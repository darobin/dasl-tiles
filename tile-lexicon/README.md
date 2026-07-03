
# @dasl/tile-lexicon

The AT Protocol lexicon and MASL schema for [DASL](https://dasl.ing/) tiles, plus
the shared TypeScript types used across the `@dasl/tile-*` packages.

This package is the single source of truth for the shapes of a tile manifest
(MASL), its resources, and the responses produced when resolving a resource. It
ships no runtime logic beyond the schema data — everything else is types, which
erase at compile time.

## Install

```sh
npm install @dasl/tile-lexicon
```

## Runtime exports

```js
import { masl, maslHTTPHeaders } from '@dasl/tile-lexicon';

masl.id;                    // 'ing.dasl.masl'
masl.defs.masl.required;    // ['name', 'resources']
maslHTTPHeaders['content-type']; // { type: 'string' }
```

- **`masl`** — the `ing.dasl.masl` lexicon document (the `masl` object definition
  and the tid-keyed `main` record that instantiates it into an AT record).
- **`maslHTTPHeaders`** — the set of HTTP headers a MASL resource may carry,
  expressed as lexicon property definitions.

## Types

Type-only imports (`import type { … }`) give you the vocabulary the other packages
speak:

```ts
import type {
  Masl, StoredMasl, WriterMasl, InMemoryMasl, AnyMasl,
  ResourceEntry, StoredResourceEntry, WriterResourceEntry, InMemoryResourceEntry,
  CidLink, BlobRef, MaslHeaders,
  MaslResponse, MaslResponseOk, MaslResponseError,
  MaslIcon, MaslScreenshot, MaslSizing,
} from '@dasl/tile-lexicon';
```

`Masl<E>` is generic over the shape of its resource entries, because the same
manifest is described differently depending on context:

| Alias | Resource `src` is… | Used by |
| --- | --- | --- |
| `StoredMasl` | a `CidLink` / `BlobRef` read from a CAR or AT record | `@dasl/tile-car-reader`, AT/CAR loaders |
| `WriterMasl` | a `CidLink` / `BlobRef` filled in on write (optional while building) | `@dasl/tile-writer`, `atile` |
| `InMemoryMasl` | raw bytes (`ArrayBuffer` / `Uint8Array` / `string`) | memory & webXDC loaders |
| `AnyMasl` | any of the above | `@dasl/tile-loader` |

## Part of DASL tiles

- [`@dasl/tiles`](../tiles) — meta-package re-exporting the whole toolkit
- [`@dasl/tile-loader`](../tile-loader) — load tiles in the browser
- [`@dasl/tile-server`](../tile-server) — the browser tile-loading server
- [`@dasl/tile-writer`](../tile-writer) — write tiles into `.tile` files
- [`@dasl/tile-car-reader`](../tile-car-reader) — read tiles from a CAR file
- [`@dasl/atile`](../atile) — the tile-publishing CLI

## License

Apache-2.0
