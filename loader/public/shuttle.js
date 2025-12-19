
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

const PFX = 'tiles-shuttle-';
const RCV_LOAD = `${PFX}load`;    // mothership tells us to start loading
const SND_READY = `${PFX}ready`;  // tell mothership we're loaded and ready

// XXX TODO
// - If there's a way to pass references around, get the worker and mothership
//   to talk directly instead of through us. But this is an optimisation, only
//   do it once this fully works.
// - One thing that is worth implementing here (unless the mothership has
//   direct script access to our window — this depends on which arrangement of
//   sandboxing we use) is setting the title and icon (for the windowed case).
// - We should receive instructions from the mothership to distinguish
//   between loading the active tile and rendering its card. This would means
//   that we need to communicate readiness to the mothership and receive
//   local instructions, it also probably means that we need to be able to
//   convey size instructions of our own based on card rendering.

// --- Communicating with worker and mothership
// - mothership -> worker
window.addEventListener('message', async (ev) => {
  const { action, id } = ev.data;
  if (action?.startsWith(PFX)) {
    if (action === RCV_LOAD) {
      await loadWorker();
      window.parent.postMessage({ id, action: SND_READY }, '*');
    }
  }
  else {
    await readyToLoad;
    worker.postMessage(ev.data);
  }
});
// - worker -> mothership
navigator.serviceWorker.onmessage = (ev) => {
  window.parent.postMessage(ev.data, '*');
}

// Let's goooo
async function loadWorker () {
  // social justice worker
  let curSWReg;
  try {
    curSWReg = await navigator.serviceWorker.getRegistration();
  }
  catch (err) {
    console.warn(`Failed to get worker registration`, err);
  }
  if (!curSWReg) {
    curSWReg = await navigator.serviceWorker.register('worker.js', { scope: '/' });
    await navigator.serviceWorker.ready;
  }
  navigator.serviceWorker.onmessage
  worker = curSWReg.active;
  worker.onerror = (ev) => console.error(`SW Error:`, ev); // XXX probably push up
  resolveReadyToLoad();
  renderWorkerFrame();
}

function renderWorkerFrame () {
  setTimeout(
    () => {
      const ifr = document.createElement('iframe');
      ifr.setAttribute('src', '/');
      ifr.setAttribute('frameborder', '0'); // oh hell yeah
      document.body.appendChild(ifr);
    },
    0
  );
}
