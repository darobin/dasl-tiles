
// ### AT Loader
export class ATTileLoader {
  async load (url, mothership) {
    const u = new URL(url);
    if (u.protocol !== 'at:') return false;
    // XXX
    //  - also check that the collection is correct
    //  - load the record
    //  - fail if it's not a valid tile record
    //  - create a Tile with the right manifest, the url, and a way to load a path
  }
}
export class ATPathLoader {
  #did;
  #manifest;
  constructor (did, manifest) {
    this.#did = did;
    this.#manifest = manifest;
  }
  async resolvePath (path) {
    // XXX
    //  - use the manifest to find the CID (make sure to ignore search & hash)
    //  - use the DID to know where to load it from
    //  - call for the blob
    //  - make the right response with the media type and all
  }
}
