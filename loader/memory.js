
import { Tile } from "../loader.js";
import { NOT_FOUND, maslResponse } from "../lib/masl.js";

// ### Memory Loader
// This is mostly for debugging, experimentation.
// You create a loader that maps IDs to manifest-like structures. Then load(memory://ID)
// and the values in the manifest provide the content directly.
export class MemoryTileLoader {
  #tiles = {};
  addTile (id, manifest) {
    this.#tiles[id] = manifest;
  }
  async load (url, mothership) {
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
  #manifest;
  constructor (manifest) {
    this.#manifest = manifest;
  }
  async resolvePath (path) {
    const entry = this.#manifest?.resources?.[path];
    if (!entry?.src) return NOT_FOUND;
    return maslResponse(entry, entry.src);
  }
}
