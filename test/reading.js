
import { deepStrictEqual, equal } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { create, CODEC_RAW, toString as stringifyCID } from '@atcute/cid';
import CarTileReader from '../car-reader.js';
import makeRel from "../lib/rel.js";
import { rickMeta } from './data.js';

const rel = makeRel(import.meta.url);
const rickTile = rel('./fixtures/rick.tile');

describe('Reading tiles from CAR', () => {
  it('reads a tile correctly', async () => {
    const ctr = new CarTileReader(rickTile);
    await ctr.open();
    deepStrictEqual(rickMeta, ctr.meta, 'metadata is read correctly');
    // 404
    const nf = ctr.resolvePath('/not/exists');
    equal(nf.ok, false, 'not found not ok');
    equal(nf.status, 404, 'not found 404');
    // root
    const idx = await readFile(rel('./fixtures/rick/index.html'), 'utf8');
    const root = ctr.resolvePath('/');
    equal(root.ok, true, 'root ok');
    equal(root.status, 200, 'root 200');
    deepStrictEqual(root.headers, { 'content-type': 'text/html' }, 'root headers');
    const stream = root.createReadStream();
    const got = await slurpString(stream);
    equal(got, idx, 'resource is correct');
    // ?
    const qs = ctr.resolvePath('/?with=a;query=string');
    equal(qs.ok, true, 'qs ok');
    equal(qs.status, 200, 'qs 200');
    deepStrictEqual(qs.headers, { 'content-type': 'text/html' }, 'qs headers');
    // image
    const img = ctr.resolvePath('/img/rick.jpg');
    equal(img.ok, true, 'img ok');
    equal(img.status, 200, 'img 200');
    deepStrictEqual(img.headers, { 'content-type': 'image/jpeg' }, 'img headers');
    const imgStream = img.createReadStream();
    const buf = await slurpBuffer(imgStream);
    const cid = await create(CODEC_RAW, buf);
    equal(stringifyCID(cid), ctr.meta.resources['/img/rick.jpg'].src.$link, 'CID matches image');
    ctr.close();
  });
});

async function slurpBuffer (stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function slurpString (stream) {
  const buf = await slurpBuffer(stream);
  return buf.toString('utf8');
}
