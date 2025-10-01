
import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { toString as stringifyCID, toCidLink } from '@atcute/cid';
import { CarReader } from '@atcute/car/v4';
import TileWriter from "../writer.js";
import makeRel from "../lib/rel.js";
import { deepStrictEqual, equal } from 'node:assert';

const rel = makeRel(import.meta.url);
const rickDir = rel('./fixtures/rick');
const tmpDir = rel('./fixtures/tmp');
const rickTile = join(tmpDir, 'rick.tile');

before(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir);
});
describe('Writing tiles', () => {
  it('writes a tile correctly', async () => {
    const tw = new TileWriter({
      name: `First Tile`,
      description: `This is a very basic tile with no interactivity, but it won't let you down.`,
    });
    tw.addResource('/', { 'content-type': 'text/html' }, { path: join(rickDir, 'index.html') });
    tw.addResource('/img/rick.jpg', { 'content-type': 'image/jpeg' }, { path: join(rickDir, '/img/rick.jpg') });
    await tw.write(rickTile);

    const rs = createReadStream(rickTile);
    const car = CarReader.fromStream(Readable.toWeb(rs));
    const { data: meta } = await car.header();
    Object.keys(meta.resources).forEach(k => {
      meta.resources[k].src = toCidLink(meta.resources[k].src).toJSON();
    });
    deepStrictEqual(
      {
        name: "First Tile",
        roots: [],
        version: 1,
        resources: {
          "/": {
            src: {
              $link: "bafkreidcmg66nzp5ldng52laqfz23h2kf6h3ftp2rv2pwnuprih2yodz4m"
            },
            "content-type": "text/html"
          },
          "/img/rick.jpg": {
            src: {
              $link: "bafkreifn5yxi7nkftsn46b6x26grda57ict7md2xuvfbsgkiahe2e7vnq4"
            },
            "content-type": "image/jpeg"
          }
        },
        description: "This is a very basic tile with no interactivity, but it won't let you down."
      },
      meta,
      'metadata is written correctly'
    );
    const cids = [
      'bafkreidcmg66nzp5ldng52laqfz23h2kf6h3ftp2rv2pwnuprih2yodz4m',
      'bafkreifn5yxi7nkftsn46b6x26grda57ict7md2xuvfbsgkiahe2e7vnq4'
    ];
    for await (const entry of car) {
      equal(cids.shift(), stringifyCID(entry.cid), 'CID is correct');
    }
  });
});
