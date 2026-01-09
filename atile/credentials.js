
import keytar from "keytar";
import { loadSettings, saveSettings } from "./settings.js";

const SERVICE = 'com.berjon.atile';

export async function addCredentials (handle, appPassword) {
  return keytar.setPassword(SERVICE, handle, appPassword);
}
export async function deleteCredentials (handle) {
  return keytar.deletePassword(SERVICE, handle);
}
export async function getPassword (handle) {
  const appPassword = await keytar.getPassword(SERVICE, handle);
  return appPassword || false;
}
export async function listCredentials () {
  return keytar.findCredentials(SERVICE);
}
export async function unsetDefaultUser () {
  await setDefaultUser(undefined);
}
export async function setDefaultUser (handle) {
  const settings = await loadSettings();
  settings.defaultUser = handle;
  await saveSettings(settings);
}
export async function getDefaultUser () {
  const settings = await loadSettings();
  return settings.defaultUser;
}
