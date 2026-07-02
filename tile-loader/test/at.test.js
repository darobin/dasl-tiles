
import { equal, ok } from 'node:assert';
import { ATTileLoader } from '../dist/at.js';

const mothership = {};
const dec = (b) => new TextDecoder().decode(b);
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const DID = 'did:plc:izttpdp3l6vss5crelt5kcux';
const manifest = {
  name: 'AT Tile',
  resources: { '/': { 'content-type': 'text/html', src: { $link: 'bafkreiroot' } } },
};

function json (obj) { return { ok: true, json: async () => obj }; }

// Wire a fake PDS: DID doc resolution, getRecord, getBlob.
function serveAT ({ blobOk = true } = {}) {
  globalThis.fetch = async (u) => {
    const url = String(u);
    if (url.startsWith('https://plc.directory/')) {
      return json({ service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.example' }] });
    }
    if (url.includes('com.atproto.repo.getRecord')) return json({ value: { tile: manifest } });
    if (url.includes('com.atproto.sync.getBlob')) {
      if (!blobOk) return { ok: false, arrayBuffer: async () => new ArrayBuffer(0) };
      return { ok: true, arrayBuffer: async () => new TextEncoder().encode('<h1>at</h1>').buffer };
    }
    return { ok: false, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
}

describe('ATTileLoader', () => {
  it('ignores non-at: URLs', async () => {
    serveAT();
    equal(await new ATTileLoader().load('https://example.com/', mothership), false);
  });

  it('declines collections that are not ing.dasl.masl', async () => {
    serveAT();
    equal(await new ATTileLoader().load(`at://${DID}/app.bsky.feed.post/x`, mothership), undefined);
  });

  it('resolves a tile record into a live Tile and serves blobs', async () => {
    serveAT();
    const tile = await new ATTileLoader().load(`at://${DID}/ing.dasl.masl/rkey`, mothership);
    ok(tile);
    equal(tile.manifest.name, 'AT Tile');
    const res = await tile.resolvePath('/');
    equal(res.ok, true);
    equal(res.headers['content-type'], 'text/html');
    equal(dec(res.body), '<h1>at</h1>');
  });

  it('404s undeclared paths', async () => {
    serveAT();
    const tile = await new ATTileLoader().load(`at://${DID}/ing.dasl.masl/rkey`, mothership);
    equal((await tile.resolvePath('/secret')).ok, false);
  });

  it('returns not-found when the blob cannot be fetched', async () => {
    serveAT({ blobOk: false });
    const tile = await new ATTileLoader().load(`at://${DID}/ing.dasl.masl/rkey`, mothership);
    equal((await tile.resolvePath('/')).ok, false);
  });

  it('fails closed when the DID is not resolvable', async () => {
    globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
    equal(await new ATTileLoader().load(`at://${DID}/ing.dasl.masl/rkey`, mothership), false);
  });
});
