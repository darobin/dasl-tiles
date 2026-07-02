
import { equal, ok, rejects, throws, match } from 'node:assert';
import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { TilePublisher } from '../dist/tile-at.js';
import CarTileReader from '@dasl/tile-car-reader';

const rel = (p) => fileURLToPath(new URL(p, import.meta.url));
const rickDir = rel('./fixtures/rick');
const tmpDir = rel('./fixtures/tmp');

before(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });
});

describe('atile – bundling', () => {
  it('bundles a directory into a CAR tile the reader can read back', async () => {
    const out = join(tmpDir, 'rick.tile');
    const tp = new TilePublisher();
    await tp.loadFromDirectory(rickDir);
    equal(await tp.bundle(out), true);

    const ctr = new CarTileReader(out);
    await ctr.open();
    ok(ctr.meta.resources['/'], 'index.html is mapped to /');
    ok(ctr.meta.resources['/img/rick.jpg'], 'nested resource is present');
    match(ctr.resolvePath('/').headers['content-type'], /^text\/html/);
    equal(ctr.resolvePath('/img/rick.jpg').headers['content-type'], 'image/jpeg');
    equal(ctr.resolvePath('/manifest.json').ok, false, 'manifest.json is not bundled as a resource');
    ctr.close();
  });

  it('refuses to load a directory twice', async () => {
    const tp = new TilePublisher();
    await tp.loadFromDirectory(rickDir);
    await rejects(() => tp.loadFromDirectory(rickDir), /already loaded/);
  });
});

describe('atile – validation', () => {
  it('refuses to validate a tile with no name', () => {
    const tp = new TilePublisher();
    throws(() => tp.validate(), /without name/);
  });
});
