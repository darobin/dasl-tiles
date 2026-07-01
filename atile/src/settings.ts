
import { homedir } from "node:os";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface Settings {
  defaultUser?: string;
}

const settingsDir = join(homedir(), '.atile');
const settingsPath = join(settingsDir, 'settings.json');
const identifiersPath = join(settingsDir, 'identifiers.json');

async function ensureSettingsDir () {
  await mkdir(settingsDir, { recursive: true });
}

export async function saveSettings (settings: Settings) {
  await ensureSettingsDir();
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}
export async function loadSettings (): Promise<Settings> {
  try {
    return JSON.parse(await readFile(settingsPath, 'utf8'));
  }
  catch (e) {
    return {};
  }
}
export async function saveIdentifier (path: string, uri: string) {
  await ensureSettingsDir();
  const map = await loadIdentifiersStore();
  map[path] = uri;
  await writeFile(identifiersPath, JSON.stringify(map, null, 2) + '\n', 'utf8');
}
export async function getSavedIdentifier (path: string): Promise<string | undefined> {
  const map = await loadIdentifiersStore();
  return map[path];
}
async function loadIdentifiersStore (): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(identifiersPath, 'utf8'));
  }
  catch (e) {
    return {};
  }
}
