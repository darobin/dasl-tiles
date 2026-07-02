
import { deepStrictEqual, equal, ok, rejects, throws } from 'node:assert';
import { join } from 'node:path';
import { mkdir, rm, readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { toString as stringifyCID, toCidLink } from '@atcute/cid';
import { fromStream } from '@atcute/car';
import TileWriter from "../dist/index.js";
import CarTileReader from '@dasl/tile-car-reader';
import { rickMeta, rickMetaRaw } from './data.js';

const rel = (pth) => fileURLToPath(new URL(pth, import.meta.url));
const rickDir = rel('./fixtures/rick');
const tmpDir = rel('./fixtures/tmp');

before(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir);
});

function basicWriter () {
  const tw = new TileWriter({
    name: `First Tile`,
    description: `This is a very basic tile with no interactivity, but it won't let you down.`,
  });
  tw.addResource('/', { 'content-type': 'text/html' }, { path: join(rickDir, 'index.html') });
  tw.addResource('/img/rick.jpg', { 'content-type': 'image/jpeg' }, { path: join(rickDir, '/img/rick.jpg') });
  return tw;
}

async function slurp (stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (c) => chunks.push(Buffer.from(c)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

describe('Writing tiles', () => {
  it('writes a tile with correct metadata and CIDs', async () => {
    const rickTile = join(tmpDir, 'basic.tile');
    await basicWriter().write(rickTile);

    const car = fromStream(Readable.toWeb(createReadStream(rickTile)));
    const { data: meta } = await car.header();
    Object.keys(meta.resources).forEach(k => {
      meta.resources[k].src = toCidLink(meta.resources[k].src).toJSON();
    });
    deepStrictEqual(rickMetaRaw, meta, 'metadata is written correctly');
    const cids = [
      'bafkreidcmg66nzp5ldng52laqfz23h2kf6h3ftp2rv2pwnuprih2yodz4m',
      'bafkreifn5yxi7nkftsn46b6x26grda57ict7md2xuvfbsgkiahe2e7vnq4'
    ];
    for await (const entry of car) {
      equal(cids.shift(), stringifyCID(entry.cid), 'CID is correct');
    }
    equal(cids.length, 0, 'all expected CIDs were seen');
  });

  it('round-trips: what we write, the CAR reader reads back identically', async () => {
    const rickTile = join(tmpDir, 'roundtrip.tile');
    await basicWriter().write(rickTile);

    const ctr = new CarTileReader(rickTile);
    await ctr.open();
    deepStrictEqual(ctr.meta, rickMeta, 'reader sees the same metadata (version/roots stripped)');

    const root = ctr.resolvePath('/');
    equal(root.ok, true);
    const gotHtml = await slurp(root.createReadStream());
    const wantHtml = await readFile(join(rickDir, 'index.html'));
    ok(gotHtml.equals(wantHtml), 'root bytes round-trip exactly');

    const img = ctr.resolvePath('/img/rick.jpg');
    const gotImg = await slurp(img.createReadStream());
    const wantImg = await readFile(join(rickDir, 'img/rick.jpg'));
    ok(gotImg.equals(wantImg), 'image bytes round-trip exactly');
    ctr.close();
  });

  it('deduplicates identical content into a single block', async () => {
    const out = join(tmpDir, 'dedup.tile');
    const tw = new TileWriter({ name: 'Dedup' });
    tw.addResource('/', { 'content-type': 'text/html' }, { path: join(rickDir, 'index.html') });
    tw.addResource('/copy.html', { 'content-type': 'text/html' }, { path: join(rickDir, 'index.html') });
    await tw.write(out);

    const car = fromStream(Readable.toWeb(createReadStream(out)));
    await car.header();
    let blocks = 0;
    for await (const _ of car) blocks++;
    equal(blocks, 1, 'identical resources share one block');

    // both paths still resolve to the same content
    const ctr = new CarTileReader(out);
    await ctr.open();
    ok(ctr.resolvePath('/').ok);
    ok(ctr.resolvePath('/copy.html').ok);
    ctr.close();
  });

  it('strips unsupported headers but keeps content-type', async () => {
    const out = join(tmpDir, 'headers.tile');
    const tw = new TileWriter({ name: 'Headers' });
    tw.addResource('/', { 'content-type': 'text/html', 'x-secret': 'leak' }, { path: join(rickDir, 'index.html') });
    await tw.write(out);

    const ctr = new CarTileReader(out);
    await ctr.open();
    const res = ctr.resolvePath('/');
    equal(res.headers['content-type'], 'text/html');
    ok(!('x-secret' in res.headers), 'unsupported header is not persisted');
    ctr.close();
  });

  it('normalizes resource paths by dropping query strings', async () => {
    const out = join(tmpDir, 'paths.tile');
    const tw = new TileWriter({ name: 'Paths' });
    tw.addResource('/page?foo=bar', { 'content-type': 'text/html' }, { path: join(rickDir, 'index.html') });
    await tw.write(out);

    const ctr = new CarTileReader(out);
    await ctr.open();
    ok(ctr.meta.resources['/page'], 'stored under the normalized path');
    ok(!ctr.meta.resources['/page?foo=bar'], 'query string is not part of the key');
    ctr.close();
  });

  it('refuses single-resource MASL metadata (one that carries its own src)', () => {
    throws(() => new TileWriter({ src: { $link: 'bafyfake' }, resources: {} }), /single-resource metadata/);
  });
});
