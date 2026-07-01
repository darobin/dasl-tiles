
// ### Base Class for HTTP, file, etc. loaders
// Here the idea is that you can load from multiple schemes, but you might not
// want to.
export class ContentSchemeTileLoader {
  #schemes;
  constructor (schemes = ['http', 'file']) {
    this.#schemes = new Set(schemes);
  }
  async load (url, mothership) {
    const u = new URL(url);
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
  }
}
