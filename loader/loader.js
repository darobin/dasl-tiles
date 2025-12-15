
import express from 'express';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 20);

// The baseHost is the host under which the subdomains for loading will be
// created. Lowercase, no leading dot.
export function createTileLoadingRouter (baseHost) {
  const router = express.Router();
  baseHost = baseHost.toLowerCase().replace(/^./, '');
  router.use((req, res, next) => {
    if (req.hostname === `load.${baseHost}`) {
      const host = `${nanoid()}.${baseHost}`;
      res.redirect(`${req.protocol}://${host}${req.originalUrl || '/'}`);
      return;
    }
    next();
  });
  // XXX
  // - get our own rel
  // - move stuff into the public directory, correctly
  // - set headers right
  router.use(express.static(rel('../public')));
  return router;
}
