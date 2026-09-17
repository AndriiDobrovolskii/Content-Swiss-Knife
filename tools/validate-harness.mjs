#!/usr/bin/env node
/**
 * Harness consistency validator.
 *
 * AGENTS.md §8 makes docs/workflow/stage-map.yaml the only authority for stage identifiers
 * and routing, and artifact-paths.yaml the only authority for where artifacts live. Those
 * claims are worth nothing unless something checks them, because the failure mode is silent:
 * a skill referencing a stage that no longer exists, or resolving an artifact key that was
 * renamed, does not crash — it routes somewhere wrong, or writes to a path nobody reads.
 *
 * Run: `npm run validate:harness` (add --strict once every skill is authored).
 *
 * TWO CLASSES OF FINDING:
 *
 *   ERROR   — a real inconsistency in the registry. Always fatal.
 *   PENDING — a skill named by the registry that has not been authored yet. During the
 *             harness bootstrap (phases P3–P5) this is the expected state, so it is
 *             reported and counted but not fatal. `--strict` makes it fatal; wire that
 *             into the gate at P6, when every skill exists. This is a ratchet, not an
 *             escape hatch: it never hides an ERROR, only an unwritten file.
 *
 * Deliberately NOT checked: retired identifiers inside docs/workflow/ itself. stage-map.yaml
 * has to name them to retire them, and stages.md explains why they are absent. The scan
 * targets .claude/skills/ and .claude/commands/, where a stale identifier would actually
 * misroute something. history.jsonl is append-only history and is never scanned.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const WF = join(ROOT, 'docs', 'workflow');
const SKILLS_DIR = join(ROOT, '.claude', 'skills');
const COMMANDS_DIR = join(ROOT, '.claude', 'commands');

const STRICT = process.argv.includes('--strict');

const errors = [];
const pending = [];
const error = (where, msg) => errors.push({ where, msg });
const pend = (where, msg) => pending.push({ where, msg });

const STAGE_TYPES = new Set(['automated_skill', 'composite_skill', 'human_gate', 'terminal']);

/** Read + parse a YAML file, or record an error and return null. */
function loadYaml(path) {
  if (!existsSync(path)) {
    error(relative(ROOT, path), 'file does not exist');
    return null;
  }
  try {
    return parseYaml(readFileSync(path, 'utf8'));
  } catch (e) {
    error(relative(ROOT, path), `is not valid YAML: ${e.message}`);
    return null;
  }
}

/** Every file under `dir`, recursively. Missing dir = empty list, not an error. */
function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Load the two registries
// ---------------------------------------------------------------------------

const stageMap = loadYaml(join(WF, 'stage-map.yaml'));
const artifactPaths = loadYaml(join(WF, 'artifact-paths.yaml'));

if (!stageMap || !artifactPaths) {
  report();
  process.exit(1);
}

const stageOrder = stageMap.stage_order ?? [];
const stages = stageMap.stages ?? {};
const retired = stageMap.retired_identifiers ?? {};
const artifacts = artifactPaths.artifacts ?? {};

const known = new Set(stageOrder);

// ---------------------------------------------------------------------------
// 1. stage_order <-> stages agree, no duplicates
// ---------------------------------------------------------------------------

const seen = new Set();
for (const id of stageOrder) {
  if (seen.has(id)) error('stage-map.yaml', `stage_order lists "${id}" more than once`);
  seen.add(id);
  if (!stages[id]) error('stage-map.yaml', `stage_order names "${id}" but stages has no definition for it`);
}
for (const id of Object.keys(stages)) {
  if (!known.has(id)) error('stage-map.yaml', `stages defines "${id}" but stage_order does not list it`);
}

// ---------------------------------------------------------------------------
// 2. Per-stage shape + routing targets
// ---------------------------------------------------------------------------

/** Every stage id any route points at — used to prove nothing is orphaned. */
const referenced = new Set([stageOrder[0]]);
const skillsNamed = new Set();

for (const [id, def] of Object.entries(stages)) {
  const at = `stage-map.yaml:${id}`;
  if (!def || typeof def !== 'object') {
    error(at, 'stage definition is empty or not a mapping');
    continue;
  }

  if (!STAGE_TYPES.has(def.type)) {
    error(at, `type "${def.type}" is not one of: ${[...STAGE_TYPES].join(', ')}`);
  }

  const isSkillStage = def.type === 'automated_skill' || def.type === 'composite_skill';

  if (isSkillStage) {
    if (!def.skill) error(at, `type is ${def.type} but no \`skill\` is named`);
    else skillsNamed.add(def.skill);

    if (!def.next) error(at, 'no `next` stage (only a terminal stage may omit it)');
    else if (!known.has(def.next)) error(at, `next "${def.next}" is not a known stage`);
    else referenced.add(def.next);
  }

  // Composite stages may fan out to per-track sub-skills.
  for (const [track, list] of Object.entries(def.skills_by_track ?? {})) {
    if (!Array.isArray(list) || list.length === 0) {
      error(at, `skills_by_track.${track} is empty`);
      continue;
    }
    for (const s of list) skillsNamed.add(s);
  }

  if (def.type === 'human_gate') {
    for (const field of ['required_artifacts', 'approve_command', 'on_approve', 'on_reject']) {
      if (def[field] === undefined) error(at, `human_gate is missing \`${field}\``);
    }
    for (const field of ['on_approve', 'on_reject']) {
      const target = def[field];
      if (target && !known.has(target)) error(at, `${field} "${target}" is not a known stage`);
      else if (target) referenced.add(target);
    }
  }

  if (def.type === 'terminal' && def.next) {
    error(at, 'a terminal stage must not declare `next`');
  }

  for (const [key, target] of Object.entries(def.loop_back ?? {})) {
    if (!known.has(target)) error(at, `loop_back.${key} -> "${target}" is not a known stage`);
    else referenced.add(target);
  }

  if (def.optional && !def.optional_when) {
    error(at, 'optional: true requires `optional_when` stating the condition');
  }
}

// A stage nothing routes to can never be reached.
for (const id of stageOrder) {
  if (!referenced.has(id)) {
    error('stage-map.yaml', `stage "${id}" is unreachable — no next/on_approve/on_reject/loop_back points at it`);
  }
}

// ---------------------------------------------------------------------------
// 3. Artifact keys resolve
// ---------------------------------------------------------------------------

const artifactKeysUsed = new Set();

for (const [id, def] of Object.entries(stages)) {
  for (const field of ['inputs', 'outputs', 'required_artifacts']) {
    for (const key of def?.[field] ?? []) {
      artifactKeysUsed.add(key);
      if (!artifacts[key]) {
        error(`stage-map.yaml:${id}`, `${field} names artifact "${key}", absent from artifact-paths.yaml`);
      }
    }
  }
}

for (const [key, def] of Object.entries(artifacts)) {
  if (!def?.pattern) error(`artifact-paths.yaml:${key}`, 'has no `pattern`');
  if (!def?.owner) error(`artifact-paths.yaml:${key}`, 'has no `owner`');
  else if (def.owner !== 'so-orchestrator' && !skillsNamed.has(def.owner)) {
    error(`artifact-paths.yaml:${key}`, `owner "${def.owner}" is not a skill named by any stage`);
  }
  // `routed: false` marks an artifact produced outside normal stage routing (archive mode).
  if (def?.routed !== false && !artifactKeysUsed.has(key)) {
    error(`artifact-paths.yaml:${key}`, 'is never used by any stage — add `routed: false` if that is deliberate');
  }
}

// ---------------------------------------------------------------------------
// 4. Retired identifiers must not appear in skills or commands
// ---------------------------------------------------------------------------

const retiredIds = Object.keys(retired);
for (const id of retiredIds) {
  if (known.has(id)) {
    error('stage-map.yaml', `"${id}" is listed as retired but is also an active stage`);
  }
  const replacement = retired[id];
  const targets = Array.isArray(replacement) ? replacement : [replacement];
  for (const t of targets) {
    if (!known.has(t)) error('stage-map.yaml', `retired_identifiers.${id} -> "${t}" is not a known stage`);
  }
}

// Only SCREAMING_SNAKE compounds are scanned for in prose. A bare single word like `PR`,
// `DESIGN`, `TESTS` or `DONE` is ordinary English ("open the PR", "the DESIGN section") and
// flagging it produces noise that trains people to ignore the validator. A compound such as
// `API_DESIGN` or `BACKLOG_SYNC` cannot be anything but a stage identifier. The full
// retired_identifiers map is still enforced against workflow-state.yaml below, where a value
// is unambiguously a stage id and no such exemption applies.
const scannableRetired = retiredIds.filter(id => id.includes('_'));

if (scannableRetired.length > 0) {
  const pattern = new RegExp(`\\b(${scannableRetired.join('|')})\\b`);
  for (const file of [...walk(SKILLS_DIR), ...walk(COMMANDS_DIR)]) {
    if (!/\.(md|ya?ml|json)$/.test(file)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const hit = line.match(pattern);
      if (hit) error(relative(ROOT, file), `line ${i + 1} uses retired stage identifier "${hit[1]}" (now ${retired[hit[1]]})`);
    });
  }
}

// ---------------------------------------------------------------------------
// 5. Skills named by the registry exist (PENDING during bootstrap)
// ---------------------------------------------------------------------------

// Every skill the registry names, plus every skill directory that actually exists. The
// second half matters because so-orchestrator is named as an artifact `owner` and by the
// /so:* commands, never as a stage's `skill:` — without this it would never be checked.
const skillDirs = existsSync(SKILLS_DIR)
  ? readdirSync(SKILLS_DIR).filter(d => statSync(join(SKILLS_DIR, d)).isDirectory())
  : [];

for (const skill of [...new Set([...skillsNamed, ...skillDirs])].sort()) {
  const path = join(SKILLS_DIR, skill, 'SKILL.md');
  if (!existsSync(path)) {
    pend(`.claude/skills/${skill}/SKILL.md`, 'named by stage-map.yaml but not authored yet');
    continue;
  }
  const body = readFileSync(path, 'utf8');
  const nameLine = body.match(/^name:\s*(.+)$/m);
  if (!nameLine) error(`.claude/skills/${skill}/SKILL.md`, 'front matter has no `name:` field');
  else if (nameLine[1].trim() !== skill) {
    error(`.claude/skills/${skill}/SKILL.md`, `front-matter name "${nameLine[1].trim()}" does not match its directory "${skill}"`);
  }
}

// ---------------------------------------------------------------------------
// 6. State files are parseable and canonical
// ---------------------------------------------------------------------------

const activeStory = loadYaml(join(WF, 'active-story.yaml'));
const workflowState = loadYaml(join(WF, 'workflow-state.yaml'));

if (workflowState) {
  const cur = workflowState.current_stage;
  if (cur != null) {
    if (retiredIds.includes(cur)) {
      error('workflow-state.yaml', `current_stage "${cur}" is a retired identifier — report INCONSISTENT, do not translate it`);
    } else if (!known.has(cur)) {
      error('workflow-state.yaml', `current_stage "${cur}" is not a known stage`);
    }
  }
  if (activeStory && activeStory.active_story !== workflowState.story) {
    error('workflow state', `active-story.yaml active_story (${activeStory.active_story}) disagrees with workflow-state.yaml story (${workflowState.story})`);
  }
}

// history.jsonl is append-only; only check that each line is parseable JSON.
const historyPath = join(WF, 'history.jsonl');
if (existsSync(historyPath)) {
  readFileSync(historyPath, 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    try {
      JSON.parse(line);
    } catch {
      error('history.jsonl', `line ${i + 1} is not valid JSON`);
    }
  });
}

// ---------------------------------------------------------------------------

report();
process.exit(errors.length > 0 || (STRICT && pending.length > 0) ? 1 : 0);

function report() {
  const stageCount = stageOrder.length ?? 0;
  console.log(`\nharness validation — ${stageCount} stages, ${Object.keys(artifacts).length} artifacts, ${skillsNamed.size} skills named\n`);

  for (const { where, msg } of errors) console.log(`  ERROR    ${where}: ${msg}`);
  for (const { where, msg } of pending) console.log(`  PENDING  ${where}: ${msg}`);

  if (errors.length === 0 && pending.length === 0) {
    console.log('  OK — registry is internally consistent and every named skill exists.\n');
  } else if (errors.length === 0) {
    const verb = STRICT ? 'FAIL (--strict)' : 'OK';
    console.log(`\n  ${verb} — 0 errors, ${pending.length} skill(s) not yet authored.`);
    if (!STRICT) console.log('  Registry is consistent. Run with --strict once every skill exists.\n');
    else console.log('  --strict treats an unauthored skill as fatal.\n');
  } else {
    console.log(`\n  FAIL — ${errors.length} error(s), ${pending.length} pending.\n`);
  }
}
