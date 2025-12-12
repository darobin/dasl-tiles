
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




// EXPERIMENT
// """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
// - next, have each inner set up a SW
// - the SW gets the repaint message and configures itself for that colour
//   note that the configuration needs to be singleton so we can test isolation
// - then an iframe is created inside, and / gets loaded
// - the SW responds with an index.html of the right colour
// - try in multiple browsers


const colours = [
  'oklch(69.3% 0.151 180)',
  'oklch(79.3% 0.136 270)',
  'oklch(54.3% 0.091 270)',
  'oklch(74.3% 0.143 0.31)',
  'oklch(89.3% 0.121 90.3)',
];

colours.forEach(c => {
  const ifr = document.createElement('iframe');
  ifr.setAttribute('width', '300');
  ifr.setAttribute('height', '300');
  ifr.setAttribute('data-colour', c);
  ifr.setAttribute('sandbox', 'allow-scripts');
  document.body.appendChild(ifr);
  ifr.setAttribute('src', './.well-known/web-tiles/index.html');
});

setTimeout(
  () => {
    [...document.querySelectorAll('iframe')].forEach(ifr => {
      const colour = ifr.getAttribute('data-colour');
      console.warn(`Posting ${colour}`);
      ifr.contentWindow.postMessage({
        action: 'repaint',
        colour,
      }, '*');
    });
  },
  500
);
