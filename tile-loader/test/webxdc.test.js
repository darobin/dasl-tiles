
import { equal, ok } from 'node:assert';
import JSZip from 'jszip';
import { WebXDCTileLoader } from '../dist/webxdc.js';

const mothership = {};
const dec = (b) => new TextDecoder().decode(b instanceof ArrayBuffer ? new Uint8Array(b) : b);
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

async function serveZip () {
  const zip = new JSZip();
  zip.file('index.html', '<h1>wx</h1>');
  zip.file('icon.png', new Uint8Array([1, 2, 3]));
  zip.file('manifest.toml', 'name = "WXDC App"\n');
  zip.file('style.css', 'body{}');
  const ab = await zip.generateAsync({ type: 'arraybuffer' });
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => ab });
}

describe('WebXDCTileLoader', () => {
  it('unpacks a .xdc zip into a tile', async () => {
    await serveZip();
    const tile = await new WebXDCTileLoader().load('https://apps.example/app.xdc', mothership);
    ok(tile);
    equal(tile.manifest.name, 'WXDC App', 'name comes from manifest.toml');
  });

  it('maps index.html to / and guesses media types', async () => {
    await serveZip();
    const tile = await new WebXDCTileLoader().load('https://apps.example/app.xdc', mothership);
    const root = await tile.resolvePath('/');
    equal(root.ok, true);
    equal(root.headers['content-type'], 'text/html');
    equal(dec(root.body), '<h1>wx</h1>');
    equal((await tile.resolvePath('/style.css')).headers['content-type'], 'text/css');
  });

  it('registers icon.png as an icon', async () => {
    await serveZip();
    const tile = await new WebXDCTileLoader().load('https://apps.example/app.xdc', mothership);
    ok(tile.manifest.icons?.some(i => i.src === '/icon.png'));
    equal((await tile.resolvePath('/icon.png')).headers['content-type'], 'image/png');
  });

  it('injects a webxdc.js shim as application/javascript', async () => {
    await serveZip();
    const tile = await new WebXDCTileLoader().load('https://apps.example/app.xdc', mothership);
    const res = await tile.resolvePath('/webxdc.js');
    equal(res.ok, true);
    equal(res.headers['content-type'], 'application/javascript');
    ok(dec(res.body).includes('window.webxdc'), 'shim defines the webxdc global');
  });

  it('returns false on non-zip content', async () => {
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode('nope').buffer });
    equal(await new WebXDCTileLoader().load('https://apps.example/app.xdc', mothership), false);
  });
});
