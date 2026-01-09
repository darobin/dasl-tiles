#!/usr/bin/env node
import { exit } from "node:process";
import { readFile } from "node:fs/promises";
import { program } from 'commander';
import {
  addCredentials,
  deleteCredentials,
  listCredentials,
  getDefaultUser,
  setDefaultUser,
  unsetDefaultUser
} from "../lib/credentials.js";
import makeRel from '../lib/rel.js';

const rel = makeRel(import.meta.url);
const { version } = JSON.parse(await readFile(rel('../package.json')));

program
  .name('atile')
  .description('Manipulating tiles on the AT protocol')
  .version(version)
;

// Credentials
program
  .command('login')
  .argument('<handle>', 'your internet handle, as in robin.berjon.com')
  .argument('<appPassword>', 'an app password for that handle')
  .action(async (handle, appPassword) => {
    await addCredentials(handle, appPassword);
    await setDefaultUser(handle);
  })
;
program
  .command('logout')
  .argument('<handle>', 'your internet handle, as in robin.berjon.com')
  .action(async (handle) => {
    await deleteCredentials(handle);
    const du = await getDefaultUser();
    if (du === handle) await unsetDefaultUser();
  })
;
program
  .command('default-user')
  .argument('<handle>', 'your internet handle, as in robin.berjon.com')
  .action(async (handle) => {
    const users = (await listCredentials()).map(({ account }) => account);
    if (!users.find(u => u === handle)) die(`No logged in user "${handle}", cannot default to it.`);
    await setDefaultUser(handle);
  })
;
program
  .command('list-users')
  .action(async () => {
    console.log((await listCredentials()).map(({ account }) => account).sort().join('\n'))
  })
;

// XXX Options others can use
//  -- user
//   .option('--user <handle>', 'the handle to use')

// XXX What this does
// - atile publish path/to/dir
//  - uses manifest.json
//  - automatically finds all resources
//  - if resources has that file, just update the CID
//  - index to /
//  - media type
//  - can save a .atile.json that has the handle and tid
//  - use an ing.dasl.tile lexicon
//  - register lexicon
// - atile update path/to/dir
//  - uses .atile.json to update, can be given otherwise
// - atile delete path/to/dir
//  - same

program.parse();

function die (str) {
  console.error(`Error: ${str}`);
  exit(1);
}
