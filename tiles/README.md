
# @dasl/tiles

All-purpose [DASL](https://dasl.ing/) web tiles library.

This is a meta-package: it re-exports the focused `@dasl/tile-*` libraries under a
single dependency, preserving the original `@dasl/tiles/*` import paths and the
`atile` / `tiles-loading-server` binaries. Existing code keeps working unchanged;
new code can depend on the smaller packages directly (recommended).

## Install

```sh
npm install @dasl/tiles
```

## Subpaths

Every import resolves to the corresponding standalone package (and carries its
TypeScript types):

| Import from `@dasl/tiles` | Backed by | Docs |
| --- | --- | --- |
| `@dasl/tiles/loader` | `@dasl/tile-loader` | [tile-loader](../tile-loader) |
| `@dasl/tiles/loader/at` · `/car` · `/memory` · `/content-scheme` · `/webxdc` | `@dasl/tile-loader/*` | [tile-loader](../tile-loader) |
| `@dasl/tiles/writer` | `@dasl/tile-writer` | [tile-writer](../tile-writer) |
| `@dasl/tiles/car-reader` | `@dasl/tile-car-reader` | [tile-car-reader](../tile-car-reader) |
| `@dasl/tiles/loading-server` | `@dasl/tile-server` | [tile-server](../tile-server) |

Binaries: **`atile`** ([@dasl/atile](../atile)) and **`tiles-loading-server`**
([@dasl/tile-server](../tile-server)).

## Examples

```js
// Loading tiles in the browser
import { TileMothership } from '@dasl/tiles/loader';
import { ATTileLoader }  from '@dasl/tiles/loader/at';

// Writing a tile
import TileWriter from '@dasl/tiles/writer';

// Reading a CAR tile
import CarTileReader from '@dasl/tiles/car-reader';

// Running the loading server
import { createTileLoadingRouter } from '@dasl/tiles/loading-server';
```

See each linked package for full documentation.

## Part of DASL tiles

- [`@dasl/tile-loader`](../tile-loader) — load tiles in the browser
- [`@dasl/tile-server`](../tile-server) — the browser tile-loading server
- [`@dasl/tile-writer`](../tile-writer) — write tiles into `.tile` files
- [`@dasl/tile-car-reader`](../tile-car-reader) — read tiles from a CAR file
- [`@dasl/tile-lexicon`](../tile-lexicon) — MASL schema and shared types
- [`@dasl/atile`](../atile) — the tile-publishing CLI

## License

Apache-2.0
