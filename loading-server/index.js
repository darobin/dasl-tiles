
import express from 'express';
import { customAlphabet } from 'nanoid';
import makeRel from '../lib/rel.js';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 20);
const rel = makeRel(import.meta.url);

// The baseHost is the host under which the subdomains for loading will be
// created. Lowercase, no leading dot.
export function createTileLoadingRouter (baseHost) {
  const router = express.Router();
  baseHost = baseHost.toLowerCase().replace(/^\./, '');
  router.use((req, res, next) => {
    if (req.hostname === `load.${baseHost}`) {
      const host = `${nanoid()}.${baseHost}`;
      res.redirect(303, `${req.protocol}://${host}${req.originalUrl || '/'}`);
      return;
    }
    next();
  });
  router.use('/.well-known/web-tiles/', express.static(rel('./public'), {
    setHeaders (res) {
      res.set({
        'service-worker-allowed': '/',
        'origin-agent-cluster': '?1',
        'referrer-policy': 'no-referrer',
        'permissions-policy': 'interest-cohort=(), browsing-topics=()',
        // 'cross-origin-embedder-policy': 'require-corp',
        'cross-origin-resource-policy': 'cross-origin',
        'cross-origin-opener-policy': 'same-origin',
        'x-content-type-options': 'nosniff',
        'x-dns-prefetch-control': 'off',
        'content-security-policy': [
          `default-src 'self' blob: data:`,
          `script-src 'self' blob: data: 'unsafe-inline' 'wasm-unsafe-eval'`,
          `script-src-attr 'none'`,
          `style-src 'self' blob: data: 'unsafe-inline'`,
          `form-src 'self'`,
          `manifest-src 'none'`,
          `object-src 'none'`,
          `base-uri 'none'`,
          `sandbox allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts`,
        ].join('; '),
        'tk': 'N',
        'x-robots-tag': "noai, noimageai",
      });
    },
  }));
  return router;
}
