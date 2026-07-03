
# @dasl/tile-server

The minimal server that makes browser tile loading safe.

Isolating untrusted [DASL](https://dasl.ing/) tiles in the browser needs two things
a normal static host doesn't give you: a **fresh origin per tile**, and a service
worker allowed to control that origin. This package is a tiny Express router (and a
CLI) that does exactly that — it serves the loader runtime (the
shuttle and worker from [`@dasl/tile-loader`](../tile-loader)) under a hardened set
of headers, and redirects each load onto its own random subdomain.

It never sees or stores tile content; it only serves the fixed runtime assets.

## Install

```sh
npm install @dasl/tile-server
```

## As a library

`createTileLoadingRouter(baseHost)` returns an Express router. Give it your base
host; it listens on `load.<baseHost>` and redirects each request to a random
`<subdomain>.<baseHost>`:

```js
import express from 'express';
import { createTileLoadingRouter } from '@dasl/tile-server';

const app = express();
app.set('trust proxy', 'loopback'); // needed so req.hostname is right behind a proxy
app.use(createTileLoadingRouter('example.site'));
app.listen(1503);
```

You are responsible for pointing `load.example.site` and `*.example.site` at this
app (wildcard DNS + TLS), and for setting `loadDomain: 'load.example.site'` on the
[mothership](../tile-loader).

## As a CLI

```sh
# installed globally, or via npx
tiles-loading-server example.site 8080
```

Starts an Express app on the given port (default `1503`) serving the router for the
given base host.

## What it enforces

- **Per-tile origin isolation** — a request to `load.<host>` gets a `303` redirect
  to a fresh 20-character random subdomain, so every tile loads on its own origin,
  cross-origin from your site and from every other tile.
- **A strict Content-Security-Policy** on the runtime assets. Notably `default-src`
  is limited to `'self' blob: data:` with no `connect-src`, so a tile's
  `fetch`/`XHR`/`WebSocket` can't reach arbitrary origins (no data exfiltration);
  `sandbox` grants scripts/forms/popups but **not** top-navigation or other
  host-hijacking capabilities; `object-src`, `base-uri`, and `script-src-attr` are
  `'none'`.
- **Cross-origin isolation & hardening headers** — `Cross-Origin-Opener-Policy:
  same-origin`, `Cross-Origin-Resource-Policy: cross-origin`, `Origin-Agent-Cluster:
  ?1`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  interest-cohort/browsing-topics disabled, and `Service-Worker-Allowed: /` so the
  loader's worker can control the origin.

Everything is served under `/.well-known/web-tiles/`.

## Part of DASL tiles

- [`@dasl/tiles`](../tiles) — meta-package re-exporting the whole toolkit
- [`@dasl/tile-loader`](../tile-loader) — load tiles in the browser
- [`@dasl/tile-writer`](../tile-writer) — write tiles into `.tile` files
- [`@dasl/tile-car-reader`](../tile-car-reader) — read tiles from a CAR file
- [`@dasl/tile-lexicon`](../tile-lexicon) — MASL schema and shared types
- [`@dasl/atile`](../atile) — the tile-publishing CLI

## License

Apache-2.0
