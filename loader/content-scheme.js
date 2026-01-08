
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
      // XXX
      //  - get the data
      //  - give it to processContent
    }
    if (u.protocol === 'file:') {
      if (!this.#schemes.has('file')) return false;
      // XXX
      //  - get the data
      //  - if it's not a zip file, return false
      //  - give it to processContent
    }
  }
}
