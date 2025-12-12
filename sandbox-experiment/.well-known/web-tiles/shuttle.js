
/*
████████╗██╗██╗     ███████╗███████╗
╚══██╔══╝██║██║     ██╔════╝██╔════╝
   ██║   ██║██║     █████╗  ███████╗
   ██║   ██║██║     ██╔══╝  ╚════██║
   ██║   ██║███████╗███████╗███████║
   ╚═╝   ╚═╝╚══════╝╚══════╝╚══════╝
      •--~~~## SHUTTLE ##~~~--•

This script loads in the context that the mothership creates, sets up the
worker, and triggers the iframe that the worker operates on.

Other than that, it passes messages between the worker and the mothership.
*/

let worker;  // instance of the worker
const { promise: readyToLoad, resolve: resolveReadyToLoad } = Promise.withResolvers();

// XXX ~~~ NOTES ~~~
// - If window.parent.postMessage doesn't work, have the mothership start us
//   with a message, that way we can save the source.
// - If there's a way to pass references around, get the worker and mothership
//   to talk directly instead of through us. But this is an optimisation, only
//   do it once this fully works.
// - The one thing that is worth implementing here (unless the mothership has
//   direct script access to our window — this depends on which arrangement of
//   sandboxing we use) is setting the title and icon (for the windowed case).
// - We should probably receive instructions from the mothership to distinguish
//   between loading the active tile and rendering its card. This would means
//   that we need to communicate readiness to the mothership and receive
//   local instructions, it also probably means that we need to be able to
//   convey size instructions of our own based on card rendering.
// - See Peergos for comparison.

// --- Communicating with worker and mothership
// - mothership -> worker
window.addEventListener('message', async (ev) => {
  await readyToLoad;
  worker.postMessage(ev.data);
});
// - worker -> mothership
navigator.serviceWorker.onmessage = (ev) => {
  window.parent.postMessage(ev.data, '*');
}

// Let's goooo
(async function () {
  // social justice worker
  let curSWReg = await navigator.serviceWorker.getRegistration();
  if (!curSWReg) {
    curSWReg = await navigator.serviceWorker.register('../../.well-known-web-tiles-worker.js', { scope: '/' });
    await navigator.serviceWorker.ready;
  }
  worker = curSWReg.active;
  worker.onerror = (ev) => console.error(`SW Error:`, ev); // XXX probably push up
  resolveReadyToLoad();
  renderWorkerFrame();
})();

// XXX maybe remove sandboxing otherwise the iframe won't share the origin with us?
//    but first try
// the problem is that if we allow-same-origin, since we have to allow scripts,
// scripts in the iframe can reach up and remove the sandbox attribute.
// Can they break containment? Maybe we need the CSP at the mothership
// level.
function renderWorkerFrame () {
  setTimeout(
    () => {
      const ifr = document.createElement('iframe');
      ifr.setAttribute('src', '/');
      ifr.setAttribute('frameborder', '0'); // oh hell yeah
      // ifr.setAttribute('csp', 'XXX'); // XXX this might be on our parent iframe to prevent injections that load from here
      ifr.setAttribute('sandbox', [
        'allow-downloads',
        'allow-forms',
        // 'allow-modals',
        // 'allow-orientation-lock',
        // 'allow-pointer-lock',
        // 'allow-popups',
        // 'allow-popups-to-escape-sandbox',
        // 'allow-presentation',
        // 'allow-same-origin',
        'allow-scripts',
        // 'allow-top-navigation',
        // 'allow-top-navigation-by-user-activation', // this we'll need to route to browser
        // 'allow-top-navigation-to-custom-protocols',
      ].join(' '));
      document.body.appendChild(ifr);
    },
    0
  );
}
