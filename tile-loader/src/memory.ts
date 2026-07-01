
import { Tile } from "./index.js";
import type { TileMothership } from "./index.js";
import { NOT_FOUND, maslResponse } from "./lib/masl.js";
import type { InMemoryMasl, MaslResponse } from "@dasl/tile-lexicon";

// ### Memory Loader
// This is mostly for debugging, experimentation.
// You create a loader that maps IDs to manifest-like structures. Then load(memory://ID)
// and the values in the manifest provide the content directly.
export class MemoryTileLoader {
  #tiles: Record<string, InMemoryMasl> = {};
  addTile (id: string, manifest: InMemoryMasl) {
    this.#tiles[id] = manifest;
  }
  async load (url: string, mothership: TileMothership): Promise<Tile | false> {
    const u = new URL(url);
    if (u.protocol !== 'memory:') return false;
    const id = u.hostname;
    if (!this.#tiles[id]) return false; // XXX an error would be better
    const manifest = this.#tiles[id];
    const loader = new MemoryPathLoader(manifest);
    return new Tile(mothership, url, manifest, loader);
  }
}

export class MemoryPathLoader {
  #manifest: InMemoryMasl;
  constructor (manifest: InMemoryMasl) {
    this.#manifest = manifest;
  }
  async resolvePath (path: string): Promise<MaslResponse> {
    const entry = this.#manifest?.resources?.[path];
    if (!entry?.src) return NOT_FOUND;
    return maslResponse(entry, entry.src);
  }
}
