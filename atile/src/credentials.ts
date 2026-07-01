
import keytar from "keytar";
import { loadSettings, saveSettings } from "./settings.js";

const SERVICE = 'com.berjon.atile';

export async function addCredentials (handle: string, appPassword: string) {
  return keytar.setPassword(SERVICE, handle, appPassword);
}
export async function deleteCredentials (handle: string) {
  return keytar.deletePassword(SERVICE, handle);
}
export async function getPassword (handle: string): Promise<string | false> {
  const appPassword = await keytar.getPassword(SERVICE, handle);
  return appPassword || false;
}
export async function listCredentials () {
  return keytar.findCredentials(SERVICE);
}
export async function unsetDefaultUser () {
  await setDefaultUser(undefined);
}
export async function setDefaultUser (handle: string | undefined) {
  const settings = await loadSettings();
  settings.defaultUser = handle;
  await saveSettings(settings);
}
export async function getDefaultUser (): Promise<string | undefined> {
  const settings = await loadSettings();
  return settings.defaultUser;
}
