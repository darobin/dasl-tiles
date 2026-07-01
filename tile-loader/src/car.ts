
import { fromUint8Array } from '@atcute/car';
import { toCidLink, toString as stringifyCID } from '@atcute/cid';
import { ContentSchemeTileLoader } from "./content-scheme.js";
import { Tile } from "./index.js";
import type { TileMothership } from "./index.js";
import { NOT_FOUND, maslResponse } from "./lib/masl.js";
import type { StoredMasl, MaslResponse, CidLink } from "@dasl/tile-lexicon";

// ### CAR Tiles
export class CARTileLoader extends ContentSchemeTileLoader {
  constructor (schemes?: string[]) {
    super(schemes);
  }
  // NOTE: ignoring scheme for now, this is pure HTTP
  async processContent (carData: ArrayBuffer, scheme: string, url: string, mothership: TileMothership): Promise<Tile | false> {
    let car;
    try {
      car = fromUint8Array(new Uint8Array(carData));
    }
    catch (e) {
      return false;
    }
    console.warn(`car`, car);
    const { data } = car.header;
    const manifest = data as StoredMasl;
    delete manifest.version;
    delete manifest.roots;
    Object.keys(manifest.resources).forEach(k => {
      manifest.resources[k].src = (toCidLink(manifest.resources[k].src as never) as unknown as { toJSON(): unknown }).toJSON() as CidLink;
    });
    // This isn't efficient in that it reads the bytes and we throw them away.
    // We could replace it with a version that skips, but that'd be copying a
    // lot of work from @atcute; we can optimise later.
    const offsets: Record<string, [number, number]> = {};
    for await (const entry of car) {
      const { cid, bytesStart, bytesEnd } = entry;
      offsets[stringifyCID(cid)] = [bytesStart, bytesEnd];
    }
    const loader = new CARPathLoader(manifest, carData, offsets);
    return new Tile(mothership, url, manifest, loader);
  }
}

export class CARPathLoader {
  #manifest: StoredMasl;
  #carData: ArrayBuffer;
  #offsets: Record<string, [number, number]>;
  constructor (manifest: StoredMasl, carData: ArrayBuffer, offsets: Record<string, [number, number]>) {
    this.#manifest = manifest;
    this.#carData = carData;
    this.#offsets = offsets;
  }
  async resolvePath (path: string): Promise<MaslResponse> {
    const entry = this.#manifest?.resources?.[path];
    if (!entry?.src) return NOT_FOUND;
    const src = entry.src;
    const cid = '$link' in src ? src.$link : src.ref.$link;
    const [start, end] = this.#offsets[cid];
    return maslResponse(entry, this.#carData.slice(start, end));
  }
}
