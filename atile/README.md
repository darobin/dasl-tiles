
# @dasl/atile

The command-line tool for [DASL](https://dasl.ing/) tiles: publish them to the AT
Protocol, or bundle them into self-contained `.tile` files.

Most operations work from a tile *source directory* — a folder with a
`manifest.json` and your `index.html` and other resources — which `atile` either
uploads to a PDS as an `ing.dasl.masl` record, or packs into a CAR `.tile`.

## Install

```sh
npm install -g @dasl/atile
# or run without installing:
npx @dasl/atile --help
```

> Credentials are stored with [`keytar`](https://www.npmjs.com/package/keytar),
> which has a native build step; `npm` will compile it on install.

## Commands

```
Usage: atile [options] [command]

Commands:
  login <handle> <appPassword>   log a handle into AT so that you can post
  logout <handle>                log a specific handle out
  default-user <handle>          set the default handle to use when unspecified
  list-users                     list all logged in handles you have
  publish [options] <dir>        publish a tile to the Atmosphere
  delete [options] <dirOrATURL>  delete a tile from the Atmosphere
  bundle <dir> <out>             bundle a tile into a .tile file
  help [command]                 display help for command
```

### Bundling (no login needed)

Pack a source directory into a self-contained CAR `.tile` that any tile reader can
open:

```sh
atile bundle ./my-tile ./my-tile.tile
```

### Publishing to AT

First log in with an [app password](https://bsky.app/settings/app-passwords). The
handle is stored securely and becomes the default; log in with several and switch
between them with `--user`.

```sh
atile login me.example.com xxxx-xxxx-xxxx-xxxx
atile publish ./my-tile
```

`atile publish` reads `./my-tile/manifest.json`, content-addresses every file,
fills in the `resources` map (guessing media types), uploads the blobs, and writes
the tile record. Useful options:

- **`-u, --user <handle>`** — publish as a specific logged-in handle.
- **`-s, --stable-id`** — remember the tile's AT URL for this directory and update
  that record in place on future publishes, instead of creating a new one.
- **`-t, --tid <tid>`** — publish under a specific record key (overrides `-s`).

### Deleting

```sh
atile delete at://did:plc:…/ing.dasl.masl/3m…
atile delete ./my-tile         # if you published it with -s
```

### Managing handles

```sh
atile list-users               # all logged-in handles
atile default-user me.example.com
atile logout me.example.com
```

## Part of DASL tiles

- [`@dasl/tiles`](../tiles) — meta-package re-exporting the whole toolkit
- [`@dasl/tile-loader`](../tile-loader) — load tiles in the browser
- [`@dasl/tile-server`](../tile-server) — the browser tile-loading server
- [`@dasl/tile-writer`](../tile-writer) — write tiles into `.tile` files
- [`@dasl/tile-car-reader`](../tile-car-reader) — read tiles from a CAR file
- [`@dasl/tile-lexicon`](../tile-lexicon) — MASL schema and shared types

## License

Apache-2.0
