
import { equal, ok, deepStrictEqual } from 'node:assert';
import { TileMothership } from '../dist/index.js';
import { MemoryTileLoader } from '../dist/memory.js';

const tick = () => new Promise(r => setTimeout(r, 15));
const dec = (b) => new TextDecoder().decode(b);

// Wire actions must match the private protocol constants in the loader.
const WORKER_REQUEST = 'tiles-worker-request';
const WORKER_RESPONSE = 'tiles-worker-response';
const WORKER_LOAD = 'tiles-worker-load';
const SHUTTLE_READY = 'tiles-shuttle-ready';
const WORKER_READY = 'tiles-worker-ready';

function fakeShuttle () {
  const posted = [];
  return { posted, contentWindow: { postMessage: (msg, origin) => posted.push({ msg, origin }) } };
}

function send (data) {
  window.dispatchEvent(new window.MessageEvent('message', { data }));
}

describe('TileMothership – loader orchestration', () => {
  it('tries loaders in order and returns the first hit, else false', async () => {
    const m = new TileMothership();
    const mem = new MemoryTileLoader();
    mem.addTile('t', { name: 'T', resources: { '/': { 'content-type': 'text/html', src: 'x' } } });
    m.addLoader(mem);
    equal(await m.loadTile('memory://nope'), false);
    ok(await m.loadTile('memory://t'));
  });

  it('does not throw when a loader is handed a URL it cannot parse', async () => {
    // Regression: memory/content-scheme loaders used to throw on at:// URLs
    // (unparseable authority), crashing the whole loadTile chain.
    const m = new TileMothership();
    m.addLoader(new MemoryTileLoader());
    equal(await m.loadTile('at://did:plc:abc/ing.dasl.masl/rkey'), false);
  });

  it('removeLoader detaches a loader by reference', async () => {
    const m = new TileMothership();
    const mem = new MemoryTileLoader();
    mem.addTile('t', { name: 'T', resources: { '/': { 'content-type': 'text/html', src: 'x' } } });
    m.addLoader(mem);
    m.removeLoader(mem);
    equal(await m.loadTile('memory://t'), false);
  });

  it('derives the load source from the configured domain (isolated origin)', () => {
    equal(new TileMothership({ loadDomain: 'load.example.site' }).getLoadSource(),
      'https://load.example.site/.well-known/web-tiles/');
    equal(new TileMothership().getLoadSource(),
      'https://load.webtil.es/.well-known/web-tiles/');
  });
});

describe('TileMothership – isolation contract', () => {
  // The ONLY channel between a tile and its host is postMessage. The mothership
  // must (a) only ever act on the handful of known protocol actions, (b) answer
  // a worker's resolve-path request with nothing more than {status, headers,
  // body}, and (c) confine resolution to the tile's declared resources.
  async function setup () {
    const m = new TileMothership();
    m.init();
    const mem = new MemoryTileLoader();
    mem.addTile('t', { name: 'T', resources: { '/ok': { 'content-type': 'text/plain', src: 'DATA' } } });
    m.addLoader(mem);
    const tile = await m.loadTile('memory://t');
    const shuttle = fakeShuttle();
    const id = m.registerShuttleFrame(shuttle, tile);
    return { m, tile, shuttle, id };
  }

  it('answers resolve-path with exactly {status, headers, body} and nothing else', async () => {
    const { shuttle, id } = await setup();
    send({ action: WORKER_REQUEST, id, type: 'resolve-path', payload: { path: '/ok', requestId: 7 } });
    await tick();
    equal(shuttle.posted.length, 1, 'exactly one message back');
    const { msg, origin } = shuttle.posted[0];
    equal(origin, '*');
    equal(msg.action, WORKER_RESPONSE);
    equal(msg.id, id);
    deepStrictEqual(Object.keys(msg.payload).sort(), ['requestId', 'response']);
    equal(msg.payload.requestId, 7);
    equal(msg.payload.response.status, 200);
    equal(dec(msg.payload.response.body), 'DATA');
    deepStrictEqual(Object.keys(msg.payload.response).sort(), ['body', 'headers', 'status'],
      'no host state leaks into the response');
  });

  it('confines resolve-path to declared resources (undeclared -> 404, no body)', async () => {
    const { shuttle, id } = await setup();
    send({ action: WORKER_REQUEST, id, type: 'resolve-path', payload: { path: '/secret', requestId: 1 } });
    await tick();
    const resp = shuttle.posted[0].msg.payload.response;
    equal(resp.status, 404);
    equal(resp.body, undefined);
  });

  it('strips query strings before resolving (no smuggling via ?)', async () => {
    const { shuttle, id } = await setup();
    send({ action: WORKER_REQUEST, id, type: 'resolve-path', payload: { path: '/ok?exfiltrate=1', requestId: 2 } });
    await tick();
    equal(shuttle.posted[0].msg.payload.response.status, 200);
  });

  it('ignores unknown / hostile actions entirely (no postMessage, no throw)', async () => {
    const { shuttle, id } = await setup();
    send({ action: 'evil-exfiltrate', id, payload: { steal: 'everything' } });
    send({ action: 'tiles-worker-request', id, type: 'unknown-request-type', payload: {} });
    send({ nonsense: true });
    await tick();
    equal(shuttle.posted.length, 0, 'nothing is sent in response to unknown input');
  });

  it('performs the ready handshake: shuttle-ready -> worker-load', async () => {
    const { shuttle, id } = await setup();
    send({ action: SHUTTLE_READY, id });
    await tick();
    ok(shuttle.posted.some(p => p.msg.action === WORKER_LOAD), 'tells the worker to load');
  });

  it('dispatches a load event on the tile when the worker reports ready', async () => {
    const { tile, id } = await setup();
    let loaded = false;
    tile.addEventListener('load', () => { loaded = true; });
    send({ action: WORKER_READY, id });
    await tick();
    ok(loaded, 'tile fires load');
  });
});
