import { PromptPayload } from '../prompt-core/payload';
import { ValidationIssue } from './output-validator';
import { REPAIR_STRATEGIES, RepairTier, getAtPath, isLadderCandidate, resolveLadder, setAtPath } from './repair-strategy';

export interface RepairGateOptions<T> {
  label: string;
  maxRepairs: number;
  basePayload: PromptPayload;
  produce: (payload: PromptPayload) => Promise<T>;
  validate: (artifact: T) => ValidationIssue[];
  withFeedback: (payload: PromptPayload, errors: ValidationIssue[]) => PromptPayload;
  onAttempt?: (attempt: number, errorCount: number) => void;
  /**
   * Tier-1 executor: send one field value plus an instruction, get the corrected value back.
   *
   * OPTIONAL. When omitted, the ladder still runs tier 0 (which needs no LLM) but every
   * 'field-scoped' rung is skipped. When BOTH this and tiered repair are unused the loop is
   * byte-identical to the pre-ladder gate — that reversibility is asserted in the spec.
   *
   * Implementations MUST build a minimal payload that reuses `basePayload.systemBlocks` BY
   * REFERENCE so the cached prefix still hits; see repairFieldPayload().
   */
  repairField?: (payload: PromptPayload) => Promise<string>;
  /** Tier-1 attempt budget. Each call is ~200 tokens, so this can exceed maxRepairs safely. */
  maxFieldRepairs?: number;
  /**
   * Block-scoped executor: given the artifact and the issues sitting on that rung, return a
   * repaired artifact.
   *
   * The whole tier is a callback rather than logic inside the gate, because a block rewrite is
   * HTML-shaped — grouping issues per block, one call, deterministic accept/reject per block — and
   * this gate is generic over T. Keeping it out here is what stops HTML knowledge leaking into a
   * function that also repairs JSON. utils/block-repair.ts supplies the pieces.
   *
   * OPTIONAL. Without it the rung is still SPENT (the cursor advances) so a ladder always
   * terminates; it simply cannot act.
   */
  repairBlocks?: (artifact: T, issues: ValidationIssue[]) => Promise<T>;
}

/**
 * Minimal payload for a tier-1 field repair.
 *
 * Deliberately NOT appendRepairFeedback: appending to the full userContent would ship the entire
 * product context to correct one string. `systemBlocks` is passed through BY REFERENCE — that is
 * what preserves the Anthropic cache hit, and a test asserts the identity.
 */
export function repairFieldPayload(basePayload: PromptPayload, instruction: string): PromptPayload {
  return { systemBlocks: basePayload.systemBlocks, userContent: instruction };
}

export interface RepairAttemptRecord {
  attempt: number;
  /** The error-severity issues that triggered this attempt (fed to withFeedback). */
  issuesBefore: ValidationIssue[];
  /** Full validate() result after the regeneration. */
  issuesAfter: ValidationIssue[];
  /** issuesBefore entries that do NOT reappear in issuesAfter — the repair actually fixed these. */
  resolved: ValidationIssue[];
  /** issuesBefore entries that still appear in issuesAfter — the repair did not fix these. */
  persisted: ValidationIssue[];
  /**
   * issuesAfter entries that were NOT in issuesBefore — errors this repair INTRODUCED.
   *
   * A repair with introduced.length > 0 is a net regression even when resolved.length > 0, and is
   * the usual reason a strictly-better comparison ties and discards an otherwise good attempt.
   * Without this field `resolved` and `persisted` are both subsets of issuesBefore, so whether a
   * repair made the artifact WORSE is unmeasurable.
   */
  introduced: ValidationIssue[];
}

export interface RepairGateResult<T> {
  artifact: T;
  finalIssues: ValidationIssue[];
  repairsUsed: number;
  attempts: RepairAttemptRecord[];
  /**
   * Distinct block-scoped findings that existed at some point during the run and are absent from
   * `finalIssues`.
   *
   * NOT the number of patches applied. A patch can splice cleanly, pass every structural check,
   * and still leave the sentence over its ceiling — the model splits off an unrelated tail and
   * leaves the enumeration intact. Reporting only "applied" would call that a success.
   */
  blockScopedResolved: number;
  /**
   * Which attempt produced the shipped artifact. 0 = the initial generation (no repair applied).
   *
   * Because ties keep the earliest attempt, this is NOT always equal to repairsUsed — a repair can
   * be spent, recorded in attempts[], and then discarded. Without this field the report cannot
   * distinguish "repair worked" from "repair worked and was thrown away".
   */
  shippedAttempt: number;
}

export async function runRepairGate<T>(opts: RepairGateOptions<T>): Promise<RepairGateResult<T>> {
  // Every block-scoped finding seen at any point in the run, so "did the repair work" can be
  // answered against what shipped rather than against how many patches were spliced.
  const blockScopedKey = (i: ValidationIssue) => `${i.rule}::${i.path}`;
  const blockScopedSeen = new Set<string>();
  const validate = (candidate: T): ValidationIssue[] => {
    const found = opts.validate(candidate);
    for (const issue of found) {
      if (issue.path && resolveLadder(issue).includes('block-scoped')) {
        blockScopedSeen.add(blockScopedKey(issue));
      }
    }
    return found;
  };

  let artifact = await opts.produce(opts.basePayload);
  let issues = validate(artifact);
  let repairsUsed = 0;
  const attempts: RepairAttemptRecord[] = [];

  const errCount = (is: ValidationIssue[]) => is.filter(i => i.severity === 'error').length;
  const issueKey = (i: ValidationIssue) => `${i.rule}::${i.context}`;

  /**
   * How many rungs of its own ladder each issue has already burned, keyed by cursorKey.
   *
   * This is what makes dispatch PER-ISSUE rather than a global tier sweep. meta-title-length's
   * ladder is ['field-scoped', 'deterministic'] — tier 1 first, because its wording carries SEO
   * value and truncation destroys it. A global "apply all tier-0 fixes, then all tier-1" pass would
   * truncate before the model ever saw the title, making tier 1 unreachable and the ladder
   * decorative. Cursors persist ACROSS iterations so a failed rung escalates rather than repeating.
   *
   * Keyed by `path`, NOT by issueKey. rule::context separates en-GB from pl-PL but not two findings
   * inside one artifact, and validation-issues.ts:17-22 says so outright: for sentence-too-long,
   * h2-nominal-heading and alt-numeric-not-grounded, "keying on rule+context alone would collapse
   * genuinely distinct findings into one". Collapsed here it does more than merge a report line —
   * with a shared cursor, one pass over two findings advances the ladder twice, so the next pass
   * reads a rung neither of them ever attempted and their terminator never runs. `path` is unique
   * by construction, which is the whole reason it exists.
   *
   * Issues with no `path` resolve to ['full-regen'] and never consult a rung, so the issueKey
   * fallback below only has to be stable, not precise.
   */
  const cursorKey = (i: ValidationIssue) => i.path ?? issueKey(i);
  const ladderCursor = new Map<string, number>();
  let cursorMoves = 0;
  const activeTier = (issue: ValidationIssue): RepairTier => {
    const ladder = resolveLadder(issue);
    // Past the end means exhausted, and 'full-regen' is the sentinel for that. An error ladder ends
    // with it anyway, so this is identical to clamping there. A WARNING ladder does not end with it
    // — clamping would pin a one-rung warning on its only rung and re-attempt it every pass.
    return ladder[ladderCursor.get(cursorKey(issue)) ?? 0] ?? 'full-regen';
  };
  const advance = (issue: ValidationIssue) => {
    ladderCursor.set(cursorKey(issue), (ladderCursor.get(cursorKey(issue)) ?? 0) + 1);
    cursorMoves++;
  };
  /** Burns the rest of an issue's ladder, so activeTier resolves it to 'full-regen' from now on. */
  const exhaust = (issue: ValidationIssue) => {
    ladderCursor.set(cursorKey(issue), resolveLadder(issue).length);
    cursorMoves++;
  };
  /**
   * Second attempt at a MEASURED finding: state the shortfall outright.
   *
   * sentence-too-long already has TWO block rungs (repair-strategy.ts) precisely because one was
   * demonstrably not enough. What it did not have is any difference between the two attempts: both
   * sent the validator's `detail` verbatim, so a model that had just missed the ceiling was asked
   * again in the same words, with no signal that it had missed or by how much. EXPERT3D XGRIDS
   * L2 Pro (2026-07-29) ran with both rungs in place and still shipped the warning — 5 patches
   * applied, 3 findings resolved.
   *
   * `measured` operands turn "did it work" into a comparison rather than a judgement, so the
   * second rung can name the exact deficit. `detail` is what block-tier.ts forwards verbatim as
   * the instruction, so escalating it needs no signature change anywhere in the executor.
   *
   * Rungs beyond the second are deliberately not added here: a sentence that survives two explicit
   * instructions should reach the report honestly rather than burn a third call.
   */
  const escalateForRetry = (issue: ValidationIssue, isRetry: boolean): ValidationIssue => {
    if (!isRetry || !issue.measured) return issue;
    const { actual, limit, unit } = issue.measured;
    if (actual <= limit) return issue;
    return {
      ...issue,
      detail:
        `${issue.detail} THE PREVIOUS ATTEMPT DID NOT SATISFY THIS CONSTRAINT — it is still `
        + `${actual} ${unit} against a limit of ${limit}. Remove at least ${actual - limit} more `
        + `${unit}; split into two sentences if that is what it takes.`,
    };
  };

  /**
   * Runs every issue currently sitting on `tier`, replacing exactly one addressed field per issue.
   * Returns the possibly-updated artifact. Issues whose repair did not land advance their cursor so
   * the next iteration tries the next rung.
   */
  const applyTier = async (
    tier: RepairTier,
    current: T,
    plan: ReadonlyArray<{ issue: ValidationIssue; tier: RepairTier }>,
  ): Promise<T> => {
    let next = current;
    for (const { issue, tier: planned } of plan) {
      if (planned !== tier || !issue.path) continue;
      try {
        const strategy = REPAIR_STRATEGIES.get(issue.rule);
        const value = getAtPath(next, issue.path);
        if (!strategy || typeof value !== 'string') { advance(issue); continue; }

        let replacement: string | null = null;
        if (tier === 'deterministic' && strategy.deterministic) {
          replacement = strategy.deterministic(value, issue);
        } else if (tier === 'field-scoped' && strategy.fieldInstruction && opts.repairField) {
          const instruction = strategy.fieldInstruction(value, issue);
          replacement = (await opts.repairField(repairFieldPayload(opts.basePayload, instruction)))?.trim() || null;
        }

        // Always advance: a rung is spent whether or not it worked. Repeating it would loop forever
        // on a strategy that cannot satisfy the constraint.
        advance(issue);
        if (replacement !== null && replacement !== value) next = setAtPath(next, issue.path, replacement);
      } catch (err) {
        // getAtPath/setAtPath throw on a path they cannot resolve, and that intent is right: a
        // malformed path is a bug in a strategy or an emission site, and it stays loud here.
        //
        // What was wrong is the price. The exception used to travel out of runRepairGate and out of
        // generate(), destroying an artifact that had already been generated and paid for. "Loud"
        // has to mean "this issue is not patchable — use the expensive instrument", not "lose the
        // work". Exhausting the ladder resolves it to full-regen from here on.
        console.error(
          `[repair-gate] ${opts.label}: cannot address "${issue.path}" for rule "${issue.rule}" — ` +
          'falling back to full regeneration for this issue.',
          err,
        );
        exhaust(issue);
      }
    }
    return next;
  };

  /**
   * The block-scoped rung. Unlike the per-issue tiers above, every issue on this rung is handed to
   * ONE executor call: several findings in the same paragraph must become a single rewrite of that
   * paragraph, not one patch each — the second patch would splice against offsets the first had
   * already invalidated.
   */
  const applyBlockTier = async (
    current: T,
    plan: ReadonlyArray<{ issue: ValidationIssue; tier: RepairTier }>,
  ): Promise<T> => {
    const onRung = plan.filter(p => p.tier === 'block-scoped' && p.issue.path).map(p => p.issue);
    if (onRung.length === 0) return current;
    // Read the cursor BEFORE advancing: a non-zero rung means this issue has already had one
    // block attempt, which is exactly what escalateForRetry needs to know.
    const instructions = onRung.map(issue =>
      escalateForRetry(issue, (ladderCursor.get(cursorKey(issue)) ?? 0) > 0));
    // Spent whether or not an executor exists, so the ladder always terminates.
    for (const issue of onRung) advance(issue);
    return opts.repairBlocks ? opts.repairBlocks(current, instructions) : current;
  };

  // `attempt` tracks which generation `best` currently holds, so the report can state what actually
  // shipped rather than inferring it from repairsUsed.
  let best = { artifact, issues, errors: errCount(issues), attempt: 0 };

  // ── Tiered ladder, ahead of any full regeneration ───────────────────────────
  //
  // Tiers 0 and 1 replace a single addressed field and cannot touch anything else, which makes them
  // MONOTONIC — and monotonicity, not cost, is the point. Full regeneration carries no preservation
  // property, so it is free to fix en-GB and break pl-PL. Every error resolved here is one that
  // never reaches the instrument that can regress its neighbours.
  //
  // The ladder is monotonic PER FIELD, but that is not the same as monotonic per artifact: a
  // strategy can resolve the error it was given and, through the value it wrote, create a different
  // one. So the whole ladder pass is snapshotted and can be rejected wholesale — the same discipline
  // the full-regen loop below has always had, which the ladder was missing.
  const preLadder = { artifact, issues, errors: errCount(issues) };

  const fieldBudget = opts.maxFieldRepairs ?? 3;
  for (let pass = 0; pass < fieldBudget; pass++) {
    // Warnings enter here too, narrowly — see isLadderCandidate. They never reach the full-regen
    // loop below, which still filters on severity === 'error'.
    const errs = issues.filter(isLadderCandidate);
    if (errs.length === 0) break;

    // Snapshot each issue's active tier ONCE per pass. Reading activeTier() inside applyTier would
    // let a single pass burn two rungs of the same ladder: the deterministic phase runs first in
    // code order, so any ladder beginning with 'deterministic' would advance the cursor and then
    // immediately match the field-scoped phase too. One rung per pass has to be structural — that is
    // what makes "attempt, fail, escalate next iteration" mean anything.
    const plan = errs.map(issue => ({ issue, tier: activeTier(issue) }));

    // Nothing left that a cheap tier can address — stop and let the full-regen loop decide.
    if (!plan.some(p => p.tier === 'deterministic' || p.tier === 'field-scoped' || p.tier === 'block-scoped')) break;

    const before = artifact;
    const movesBefore = cursorMoves;
    artifact = await applyTier('deterministic', artifact, plan);
    artifact = await applyTier('field-scoped', artifact, plan);
    artifact = await applyBlockTier(artifact, plan);

    // Advancing a cursor IS progress even when the artifact did not change — the next pass will
    // reach a different rung. Breaking on "no change" alone would strand meta-title-length on its
    // field-scoped rung whenever no repairField executor is supplied, and its deterministic
    // terminator would never run.
    if (artifact === before && cursorMoves === movesBefore) break;
    if (artifact === before) continue; // cursors moved but nothing changed — no need to re-validate

    issues = validate(artifact);
  }

  // ── Reject the ladder's work if it did not improve the artifact ─────────────
  //
  // Two ways a pass fails, and the second is invisible to a count:
  //
  //   1. More errors than it started with. Straightforward regression.
  //   2. The same number of errors, but one of the new ones can ONLY be fixed by full
  //      regeneration. slugify is the concrete path: coercing "Ortur H20!" and "ortur-h20" to the
  //      same string turns a tier-0-repairable slug-charset into slug-duplicate, which has no
  //      registered strategy. The count is unchanged and the artifact is strictly worse off — the
  //      ladder manufactured work for the one instrument it exists to avoid.
  //
  // Rejection is wholesale, not per field. A pass is a unit: the fields it wrote are what produced
  // the new issue set, and unpicking one of them would leave a state that was never validated.
  const preLadderKeys = new Set(preLadder.issues.map(issueKey));
  const manufacturedFullRegenWork = issues.some(
    i => i.severity === 'error' && !preLadderKeys.has(issueKey(i)) && resolveLadder(i)[0] === 'full-regen',
  );
  if (errCount(issues) > preLadder.errors || manufacturedFullRegenWork) {
    artifact = preLadder.artifact;
    issues = preLadder.issues;
  }

  // The ladder's work counts as the shipped state, not as a spent repair: `repairsUsed` tracks full
  // regenerations only, so Phase A's "Repairs spent but discarded" stays meaningful.
  best = { artifact, issues, errors: errCount(issues), attempt: 0 };

  while (repairsUsed < opts.maxRepairs) {
    if (best.errors === 0) break;
    const issuesBefore = issues.filter(i => i.severity === 'error');
    opts.onAttempt?.(repairsUsed + 1, errCount(issues));
    artifact = await opts.produce(opts.withFeedback(opts.basePayload, issuesBefore));
    issues = validate(artifact);
    repairsUsed++;

    // ── Deterministic cleanup, applied to THIS attempt's output before it is scored ──
    //
    // Full regeneration carries no preservation property: it is free to fix the issue it was asked
    // about and introduce an unrelated one in the same breath (the concrete case this closes:
    // slug-name-designator-lost fixed, slug-charset introduced, in the same rewrite). When the
    // introduced issue happens to have a registered tier-0 strategy, running it here — once, before
    // the strictly-better comparison below — recovers a genuinely-improved attempt that comparison
    // would otherwise discard wholesale on a tied error count.
    //
    // Safe by construction, not merely convenient: every registered `deterministic` strategy either
    // returns a value proven to satisfy the rule again (slugify's own contract — see
    // repair-strategy.ts) or leaves the field untouched, so this can only remove mechanically fixable
    // noise, never add it. Does NOT spend a repair attempt or its own budget — repairsUsed already
    // incremented above from the produce() call, and exactly one RepairAttemptRecord is still pushed
    // below, built from the post-cleanup issue set. Skipped entirely, cleanup and re-validate alike,
    // when nothing on this attempt is tier-0-fixable — the identity check on `cleaned` mirrors the
    // pre-loop ladder's own "did anything change" gate (this file, the pre-ladder pass above).
    const cleanupPlan = issues
      .filter(i => i.path && REPAIR_STRATEGIES.get(i.rule)?.deterministic)
      .map(issue => ({ issue, tier: 'deterministic' as RepairTier }));
    if (cleanupPlan.length > 0) {
      const cleaned = await applyTier('deterministic', artifact, cleanupPlan);
      if (cleaned !== artifact) {
        artifact = cleaned;
        issues = validate(artifact);
      }
    }

    const afterKeys = new Set(issues.map(issueKey));
    const beforeKeys = new Set(issuesBefore.map(issueKey));
    attempts.push({
      attempt: repairsUsed,
      issuesBefore,
      issuesAfter: issues,
      resolved: issuesBefore.filter(i => !afterKeys.has(issueKey(i))),
      persisted: issuesBefore.filter(i => afterKeys.has(issueKey(i))),
      // Errors only: a warning appearing after a repair is not a regression worth spending a
      // repair attempt on, and counting it would inflate the run-level regression metric.
      introduced: issues.filter(i => i.severity === 'error' && !beforeKeys.has(issueKey(i))),
    });

    const e = errCount(issues);
    // Strictly-better wins; ties keep earliest. Deliberately conservative — do not relax this
    // without a separate argument, but DO record which attempt won so the report can say so.
    if (e < best.errors) best = { artifact, issues, errors: e, attempt: repairsUsed };
  }

  // ── Final block pass, on whatever actually shipped ──────────────────────────
  //
  // The ladder runs BEFORE the loop above, on an artifact that loop may then replace. When a
  // regeneration wins on errors, `best` becomes an artifact the block tier has never seen, and
  // every patch made earlier is discarded along with the artifact it was applied to. Without this
  // pass the whole feature is reliable only when regeneration FAILS — which is how the first real
  // run happened to keep its ten patches.
  //
  // Gated on `best.attempt > 0`: when no regeneration won, `best` IS the artifact the ladder
  // worked on and its cursors still mean something, so a pass here would be a third attempt past
  // the two-rung cap. Ladder cursors are deliberately not consulted otherwise — they were spent on
  // a different artifact.
  if (opts.repairBlocks && best.attempt > 0) {
    const repairable = best.issues.filter(i => i.path && resolveLadder(i).includes('block-scoped'));
    if (repairable.length > 0) {
      const patched = await opts.repairBlocks(best.artifact, repairable);
      const patchedIssues = validate(patched);
      const patchedErrors = errCount(patchedIssues);
      // Same discipline as everywhere else: a repair may not increase the error count.
      if (patchedErrors <= best.errors) {
        best = { ...best, artifact: patched, issues: patchedIssues, errors: patchedErrors };
      }
    }
  }

  const shippedBlockScoped = new Set(best.issues.filter(i => i.path).map(blockScopedKey));

  return {
    artifact: best.artifact,
    finalIssues: best.issues,
    repairsUsed,
    attempts,
    blockScopedResolved: [...blockScopedSeen].filter(k => !shippedBlockScoped.has(k)).length,
    shippedAttempt: best.attempt,
  };
}

export function appendRepairFeedback(
  payload: PromptPayload,
  errors: ValidationIssue[],
): PromptPayload {
  const feedbackLines = errors
    .map(i => `- [${i.severity.toUpperCase()}] ${i.rule}: ${i.detail}${i.context ? ` (${i.context})` : ''}`)
    .join('\n');

  const block = [
    '',
    '[VALIDATION FEEDBACK — REVISION REQUIRED]',
    'Your previous output failed these mandatory acceptance checks.',
    'Return a corrected, complete output that resolves every item. No commentary, no code fences.',
    feedbackLines,
  ].join('\n');

  return {
    ...payload,
    userContent: `${payload.userContent}\n${block}`,
  };
}

export interface RepairArtifactReport {
  label: string;
  repairsUsed: number;
  attempts: RepairAttemptRecord[];
  finalIssues: ValidationIssue[];
  /** 'clean' = no repair needed. 'repaired' = repair fixed all errors. 'unresolved' = errors remain after maxRepairs. */
  status: 'clean' | 'repaired' | 'unresolved';
  /** Which attempt shipped. Required, not optional — see RepairGateResult.shippedAttempt. Making it
   *  optional would let a caller silently drop the signal, which is the bug this field exists to fix. */
  shippedAttempt: number;
  /**
   * What the block-scoped rung did to this artifact, when it ran.
   *
   * `rejections` matters as much as the counts: a silent rejection is indistinguishable from "the
   * model had nothing to fix", and the difference is the whole signal about whether the repair
   * prompt is working.
   */
  blockPatches?: {
    /** Patches spliced in — says the rewrite was structurally sound, NOT that it worked. */
    applied: number;
    /** Findings actually gone from the shipped artifact. The gap against `applied` is the signal. */
    resolved: number;
    rejected: number;
    rejections: string[];
  };
}

export function toArtifactReport(
  label: string,
  result: RepairGateResult<unknown>,
  blockPatches?: Omit<NonNullable<RepairArtifactReport['blockPatches']>, 'resolved'>,
): RepairArtifactReport {
  const finalErrors = result.finalIssues.filter(i => i.severity === 'error').length;
  const status: RepairArtifactReport['status'] =
    result.repairsUsed === 0 ? 'clean' : finalErrors === 0 ? 'repaired' : 'unresolved';
  return {
    label,
    repairsUsed: result.repairsUsed,
    attempts: result.attempts,
    finalIssues: result.finalIssues,
    status,
    shippedAttempt: result.shippedAttempt,
    // `resolved` comes from the gate, which is the only place that can compare findings before and
    // after; the executor can only count what it spliced.
    blockPatches: blockPatches ? { ...blockPatches, resolved: result.blockScopedResolved } : undefined,
  };
}

export interface RepairReportMeta {
  product: string;
  store: string;
  generatedAt: string; // ISO timestamp
}

/**
 * Renders repair-gate reports as Markdown, optimized for prompt-engineering review:
 * the recurring-failures table comes first so a persistent rule failure (the kind worth
 * fixing in a system block instead of paying for repeated repair-gate retries) is visible
 * without reading the full per-artifact log.
 */
/**
 * Renders what the block-scoped rung did. Nothing at all when it never ran, so a report from a run
 * without the tier is unchanged.
 */
function renderLocalPatches(lines: string[], blockWork: RepairArtifactReport[]): void {
  if (blockWork.length === 0) return;
  lines.push('## Local patches');
  lines.push('');
  lines.push('Repairs that rewrote a single block instead of regenerating the artifact.');
  lines.push('');
  for (const report of blockWork) {
    const patches = report.blockPatches!;
    lines.push(`- **${report.label}** — ${patches.applied} applied, ${patches.resolved} resolved, ${patches.rejected} rejected`);
    // The reason is the signal: a rejected patch means the model tried and produced something the
    // deterministic checks refused, which is a prompt problem. A silent count cannot say that.
    for (const reason of patches.rejections) lines.push(`  - ✗ ${reason}`);
  }
  lines.push('');
}

export function formatRepairReportMarkdown(reports: RepairArtifactReport[], meta: RepairReportMeta): string {
  const lines: string[] = [];
  const repaired = reports.filter(r => r.status !== 'clean');
  const blockWork = reports.filter(r => r.blockPatches && (r.blockPatches.applied > 0 || r.blockPatches.rejected > 0));
  // Computed once and appended in BOTH branches below. Previously this lived inside the
  // repaired.length === 0 early return, so any run that needed a repair silently dropped every
  // warning — exactly the situation a mass-deletion incident produces (Bug E).
  const warnings = reports.flatMap(r =>
    r.finalIssues.filter(i => i.severity === 'warning').map(i => ({ ...i, label: r.label })));

  lines.push(`# Repair Gate Report — ${meta.product} (${meta.store})`);
  lines.push('');
  lines.push(`Generated: ${meta.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Artifacts checked: ${reports.length}`);
  lines.push(`- Artifacts that needed a repair: ${repaired.length}`);
  lines.push(`- Artifacts still failing after maxRepairs: ${reports.filter(r => r.status === 'unresolved').length}`);
  lines.push(`- Total repair attempts spent: ${reports.reduce((sum, r) => sum + r.repairsUsed, 0)}`);
  // Repairs that were paid for and then thrown away by the tie-break. A non-zero value here next to
  // a non-zero regression count means repair instructions are broad enough to damage neighbouring
  // fields — a prompt problem. A non-zero value with zero regressions means the tie-break itself is
  // discarding equal-scoring improvements.
  lines.push(`- Repairs spent but discarded: ${reports.reduce((sum, r) => sum + Math.max(0, r.repairsUsed - r.shippedAttempt), 0)}`);
  lines.push(`- Total repair regressions introduced: ${reports.reduce((sum, r) => sum + r.attempts.reduce((n, a) => n + a.introduced.length, 0), 0)}`);
  if (blockWork.length > 0) {
    // Counted separately from repairsUsed: a block patch is not a full regeneration, and folding
    // the two together would make "Repairs spent but discarded" unreadable.
    lines.push(`- Local block patches applied: ${blockWork.reduce((n, r) => n + r.blockPatches!.applied, 0)}`);
    // Reported next to `applied` on purpose: a patch can splice cleanly and still leave the
    // sentence over its ceiling, and only this number says so.
    lines.push(`- Local block findings resolved: ${blockWork.reduce((n, r) => n + r.blockPatches!.resolved, 0)}`);
    lines.push(`- Local block patches rejected: ${blockWork.reduce((n, r) => n + r.blockPatches!.rejected, 0)}`);
  }
  lines.push('');

  if (repaired.length === 0) {
    // "No repairs were needed" must not be printed once a block patch has rewritten something.
    // A block patch IS a repair — a cheaper one — and claiming otherwise is the same untruthfulness
    // class the shipped-attempt work fixed: a report that reads clean about an artifact that was
    // in fact rewritten.
    lines.push(blockWork.length === 0
      ? 'No repairs were needed — every artifact passed validation on the first generation.'
      : 'No full regeneration was needed — every artifact either passed on the first generation or was repaired in place.');
    lines.push('');
    renderLocalPatches(lines, blockWork);
    if (warnings.length > 0) {
      lines.push('## Warnings (not repaired)');
      lines.push('');
      for (const issue of warnings) {
        lines.push(`- [${issue.label}] \`${issue.rule}\` — ${issue.detail}`);
      }
    }
    return lines.join('\n').trimEnd();
  }

  // ── Recurring rule failures — the prompt-engineering signal ──
  //
  // The "Fixed by repair?" column is computed against what SHIPPED (finalIssues), not against
  // per-attempt bookkeeping. The old version read `agg.persisted > 0 ? no : yes`, which reported
  // ✅ yes for a rule whose fix was recorded in attempts[] and then discarded by the
  // strictly-better tie-break — crediting a repair that never shipped.
  interface RuleAgg {
    rule: string;
    /** How often this rule BLOCKED acceptance (resolved + persisted). Introduced is counted
     *  separately so ranking keeps meaning "how often did this rule stand in the way". */
    occurrences: number;
    introduced: number;
    contexts: Set<string>;
    resolved: number;
    persisted: number;
    sampleDetail: string;
  }
  const byRule = new Map<string, RuleAgg>();
  const agg = (issue: ValidationIssue): RuleAgg => {
    const existing = byRule.get(issue.rule)
      ?? { rule: issue.rule, occurrences: 0, introduced: 0, contexts: new Set<string>(), resolved: 0, persisted: 0, sampleDetail: issue.detail };
    existing.contexts.add(issue.context);
    byRule.set(issue.rule, existing);
    return existing;
  };

  // Rules whose fix was resolved on THIS artifact, keyed per report label. The pairing below must
  // stay per-artifact: a run covers several artifacts (SEO meta for uk-UA/en-GB/pl-PL), and a global
  // "somebody resolved it somewhere" would label a rule 'fixed then discarded' when one locale was
  // fixed-then-discarded while another was never fixed at all — merging a gate problem with a prompt
  // problem and hiding the harder one.
  const resolvedByLabel = new Map<string, Set<string>>();
  const shippedByLabel = new Map<string, Set<string>>();

  for (const report of reports) {
    const resolvedHere = new Set<string>();
    for (const attempt of report.attempts) {
      for (const issue of attempt.resolved) {
        const a = agg(issue); a.occurrences++; a.resolved++;
        resolvedHere.add(issue.rule);
      }
      for (const issue of attempt.persisted) {
        const a = agg(issue); a.occurrences++; a.persisted++; a.sampleDetail = issue.detail;
      }
      // Included in the row set so a regression that ships is rankable at all. Without this a rule
      // that only ever appeared as `introduced` has no row, and Defect B survives in the table.
      for (const issue of attempt.introduced) {
        const a = agg(issue); a.introduced++; a.sampleDetail = issue.detail;
      }
    }
    resolvedByLabel.set(report.label, resolvedHere);
    shippedByLabel.set(
      report.label,
      new Set(report.finalIssues.filter(i => i.severity === 'error').map(i => i.rule)),
    );
  }
  const ranked = [...byRule.values()].sort((a, b) => b.occurrences - a.occurrences);

  /** Number of artifacts that shipped this rule as an unresolved error. */
  const shippedCount = (rule: string) =>
    [...shippedByLabel.values()].filter(s => s.has(rule)).length;

  /** True when SOME single artifact both resolved the rule and still shipped it broken. */
  const fixedThenDiscarded = (rule: string) =>
    reports.some(r => shippedByLabel.get(r.label)?.has(rule) && resolvedByLabel.get(r.label)?.has(rule));

  lines.push('## Recurring rule failures (fix candidates for prompts/system blocks)');
  lines.push('');
  lines.push('| Rule | Occurrences | Introduced | Contexts | Fixed by repair? |');
  lines.push('|---|---|---|---|---|');
  for (const a of ranked) {
    const shipped = shippedCount(a.rule);
    // Precedence when both patterns occur across artifacts: 'fixed then discarded' wins. It is the
    // rarer and more actionable signal, and Contexts still lists every affected artifact.
    const fixedCol = shipped === 0
      ? '✅ yes'
      : fixedThenDiscarded(a.rule)
        ? '⚠️ fixed then discarded'
        : `❌ no (${shipped} still failing)`;
    lines.push(`| \`${a.rule}\` | ${a.occurrences} | ${a.introduced} | ${[...a.contexts].join(', ')} | ${fixedCol} |`);
  }
  lines.push('');
  lines.push('Rules marked "❌ no" cost repair-gate attempts AND still shipped broken — highest priority.');
  lines.push('Rules marked "⚠️ fixed then discarded" point at the GATE, not the prompt: the repair worked,');
  lines.push('but the whole-artifact strictly-better comparison threw it away — usually because the same');
  lines.push('attempt introduced a regression elsewhere (see the Introduced column). Fixing the prompt');
  lines.push('will not help these; narrowing what a repair is allowed to rewrite will.');
  lines.push('Rules with "yes" but occurrences > 1 are the best ROI for prompt fixes: the model reliably');
  lines.push('gets it wrong on attempt 1 but reliably fixes it when told — meaning a clearer instruction');
  lines.push('up front should get it right the first time, at zero extra API cost.');
  lines.push('');

  // ── Per-artifact detail ──
  lines.push('## Per-artifact detail');
  lines.push('');
  for (const report of repaired) {
    lines.push(`### ${report.label} — ${report.status} (${report.repairsUsed} attempt${report.repairsUsed === 1 ? '' : 's'})`);
    lines.push('');
    // 0 = the initial generation. When this is less than repairsUsed, every attempt above it was
    // paid for and discarded.
    lines.push(`- Shipped attempt: ${report.shippedAttempt} of ${report.repairsUsed}`);
    lines.push('');
    for (const attempt of report.attempts) {
      lines.push(`**Attempt ${attempt.attempt}**`);
      for (const issue of attempt.resolved) {
        lines.push(`- ✅ fixed: \`${issue.rule}\` — ${issue.detail}`);
      }
      for (const issue of attempt.persisted) {
        lines.push(`- ❌ still failing: \`${issue.rule}\` — ${issue.detail}`);
      }
      // Rendered inside this attempt's block, not as a flat list at the end of the artifact, so the
      // causal story reads at a glance: "attempt 1 fixed the title but broke the description".
      for (const issue of attempt.introduced) {
        lines.push(`- ⚠️ introduced: \`${issue.rule}\` — ${issue.detail}`);
      }
      lines.push('');
    }
    if (report.status === 'unresolved') {
      lines.push(`**Shipped with unresolved errors:**`);
      for (const issue of report.finalIssues.filter(i => i.severity === 'error')) {
        lines.push(`- \`${issue.rule}\` — ${issue.detail}`);
      }
      lines.push('');
    }
  }

  if (warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const issue of warnings) {
      lines.push(`- [${issue.label}] \`${issue.rule}\` — ${issue.detail}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
