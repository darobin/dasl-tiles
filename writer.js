
import { readFile, open } from 'node:fs/promises';
import { file as tmpFile } from 'tmp-promise';
import { create, CODEC_RAW, toString as stringifyCID, toCidLink } from '@atcute/cid';
import { encode as encodeVarInt } from '@atcute/varint';
import { encode as encodeDRISL } from '@atcute/cbor';

// manifest:
//  - [ ] background_color
//  - [ ] categories
//  - [ ] description
//  - [ ] icons
//  - [ ] id
//  - [ ] name
//  - [ ] screenshots
//  - [ ] short_name
//  - [ ] theme_color
// tiles:
//  - [ ] resources
//  - [ ] prev
//  - [ ] sizing
// car (ignore on read, force on write):
//  - [ ] version
//  - [ ] roots
// HTTP:
//  - [ ] content-disposition
//  - [ ] content-encoding
//  - [ ] content-language
//  - [ ] content-security-policy
//  - [ ] content-type
//  - [ ] link
//  - [ ] permissions-policy
//  - [ ] referrer-policy
//  - [ ] service-worker-allowed
//  - [ ] sourcemap // verify that this points in the resource map
//  - [ ] speculation-rules // verify that this points in the resource map
//  - [ ] supports-loading-mode
//  - [ ] x-content-type-options

export const supportedHTTPHeaders = new Set([
  // 'content-disposition',
  // 'content-encoding',
  // 'content-language',
  // 'content-security-policy',
  'content-type',
  // 'link',
  // 'permissions-policy',
  // 'referrer-policy',
  // 'service-worker-allowed',
  // 'sourcemap',
  // 'speculation-rules',
  // 'supports-loading-mode',
  // 'x-content-type-options',
]);
export default class TileWriter {
  #masl;
  #resMap = {};
  constructor (masl) {
    this.setMASL(masl);
  }
  setMASL (masl) {
    if (masl.src) throw new Error(`The MASL metadata contains an 'src', it is intended for single-resource metadata, not a tile`);
    // XXX
    // - we should probably ignore resources here
    // - icons and screenshots need to be resources (later)
    this.#masl = masl;
  }
  addResource (path, headers, src) {
    if (!this.#masl) this.#masl = {};
    if (!this.#masl.resources) this.#masl.resources = {};
    path = (new URL(`fake:${path}`)).pathname;
    Object.keys(headers).forEach(k => {
      if (!supportedHTTPHeaders.has(k)) throw new Error(`Unsupported header '${k}'`);
    });
    this.#masl.resources[path] = { ...headers };
    // this could be multiple things:
    //  - { path: '/path/to file' }
    this.#resMap[path] = src;
  }
  async write (out) {
    const seenCIDs = new Set();
    const { path: tmpPath, cleanup } = await tmpFile();
    const tmp = await open(tmpPath, 'w+');
    // for now, just sort / first but there will likely be other priorities
    const paths = Object.keys(this.#masl.resources).sort((a, b) => {
      if (a === '/') return -1;
      if (b === '/') return 1;
      return 0;
    });
    for (const p of paths) {
      const buf = await readFile(this.#resMap[p].path);
      const cid = await create(CODEC_RAW, buf);
      this.#masl.resources[p].src = toCidLink(cid);
      const cidString = stringifyCID(cid);
      if (seenCIDs.has(cidString)) continue;
      seenCIDs.add(cidString);
      const size = [];
      encodeVarInt(36 + buf.length, size);
      await tmp.write(new Uint8Array(size));
      await tmp.write(cid.bytes);
      await tmp.write(buf);
    }
    await tmp.close();
    const outh = await open(out, 'w');
    this.#masl.version = 1;
    this.#masl.roots = [];
    const meta = encodeDRISL(this.#masl);
    const size = [];
    encodeVarInt(meta.length, size);
    await outh.write(new Uint8Array(size));
    await outh.write(meta);
    const tmpRead = await open(tmpPath);
    const w = outh.createWriteStream();
    tmpRead.createReadStream().pipe(w);
    await new Promise((resolve, reject) => {
      w.on('close', resolve);
      w.on('error', reject);
    });
    cleanup();
  }
}
