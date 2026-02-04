#!/usr/bin/env node
import { cwd, exit } from "node:process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { program } from 'commander';
import chalk from "chalk";
import {
  addCredentials,
  deleteCredentials,
  listCredentials,
  getDefaultUser,
  setDefaultUser,
  unsetDefaultUser,
  getPassword
} from "./credentials.js";
import { TilePublisher } from './tile-at.js';
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
  .description('log a handle into AT so that you can post')
  .argument('<handle>', 'your internet handle, as in robin.berjon.com')
  .argument('<appPassword>', 'an app password for that handle')
  .action(async (handle, appPassword) => {
    await addCredentials(handle, appPassword);
    await setDefaultUser(handle);
  })
;
program
  .command('logout')
  .description('log a specific handle out')
  .argument('<handle>', 'your internet handle, as in robin.berjon.com')
  .action(async (handle) => {
    await deleteCredentials(handle);
    const du = await getDefaultUser();
    if (du === handle) await unsetDefaultUser();
  })
;
program
  .command('default-user')
  .description('set the default handle to use when unspecified')
  .argument('<handle>', 'your internet handle, as in robin.berjon.com')
  .action(async (handle) => {
    const users = (await listCredentials()).map(({ account }) => account);
    if (!users.find(u => u === handle)) die(`No logged in user "${handle}", cannot default to it.`);
    await setDefaultUser(handle);
  })
;
program
  .command('list-users')
  .description('list all logged in handles you have')
  .action(async () => {
    console.log((await listCredentials()).map(({ account }) => account).sort().join('\n'))
  })
;

// Tile publishing
program
  .command('publish')
  .description('publish a tile to the Atmosphere')
  .argument('<dir>', 'path to a directory that contains a tile and its manifest')
  .option('-u, --user <handle>', 'the handle to use if not the default')
  .option('-s, --stable-id', 'save and reuse the tile identifier, updates previous version in place')
  .option('-t, --tid <tid>', 'specify the TID, will override -s')
  .action(async (dir, options) => {
    try {
      console.warn(chalk.blue(`Publishing tile from "${dir}"`));
      const tp = new TilePublisher({ reuseIdentifiers: options.stableId, tid: options.tid });
      const identifier = options.user || await getDefaultUser();
      const password = await getPassword(identifier);
      await tp.login(identifier, password);
      console.warn(chalk.blue(`• Logged in`));
      dir = resolve(cwd(), dir);
      await tp.loadFromDirectory(dir);
      console.warn(chalk.blue(`• Loaded content from "${dir}"`));
      tp.addEventListener('warn', (ev) => console.warn(chalk.yellow.bold(`WARNING: ${ev.message}.`)));
      tp.addEventListener('start-upload', (ev) => console.warn(chalk.gray(`Uploading ${ev.resource}.`)));
      tp.addEventListener('fail-upload', (ev) => console.warn(chalk.red(`UPLOAD FAILED for ${ev.resource}.`)));
      tp.addEventListener('done-upload', (ev) => console.warn(chalk.green.bold(`${ev.resource} uploaded OK.`)));
      const { uri, success } = await tp.publish();
      if (success) {
        console.warn(chalk.green.bold(`Tile published: ${uri}.`));
      }
      else {
        console.warn(chalk.red(`FAILED to publish tile.`));
        exit(1);
      }
    }
    catch (err) {
      console.error(chalk.red(err, err.stack));
      exit(1);
    }
  })
;
program
  .command('delete')
  .description('delete a tile from the Atmosphere')
  .argument('<dirOrATURL>', 'path to a directory that contains a tile or at: URL of one')
  .option('-u, --user <handle>', 'the handle to use if not the default')
  .action(async (dirOrURL, options) => {
    try {
      console.warn(chalk.blue(`Deleting tile from "${dirOrURL}"`));
      const tp = new TilePublisher();
      const identifier = options.user || await getDefaultUser();
      const password = await getPassword(identifier);
      await tp.login(identifier, password);
      console.warn(chalk.blue(`• Logged in`));
      const { success, uri } = await tp.delete(dirOrURL);
      tp.addEventListener('warn', (ev) => console.warn(chalk.yellow.bold(`WARNING: ${ev.message}.`)));
      if (success) {
        console.warn(chalk.green.bold(`Tile deleted: ${uri}.`));
      }
      else {
        console.warn(chalk.red(`FAILED to delete tile.`));
        exit(1);
      }
    }
    catch (err) {
      console.error(chalk.red(err, err.stack));
      exit(1);
    }
  })
;

program.parse();

function die (str) {
  console.error(`Error: ${str}`);
  exit(1);
}
