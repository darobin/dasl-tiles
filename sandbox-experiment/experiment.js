
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
  ifr.setAttribute('src', 'inner.html');
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
