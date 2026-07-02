
import { equal, ok, deepStrictEqual } from 'node:assert';
import { MemoryTileLoader } from '../dist/memory.js';

// The Tile constructor only touches the mothership when a 'load' event fires,
// which these tests never trigger, so a bare stub is enough.
const mothership = {};
const dec = (b) => new TextDecoder().decode(b);

describe('MemoryTileLoader', () => {
  it('ignores URLs that are not memory:', async () => {
    const l = new MemoryTileLoader();
    equal(await l.load('at://did:plc:x/ing.dasl.masl/r', mothership), false);
    equal(await l.load('https://example.com/', mothership), false);
  });

  it('returns false for unregistered ids', async () => {
    const l = new MemoryTileLoader();
    equal(await l.load('memory://missing', mothership), false);
  });

  it('loads a registered tile and serves its resources', async () => {
    const l = new MemoryTileLoader();
    l.addTile('demo', { name: 'Demo', resources: { '/': { 'content-type': 'text/html', src: '<h1>hi</h1>' } } });
    const tile = await l.load('memory://demo', mothership);
    ok(tile);
    equal(tile.url, 'memory://demo');
    equal(tile.manifest.name, 'Demo');
    const res = await tile.resolvePath('/');
    equal(res.ok, true);
    equal(res.status, 200);
    equal(res.headers['content-type'], 'text/html');
    equal(dec(res.body), '<h1>hi</h1>');
  });

  it('confines resolution to declared paths and strips query strings', async () => {
    const l = new MemoryTileLoader();
    l.addTile('demo', { name: 'Demo', resources: { '/a': { 'content-type': 'text/plain', src: 'A' } } });
    const tile = await l.load('memory://demo', mothership);
    equal((await tile.resolvePath('/missing')).ok, false, 'undeclared path is 404');
    // Path traversal normalizes within the flat resource map: it can only ever
    // land on a declared key, never escape to host resources.
    equal((await tile.resolvePath('/../../etc/passwd')).ok, false, 'traversal cannot reach host paths');
    equal((await tile.resolvePath('/../a')).ok, true, 'traversal normalizes to a declared key');
    const hit = await tile.resolvePath('/a?leak=secret');
    equal(hit.ok, true, 'query string is ignored when matching');
    deepStrictEqual(Object.keys(hit.headers), ['content-type']);
  });
});
