
import { TileLoader, MemoryTileLoader } from './tile-loader.js';

// XXX
// - move most of this to tile-loader
// - load tile-loader
// - have it resolve content in memory with the same colour thing
// - move on to move complex things
// - refactor the tile-loader to be a proper library
// - refactor it to split, too

// WHAT WE'RE DOING HERE
// Note: this is experimental and only an approximation of how we want the final
// product to work.
// But the idea is to get this working bottom up: we get the worker to DTRT,
// then the shuttle, and then the mothership. If this experiment can run
// correctly, then we can start having it load real tiles.
// Before trying real tiles we should make attempts to break containment.

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

const id2shuttle = new Map();
function sendToShuttle (id, action, payload) {
  console.warn(`sendToShuttle`, id, action, payload);
  const ifr = id2shuttle.get(id);
  if (!ifr) return console.error(`No shuttle for ID ${id}`);
  ifr.contentWindow.postMessage({ id, action, payload }, '*');
}
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
    sendToShuttle(id, SND_WORKER_LOAD, { id });
  }
  else if (action === RCV_WORKER_READY) {
    const { id } = ev.data;
    console.info(`[W:${id}] worker ready!`);
  }
  else if (action === RCV_WORKER_REQUEST) {
    const { type, id, payload } = ev.data;
    if (type === 'resolve-path') {
      const { path, requestId } = payload;
      let status = 200;
      let headers = {};
      let body;
      // if (path === '/') {
      if (path === '/') {
        headers['content-type'] = 'text/html';
        body = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Tile!</title>
                <link rel="stylesheet" href="/style.css"></head><body><p>hi!</p></body></html>`;
      }
      else if (path === '/style.css') {
        headers['content-type'] = 'text/css';
        body = `body { background: ${id}; }\n`;
      }
      else {
        status = 404;
        headers['content-type'] = 'text/plain';
        body = `BOOM — not found…\n`;
      }
      sendToShuttle(id, SND_WORKER_RESPONSE, { requestId, response: { status, headers, body: (new TextEncoder()).encode(body) } });
    }
  }
});

[
  'oklch(69.3% 0.151 180)',
  'oklch(79.3% 0.136 270)',
  'oklch(54.3% 0.091 270)',
  'oklch(74.3% 0.143 0.31)',
  'oklch(89.3% 0.121 90.3)',
].forEach(c => {
    const ifr = document.createElement('iframe');
    ifr.setAttribute('width', '300');
    ifr.setAttribute('height', '300');
    ifr.setAttribute('data-colour', c);
    // ifr.setAttribute('sandbox', 'allow-scripts');
    document.body.appendChild(ifr);
    id2shuttle.set(c, ifr);
    ifr.onload = () => sendToShuttle(c, SND_SHUTTLE_LOAD, { id: c });
    ifr.setAttribute('src', 'https://load.webtiles.bast/.well-known/web-tiles/');
    // ifr.setAttribute('src', 'loader.html');
  }
);

// A more real experiment!
const mem = new MemoryTileLoader();
mem.addTile('basic', {
  name: 'Very Basic Tile',
  description: 'This is a very simple tile that we can load from memory and that has enough content to be worth playing with.',
  screenshots: [{ src: '/img/shot' }],
  icons: [{ src: `/img/icon` }],
  resources: {
    '/': {},
    '/img/shot': {
      src: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600">
        <rect x="0" y="0" width="100%" height="100%" fill="hotpink"></rect>
        <circle cx="50%" cy="50%" r="300" fill="lime"></circle>
      </svg>`,
      'content-type': 'image/svg+xml',
    },
    '/img/icon': {
      src: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px">
        <circle cx="50%" cy="50%" r="20" fill="blue"></circle>
      </svg>`,
      'content-type': 'image/svg+xml',
    },
  },
});

// XXX - CURRENT STATUS
// - loading blobs this way doesn't work, I suspect the SVG is unhappy text encoded or something
//  - try building a blob and URL that works step by step
// - once that's good, go to tile-loader for next steps.

const tl = new TileLoader();
tl.addLoader(mem);
const parent = document.createElement('div');
parent.style.paddingTop = '50px';
parent.style.maxWidth = '570px';
document.body.append(parent);
const tile = await tl.loadTile('memory://basic');
parent.append(await tile.renderCard());
