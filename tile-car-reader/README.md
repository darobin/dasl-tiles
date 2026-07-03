
# @dasl/tile-car-reader

Read [DASL](https://dasl.ing/) tiles from a CAR-based `.tile` file.

The reader indexes a tile once on `open()`, then resolves request paths to their
HTTP headers and a stream over just that resource's bytes — without reading the
whole file into memory. Path resolution ignores query strings and hashes, so
`/img/cat.jpg?v=2` resolves the same as `/img/cat.jpg`.

> Node.js only — it opens the file and hands back `node:fs` read streams.

## Install

```sh
npm install @dasl/tile-car-reader
```

## Usage

```js
import CarTileReader from '@dasl/tile-car-reader';

const ctr = new CarTileReader('/path/to/a/car-based.tile');
await ctr.open();

const nf = ctr.resolvePath('/not/exists');
// nf.ok === false, nf.status === 404

const root = ctr.resolvePath('/');
// root.ok === true, root.status === 200
sendHeaders(root.headers);            // { 'content-type': 'text/html' }
root.createReadStream().pipe(res);    // stream the bytes

ctr.close();
```

## API

### `new CarTileReader(path)`

`path` is the location of the `.tile` file on disk.

### `await reader.open()`

Reads the header and builds the resource index. Must be called before
`resolvePath`.

### `reader.meta`

The tile's MASL metadata (a [`StoredMasl`](../tile-lexicon)), with the CAR
bookkeeping (`version`, `roots`) stripped.

### `reader.resolvePath(path)`

Returns either:

- **hit** — `{ ok: true, status: 200, statusText, headers, createReadStream() }`,
  where `createReadStream()` streams exactly that resource's bytes; or
- **miss** — `{ ok: false, status: 404, statusText }` (no stream).

The `CarResolveResult` / `CarResolveOk` / `CarResolveError` types are exported for
TypeScript consumers.

### `reader.close()`

Closes the underlying file handle. Safe to call more than once.

## Part of DASL tiles

- [`@dasl/tiles`](../tiles) — meta-package re-exporting the whole toolkit
- [`@dasl/tile-loader`](../tile-loader) — load tiles in the browser
- [`@dasl/tile-server`](../tile-server) — the browser tile-loading server
- [`@dasl/tile-writer`](../tile-writer) — write tiles into `.tile` files
- [`@dasl/tile-lexicon`](../tile-lexicon) — MASL schema and shared types
- [`@dasl/atile`](../atile) — the tile-publishing CLI

## License

Apache-2.0
