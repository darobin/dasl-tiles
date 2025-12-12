
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
  `data` with whatever needed payload.
- The shuttle responds with `action: tiles-worker-response` that also contains
  `data` (if successful) or `error` (a string, if not).
- Occasionally, an `action: warn` message is sent, with an attached `msg` array
  of strings and worker `id`. This is so the container can warn, for debugging
  purposes.

There is only one request type at this point, the type of which is `resolve-path`
and data for which contains the unique `id` for this worker and the `path` being
resolved (which may include a query string).

It's worth noting that there are two paths that the SW will treat as passthrough:

- Anything starting with `/.well-known/web-tiles/`. This is the path that we load
  all support content from (including the index.html that loads us).
- Exactly `/.well-known-web-tiles-worker.js`. This does violence to documented best
  practices but such is life. This is meant to be the path to this worker. It
  would be better to use /.well-known/web-tiles/worker.js, but in turn that requires
  sending a `service-worker-allowed: /` header and that can be tricky in some
  environments. So instead we load the worker from the root.
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
const SND_WARNING = `${PFX}warn`;       // warn mothership

self.skipWaiting();

// --- Communicating with the shuttle
const requestMap = new Map();
let currentRequest = 0;
async function request (type, data) {
  currentRequest++;
  warn(`[SW] current request ${currentRequest}`);
  const p = new Promise((resolve, reject) => {
    requestMap.set(currentRequest, { resolve, reject });
  });
  warn(`[SW] promise ready`, p);
  shuttle.postMessage({ action: SND_REQUEST, type, data, $id: currentRequest });
  warn(`[SW] posted to source…`);
  return p;
}
self.addEventListener('message', async (ev) => {
  warn(`[SW] MESSAGE`, ev.data);
  const { action } = ev.data || {};
  if (!action) return;
  if (action === RCV_LOAD) {
    id = ev.data.id;
    resolveReadyToLoad();
    ev.source.postMessage({ action: SND_READY });
    shuttle = ev.source;
  }
  else if (action === RCV_RESPONSE) {
    const { data, $id, error } = ev.data;
    warn(`[SW] WORKER GOT RESPONSE ${$id}`);
    if (!requestMap.has($id)) return console.error(`No response ID for "${$id}".`);
    warn(`[SW] - had response ID`, requestMap.get($id)?.resolve?.toString());
    const { resolve, reject } = requestMap.get($id);
    warn(`[SW] - have functions, will delete`)
    requestMap.delete($id);
    warn(`[SW] - error? ${error}`);
    if (error) return reject(error);
    warn(`[SW] - resolving`);
    resolve(data);
  }
});

self.addEventListener('fetch', async (ev) => {
  warn('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  warn(`FETCH of "${ev.request.url}"`);
  const url = new URL(ev.request.url);
  // IMPORTANT
  // We have to let this through since we do need to load the loader. But it means that tiles
  // can themselves load anything in loader space. We should add further protection later based
  // on fetch context or some such.
  warn(`checking we're not self loading "${/^\/\.well-known\/web-tiles\//.test(url.pathname)}"`);
  if (/^(\/\.well-known\/web-tiles\/|\/\.well-known-web-tiles-worker\.js)/.test(url.pathname)) return;
  warn('waiting to be ready to load…');
  await readyToLoad;
  warn(`ready — has id? ${id}`);
  if (!id) return ev.respondWith(new Response('Not in a loaded state.', response()));
  // IMPORTANT: Here we have to be careful not to have a nested await (of a fetch at least).
  warn(`respondWith`);
  const { promise, resolve, reject } = Promise.withResolvers();
  ev.respondWith(promise);
  warn(`making request`);
  try {
    const r = await request('resolve-path', { id, path: url.pathname }); // XXX this may be a nested await, delete this comment if it works
    warn(`got r `, r);
    // warn(`• fetch ${res.src.$link} got ${r.status}`)
    resolve(new Response(bodify(r.body), response(r.status, r.headers)));
  }
  catch (err) {
    reject(err); // XXX should get the error message out of this
  }
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

async function warn (...msg) {
  console.warn(...msg);
  if (!shuttle) return;
  shuttle.postMessage({ action: SND_WARNING, msg, id });
}
