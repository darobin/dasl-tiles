
import type { Tile, TileMothership } from "./index.js";

// ### Base Class for HTTP, file, etc. loaders
// Here the idea is that you can load from multiple schemes, but you might not
// want to.
export abstract class ContentSchemeTileLoader {
  #schemes: Set<string>;
  constructor (schemes: string[] = ['http', 'file']) {
    this.#schemes = new Set(schemes);
  }
  async load (url: string, mothership: TileMothership): Promise<Tile | false | undefined> {
    let u: URL;
    try { u = new URL(url); }
    catch { return false; } // not a URL we understand; let another loader try
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      if (!this.#schemes.has('http')) return false;
      const res = await fetch(url);
      if (!res.ok) return false;
      return await this.processContent(await res.arrayBuffer(), u.protocol, url, mothership);
    }
    if (u.protocol === 'file:') {
      if (!this.#schemes.has('file')) return false;
      // XXX
      //  - get the data
      //  - give it to processContent
    }
    return undefined;
  }
  abstract processContent (data: ArrayBuffer, scheme: string, url: string, mothership: TileMothership): Promise<Tile | false>;
}
