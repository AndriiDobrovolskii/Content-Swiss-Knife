import { PromptPayload } from '../prompt-core/payload';
import { ValidationIssue } from './output-validator';
import { REPAIR_STRATEGIES, RepairTier, getAtPath, resolveLadder, setAtPath } from './repair-strategy';

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
   * Which attempt produced the shipped artifact. 0 = the initial generation (no repair applied).
   *
   * Because ties keep the earliest attempt, this is NOT always equal to repairsUsed — a repair can
   * be spent, recorded in attempts[], and then discarded. Without this field the report cannot
   * distinguish "repair worked" from "repair worked and was thrown away".
   */
  shippedAttempt: number;
}

export async function runRepairGate<T>(opts: RepairGateOptions<T>): Promise<RepairGateResult<T>> {
  let artifact = await opts.produce(opts.basePayload);
  let issues = opts.validate(artifact);
  let repairsUsed = 0;
  const attempts: RepairAttemptRecord[] = [];

  const errCount = (is: ValidationIssue[]) => is.filter(i => i.severity === 'error').length;
  const issueKey = (i: ValidationIssue) => `${i.rule}::${i.context}`;

  /**
   * How many rungs of its own ladder each issue has already burned, keyed by issueKey.
   *
   * This is what makes dispatch PER-ISSUE rather than a global tier sweep. meta-title-length's
   * ladder is ['field-scoped', 'deterministic'] — tier 1 first, because its wording carries SEO
   * value and truncation destroys it. A global "apply all tier-0 fixes, then all tier-1" pass would
   * truncate before the model ever saw the title, making tier 1 unreachable and the ladder
   * decorative. Cursors persist ACROSS iterations so a failed rung escalates rather than repeating.
   *
   * issueKey is rule::context, which already distinguishes the same rule failing on two locales
   * ("SEO meta (en-GB)" vs "SEO meta (pl-PL)"). No second identity function.
   */
  const ladderCursor = new Map<string, number>();
  let cursorMoves = 0;
  const activeTier = (issue: ValidationIssue): RepairTier => {
    const ladder = resolveLadder(issue);
    return ladder[Math.min(ladderCursor.get(issueKey(issue)) ?? 0, ladder.length - 1)];
  };
  const advance = (issue: ValidationIssue) => {
    ladderCursor.set(issueKey(issue), (ladderCursor.get(issueKey(issue)) ?? 0) + 1);
    cursorMoves++;
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
    }
    return next;
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
    const errs = issues.filter(i => i.severity === 'error');
    if (errs.length === 0) break;

    // Snapshot each issue's active tier ONCE per pass. Reading activeTier() inside applyTier would
    // let a single pass burn two rungs of the same ladder: the deterministic phase runs first in
    // code order, so any ladder beginning with 'deterministic' would advance the cursor and then
    // immediately match the field-scoped phase too. One rung per pass has to be structural — that is
    // what makes "attempt, fail, escalate next iteration" mean anything.
    const plan = errs.map(issue => ({ issue, tier: activeTier(issue) }));

    // Nothing left that a cheap tier can address — stop and let the full-regen loop decide.
    if (!plan.some(p => p.tier === 'deterministic' || p.tier === 'field-scoped')) break;

    const before = artifact;
    const movesBefore = cursorMoves;
    artifact = await applyTier('deterministic', artifact, plan);
    artifact = await applyTier('field-scoped', artifact, plan);

    // Advancing a cursor IS progress even when the artifact did not change — the next pass will
    // reach a different rung. Breaking on "no change" alone would strand meta-title-length on its
    // field-scoped rung whenever no repairField executor is supplied, and its deterministic
    // terminator would never run.
    if (artifact === before && cursorMoves === movesBefore) break;
    if (artifact === before) continue; // cursors moved but nothing changed — no need to re-validate

    issues = opts.validate(artifact);
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
    issues = opts.validate(artifact);
    repairsUsed++;

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

  return {
    artifact: best.artifact,
    finalIssues: best.issues,
    repairsUsed,
    attempts,
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
}

export function toArtifactReport(label: string, result: RepairGateResult<unknown>): RepairArtifactReport {
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
export function formatRepairReportMarkdown(reports: RepairArtifactReport[], meta: RepairReportMeta): string {
  const lines: string[] = [];
  const repaired = reports.filter(r => r.status !== 'clean');
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
  lines.push('');

  if (repaired.length === 0) {
    if (warnings.length === 0) {
      lines.push('No repairs were needed — every artifact passed validation on the first generation.');
      return lines.join('\n');
    }
    lines.push('No repairs were needed — every artifact passed validation on the first generation.');
    lines.push('');
    lines.push('## Warnings (no repairs needed)');
    lines.push('');
    for (const issue of warnings) {
      lines.push(`- [${issue.label}] \`${issue.rule}\` — ${issue.detail}`);
    }
    return lines.join('\n');
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
