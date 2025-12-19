
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


// WHAT WE'RE DOING HERE
// Note: this is experimental and only an approximation of how we want the final
// product to work.
// But the idea is to get this working bottom up: we get the worker to DTRT,
// then the shuttle, and then the mothership. If this experiment can run
// correctly, then we can start having it load real tiles.
// Before trying real tiles we should make attempts to break containment.

const SHUTTLE_PFX = 'tiles-shuttle-';
const SND_SHUTTLE_LOAD = `${SHUTTLE_PFX}load`;          // tell worker to roll
const RCV_SHUTTLE_READY = `${SHUTTLE_PFX}ready`;        // worker ready
const WORKER_PFX = 'tiles-worker-';
const SND_WORKER_LOAD = `${WORKER_PFX}load`;          // tell worker to roll
const RCV_WORKER_READY = `${WORKER_PFX}ready`;        // worker ready
const RCV_WORKER_REQUEST = `${WORKER_PFX}request`;    // worker requested something
const SND_WORKER_RESPONSE = `${WORKER_PFX}response`;  // respond to a worker
const WORKER_WARNING = `${WORKER_PFX}warn`;           // worker warngs

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
