
let workerColour = 'red';
const p = document.querySelector('p');
p.textContent = 'Running…';

window.onmessage = (ev) => {
  console.warn(ev);
  const { action, colour } = ev.data;
  if (action === 'repaint') {
    // document.body.style.backgroundColor = colour;
    p.textContent = colour;
    workerColour = colour;
  }
};


// Let's goooo
(async function () {
  // receiving one-offs
  await wv.listen('tessera-signal', (ev) => {
    // noop, right now we don't know what to do with this
  });
  await wv.listen('tessera-response', (ev) => {
    console.warn(`loader|on.response`, ev);
    const { $id, name, data, error } = ev.payload;
    if (!requestMap.has($id)) return console.error(`No response ID for "${$id}".`);
    const { resolve, reject } = requestMap.get($id);
    requestMap.delete($id);
    if (error) return reject(error);
    resolve({ name, data });
  });

  // This is not the CID because not all sources are CIDs, and some tiles could
  // be loaded into multiple windows.
  const id = new URLSearchParams(document.location.search).get('id');
  if (!id) {
    const message = `404: tile with ID "${id || 'unknown'}" not found.`;
    el('div', {}, [message], document.body);
    await signal('error', { message });
    return;
  }

  // social justice worker
  let curSWReg = await navigator.serviceWorker.getRegistration();
  if (!curSWReg) {
    curSWReg = await navigator.serviceWorker.register('./sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
  }
  // startLoading();
  curSWReg.active.onerror = (ev) => console.error(`ERR`, ev);
  // curSWReg.active.onstatechange = (ev) => console.warn(`State`, ev);
  navigator.serviceWorker.onmessage = async (ev) => {
    console.warn(`loader|worker.message`, ev);
    const { action } = ev.data || {};
    if (action === 'warn') {
      console.warn(`[SW]`, ...ev.data.msg);
    }
    else if (action === 'ready') {
      startLoading();
    }
    else if (action === 'request') {
      const { $id, name, data } = ev.data;
      if (name === 'resolve-path') {
        const res = await request('request', data);
        console.warn(`GOT RES FROM MAIN, SENDING TO SJW`, res);
        curSWReg.active.postMessage({ action: 'response', $id, name, data: res.data });
      }
    }
  };
  // XXX
  // - we should get the title and icon from mothership
  // - all it knows is the ID, and then we shuttle requests for ID,path -> headers,content
  console.warn(`Sending message`, curSWReg.active, id);
  curSWReg.active.postMessage({ action: 'load', id });
  // XXX PLAN
  // - see what we can send from store to here
  // - implement request/response here
  // - set up a thing that requests and promises on the SW
  // - wire all the way from SW to store
})();

function el (ln, attrs, kids, parent) {
  const e = document.createElement(ln);
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      e.setAttribute(k, v);
    });
  }
  if (kids) {
    kids.forEach(k => {
      if (typeof k === 'string') e.append(document.createTextNode(k));
      else e.append(k);
    });
  }
  if (parent) parent.append(e);
  return e;
}

function startLoading () {
  // XXX here we should also set up link|icon, which should also fetch from SW
  setTimeout(
    () => {
      el(
        'iframe',
        {
          src: '/',
          frameborder: '0', // oh hell yeah
          // XXX make this correct
          sandbox: [
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
          ].join(' '),
        },
        [],
        document.body
      );
    },
    0
  );
}
