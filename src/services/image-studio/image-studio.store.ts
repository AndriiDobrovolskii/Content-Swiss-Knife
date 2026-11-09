import { Injectable, computed, inject, signal } from '@angular/core';
import { findImageModel } from '../../prompt-core/model-catalog';
import { applyResponse, InvalidResponseError } from '../../utils/image-studio/apply-response';
import type { BuildInput } from '../../utils/image-studio/request-builder';
import { createGenerationRunner, type RunOutcome } from '../../utils/image-studio/generation-runner';
import { outputFormat } from '../../utils/image-studio/output-format';
import {
  StorageQuotaError,
  type Announcer,
  type ImageMime,
  type SessionMeta,
  type StoredSession,
  type Turn,
  type Version,
} from '../../utils/image-studio/ports';
import { parseStoredSession, parseStoredTurn } from '../../utils/image-studio/schemas';
import { pickEvictionVictims, SESSION_CAP, touchOnEvent } from '../../utils/image-studio/session-lifecycle';
import { studioText, type StudioLanguage } from '../../utils/image-studio/studio-texts';
import { LlmService } from '../llm.service';
import {
  ALERT_PORT, CLOCK_PORT, CONFIRM_PORT, ID_SOURCE_PORT, SCHEDULER_PORT, SESSION_STORE_PORT,
} from './image-studio.tokens';

/**
 * The root Image Studio store (US-10.1 DD-14): signals only, no RxJS. It lives at the root, not in a component,
 * because the mode switch stays enabled during a paid call and `AppComponent` destroys the studio branch: a
 * component-local state would unsubscribe a paid request and lose its result.
 *
 * Sessions and persistence: the list (with the seven-day expiry on every load and the cap of 20), the current
 * session, the per-session composer drafts (in memory only, P-4), new-session creation with eviction in the port's
 * single transaction, the model switch, attaching, the atomic commit of a response batch, the running cost, and the
 * `downloaded` flags. Every storage failure is one native alert per failing user action (D-28); a sent-bytes store
 * failure never blocks an attach or a send (OD-37).
 *
 * Generation: the in-flight call (abort controller, session id), `send` / `retry` / `cancel` over the generation
 * runner, the blocked state (FR-47), the non-history events of text and safety replies (D-5), and the status signal
 * the runner announces through. Every ambient effect is a port (NFR-14).
 */

export const DEFAULT_MODEL = 'gemini-3.1-flash-image';

export interface Attachment {
  id: string;
  fileName: string;
  fileUri: string;
  mimeType: string;
  state: 'uploading' | 'ready' | 'failed';
}

export interface AttachedVersion {
  mimeType: string;
  data: string;
  fromVersion: number;
}

/** The composer's content of one session (never persisted). */
export interface ComposerDraft {
  text: string;
  productName: string;
  presetId: string | null;
  model: string;
  aspectRatio: string;
  resolution: string;
  attachments: Attachment[];
  attachedVersion: AttachedVersion | null;
}

/** The one pending error or notice, shown in the alert region. */
export interface StudioMessage {
  textId: string;
  params?: Record<string, string | number>;
  region: 'alert';
}

/** A reply that is not part of the history: a text-only answer or a safety block (FR-36, D-5). In memory only. */
export interface StudioEvent {
  kind: 'text' | 'safety';
  text?: string;
  reason?: string;
  sessionId: string;
  /** The id of the user turn this reply answered; a Retry of that turn replaces the event. */
  turnId: string;
}

/** The turn a Retry would re-send: only offered while the composer still holds exactly this content (SD-18). */
interface RetryTurn {
  sessionId: string;
  buildInput: BuildInput;
  draft: ComposerDraft;
}

function defaultDraft(model: string): ComposerDraft {
  return {
    text: '', productName: '', presetId: null, model, aspectRatio: '1:1', resolution: '1K', attachments: [], attachedVersion: null,
  };
}

/** Newest last activity first; a tie is broken by the smaller id (SD-41). */
function newestFirst(a: SessionMeta, b: SessionMeta): number {
  return b.lastActivity - a.lastActivity || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function sameTurnContent(a: ComposerDraft, b: ComposerDraft): boolean {
  return (
    a.text === b.text &&
    a.presetId === b.presetId &&
    a.model === b.model &&
    a.aspectRatio === b.aspectRatio &&
    a.resolution === b.resolution &&
    a.attachments.map((x) => x.fileUri).join('\n') === b.attachments.map((x) => x.fileUri).join('\n') &&
    (a.attachedVersion?.fromVersion ?? null) === (b.attachedVersion?.fromVersion ?? null)
  );
}

@Injectable({ providedIn: 'root' })
export class ImageStudioStore {
  private readonly llm = inject(LlmService);
  private readonly clock = inject(CLOCK_PORT);
  private readonly scheduler = inject(SCHEDULER_PORT);
  private readonly ids = inject(ID_SOURCE_PORT);
  private readonly port = inject(SESSION_STORE_PORT);
  private readonly alerts = inject(ALERT_PORT);
  private readonly confirmPort = inject(CONFIRM_PORT);

  private readonly language = signal<StudioLanguage>('en');
  private readonly metas = signal<SessionMeta[]>([]);
  private readonly current = signal<StoredSession | null>(null);
  private readonly drafts = signal<Record<string, ComposerDraft>>({});
  private readonly status = signal('');
  private readonly pending = signal<StudioMessage | null>(null);
  private readonly retryTurn = signal<RetryTurn | null>(null);
  private readonly running = signal<{ sessionId: string; controller: AbortController } | null>(null);
  private readonly blockedSessionId = signal<string | null>(null);
  private readonly eventLog = signal<StudioEvent[]>([]);

  /** The text of the one `role="status"` region; '' when cleared. */
  readonly statusMessage = this.status.asReadonly();
  /** The pending error or notice (alert region); cleared when the next action starts. */
  readonly message = this.pending.asReadonly();
  readonly sessions = computed(() => [...this.metas()].sort(newestFirst));
  readonly currentSession = this.current.asReadonly();
  readonly currentSessionId = computed(() => this.current()?.meta.id ?? null);
  readonly versions = computed<Version[]>(() => this.current()?.meta.versions ?? []);
  readonly costUsd = computed(() => this.current()?.meta.costUsd ?? 0);
  readonly draft = computed<ComposerDraft>(() => {
    const session = this.current();
    if (!session) return defaultDraft(DEFAULT_MODEL);
    return this.drafts()[session.meta.id] ?? defaultDraft(session.meta.model);
  });
  /** True while a generation runs (it belongs to the root store, not to any component, DD-14). */
  readonly generating = computed(() => this.running() !== null);
  /** The input is locked only while a generation runs; the blocked state keeps it enabled (SD-37). */
  readonly inputEnabled = computed(() => !this.generating());
  /** The current session is in the blocked state: the protected history alone exceeds the limits (FR-47, D-12). */
  readonly blocked = computed(() => this.blockedSessionId() !== null && this.blockedSessionId() === this.currentSessionId());
  /** Non-history replies of the current session (D-5). */
  readonly events = computed(() => this.eventLog().filter((e) => e.sessionId === this.currentSessionId()));
  /** Send needs content (text, a ready upload or an attached version) and no running call, upload or block (FR-18). */
  readonly canSend = computed(() => {
    const d = this.draft();
    if (this.current() === null || this.generating() || this.blocked()) return false;
    if (d.attachments.some((a) => a.state === 'uploading')) return false;
    return d.text.trim() !== '' || d.attachments.some((a) => a.state === 'ready') || d.attachedVersion !== null;
  });
  /** True while Retry is offered: the failed turn is still exactly what the composer holds (SD-18). */
  readonly canRetry = computed(() => {
    const retry = this.retryTurn();
    return retry !== null && retry.sessionId === this.currentSessionId() && sameTurnContent(retry.draft, this.draft());
  });
  /** The model switch is inactive while the composer holds unsent content or a failed turn awaits Retry (D-4). */
  readonly modelSwitchLocked = computed(() => {
    const d = this.draft();
    return this.generating() || d.text.trim() !== '' || d.attachments.length > 0 || d.attachedVersion !== null || this.canRetry();
  });

  /** The announcer the generation runner calls; bound to the status signal (DD-23, P-15). */
  private readonly announcer: Announcer = {
    announce: (text) => this.status.set(text),
    clear: () => this.status.set(''),
  };

  private readonly runner = createGenerationRunner({
    generateImage: (request, signal) => this.llm.generateImage(request as unknown as Record<string, unknown>, signal),
    uploadImage: (request, signal) => this.llm.uploadImageFile(request, signal),
    store: {
      getSentBytes: (sessionId, fileUri) => this.port.getSentBytes(sessionId, fileUri),
      remapFileUris: (sessionId, map) => this.port.remapFileUris(sessionId, map),
    },
    clock: this.clock,
    scheduler: this.scheduler,
    announcer: this.announcer,
    uiLanguage: () => this.language(),
    sessionExists: async (sessionId) => (await this.loadValid(sessionId)) !== null,
  });

  // ---- lifecycle ----------------------------------------------------------------------------------------------

  setLanguage(lang: StudioLanguage): void {
    this.language.set(lang);
  }

  /** Loads the stored sessions (expired ones are deleted by the port), selects the newest or creates the first. */
  async init(): Promise<void> {
    const metas = await this.loadMetas();
    this.metas.set(metas);
    if (metas.length > 0) await this.selectSession([...metas].sort(newestFirst)[0].id);
    else await this.createSession({ model: DEFAULT_MODEL });
  }

  /** A later load of the list: expiry applies again (SD-33); a current session that is gone is replaced. */
  async refreshSessions(): Promise<void> {
    const metas = await this.loadMetas();
    this.metas.set(metas);
    const currentId = this.currentSessionId();
    if (currentId !== null && metas.some((m) => m.id === currentId)) return;
    this.current.set(null);
    if (metas.length > 0) await this.selectSession([...metas].sort(newestFirst)[0].id);
    else await this.createSession({ model: DEFAULT_MODEL });
  }

  /** Makes another stored session current. Viewing is not activity (SD-32): nothing is written. */
  async selectSession(id: string): Promise<void> {
    const stored = await this.loadValid(id);
    if (stored) this.current.set(stored);
  }

  /** The New session action (FR-49): confirms with T-23, then creates an empty session on the current model. */
  async newSession(): Promise<boolean> {
    if (!this.confirmPort.confirm(studioText('T-23', this.language()))) return false;
    return this.createSession({ model: this.draft().model });
  }

  /**
   * Switching the model (FR-50, SD-19). Before the session holds a version only the next message's model changes;
   * with a version a NEW session on the new model is created, seeded with the latest version as an attached image.
   */
  async switchModel(modelId: string): Promise<boolean> {
    const spec = findImageModel(modelId);
    const session = this.current();
    if (!spec || !session || this.modelSwitchLocked()) return false;

    const draft = this.draft();
    const resolution = spec.resolutions.includes(draft.resolution) ? draft.resolution : spec.resolutions[0];
    if (session.meta.versions.length === 0) {
      this.setDraft({ model: modelId, resolution });
      return true;
    }
    const seed = this.latestVersionImage(session);
    if (!seed) return false;
    return this.createSession({
      model: modelId,
      seed,
      carry: { productName: draft.productName, aspectRatio: draft.aspectRatio, resolution },
    });
  }

  // ---- the composer draft ---------------------------------------------------------------------------------------

  setDraft(patch: Partial<ComposerDraft>): void {
    const id = this.currentSessionId();
    if (id === null) return;
    const next = { ...this.draft(), ...patch };
    this.drafts.update((all) => ({ ...all, [id]: next }));
  }

  /**
   * Adds already-uploaded files as `ready` attachments (one user action) and keeps their sent bytes best effort
   * (OD-37): a store failure never rejects, never drops an attachment and raises ONE alert for the whole call (D-28).
   */
  async attach(entries: Array<{ fileUri: string; mimeType: string; fileName: string; bytes: Uint8Array }>): Promise<void> {
    const sessionId = this.currentSessionId();
    if (sessionId === null || entries.length === 0) return;
    const added: Attachment[] = entries.map((e) => ({
      id: this.ids.next(), fileName: e.fileName, fileUri: e.fileUri, mimeType: e.mimeType, state: 'ready',
    }));
    this.setDraft({ attachments: [...this.draft().attachments, ...added] });

    let storeFailed = false;
    for (const entry of entries) {
      try {
        await this.port.putSentBytes(sessionId, entry.fileUri, entry.bytes, entry.mimeType);
      } catch {
        storeFailed = true;
      }
    }
    if (storeFailed) this.alertStorage();
  }

  removeAttachment(id: string): void {
    this.setDraft({ attachments: this.draft().attachments.filter((a) => a.id !== id) });
  }

  /**
   * "Edit this version" (FR-37). In the normal state the version is attached inline to the draft of the same session,
   * replacing any earlier one. In the blocked state it creates a NEW session seeded with the version (FR-47): that exit
   * is not subject to the composer guard.
   */
  async editVersion(versionNumber: number): Promise<void> {
    const session = this.current();
    if (!session) return;
    const seed = this.versionImage(session, versionNumber);
    if (!seed) return;
    if (this.blocked()) {
      await this.createSession({ model: session.meta.model, seed, carry: { productName: this.draft().productName } });
      return;
    }
    this.setDraft({ attachedVersion: seed });
  }

  // ---- persistence of the downloaded flag -----------------------------------------------------------------------

  /** Flags versions as downloaded, called only after an SD-17 success signal; renews the last activity (SD-32). */
  async markDownloaded(versionNumbers: number[]): Promise<void> {
    const session = this.current();
    if (!session) return;
    const wanted = new Set(versionNumbers);
    if (!session.meta.versions.some((v) => wanted.has(v.number) && !v.downloaded)) return;

    const meta = touchOnEvent(session.meta, 'downloaded-changed', this.clock.now());
    meta.versions = meta.versions.map((v) => (wanted.has(v.number) ? { ...v, downloaded: true } : v));
    try {
      await this.port.commit(session.meta.id, { putTurns: [], deleteTurnIds: [], meta });
    } catch (error) {
      this.reportStorageFailure(error);
      return;
    }
    this.replaceStored(session.meta.id, { meta, turns: session.turns });
  }

  // ---- sending ------------------------------------------------------------------------------------------------

  /** One user action from the current session's draft. The draft is cleared on send and restored on any failure. */
  async send(): Promise<void> {
    const session = this.current();
    if (!session || this.generating()) return;
    const draft = this.draft();
    const buildInput: BuildInput = {
      newTurnId: this.ids.next(),
      text: draft.text,
      uploads: draft.attachments.filter((a) => a.state === 'ready').map((a) => ({ fileUri: a.fileUri, mimeType: a.mimeType })),
      ...(draft.attachedVersion ? { attachedVersion: { mimeType: draft.attachedVersion.mimeType, data: draft.attachedVersion.data } } : {}),
      model: draft.model,
      aspectRatio: draft.aspectRatio,
      resolution: draft.resolution,
      ...(draft.presetId !== null ? { presetId: draft.presetId } : {}),
    };
    await this.execute(session, buildInput, structuredClone(draft));
  }

  /** Re-sends the SAME turn (same content, ratio, resolution, model, preset); a no-op unless Retry is offered. */
  async retry(): Promise<void> {
    const retry = this.retryTurn();
    const session = this.current();
    if (!retry || !session || this.generating() || !this.canRetry()) return;
    this.eventLog.update((all) => all.filter((e) => e.turnId !== retry.buildInput.newTurnId));
    await this.execute(session, retry.buildInput, retry.draft);
  }

  /** Cancel (FR-21): aborts the in-flight call; the runner ends the action as `cancelled`. */
  cancel(): void {
    this.running()?.controller.abort();
  }

  private async execute(session: StoredSession, buildInput: BuildInput, draftSnapshot: ComposerDraft): Promise<void> {
    // FR-24: Send and Retry both enter here, so the duration of a Retry is measured from the Retry click.
    const startedAt = this.clock.now();
    const sessionId = session.meta.id;
    const controller = new AbortController();
    this.pending.set(null);
    this.retryTurn.set(null);
    this.blockedSessionId.set(null);
    this.running.set({ sessionId, controller });
    this.setDraftOf(sessionId, { ...draftSnapshot, text: '', attachments: [], attachedVersion: null });

    try {
      const outcome = await this.runner.run({ sessionId, snapshot: session, buildInput }, controller.signal);
      // The call has ended; from here on only the commit remains, which Cancel can no longer stop.
      this.running.set(null);
      await this.applyOutcome(outcome, sessionId, buildInput, draftSnapshot, startedAt);
    } finally {
      this.running.set(null);
    }
  }

  private async applyOutcome(
    outcome: RunOutcome,
    sessionId: string,
    buildInput: BuildInput,
    draft: ComposerDraft,
    startedAt: number,
  ): Promise<void> {
    switch (outcome.type) {
      case 'discarded':
        await this.refreshSessions();
        return;
      case 'images':
      case 'text':
      case 'safety':
        await this.commitResponse(outcome, sessionId, buildInput, draft, startedAt);
        return;
      case 'cancelled':
        this.restoreDraft(sessionId, draft);
        this.pending.set({ textId: 'T-18', region: 'alert' });
        return;
      case 'blocked':
        this.restoreDraft(sessionId, draft);
        this.blockedSessionId.set(sessionId);
        this.pending.set({ textId: outcome.textId, region: 'alert' });
        return;
      case 'failed':
        this.restoreDraft(sessionId, draft);
        this.pending.set({ textId: outcome.textId, region: 'alert' });
        if (outcome.retry) this.retryTurn.set({ sessionId, buildInput, draft });
        return;
    }
  }

  /** Applies an accepted response to the session that sent it: ONE atomic commit, then the in-memory state (FR-44). */
  private async commitResponse(
    outcome: Extract<RunOutcome, { type: 'images' | 'text' | 'safety' }>,
    sessionId: string,
    buildInput: BuildInput,
    draft: ComposerDraft,
    startedAt: number,
  ): Promise<void> {
    const stored = await this.loadValid(sessionId);
    if (!stored) {
      await this.refreshSessions();
      return;
    }
    const userTurn: Turn = { id: outcome.request.newTurn.id, role: 'user', parts: outcome.request.newTurn.parts };
    const uploadedFormats = draft.attachments.map((a) => a.mimeType as ImageMime);
    const attachedFormat = draft.attachedVersion
      ? stored.meta.versions.find((v) => v.number === draft.attachedVersion?.fromVersion)?.inputFormat
      : undefined;
    const latest = stored.meta.versions.reduce<Version | undefined>((best, v) => (!best || v.number > best.number ? v : best), undefined);
    // FR-9 (plan F-1): the edit source is stored only when the attached version names a version of THIS session; a
    // seed carried over from another session (switchModel, blocked editVersion) names none that exists here.
    const editOfVersion =
      draft.attachedVersion && stored.meta.versions.some((v) => v.number === draft.attachedVersion?.fromVersion)
        ? draft.attachedVersion.fromVersion
        : undefined;
    // FR-24 (SQ-6-A): the clock is read once here; the interval ends at the hand-off to the port, so the write is not in it.
    const now = this.clock.now();

    let applied;
    try {
      applied = applyResponse(stored, outcome.response, {
        userTurn,
        ids: this.ids,
        now,
        durationMs: Math.max(0, now - startedAt),
        ...(editOfVersion !== undefined ? { editOfVersion } : {}),
        model: buildInput.model,
        aspectRatio: buildInput.aspectRatio,
        resolution: buildInput.resolution,
        prompt: buildInput.text ?? '',
        inputFormat: outputFormat({ uploadedFormats, attachedVersionFormat: attachedFormat, latestVersionFormat: latest?.inputFormat }),
      });
    } catch (error) {
      // A response that lists a protected turn (InvalidResponseError) is an invalid response: nothing is applied.
      if (!(error instanceof InvalidResponseError)) throw error;
      this.announcer.clear();
      this.restoreDraft(sessionId, draft);
      this.pending.set({ textId: 'T-12', region: 'alert' });
      return;
    }
    if (!applied.batch) {
      this.recordNonHistoryReply(outcome, sessionId, buildInput, draft);
      return;
    }

    applied.batch.meta.model = buildInput.model;
    try {
      await this.port.commit(sessionId, applied.batch);
    } catch (error) {
      this.announcer.clear();
      this.restoreDraft(sessionId, draft);
      this.reportStorageFailure(error);
      return;
    }

    const byId = new Map<string, Turn>(stored.turns.map((t) => [t.id, t]));
    for (const id of applied.batch.deleteTurnIds) byId.delete(id);
    for (const turn of applied.batch.putTurns) byId.set(turn.id, turn);
    const turns = applied.batch.meta.turnOrder.map((id) => byId.get(id)).filter((t): t is Turn => t !== undefined);
    this.replaceStored(sessionId, { meta: applied.batch.meta, turns });

    if (outcome.type !== 'images') this.recordNonHistoryReply(outcome, sessionId, buildInput, draft);
    if (applied.notice) this.pending.set({ textId: 'T-9', params: { ...applied.notice }, region: 'alert' });
  }

  /**
   * A text-only or safety reply is a non-history event with Retry (FR-36, FR-62, FR-63): it is kept in memory only, the
   * composer gets the content back, and a safety block also shows T-4 (the cut notice, when there is one, replaces it).
   */
  private recordNonHistoryReply(
    outcome: Extract<RunOutcome, { type: 'images' | 'text' | 'safety' }>,
    sessionId: string,
    buildInput: BuildInput,
    draft: ComposerDraft,
  ): void {
    const response = outcome.response;
    const turnId = buildInput.newTurnId;
    if (response.kind === 'text') {
      this.eventLog.update((all) => [...all, { kind: 'text', text: response.text, sessionId, turnId }]);
    } else if (response.kind === 'safety') {
      this.eventLog.update((all) => [...all, { kind: 'safety', reason: response.reason, sessionId, turnId }]);
      this.pending.set({ textId: 'T-4', region: 'alert' });
    }
    this.restoreDraft(sessionId, draft);
    this.retryTurn.set({ sessionId, buildInput, draft });
  }

  // ---- internals ----------------------------------------------------------------------------------------------

  private async loadMetas(): Promise<SessionMeta[]> {
    const raw = await this.port.loadAndExpire(this.clock.now());
    return raw.map((meta) => parseStoredSession(meta)).filter((meta): meta is SessionMeta => meta !== null);
  }

  /** A stored session whose meta and turns pass their schemas, or null (missing or malformed: ignored, not deleted). */
  private async loadValid(id: string): Promise<StoredSession | null> {
    const raw = await this.port.loadSession(id);
    if (!raw) return null;
    const meta = parseStoredSession(raw.meta);
    if (!meta) return null;
    const turns = raw.turns.map((turn) => parseStoredTurn(turn)).filter((turn): turn is Turn => turn !== null);
    return { meta, turns };
  }

  /** Creates an empty session in the port's single transaction, evicting per the lifecycle rules (FR-86, D-23..D-25). */
  private async createSession(opts: {
    model: string;
    seed?: AttachedVersion;
    carry?: Partial<Pick<ComposerDraft, 'productName' | 'aspectRatio' | 'resolution'>>;
  }): Promise<boolean> {
    const now = this.clock.now();
    const id = this.ids.next();
    const meta: SessionMeta = {
      schemaVersion: 1, id, createdAt: now, lastActivity: now, model: opts.model, costUsd: 0, nextVersionNumber: 1, turnOrder: [], versions: [],
    };
    const leavingId = this.currentSessionId() ?? undefined;
    try {
      const result = await this.port.createWithEviction({ meta, turns: [] }, (stored) =>
        pickEvictionVictims(
          stored.map((m) => parseStoredSession(m)).filter((m): m is SessionMeta => m !== null),
          { cap: SESSION_CAP, leavingId, inFlightId: this.inFlightSessionId(), creatingId: id },
        ),
      );
      const evicted = new Set(result.evictedIds);
      this.metas.update((all) => [...all.filter((m) => !evicted.has(m.id)), meta]);
      this.drafts.update((all) => {
        const rest = Object.fromEntries(Object.entries(all).filter(([key]) => !evicted.has(key)));
        return { ...rest, [id]: { ...defaultDraft(opts.model), ...(opts.carry ?? {}), attachedVersion: opts.seed ?? null } };
      });
      this.current.set({ meta, turns: [] });
      return true;
    } catch (error) {
      this.reportStorageFailure(error);
      return false;
    }
  }

  /** The session with a generation in flight, which the eviction must spare (D-23). */
  private inFlightSessionId(): string | undefined {
    return this.running()?.sessionId;
  }

  /** The latest version's image, as the seed of a new session (FR-50). */
  private latestVersionImage(session: StoredSession): AttachedVersion | null {
    const latest = session.meta.versions.reduce<Version | undefined>((best, v) => (!best || v.number > best.number ? v : best), undefined);
    return latest ? this.versionImage(session, latest.number) : null;
  }

  /** The inline image of one retained version, or null when its turn or part is not available. */
  private versionImage(session: StoredSession, versionNumber: number): AttachedVersion | null {
    const version = session.meta.versions.find((v) => v.number === versionNumber);
    const part = version ? session.turns.find((t) => t.id === version.turnId)?.parts[version.partIndex] : undefined;
    if (!version || !part?.inlineData) return null;
    return { mimeType: part.inlineData.mimeType, data: part.inlineData.data, fromVersion: version.number };
  }

  private replaceStored(sessionId: string, stored: StoredSession): void {
    this.metas.update((all) => all.map((m) => (m.id === sessionId ? stored.meta : m)));
    if (this.currentSessionId() === sessionId) this.current.set(stored);
  }

  private setDraftOf(sessionId: string, draft: ComposerDraft): void {
    this.drafts.update((all) => ({ ...all, [sessionId]: draft }));
  }

  private restoreDraft(sessionId: string, draft: ComposerDraft): void {
    this.setDraftOf(sessionId, draft);
  }

  private reportStorageFailure(error: unknown): void {
    if (error instanceof StorageQuotaError) this.alertStorage();
    else this.pending.set({ textId: 'T-12', region: 'alert' });
  }

  /** The one native alert of a failing user action (FR-81, D-28). */
  private alertStorage(): void {
    this.alerts.alert(studioText('T-20', this.language()));
  }
}
