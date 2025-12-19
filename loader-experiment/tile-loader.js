
/*
████████╗██╗██╗     ███████╗███████╗
╚══██╔══╝██║██║     ██╔════╝██╔════╝
   ██║   ██║██║     █████╗  ███████╗
   ██║   ██║██║     ██╔══╝  ╚════██║
   ██║   ██║███████╗███████╗███████║
   ╚═╝   ╚═╝╚══════╝╚══════╝╚══════╝
      •--~~~## MOTHERSHIP ##~~~--•

The tile-loading architecture has three levels that all communicate together:

- At the top, the MOTHERSHIP. This has access to things in the real world like
  fetching from the internet or reading from the file system. It's the interface
  to tile loading, it gets configured in ways that are appropriate for its
  context. This is the entry point: you give it a URL and it'll instantiate that
  tile. To the extent possible, this should contain all the intelligence and all
  the configurability so that the other components can be deployed in entirely
  generic ways.
- The mothership instantiates tiles by creating insulated contexts (a sandboxed
  iframe, an incognito window…) and loading a SHUTTLE in it. The role of the
  shuttle is to set up a service worker and an iframe to load the root of the
  tile into. It only exists because you need something to carry a service worker
  in. The only other thing that it does is (*drumroll*) shuttle messages back
  and forth between the worker and the mothership.
- The WORKER is dispatched on a shuttle to handle resource loading for a tile.
  Apart from allow-listing some paths for itself and the shuttle, it passes all
  requests up, which the shuttle then hands over to the mothership.
*/

export class TileLoader {
  #loaders = [];
  // Adds a loader that will handle matching requests to load a tile.
  // - `loader` is an object that knows how to load a tile for a specific scheme
  //    (and types)
  addLoader (loader) {
    this.#loaders.push(loader);
  }
  // Remove using same reference.
  removeLoader (loader) {
    this.#loaders = this.#loaders.filter(ldr => ldr !== loader);
  }
  // Load a tile.
  async loadTile (url) {
    let tile = false;
    for (const ldr of this.#loaders) {
      tile = await ldr.load(url);
      if (tile) break;
    }
    return tile;
  }
}

export class Tile {
  #url;
  #manifest;
  #pathLoader;
  constructor (url, manifest, pathLoader) {
    this.#url = url;
    this.#manifest = manifest;
    this.#pathLoader = pathLoader;
  }
  get url () {
    return this.#url;
  }
  get manifest () {
    return this.#manifest;
  }
  async resolvePath (path) {
    return this.#pathLoader.resolvePath(path);
  }
}

// ############################################
// ##########################################
// #### NEXT STEPS ########################
// ##########################################
// ############################################
//
//  - have the mothership change to being an experiment loading actual tiles
//  - support renderCard (pluggable too)
//  - implement the loaders one by one
//  - try each, stick to browser environments for now (we can add e.g. Tauri later)
//  - when it works, refactor
//  - publish to npm with the right metadata
//  - make a website with demo
//  - DASL spec
//  - WAG meeting



// ----- specific loaders (refactor later)
export class ATTileLoader {
  async load (url) {
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

// Here the idea is that you can load from multiple schemes, but you might not
// want to.
export class ContentSchemeTileLoader {
  #schemes;
  constructor (schemes = ['http', 'file']) {
    this.#schemes = new Set(schemes);
  }
  async load (url) {
    const u = new URL(url);
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      if (!this.#schemes.has('http')) return false;
      // XXX
      //  - get the data
      //  - if it's not a zip file, return false
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
  // async processZip (zipData) {
  //   // XXX
  //   //  - generate a synthetic manifest
  //   //  - make a path loader that will point to the right part
  // }
}

export class WebXDCTileLoader extends ContentSchemeTileLoader {
  constructor (schemes) {
    super(schemes);
  }
  async processContent (zipData, scheme) {
    // XXX
    //  - generate a synthetic manifest
    //  - make a path loader that will point to the right part
    //  - scheme doesn't matter because we always do this in memory
  }
}

export class CARTileLoader extends ContentSchemeTileLoader {
  constructor (schemes) {
    super(schemes);
  }
  async processContent (car, scheme) {
    // XXX
    //  - for http we assume that we have the file in memory (we could do range
    //    requests but let's not right now)
    //  - for file, we scan and save offsets
    //  - extract the manifest
    //  - make a path loader that will point to the right part depending on scheme
  }
}
