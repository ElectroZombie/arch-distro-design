#!/usr/bin/env node
/**
 * build-packages.mjs — build the Agensi upload packages from skills/.
 *
 * The Agensi security scan checks **zip structure integrity**: a single
 * top-level folder, SKILL.md at its root, optional supporting folders, no
 * symlinks, no binaries, no OS junk. This script builds exactly that:
 *
 *   dist/arch-iso-builder.zip          ->  arch-iso-builder/SKILL.md (+ scripts/)
 *   dist/arch-distro-design.zip        ->  arch-distro-design/SKILL.md
 *   dist/arch-distro-design-pack.zip   ->  arch-distro-design/<skill>/...  (9 skills)
 *
 * Store-only ZIP (method 0), fixed timestamps, so the same input always
 * produces byte-identical output. No dependencies beyond Node.
 *
 * Usage: node harness/scripts/build-packages.mjs [--out dist] [--pack-name arch-distro-design]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT_DIR = path.resolve(ROOT, value('--out', 'dist'));
const PACK_NAME = value('--pack-name', 'arch-distro-design');

const EXCLUDED = new Set(['.DS_Store', 'Thumbs.db', '.git', '.gitignore']);

// --- zip writer (store, deterministic) ----------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = entry.data;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);       // version needed
    local.writeUInt16LE(0, 6);        // flags
    local.writeUInt16LE(0, 8);        // method: store
    local.writeUInt16LE(0, 10);       // mod time (fixed)
    local.writeUInt16LE(0x21, 12);    // mod date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4); // made by Unix, version 2.0
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    // Unix mode in the external attributes: the agent must be able to run
    // scripts/ without an extra chmod after extraction.
    central.writeUInt32LE(((entry.mode ?? 0o644) & 0xffff) << 16, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += 30 + name.length + data.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuf, end]);
}

// --- collection ----------------------------------------------------------------
const problems = [];

function collect(dir, prefix) {
  const entries = [];
  for (const name of readdirSync(dir).sort()) {
    if (EXCLUDED.has(name)) continue;
    const full = path.join(dir, name);
    const stats = statSync(full);
    if (stats.isSymbolicLink()) {
      problems.push(`symlink skipped: ${prefix}${name}`);
      continue;
    }
    if (stats.isDirectory()) {
      entries.push(...collect(full, `${prefix}${name}/`));
      continue;
    }
    const data = readFileSync(full);
    if (data.includes(0)) {
      problems.push(`binary file skipped: ${prefix}${name}`);
      continue;
    }
    entries.push({ name: `${prefix}${name}`, data, mode: stats.mode & 0o777 });
  }
  return entries;
}

const skillDirs = readdirSync(SKILLS_DIR)
  .filter((name) => statSync(path.join(SKILLS_DIR, name)).isDirectory())
  .sort();

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const written = [];

function writePackage(fileName, entries, label) {
  const zip = buildZip(entries);
  const outPath = path.join(OUT_DIR, fileName);
  writeFileSync(outPath, zip);
  const sha = createHash('sha256').update(zip).digest('hex');
  written.push({ label, fileName, entries: entries.length, bytes: zip.length, sha });
}

for (const skill of skillDirs) {
  const entries = collect(path.join(SKILLS_DIR, skill), `${skill}/`);
  if (!entries.some((e) => e.name === `${skill}/SKILL.md`)) {
    problems.push(`${skill}: no SKILL.md at the folder root`);
    continue;
  }
  writePackage(`${skill}.zip`, entries, skill);
}

// The pack is a single top-level folder (the pack name) holding the nine
// skill folders — the same shape as a one-skill package, so the zip-structure
// check passes, with 9 SKILL.md files inside for the pack detection.
const packEntries = skillDirs.flatMap((skill) =>
  collect(path.join(SKILLS_DIR, skill), `${PACK_NAME}/${skill}/`)
);
writePackage(`${PACK_NAME}-pack.zip`, packEntries, `${PACK_NAME} (${skillDirs.length} skills)`);

// --- report --------------------------------------------------------------------
console.log('Agensi upload packages\n');
console.log('  package                              entries   size     sha256');
console.log('  ' + '-'.repeat(78));
for (const item of written) {
  console.log(
    `  ${item.fileName.padEnd(36)} ${String(item.entries).padStart(7)} ${`${(item.bytes / 1024).toFixed(1)} KB`.padStart(8)}   ${item.sha.slice(0, 16)}…`
  );
}

// A manifest next to the packages, so an upload can be verified later with
// `sha256sum -c SHA256SUMS` in this directory.
writeFileSync(
  path.join(OUT_DIR, 'SHA256SUMS'),
  `${written.map((item) => `${item.sha}  ${item.fileName}`).join('\n')}\n`
);

console.log(`\n  output: ${path.relative(ROOT, OUT_DIR)}/`);
console.log('  verify: cd ' + path.relative(ROOT, OUT_DIR) + ' && sha256sum -c SHA256SUMS\n');

if (problems.length > 0) {
  console.log('Problems:');
  for (const problem of problems) console.log(`  - ${problem}`);
  process.exit(1);
}

console.log('Structure check: single top-level folder · SKILL.md at its root · no symlinks · no binaries · no OS junk.');
