
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

let workerId;   // keep track of the worker id so the mothership knows who we are when we talk
let mothership; // hold on to the source so we can initiate sending up
let worker;     // instance of the worker
const { promise: readyToLoad, resolve: resolveReadyToLoad } = Promise.withResolvers();

const PFX = 'tiles-shuttle-';
const RCV_LOAD = `${PFX}load`;            // mothership tells us to start loading
const SND_READY = `${PFX}ready`;          // tell mothership we're loaded and ready
const RCV_SET_TITLE = `${PFX}set-title`;  // set the title
const RCV_SET_ICON = `${PFX}set-icon`;    // set the icon

let error, warn;

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
      workerId = id;
      mothership = ev.source;
      const utils = makeUtils({ mothership, workerId });
      error = utils.error;
      warn = utils.warn;
      await loadWorker();
      window.parent.postMessage({ id, action: SND_READY }, '*');
    }
    else if (action === RCV_SET_TITLE) {
      const { payload } = ev.data;
      warn(`Setting title to ${payload?.title}`);
      document.title = payload?.title;
    }
    else if (action === RCV_SET_ICON) {
      const { payload } = ev.data;
      // If the worker is loaded, we just load the icon straight up.
      // Otherwise we need to request resolving the path from the mothership,
      // the way that workers do.
      if (worker) {
        document.querySelector('link[rel="icon"]')?.setAttribute('href', payload?.path);
      }
      else {
        // XXX make request system reusable
      }
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
    curSWReg = await navigator.serviceWorker.register('worker.js', { scope: '/', type: 'module' });
  }
  await navigator.serviceWorker.ready;
  window.addEventListener('beforeunload', async () => {
    await curSWReg.unregister();
  });
  // navigator.serviceWorker.onmessage
  worker = curSWReg.active;
  worker.onerror = (ev) => error(`Worker error`, ev);
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
    5 // setting this to 0 surfaces a race condition… (probably still there)
  );
}

// #### WARNING
// ---- This stuff should be in utils.js, but import isn't yet universally
// supported in browsers. Move it later in 2026.
const TILES_PFX = 'tiles-';
const SND_ERROR = `${TILES_PFX}error`;        // error to parent
const SND_WARNING = `${TILES_PFX}warn`;       // warn parent

function makeUtils({ shuttle, mothership, workerId }) {
  const parent = shuttle || mothership;
  return {
    warn (...msg) {
      console.warn(...msg);
      if (!parent) return;
      parent.postMessage({ action: SND_WARNING, msg, id: workerId });
    },
    error (...msg) {
      console.warn(...msg);
      if (!parent) return;
      parent.postMessage({ action: SND_ERROR, msg, id: workerId });
    },
  };
}
