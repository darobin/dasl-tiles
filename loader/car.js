
import { fromUint8Array } from '@atcute/car';
import { toCidLink, toString as stringifyCID } from '@atcute/cid';
import { ContentSchemeTileLoader } from "./content-scheme.js";
import { Tile } from "../loader.js";
import { NOT_FOUND, maslResponse } from "../lib/masl.js";

// ### CAR Tiles
export class CARTileLoader extends ContentSchemeTileLoader {
  constructor (schemes) {
    super(schemes);
  }
  // NOTE: ignoring scheme for now, this is pure HTTP
  async processContent (carData, scheme, url, mothership) {
    let car;
    try {
      car = fromUint8Array(carData);
    }
    catch (e) {
      return false;
    }
    const { data: manifest } = await car.header();
    delete manifest.version;
    delete manifest.roots;
    Object.keys(manifest.resources).forEach(k => {
      manifest.resources[k].src = toCidLink(manifest.resources[k].src).toJSON();
    });
    // This isn't efficient in that it reads the bytes and we throw them away.
    // We could replace it with a version that skips, but that'd be copying a
    // lot of work from @atcute; we can optimise later.
    const offsets = {};
    for await (const entry of car) {
      const { cid, bytesStart, bytesEnd } = entry;
      offsets[stringifyCID(cid)] = [bytesStart, bytesEnd - 1]; // XXX CHECK THAT - 1 IS CORRECT
    }
    const loader = new CARPathLoader(manifest, carData, offsets);
    return new Tile(mothership, url, manifest, loader);
  }
}

export class CARPathLoader {
  #manifest;
  #carData;
  #offsets;
  constructor (manifest, carData, offsets) {
    this.#manifest = manifest;
    this.#carData = carData;
    this.#offsets = offsets;
  }
  async resolvePath (path) {
    const entry = this.#manifest?.resources?.[path];
    if (!entry?.src) return NOT_FOUND;
    const headers = { ... this.#manifest.resources[path] };
    const cid = headers.src.$link;
    delete headers.src;
    const [start, end] = this.#offsets[cid];
    return maslResponse(entry, this.#carData.slice(start, end));
  }
}
