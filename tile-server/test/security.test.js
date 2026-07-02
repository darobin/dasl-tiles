
import { equal, ok, deepStrictEqual, match } from 'node:assert';
import express from 'express';
import request from 'supertest';
import { createTileLoadingRouter } from '../dist/index.js';

const BASE = 'tiles.example';

function app () {
  const a = express();
  a.set('trust proxy', 'loopback');
  a.use(createTileLoadingRouter(BASE));
  return a;
}

// Turn a CSP header string into { directive: [values...] }.
function parseCSP (csp) {
  const map = {};
  csp.split(';').map(s => s.trim()).filter(Boolean).forEach(d => {
    const [name, ...vals] = d.split(/\s+/);
    map[name] = vals;
  });
  return map;
}

async function getAsset (path = '/.well-known/web-tiles/worker.js') {
  // A non-"load." host so we hit the static handler rather than the redirect.
  return request(app()).get(path).set('Host', `abc.${BASE}`);
}

describe('tile-server – origin isolation', () => {
  it('redirects load.<host> to a fresh random subdomain (303) preserving the path', async () => {
    const res = await request(app()).get('/.well-known/web-tiles/').set('Host', `load.${BASE}`);
    equal(res.status, 303);
    const loc = new URL(res.headers.location);
    match(loc.hostname, new RegExp(`^[a-z]{20}\\.${BASE.replace('.', '\\.')}$`),
      'redirects to a 20-letter random subdomain of the base host');
    equal(loc.pathname, '/.well-known/web-tiles/', 'path is preserved');
  });

  it('hands out a different subdomain each time (per-tile origin isolation)', async () => {
    const a = app();
    const one = await request(a).get('/x').set('Host', `load.${BASE}`);
    const two = await request(a).get('/x').set('Host', `load.${BASE}`);
    const h1 = new URL(one.headers.location).hostname;
    const h2 = new URL(two.headers.location).hostname;
    ok(h1 !== h2, 'each load gets its own origin');
  });

  it('serves loader assets on non-load hosts', async () => {
    const worker = await getAsset('/.well-known/web-tiles/worker.js');
    equal(worker.status, 200);
    const shuttle = await getAsset('/.well-known/web-tiles/shuttle.js');
    equal(shuttle.status, 200);
  });
});

describe('tile-server – isolation & anti-exfiltration headers', () => {
  it('sets the cross-origin isolation and hardening headers', async () => {
    const res = await getAsset();
    equal(res.headers['service-worker-allowed'], '/');
    equal(res.headers['origin-agent-cluster'], '?1');
    equal(res.headers['cross-origin-resource-policy'], 'cross-origin');
    equal(res.headers['cross-origin-opener-policy'], 'same-origin');
    equal(res.headers['x-content-type-options'], 'nosniff');
    equal(res.headers['referrer-policy'], 'no-referrer');
    equal(res.headers['x-dns-prefetch-control'], 'off');
    match(res.headers['permissions-policy'], /interest-cohort=\(\)/);
    match(res.headers['permissions-policy'], /browsing-topics=\(\)/);
    match(res.headers['x-robots-tag'], /noai/);
  });

  it('CSP confines network access to self/blob/data (no arbitrary-origin exfiltration)', async () => {
    const csp = parseCSP((await getAsset()).headers['content-security-policy']);
    ok(csp['default-src'], 'has a default-src');
    // connect-src is intentionally NOT widened, so fetch/XHR/WebSocket fall back
    // to default-src — which does not allow any remote origin.
    ok(!('connect-src' in csp), 'no connect-src that could widen network access');
    deepStrictEqual(csp['default-src'], ["'self'", 'blob:', 'data:']);
    ok(!csp['default-src'].includes('*'), 'default-src is not a wildcard');
    ok(!csp['default-src'].some(v => v === 'https:' || v === 'http:'), 'no blanket scheme allow');
  });

  it('CSP locks down objects, base URI, and inline attribute handlers', async () => {
    const csp = parseCSP((await getAsset()).headers['content-security-policy']);
    deepStrictEqual(csp['object-src'], ["'none'"]);
    deepStrictEqual(csp['base-uri'], ["'none'"]);
    deepStrictEqual(csp['script-src-attr'], ["'none'"]);
  });

  it('CSP sandbox grants only the intended capabilities and NOT host-hijacking ones', async () => {
    const csp = parseCSP((await getAsset()).headers['content-security-policy']);
    const sandbox = csp['sandbox'] || [];
    for (const cap of ['allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-modals', 'allow-popups', 'allow-popups-to-escape-sandbox', 'allow-downloads']) {
      ok(sandbox.includes(cap), `sandbox should allow ${cap}`);
    }
    // A tile must not be able to navigate/steer the host or grab powerful capabilities.
    for (const forbidden of [
      'allow-top-navigation',
      'allow-top-navigation-by-user-activation',
      'allow-top-navigation-to-custom-protocols',
      'allow-pointer-lock',
      'allow-presentation',
      'allow-orientation-lock',
      'allow-storage-access-by-user-activation',
    ]) {
      ok(!sandbox.includes(forbidden), `sandbox must NOT allow ${forbidden}`);
    }
  });
});
