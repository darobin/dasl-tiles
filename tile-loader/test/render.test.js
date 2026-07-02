
import { equal, ok } from 'node:assert';
import { TileMothership } from '../dist/index.js';
import { MemoryTileLoader } from '../dist/memory.js';

async function demoTile () {
  const m = new TileMothership({ loadDomain: 'load.example.site' });
  const mem = new MemoryTileLoader();
  mem.addTile('t', {
    name: 'My Tile',
    description: 'A friendly description',
    resources: { '/': { 'content-type': 'text/html', src: '<b>secret markup</b>' } },
  });
  m.addLoader(mem);
  return m.loadTile('memory://t');
}

describe('Tile rendering', () => {
  it('renderCard builds a card element showing metadata only', async () => {
    const tile = await demoTile();
    const card = await tile.renderCard();
    equal(card.tagName, 'DIV');
    ok(card.textContent.includes('My Tile'));
    ok(card.textContent.includes('A friendly description'));
    // The card is metadata-only: tile markup is never inlined into the host DOM.
    ok(!card.innerHTML.includes('secret markup'));
  });

  it('renderContent always loads via the sandboxed loader origin, never inline', async () => {
    const tile = await demoTile();
    const ifr = tile.renderContent(400);
    equal(ifr.tagName, 'IFRAME');
    // Content is delivered through an iframe pointed at the isolated server
    // origin — not by injecting tile HTML into the host document.
    equal(ifr.getAttribute('src'), 'https://load.example.site/.well-known/web-tiles/');
    ok(!ifr.innerHTML.includes('secret markup'));
  });
});
