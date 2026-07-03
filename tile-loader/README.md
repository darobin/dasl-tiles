
# @dasl/tile-loader

Load [DASL](https://dasl.ing/) tiles into a web page — safely.

A tile is untrusted web content. This package renders it inside a sandboxed,
cross-origin iframe served by a [`@dasl/tile-server`](../tile-server), where a
service worker answers the tile's resource requests from its manifest. The tile
can only talk to your page through `postMessage`; it can't reach your DOM,
your storage, or the network beyond what the loading server's CSP allows.

> Browser only — it uses the DOM, `fetch`, service workers, and iframes.

## Install

```sh
npm install @dasl/tile-loader
```

## Usage

```js
import { TileMothership } from '@dasl/tile-loader';
import { ATTileLoader }  from '@dasl/tile-loader/at';

const tl = new TileMothership({ loadDomain: 'load.webtiles.example' });
tl.init();
tl.addLoader(new ATTileLoader());

const tile = await tl.loadTile('at://did:plc:…/ing.dasl.masl/3mcjwwoqjqs2v');

document.body.append(await tile.renderCard());   // lightweight, metadata-only
// or, to run the tile:
document.body.append(tile.renderContent());      // sandboxed iframe
```

`loadDomain` must point at a running [`@dasl/tile-server`](../tile-server) — that's
the origin the sandboxed content is loaded from.

## Architecture

Three cooperating layers, all talking over `postMessage`:

- **Mothership** (this module, in your page) — the entry point. You configure it
  with loaders, hand it a URL, and it produces a `Tile`. It holds all the
  privileged capabilities (fetching, file access via loaders); the other layers
  stay generic.
- **Shuttle** (served by the tile server) — a sandboxed iframe on a fresh random
  origin. It installs the service worker and hosts the inner iframe the tile
  renders into, shuttling messages between the worker and the mothership.
- **Worker** (a service worker, served by the tile server) — intercepts the inner
  iframe's requests and asks the mothership to resolve each path, so the tile only
  ever sees the resources its manifest declares.

## API

### `new TileMothership(conf?)`

`conf.loadDomain` — the host of your tile server (defaults to `load.webtil.es`).

- **`init()`** — wire up the message plumbing. Call once.
- **`addLoader(loader)`** / **`removeLoader(loader)`** — register a loader (below).
  Loaders are tried in order until one returns a tile.
- **`await loadTile(url)`** — returns a `Tile`, or `false` if no loader matched.

### `Tile`

- **`await renderCard(options?)`** — a DOM element showing the tile's card
  (metadata only; safe to render many at once). `options.contentHeight` presets the
  height used when the card is clicked to expand.
- **`renderContent(height?)`** — the sandboxed iframe that runs the tile.
- **`url`**, **`manifest`** — the tile's URL and MASL metadata.

### Loaders

Each is a subpath export; add the ones you need:

| Import | Loads | Matches |
| --- | --- | --- |
| `@dasl/tile-loader/at` — `ATTileLoader` | tiles from AT Protocol records | `at://…` |
| `@dasl/tile-loader/car` — `CARTileLoader` | CAR `.tile` files over HTTP | `http(s)://…` |
| `@dasl/tile-loader/webxdc` — `WebXDCTileLoader` | WebXDC `.xdc` bundles over HTTP | `http(s)://…` |
| `@dasl/tile-loader/memory` — `MemoryTileLoader` | in-memory manifests (testing/experiments) | `memory://<id>` |

`@dasl/tile-loader/content-scheme` exports `ContentSchemeTileLoader`, the base class
the HTTP-fetching loaders extend. The `TileLoader` and `TilePathLoader` interfaces
are exported from the package root for writing your own.

## Security model

The isolation guarantees are enforced by the browser under the policy the tile
server sends (per-tile random origin, a strict CSP whose `sandbox` and
`default-src` block host navigation and off-origin network access) together with
the mothership's contract of only ever answering a worker's `resolve-path` request
with `{ status, headers, body }` and never anything else. See
[`@dasl/tile-server`](../tile-server) for the header policy.

## Part of DASL tiles

- [`@dasl/tiles`](../tiles) — meta-package re-exporting the whole toolkit
- [`@dasl/tile-server`](../tile-server) — the browser tile-loading server
- [`@dasl/tile-writer`](../tile-writer) — write tiles into `.tile` files
- [`@dasl/tile-car-reader`](../tile-car-reader) — read tiles from a CAR file
- [`@dasl/tile-lexicon`](../tile-lexicon) — MASL schema and shared types
- [`@dasl/atile`](../atile) — the tile-publishing CLI

## License

Apache-2.0
