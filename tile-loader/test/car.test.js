
import { equal, ok } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import { CARTileLoader } from '../dist/car.js';

const rel = (pth) => fileURLToPath(new URL(pth, import.meta.url));
const mothership = {};
const realFetch = globalThis.fetch;

let carAB;
before(async () => {
  const buf = await readFile(rel('./fixtures/rick.tile'));
  carAB = new Uint8Array(buf).buffer;
});
afterEach(() => { globalThis.fetch = realFetch; });

function serveCar () {
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => carAB });
}

describe('CARTileLoader', () => {
  it('fetches a CAR tile over http and serves its resources', async () => {
    serveCar();
    const tile = await new CARTileLoader().load('https://tiles.example/rick.tile', mothership);
    ok(tile);
    const res = await tile.resolvePath('/');
    equal(res.ok, true);
    equal(res.headers['content-type'], 'text/html');
    const want = await readFile(rel('./fixtures/rick/index.html'));
    ok(Buffer.from(res.body).equals(want), 'root bytes match');
  });

  it('confines resolution to resources declared in the CAR', async () => {
    serveCar();
    const tile = await new CARTileLoader().load('https://tiles.example/rick.tile', mothership);
    equal((await tile.resolvePath('/etc/passwd')).ok, false);
    equal((await tile.resolvePath('/img/rick.jpg?leak=1')).ok, true, 'query string ignored');
  });

  it('refuses schemes it was not configured for', async () => {
    serveCar();
    // only file: allowed -> an http URL is declined without ever fetching
    equal(await new CARTileLoader(['file']).load('https://tiles.example/x', mothership), false);
  });

  it('returns false for non-CAR content instead of throwing', async () => {
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode('not a car').buffer });
    equal(await new CARTileLoader().load('https://tiles.example/x', mothership), false);
  });

  it('returns false when the fetch fails', async () => {
    globalThis.fetch = async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) });
    equal(await new CARTileLoader().load('https://tiles.example/x', mothership), false);
  });
});
