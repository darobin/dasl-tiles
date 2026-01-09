
import { homedir } from "node:os";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const settingsDir = join(homedir(), '.atile');
const settingsPath = join(settingsDir, 'settings.json');

export async function saveSettings (settings) {
  await mkdir(settingsDir, { recursive: true });
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
