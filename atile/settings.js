
import { homedir } from "node:os";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const settingsDir = join(homedir(), '.atile');
const settingsPath = join(settingsDir, 'settings.json');
const identifiersPath = join(settingsDir, 'identifiers.json');

async function ensureSettingsDir () {
  await mkdir(settingsDir, { recursive: true });
}

export async function saveSettings (settings) {
  await ensureSettingsDir();
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}
export async function loadSettings () {
  try {
    return JSON.parse(await readFile(settingsPath));
  }
  catch (e) {
    return {};
  }
}
export async function saveIdentifier (path, uri) {
  await ensureSettingsDir();
  const map = await loadIdentifiersStore();
  map[path] = uri;
  await writeFile(identifiersPath, JSON.stringify(map, null, 2) + '\n', 'utf8');
}
export async function getSavedIdentifier (path) {
  const map = await loadIdentifiersStore();
  return map[path];
}
async function loadIdentifiersStore () {
  try {
    return JSON.parse(await readFile(identifiersPath));
  }
  catch (e) {
    return {};
  }
}
