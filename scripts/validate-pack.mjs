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
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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