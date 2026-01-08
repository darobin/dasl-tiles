
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

import { el } from "./lib/el.js";

const SHUTTLE_PFX = 'tiles-shuttle-';
const SND_SHUTTLE_LOAD = `${SHUTTLE_PFX}load`;        // tell worker to roll
const RCV_SHUTTLE_READY = `${SHUTTLE_PFX}ready`;      // worker ready
const WORKER_PFX = 'tiles-worker-';
const SND_WORKER_LOAD = `${WORKER_PFX}load`;          // tell worker to roll
const RCV_WORKER_READY = `${WORKER_PFX}ready`;        // worker ready
const RCV_WORKER_REQUEST = `${WORKER_PFX}request`;    // worker requested something
const SND_WORKER_RESPONSE = `${WORKER_PFX}response`;  // respond to a worker
const WORKER_WARNING = `${WORKER_PFX}warn`;           // worker warnings
const SHUTTLE_ERROR = `${SHUTTLE_PFX}error`;          // shuttle errors

export class TileMothership {
  #loaders = [];
  #conf = {};
  #id2shuttle = new Map();
  #id2tile = new Map();
  constructor (conf) {
    this.#conf = conf;
  }
  init () {
    window.addEventListener('message', async (ev) => {
      const { action } = ev.data || {};
      if (action === WORKER_WARNING) {
        const { msg, id } = ev.data;
        console.warn(`[W:${id}]`, ...msg);
      }
      if (action === SHUTTLE_ERROR) {
        const { msg, id } = ev.data;
        console.error(`[S:${id}]`, ...msg);
      }
      else if (action === RCV_SHUTTLE_READY) {
        const { id } = ev.data;
        console.info(`[W:${id}] shuttle ready!`);
        this.sendToShuttle(id, SND_WORKER_LOAD, { id });
      }
      else if (action === RCV_WORKER_READY) {
        const { id } = ev.data;
        console.info(`[W:${id}] worker ready!`);
      }
      else if (action === RCV_WORKER_REQUEST) {
        const { type, id, payload } = ev.data;
        if (type === 'resolve-path') {
          const { path, requestId } = payload;
          const tile = this.#id2tile.get(id);
          if (!tile) throw new Error(`No tile shuttle with ID ${id}`);
          const { status, headers, body } = await tile.resolvePath(path);
          this.sendToShuttle(id, SND_WORKER_RESPONSE, { requestId, response: { status, headers, body } });
        }
      }
    });
  }
  sendToShuttle (id, action, payload) {
    console.warn(`sendToShuttle`, id, action, payload);
    const ifr = this.#id2shuttle.get(id);
    if (!ifr) return console.error(`No shuttle for ID ${id}`);
    ifr.contentWindow.postMessage({ id, action, payload }, '*');
  }
  registerShuttleFrame (ifr, tile) {
    const id = crypto.randomUUID(); // we might want to make that pluggable
    this.#id2shuttle.set(id, ifr);
    this.#id2tile.set(id, tile);
    return id;
  }
  startShuttle (id) {
    this.sendToShuttle(id, SND_SHUTTLE_LOAD, { id });
  }
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
  getLoadSource () {
    return `https://${this.#conf?.loadDomain || 'load.webtil.es'}/.well-known/web-tiles/`;
  }
  // Load a tile.
  async loadTile (url) {
    let tile = false;
    for (const ldr of this.#loaders) {
      tile = await ldr.load(url, this);
      if (tile) break;
    }
    return tile;
  }
}

export class Tile {
  #mothership;
  #url;
  #manifest;
  #pathLoader;
  #shuttleId;
  constructor (mothership, url, manifest, pathLoader) {
    this.#mothership = mothership;
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
  async renderCard () {
    const card = el('div', { style: {
      border: '1px solid lightgrey',
      'border-radius': '3px',
      cursor: 'pointer',
    }});
    card.addEventListener('click', async () => {
      console.warn(`going to height ${card.offsetHeight}`);
      const tileRenderer = await this.renderContent(card.offsetHeight);
      card.replaceWith(tileRenderer);
    });
    // XXX we always take the first, we could be smarter with sizes
    if (this.#manifest?.screenshots?.[0]?.src) {
      const res = await this.resolvePath(this.#manifest.screenshots[0].src);
      if (res.ok) {
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
  async renderContent (height = 300) {
    const ifr = el('iframe', {
      src: this.#mothership.getLoadSource(),
      style: {
        display: 'block',
        width: '100%',
        height: `${height}px`,
        border: 'none',
      }
    });
    this.#shuttleId = this.#mothership.registerShuttleFrame(ifr, this);
    ifr.addEventListener('load', () => this.#mothership.startShuttle(this.#shuttleId));
    return ifr;
  }
}

// XXX NEXT STEPS
// - this is a good point to refactor into library+demo
// x move the experiment entirely into webtil.es
//  x put a basic build thing there
//  x npm link
// x rename loader to loading-server and document
// x use package.json to expose tile-loader as @dasl/tiles/loader (and car-reader?)
// - refactor tiles loader into split
// - do XDC and CAR first
// - need an AT publisher
// - need a tilifier given a web page


// ############################################
// ##########################################
// #### NEXT STEPS ########################
// ##########################################
// ############################################
//
//  x have the mothership change to being an experiment loading actual tiles
//  x support renderCard (pluggable too)
//  - implement the loaders one by one
//  - try each, stick to browser environments for now (we can add e.g. Tauri later)
//  - publish to npm with the right metadata
//  - make a website with demo
//  - DASL spec
//  - WAG meeting
