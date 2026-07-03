
/*
████████╗██╗██╗     ███████╗███████╗
╚══██╔══╝██║██║     ██╔════╝██╔════╝
   ██║   ██║██║     █████╗  ███████╗
   ██║   ██║██║     ██╔══╝  ╚════██║
   ██║   ██║███████╗███████╗███████║
   ╚═╝   ╚═╝╚══════╝╚══════╝╚══════╝
   •--~~~## SERVICE WORKER ##~~~--•

This is a very simple Service Worker, almost all complexity that it might have
had has been removed because life is too short to debug badly designed APIs.

After being instantiated in the context that will load tile content (either the
full tile or its card rendering), the following steps are expected:

- It waits for a `action: tiles-worker-load` event with an associated unique `id`
  that we'll use to communicate up in case we need to be disambiguated.
- It responds with `action: tiles-worker-ready`.
- It can then communicate to the shuttle by messaging it with
  `action: tiles-worker-request`, with associated `type` for the request type and
  `payload` with whatever needed payload.
- The shuttle responds with `action: tiles-worker-response` that also contains
  `payload` (if successful) or `error` (a string, if not).
- Occasionally, an `action: tiles-worker-warn` message is sent, with an attached `msg` array
  of strings and worker `id`. This is so the container can warn, for debugging
  purposes.

There is only one request type at this point, the type of which is `resolve-path`
and data for which is the `path` being resolved (which may include a query string).

It's worth noting that anything starting with `/.well-known/web-tiles/` the SW
will treat as passthrough. This is the path that we load all support content from
(including the index.html that loads us).
*/


let id;       // keep track of our id so the shuttle knows who we are when we talk
let shuttle;  // hold on to the source so we can initiate sending up
const { promise: readyToLoad, resolve: resolveReadyToLoad } = Promise.withResolvers();

// All of the below are described as communicating with the mothership, but it's
// mediated by the shuttle.
const PFX = 'tiles-worker-';
const RCV_LOAD = `${PFX}load`;          // mothership tells us to start loading
const SND_READY = `${PFX}ready`;        // tell mothership we're loaded and ready
const SND_REQUEST = `${PFX}request`;    // request something from mothership
const RCV_RESPONSE = `${PFX}response`;  // mothership responds to a request
const TILES_PFX = 'tiles-';
const SND_WARNING = `${TILES_PFX}warn`;       // warn mothership

self.skipWaiting();

// --- Communicating with the shuttle
const requestMap = new Map();
let currentRequest = 0;
async function request (type, payload) {
  currentRequest++;
  const p = new Promise((resolve, reject) => {
    requestMap.set(currentRequest, { resolve, reject });
  });
  shuttle.postMessage({ action: SND_REQUEST, id, type, payload: { requestId: currentRequest, ...payload } });
  return p;
}
self.addEventListener('message', async (ev) => {
  const { action } = ev.data || {};
  if (!action) return;
  if (action === RCV_LOAD) {
    id = ev.data.id;
    resolveReadyToLoad();
    shuttle = ev.source;
    ev.source.postMessage({ action: SND_READY, id });
  }
  else if (action === RCV_RESPONSE) {
    const { payload, error } = ev.data;
    const { requestId } = payload;
    if (!requestMap.has(requestId)) return console.error(`No response ID for "${requestId}".`);
    const { resolve, reject } = requestMap.get(requestId);
    requestMap.delete(requestId);
    if (error) return reject(error);
    resolve(payload.response);
  }
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  // IMPORTANT
  // We have to let this through since we do need to load the loader. But it means that tiles
  // can themselves load anything in loader space.
  if (/^\/\.well-known\/web-tiles\//.test(url.pathname)) return;
  // A Service Worker MUST call respondWith() synchronously, while the fetch event
  // is still being dispatched. So we register the response promise *first*, then do
  // all of the waiting inside it: first for the load handshake (readyToLoad), then
  // for the mothership round-trip. Awaiting *before* respondWith() used to lose a
  // race with the handshake and let the navigation fall through to the network,
  // which the loading server answers with "Cannot GET /".
  const { promise, resolve } = Promise.withResolvers();
  ev.respondWith(promise);
  (async () => {
    await readyToLoad;
    if (!id) return resolve(new Response('Not in a loaded state.', response()));
    try {
      const r = await request('resolve-path', { path: url.pathname });
      resolve(new Response(bodify(r.body), response(r.status, r.headers)));
    }
    catch (err) {
      // Resolve (not reject) so the browser doesn't turn this into a network error.
      resolve(new Response(String(err?.message ?? err), response(502)));
    }
  })();
});

function response (status = 200, headers = { 'content-type': 'text/plain' }) {
  return {
    status,
    headers,
  };
}

// Tauri seems to turn Uint8Array into an Array, which isn't good.
function bodify (body) {
  return Array.isArray(body) ? new Uint8Array(body) : body;
}

// NOTE: these just get copied around because browsers don't all support import
// in SW yet.
// eslint-disable-next-line
async function warn (...msg) {
  console.warn(...msg);
  if (!shuttle) return;
  shuttle.postMessage({ action: SND_WARNING, msg, id });
}
