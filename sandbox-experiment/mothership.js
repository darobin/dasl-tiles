
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

const WORKER_PFX = 'tiles-worker-';
const SND_WORKER_LOAD = `${WORKER_PFX}load`;          // tell worker to roll
const RCV_WORKER_READY = `${WORKER_PFX}ready`;        // worker ready
const RCV_WORKER_REQUEST = `${WORKER_PFX}request`;    // worker requested something
const SND_WORKER_RESPONSE = `${WORKER_PFX}response`;  // respond to a worker
const WORKER_WARNING = `${WORKER_PFX}warn`;           // worker warngs

const id2shuttle = new Map();
function sendToWorker (id, action, data) {
  const ifr = id2shuttle.get(id);
  if (!ifr) return console.error(`No shuttle for ID ${id}`);
  ifr.contentWindow.postMessage({ action, data }, '*');
}
window.addEventListener('message', async (ev) => {
  const { action } = ev.data || {};
  if (action === WORKER_WARNING) {
    const { msg, id } = ev.data;
    console.warn(`[W:${id}]`, ...msg);
  }
  else if (action === RCV_WORKER_READY) {
    const { id } = ev.data;
    console.info(`[W:${id}] ready!`);
  }
  else if (action === RCV_WORKER_REQUEST) {
    const { type, $id } = ev.data;
    if (type === 'resolve-path') {
      const { path, id } = ev.data.data;
      // XXX
      // - always respond with $id as that's the *request* ID (CHANGE NAME, also data -> params)
      // - if path = / send back an index that loads a CSS
      // - if path = /style.css send back CSS using the ID as the colour
      // - anything else error
      // - response has { $id, data: { status, headers, body } } where body should be UInt8Array
    }
  }
});


// STEPS
// ✅ 1. create a bunch of iframe shuttles
// ✅ 2. wait for load of iframe
// ✅ 3. send shuttle for each iframe a `action: tiles-worker-load` with unique ID
// ✅ 4. wait for `action: tiles-worker-ready` (optional, mostly ignore it)
// ✅ 5. btw whenever we get a tiles-worker-warn message, we should warn.
// 6. when we get `action: tiles-worker-request` messages, with resolve-path
//    then respond appropriately. Here we test with colours.
// A. try in multiple browsers

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
    ifr.setAttribute('sandbox', 'allow-scripts');
    document.body.appendChild(ifr);
    id2shuttle.add(c, ifr);
    ifr.onload = () => sendToWorker(SND_WORKER_LOAD, { id: c });
    ifr.setAttribute('src', './.well-known/web-tiles/index.html');
  }
);




// THIS SHOULD BE HERE (but of course listening to the right source, not the
// worker)
// navigator.serviceWorker.onmessage = async (ev) => {
//   console.warn(`loader|worker.message`, ev);
//   const { action } = ev.data || {};
//   if (action === 'warn') {
//     console.warn(`[SW]`, ...ev.data.msg);
//   }
//   else if (action === 'ready') {
//     startLoading();
//   }
//   else if (action === 'request') {
//     const { $id, name, data } = ev.data;
//     if (name === 'resolve-path') {
//       const res = await request('request', data);
//       console.warn(`GOT RES FROM MAIN, SENDING TO SJW`, res);
//       worker.postMessage({ action: 'response', $id, name, data: res.data });
//     }
//   }
// };


// setTimeout(
//   () => {
//     [...document.querySelectorAll('iframe')].forEach(ifr => {
//       const colour = ifr.getAttribute('data-colour');
//       console.warn(`Posting ${colour}`);
      // ifr.contentWindow.postMessage({
      //   action: 'repaint',
      //   colour,
      // }, '*');
//     });
//   },
//   500
// );
