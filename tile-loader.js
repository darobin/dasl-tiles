
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
    const u = new URL(`fake:${path}`);
    return this.#pathLoader.resolvePath(u.pathname);
  }
  async renderCard() {
    const card = el('div', { style: {
      border: '1px solid lightgrey',
      'border-radius': '3px',
    }});
    // XXX we always take the first, we could be smarter with sizes
    if (this.#manifest?.screenshots?.[0]?.src) {
      const res = await this.resolvePath(this.#manifest.screenshots[0].src);
      if (res.ok) {
        console.warn(res);
        const blob = new Blob([res.body], { type: res.headers?.['content-type'] });
        const url = URL.createObjectURL(blob);
        el('div', { style: {
          'background-image': `url(${url})`,
          'background-size': 'cover',
          'background-position': '50%',
          'aspect-ratio': '16/9',
        }}, [], card);
      }
    }
    const title = el('div', { style: {
      padding: '0.5rem 1rem 0 1rem',
      display: 'flex',
      'align-items': 'center',
    }}, [], card);
    // XXX we always take the first, we could be smarter with sizes
    if (this.#manifest?.icons?.[0]?.src) {
      const res = await this.resolvePath(this.#manifest.icons[0].src);
      if (res.ok) {
        const blob = new Blob([res.body], { type: res.headers?.['content-type'] });
        console.warn(blob);
        const url = URL.createObjectURL(blob);
        el('img', { src: url, width: '48', height: '48', alt: 'icon', style: { 'padding-right': '0.5rem' } }, [], title);
      }
    }
    el('span', { style: { 'font-weight': 'bold' } }, [this.#manifest.name || 'Untitled Tile'], title);
    if (this.#manifest.description) {
      el('p', { style: { 'margin': '0.5rem 1rem 1rem 1rem' } }, [this.#manifest.description], card);
    }
    return card;
  }
  async renderContent () {
    // XXX render content
  }
}
function el (n, attrs, kids, p) {
  const e = document.createElement(n);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v == null) return;
    if (k === 'style') {
      Object.entries(v).forEach(([prop, value]) => {
        const snake = prop
          .split('-')
          .map((part, idx) => idx ? part.charAt(0).toUpperCase() + part.slice(1) : part)
          .join('')
        ;
        e.style[snake] = value;
      });
      return;
    }
    e.setAttribute(k, v);
  });
  (kids || []).forEach((n) => {
    if (typeof n === 'string') e.append(txt(n));
    else e.append(n);
  });
  if (p) p.append(e);
  return e;
}
function txt (str) {
  return document.createTextNode(str);
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

// ----- some utilities
const NOT_FOUND = { ok: false, status: 404, statusText: 'Not found' };
const maslHeaders = [
  'content-disposition',
  'content-encoding',
  'content-language',
  'content-security-policy',
  'content-type',
  'link',
  'permissions-policy',
  'referrer-policy',
  'service-worker-allowed',
  'sourcemap',
  'speculation-rules',
  'supports-loading-mode',
  'x-content-type-options',
];
function maslResponse (masl, body) {
  if (!body) return NOT_FOUND;
  const headers = {};
  maslHeaders.forEach(k => {
    if (typeof masl[k] !== 'undefined') headers[k] = masl[k];
  });
  if (typeof body === 'string') body = (new TextEncoder()).encode(body);
  return { ok: true, status: 200, statusText: 'Ok', headers, body };
}


// ----- XXX specific loaders (refactor later)

// ### Memory Loader
// This is mostly for debugging, experimentation.
// You create a loader that maps IDs to manifest-like structures. Then load(memory://ID)
// and the values in the manifest provide the content directly.
export class MemoryTileLoader {
  #tiles = {};
  addTile (id, manifest) {
    this.#tiles[id] = manifest;
  }
  async load (url) {
    const u = new URL(url);
    if (u.protocol !== 'memory:') return false;
    const id = u.hostname;
    if (!this.#tiles[id]) return false; // XXX an error would be better
    const manifest = this.#tiles[id];
    const loader = new MemoryPathLoader(manifest);
    return new Tile(url, manifest, loader);
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

// ### AT Loader
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

// ### Base Class for HTTP, file, etc. loaders
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

// ### WebXDC (DeltaChat) Loader
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

// ### CAR Tiles
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
