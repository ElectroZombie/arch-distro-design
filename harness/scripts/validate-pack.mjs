#!/usr/bin/env node
/**
 * validate-pack.mjs — structural verification for the arch-distro-design skill pack.
 *
 * This is a documentation/skill repository, so "tests" are structural checks:
 * frontmatter validity, name/directory agreement, skills.sh.json consistency,
 * English-only content, and README coverage. No external dependencies.
 *
 * Exit code 0 = all checks passed, 1 = at least one failure.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// The pack to validate. `--target DIR` wins; otherwise the current directory.
const argv = process.argv.slice(2);
const targetIndex = argv.findIndex((arg) => arg === '--target' || arg.startsWith('--target='));
const ROOT = (() => {
  if (targetIndex === -1) return process.cwd();
  const raw = argv[targetIndex];
  if (raw.startsWith('--target=')) return path.resolve(raw.slice('--target='.length));
  return path.resolve(argv[targetIndex + 1] || process.cwd());
})();

const SKILLS_DIR = path.join(ROOT, 'skills');
const MANIFEST = path.join(ROOT, 'skills.sh.json');
const README = path.join(ROOT, 'README.md');

const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (condition) {
    console.log(`PASS ${message}`);
  } else {
    console.log(`FAIL ${message}`);
    failures.push(message);
  }
}

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

/** Extract a simple `key: value` from YAML frontmatter. */
function frontmatterValue(block, key) {
  const match = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { ok: false, reason: 'missing opening ---' };
  const rest = content.slice(3);
  const end = rest.search(/\r?\n---\s*(\r?\n|$)/);
  if (end === -1) return { ok: false, reason: 'missing closing ---' };
  const block = rest.slice(0, end);
  return {
    ok: true,
    name: frontmatterValue(block, 'name'),
    description: frontmatterValue(block, 'description')
  };
}

console.log(`Validating skill pack at ${ROOT}\n`);

// --- Manifest ------------------------------------------------ ---------------------------------------------------------------
let declared = [];
if (!existsSync(MANIFEST)) {
  check(false, 'skills.sh.json exists');
} else {
  check(true, 'skills.sh.json exists');
  try {
    const manifest = JSON.parse(read(MANIFEST));
    const groupings = Array.isArray(manifest.groupings) ? manifest.groupings : [];
    declared = groupings.flatMap((group) => (Array.isArray(group.skills) ? group.skills : []));
    check(groupings.length > 0, 'skills.sh.json defines at least one grouping');
    check(new Set(declared).size === declared.length, 'skills.sh.json has no duplicate skill entries');
  } catch (error) {
    check(false, `skills.sh.json is valid JSON (${error.message})`);
  }
}

// --- Skill directories --------------------------------------------------------
const skillDirs = existsSync(SKILLS_DIR)
  ? readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

check(skillDirs.length > 0, 'at least one skill directory exists');

const present = new Set();
for (const dir of skillDirs) {
  const skillFile = path.join(SKILLS_DIR, dir, 'SKILL.md');
  if (!existsSync(skillFile)) {
    check(false, `skills/${dir}/SKILL.md exists`);
    continue;
  }
  present.add(dir);
  check(true, `skills/${dir}/SKILL.md exists`);

  const content = read(skillFile);
  const fm = parseFrontmatter(content);
  check(fm.ok, `skills/${dir}/SKILL.md has valid YAML frontmatter${fm.ok ? '' : ` (${fm.reason})`}`);
  if (fm.ok) {
    check(Boolean(fm.name), `skills/${dir}/SKILL.md declares a name`);
    check(Boolean(fm.description), `skills/${dir}/SKILL.md declares a description`);
    check(fm.name === dir, `skills/${dir}/SKILL.md name matches its directory`);
  }
  check(/^#\s+\S/m.test(content), `skills/${dir}/SKILL.md has a level-1 heading`);
  check(!/[áéíóúñ¿¡ÁÉÍÓÚÑ]/.test(content), `skills/${dir}/SKILL.md contains no Spanish accents`);
}

// --- Skill harness contract ----------------------------------------------------
// Every skill must expose the same five-subsystem contract so an agent can
// enter, scope, verify, close and resume it the same way everywhere.
const REQUIRED_SECTIONS = [
  'Startup Workflow',
  'Scope',
  'Verification',
  'Definition of Done',
  'State & Evidence',
  'Handoff'
];

function sectionIndex(content, title) {
  const lines = content.split(/\r?\n/);
  return lines.findIndex((line) => line.trim() === `## ${title}`);
}

for (const dir of skillDirs) {
  const skillFile = path.join(SKILLS_DIR, dir, 'SKILL.md');
  if (!existsSync(skillFile)) continue;
  const content = read(skillFile);

  const indexes = REQUIRED_SECTIONS.map((title) => [title, sectionIndex(content, title)]);
  for (const [title, index] of indexes) {
    check(index !== -1, `skills/${dir}/SKILL.md has a "## ${title}" section`);
  }

  const present = indexes.filter(([, index]) => index !== -1);
  const ordered = present.every(([, index], i) => i === 0 || index > present[i - 1][1]);
  check(ordered, `skills/${dir}/SKILL.md keeps the contract sections in order`);

  // The Verification section must ship a runnable, fail-fast script.
  const verificationAt = sectionIndex(content, 'Verification');
  if (verificationAt !== -1) {
    const body = content.split(/\r?\n/).slice(verificationAt).join('\n');
    check(/```bash/.test(body), `skills/${dir}/SKILL.md "Verification" contains a bash block`);
    check(/set -euo pipefail/.test(body), `skills/${dir}/SKILL.md "Verification" fails fast`);
    check(/echo "✅/.test(body), `skills/${dir}/SKILL.md "Verification" prints a success marker`);
  }

  // The Scope section must state both sides of the boundary.
  const scopeAt = sectionIndex(content, 'Scope');
  if (scopeAt !== -1) {
    const body = content.split(/\r?\n/).slice(scopeAt).join('\n');
    check(/\*\*In scope:\*\*/.test(body), `skills/${dir}/SKILL.md "Scope" declares what is in scope`);
    check(/\*\*Out of scope:\*\*/.test(body), `skills/${dir}/SKILL.md "Scope" declares what is out of scope`);
  }

  // The Definition of Done must be a real checklist.
  const doneAt = sectionIndex(content, 'Definition of Done');
  if (doneAt !== -1) {
    const body = content.split(/\r?\n/).slice(doneAt).join('\n');
    check(/- \[ \]/.test(body), `skills/${dir}/SKILL.md "Definition of Done" is a checklist`);
  }
}

// --- Cross-skill and asset references -----------------------------------------
// A skill that points at a sibling or at an asset that does not exist is an
// integration break: the agent follows the reference and finds nothing.
const NOT_SKILLS = new Set([
  'arch-chroot',            // the arch-install-scripts command
  'arch-install-scripts',   // an Arch package
  'arch-profile',           // a directory under builder/
  'arch-repo'               // the frozen repo directory
]);

// Collect every asset that ships in the pack, keyed as `assets/<path>`.
const packAssets = new Set();
for (const dir of skillDirs) {
  const assetsDir = path.join(SKILLS_DIR, dir, 'assets');
  if (!existsSync(assetsDir)) continue;
  const walk = (current, prefix) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(current, entry.name), rel);
      else if (entry.isFile()) packAssets.add(`assets/${rel}`);
    }
  };
  walk(assetsDir, '');
}

for (const dir of skillDirs) {
  const skillFile = path.join(SKILLS_DIR, dir, 'SKILL.md');
  if (!existsSync(skillFile)) continue;
  const content = read(skillFile);

  const skillRefs = new Set(content.match(/arch-[a-z][a-z0-9-]*/g) || []);
  for (const ref of skillRefs) {
    if (NOT_SKILLS.has(ref)) continue;
    check(existsSync(path.join(SKILLS_DIR, ref)), `skills/${dir} references an existing skill: ${ref}`);
  }

  const assetRefs = new Set(content.match(/assets\/[A-Za-z0-9._/-]+/g) || []);
  for (const ref of assetRefs) {
    const clean = ref.replace(/[.,)]+$/, '');
    check(packAssets.has(clean), `skills/${dir} references an asset that ships in the pack: ${clean}`);
  }
}

// Every asset that ships must be reachable from some skill.
for (const asset of packAssets) {
  const owner = asset.split('/')[1];
  const referenced = skillDirs.some((dir) => {
    const file = path.join(SKILLS_DIR, dir, 'SKILL.md');
    return existsSync(file) && read(file).includes(asset);
  });
  check(referenced, `asset ${asset} is referenced by a skill (owner: ${owner})`);
}

// --- Manifest <-> disk consistency -------------------------------------------
for (const name of declared) {
  check(present.has(name), `skills.sh.json entry "${name}" has a matching SKILL.md`);
}
for (const dir of skillDirs) {
  check(declared.includes(dir), `skills/${dir} is registered in skills.sh.json`);
}

// --- README coverage ----------------------------------------------------------
if (!existsSync(README)) {
  check(false, 'README.md exists');
} else {
  check(true, 'README.md exists');
  const readme = read(README);
  for (const name of declared) {
    check(readme.includes(name), `README.md documents "${name}"`);
  }
}

// --- Summary ------------------------------------------------------------------
console.log('');
if (failures.length > 0) {
  console.error(`FAILED ${failures.length}/${checks} checks:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`OK — all ${checks} checks passed.`);