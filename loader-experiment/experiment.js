
import { TileMothership, MemoryTileLoader } from './tile-loader.js';

// XXX
// x move most of this to tile-loader
// x load tile-loader
// x have it resolve content in memory with the same colour thing
// - move on to move complex things
// - refactor the tile-loader to be a proper library
// - refactor it to split, too

// A more real experiment!
const mem = new MemoryTileLoader();
const colours = {
  green: 'oklch(69.3% 0.151 180)',
  light: 'oklch(79.3% 0.136 270)',
  dark: 'oklch(54.3% 0.091 270)',
  pink: 'oklch(74.3% 0.143 0.31)',
  yellow: 'oklch(89.3% 0.121 90.3)',
};

const tl = new TileMothership({ loadDomain: 'load.webtiles.bast' });
tl.init();
tl.addLoader(mem);

for (const ent of Object.entries(colours)) {
  const [id, colour] = ent;
  mem.addTile(id, {
    name: `Basic ${id} Tile`,
    description: `This is a very simple tile that we can load from memory and that has enough content to be worth playing with. It comes in ${colour} shade.`,
    screenshots: [{ src: '/img/shot' }],
    icons: [{ src: `/img/icon` }],
    resources: {
      '/': {
        src: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Tile!</title>
              <link rel="stylesheet" href="/style.css"></head><body><p>hi from ${colour}!</p></body></html>`,
        'content-type': 'text/html',
      },
      '/style.css': {
        src: `body { background: ${colour}; }\n`,
        'content-type': 'text/css',
      },
      '/img/shot': {
        src: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600">
          <rect x="0" y="0" width="100%" height="100%" fill="${colour}"></rect>
          <circle cx="50%" cy="50%" r="300" fill="lime"></circle>
        </svg>`,
        'content-type': 'image/svg+xml',
      },
      '/img/icon': {
        src: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px">
          <circle cx="50%" cy="50%" r="20" fill="${colour}"></circle>
        </svg>`,
        'content-type': 'image/svg+xml',
      },
    },
  });
  const parent = document.createElement('div');
  parent.style.display = 'inline-block';
  parent.style.verticalAlign = 'top';
  parent.style.padding = '50px';
  parent.style.width = '570px';
  document.body.append(parent);
  const tile = await tl.loadTile(`memory://${id}`);
  parent.append(await tile.renderCard());
}
