
# @dasl/tile-writer

Write [DASL](https://dasl.ing/) tiles into CAR-based `.tile` files.

A tile is a bundle of web resources (an `index.html`, images, scripts…) addressed
by content and described by MASL metadata. `TileWriter` takes that metadata plus a
set of source files, content-addresses each resource, and streams out a single
`.tile` (a CAR) with the metadata in the header and the resource bytes as blocks.
Identical resources are de-duplicated into a single block.

> Node.js only — it reads source files and writes the output with `node:fs`.

## Install

```sh
npm install @dasl/tile-writer
```

## Usage

```js
import TileWriter from '@dasl/tile-writer';

const tw = new TileWriter({
  name: `My Cat`,
  description: `This basic tile is a picture of my cat.`,
});

// addResource(path, headers, source)
tw.addResource('/', { 'content-type': 'text/html' }, { path: '/path/to/index.html' });
tw.addResource('/img/kitsu.jpg', { 'content-type': 'image/jpeg' }, { path: '/path/to/kitsu.jpg' });

await tw.write('/path/to/output.tile');
```

The result round-trips through [`@dasl/tile-car-reader`](../tile-car-reader).

## API

### `new TileWriter(masl)`

`masl` is the tile's MASL metadata (a [`WriterMasl`](../tile-lexicon) — e.g. `name`,
`description`, `icons`, `sizing`…). Passing single-resource metadata that carries
its own `src` throws — that shape is for a lone resource, not a tile.

### `writer.setMASL(masl)`

Replace the metadata.

### `writer.addResource(path, headers, source)`

- **`path`** — the request path the resource answers to (query strings are dropped;
  `/` is the tile root, typically your `index.html`).
- **`headers`** — a [`MaslHeaders`](../tile-lexicon) object. Unsupported headers are
  dropped with a warning; `content-type` is the one you'll usually set. See
  `supportedHTTPHeaders` for the current allowlist.
- **`source`** — `{ path }` pointing at the file to read the bytes from.

### `await writer.write(out)`

Content-addresses every resource, de-duplicates identical blocks, and writes the
`.tile` (CAR) to the file path `out`.

### `supportedHTTPHeaders`

A `Set<string>` of the HTTP headers currently persisted into a tile.

## Part of DASL tiles

- [`@dasl/tiles`](../tiles) — meta-package re-exporting the whole toolkit
- [`@dasl/tile-loader`](../tile-loader) — load tiles in the browser
- [`@dasl/tile-server`](../tile-server) — the browser tile-loading server
- [`@dasl/tile-car-reader`](../tile-car-reader) — read tiles from a CAR file
- [`@dasl/tile-lexicon`](../tile-lexicon) — MASL schema and shared types
- [`@dasl/atile`](../atile) — the tile-publishing CLI

## License

Apache-2.0
