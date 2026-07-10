

const PFX_PROTOCOL_TO_HOST = 'tiles-protocol-up-data-';
const PFX_PROTOCOL_TO_TILE = 'tiles-protocol-down-data-';
const handlers = [];

export function addDataHandler (hand) {
  if (handlers.find(h => h === hand)) return;
  handlers.push(hand);
}

export function removeDataHandler (hand) {
  const idx = handlers.findIndex(h => h === hand);
  if (idx < 0) return;
  handlers.splice(idx, 1);
}

window.addEventListener('message', async (ev) => {
  const { action, payload } = ev.data;
  if (action === `${PFX_PROTOCOL_TO_TILE}payload`) {
    handlers.forEach(h => h(payload));
  }
});

export function listen () {
  window.parent.postMessage({ action: `${PFX_PROTOCOL_TO_HOST}ready` }, '*');
}

export function sendData (payload) {
  window.parent.postMessage({ action: `${PFX_PROTOCOL_TO_HOST}payload`, payload }, '*');
}
