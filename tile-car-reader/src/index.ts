
import { open } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import type { ReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { fromStream } from '@atcute/car';
import { toCidLink, toString as stringifyCID } from '@atcute/cid';
import type { StoredMasl, MaslHeaders, CidLink } from '@dasl/tile-lexicon';

/** A negative path resolution (e.g. the path is not in the tile). */
export interface CarResolveError {
  ok: false;
  status: number;
  statusText: string;
}
/** A positive path resolution, with a lazy stream over the resource bytes. */
export interface CarResolveOk {
  ok: true;
  status: number;
  statusText: string;
  headers: MaslHeaders;
  createReadStream: () => ReadStream;
}
export type CarResolveResult = CarResolveError | CarResolveOk;

// XXX IMPORTANT
// Note that resolvePath() returns a stream and doesn't verify.
// Maybe we should use the fact that open() reads the bytes anyway to verify the content.
export default class CarTileReader {
  #path: string;
  #fh: FileHandle | undefined;
  #meta: StoredMasl = { resources: {} };
  #cidOffsets: Record<string, [number, number]> = {};
  constructor (path: string) {
    this.#path = path;
  }
  get meta (): StoredMasl {
    return this.#meta;
  }
  async open () {
    this.#fh = await open(this.#path);
    const car = fromStream(Readable.toWeb(this.#fh.createReadStream({ autoClose: false })) as ReadableStream<Uint8Array>);
    const { data: meta } = await car.header(); // also returns headerEnd if we want to read ourselves
    const manifest = meta as StoredMasl;
    delete manifest.version;
    delete manifest.roots;
    Object.keys(manifest.resources).forEach(k => {
      manifest.resources[k].src = (toCidLink(manifest.resources[k].src as never) as unknown as { toJSON(): unknown }).toJSON() as CidLink;
    });
    this.#meta = manifest;
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
  resolvePath (path: string): CarResolveResult {
    path = (new URL(`fake:${path}`)).pathname; // remove QS, etc.
    const entry = this.#meta.resources?.[path];
    if (!entry) return { ok: false, status: 404, statusText: 'Not found' };
    const { src, ...headers } = entry;
    const cid = '$link' in src ? src.$link : src.ref.$link;
    const [start, end] = this.#cidOffsets[cid];
    return {
      ok: true,
      status: 200,
      statusText: 'Ok',
      headers,
      createReadStream: () => this.#fh!.createReadStream({ start, end, autoClose: false }),
    };
  }
}
