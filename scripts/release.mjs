#!/usr/bin/env node
// Release every workspace package that has changed since its last release.
//
// "Last release" is tracked by a per-package git tag of the form
// `${name}@${version}` (created by release-it — see .release-it.json). A package
// with no such tag is treated as never released and will be released.
//
// A package is considered changed when its own directory differs between its
// last release tag and HEAD. Changes to shared/root files do not trigger a
// release on their own.
//
// Any extra CLI args are passed through to release-it, e.g.:
//   npm run release -- patch          release all changed packages as a patch
//   npm run release -- minor --ci     non-interactive minor release
//   npm run release -- --dry-run      preview without publishing

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(root, '.release-it.json');
const releaseItBin = resolve(root, 'node_modules', '.bin', 'release-it');
const passthrough = process.argv.slice(2);

const rootPkg = readJSON(resolve(root, 'package.json'));
const dirs = rootPkg.workspaces ?? [];

let released = 0;
for (const dir of dirs) {
  const pkg = readJSON(resolve(root, dir, 'package.json'));
  if (!pkg.name || pkg.private) {
    log(`·  ${dir}: private or unnamed, skipping`);
    continue;
  }
  const tag = lastReleaseTag(pkg.name);
  const changed = tag ? dirChangedSince(tag, dir) : true;
  if (!changed) {
    log(`·  ${pkg.name}: no changes since ${tag}, skipping`);
    continue;
  }
  log(`\n▸  ${pkg.name}: releasing (${tag ? `changed since ${tag}` : 'never released'})`);
  execFileSync(releaseItBin, ['--config', configPath, ...passthrough], {
    cwd: resolve(root, dir),
    stdio: 'inherit',
  });
  released++;
}

log(released ? `\nReleased ${released} package(s).` : '\nNothing to release — every package is up to date.');

function readJSON (p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}
function log (m) {
  console.log(m);
}
function lastReleaseTag (name) {
  const out = git(['tag', '--list', `${name}@*`, '--sort=-creatordate']);
  return out.split('\n').filter(Boolean)[0] || null;
}
function dirChangedSince (tag, dir) {
  // `git diff --quiet` exits 1 (throws) when there are differences.
  try {
    git(['diff', '--quiet', tag, 'HEAD', '--', dir]);
    return false;
  }
  catch {
    return true;
  }
}
function git (args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}
