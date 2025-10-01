
import { open } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { CarReader } from '@atcute/car/v4';
import { toCidLink, toString as stringifyCID } from '@atcute/cid';

// XXX IMPORTANT
// Note that resolvePath() returns a stream and doesn't verify.
// Maybe we should use the fact that open() reads the bytes anyway to verify the content.
export default class CarTileReader {
  #path;
  #fh;
  #meta = {};
  #cidOffsets = {};
  constructor (path) {
    this.#path = path;
  }
  get meta () {
    return this.#meta;
  }
  async open () {
    this.#fh = await open(this.#path);
    const car = CarReader.fromStream(Readable.toWeb(this.#fh.createReadStream({ autoClose: false })));
    const { data: meta } = await car.header(); // also returns headerEnd if we want to read ourselves
    delete meta.version;
    delete meta.roots;
    Object.keys(meta.resources).forEach(k => {
      meta.resources[k].src = toCidLink(meta.resources[k].src).toJSON();
    });
    this.#meta = meta;
    // This isn't efficient in that it reads the bytes and we throw them away.
    // We could replace it with a version that skips, but that'd be copying a
    // lot of work from @atcute; we can optimise later.
    for await (const entry of car) {
      const { cid, bytesStart, bytesEnd } = entry;
      this.#cidOffsets[stringifyCID(cid)] = [bytesStart, bytesEnd - 1];
    }
  }
  close () {
    this.#fh?.close();
  }
  // Use this when paths are mapped into the tile.
  resolvePath (path) {
    path = (new URL(`fake:${path}`)).pathname; // remove QS, etc.
    if (!this.#meta.resources?.[path]) return { ok: false, status: 404, statusText: 'Not found' };
    const headers = { ... this.#meta.resources[path] };
    const cid = headers.src.$link;
    delete headers.src;
    return {
      ok: true,
      status: 200,
      statusText: 'Ok',
      headers,
      createReadStream: () => this.#fh.createReadStream({ start: this.#cidOffsets[cid][0], end: this.#cidOffsets[cid][1], autoClose: false }),
    };
  }
}
