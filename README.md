
# Web Tiles

Web Tiles are a DASL technology. They basically make content addressed resource work well
in a web context, and make web content available safely and in privacy-friendly
ways in non-web contexts such as social, commercial, or agentic protocols.

This library is a toolbox for tiles.

## Tile Loader

In order to load a tile into a web page you need to use the tile loader with a specific
loading configuration. It typically looks like this:

```js
import { TileMothership } from '@dasl/tiles/loader';
import { ATTileLoader } from '@dasl/tiles/loader/at';

// AT Tiles!
const at = new ATTileLoader();
const tl = new TileMothership({ loadDomain: 'load.webtiles.bast' });
tl.init();
tl.addLoader(at);

const parent = document.createElement('div');
parent.style.display = 'inline-block';
parent.style.verticalAlign = 'top';
parent.style.padding = '50px';
parent.style.width = '570px';
document.body.append(parent);

const tile = await tl.loadTile(`at://did:plc:izttpdp3l6vss5crelt5kcux/ing.dasl.masl/3mcjwwoqjqs2v`); // Minesweeper
console.warn(`Tile`, tile);
parent.append(await tile.renderCard());
```

The tile-loading architecture has three levels that all communicate together:

- At the top, the MOTHERSHIP. This has access to things in the real world like
  fetching from the internet or reading from the file system. It's the interface
  to tile loading, it gets configured in ways that are appropriate for its
  context. This is the entry point: you give it a URL and it'll instantiate that
  tile. To the extent possible, this should contain all the intelligence and all
  the configurability so that the other components can be deployed in entirely
  generic ways.
- The mothership instantiates tiles by creating insulated contexts (a protected
  iframe, an incognito window…) and loading a SHUTTLE in it. The role of the
  shuttle is to set up a service worker and an iframe to load the root of the
  tile into. It only exists because you need something to carry a service worker
  in. The only other thing that it does is (*drumroll*) shuttle messages back
  and forth between the worker and the mothership.
- The WORKER is dispatched on a shuttle to handle resource loading for a tile.
  Apart from allow-listing some paths for itself and the shuttle, it passes all
  requests up, which the shuttle then hands over to the mothership.

First, you create a mothership using `new TileMothership()`. That mothership is then
initialised and configured with one or more loaders that support getting tiles
from AT Proto (`ATTileLoader`), CAR Tiles (`CARTileLoader`), WebXDC (`WebXDCTileLoader`), or
memory (`MemoryTileLoader`). If you add more than one loader, the mothership will try them
each in turn until one returns a tile (most match on URL scheme).

Once the mothership is configured, you call `loadTile()` on it with a tile URL. And after
the tile has been loaded, you can get a DOM element from either `tile.renderCard()` (for
the card overview) or `tile.renderContent()` that will render the actual tile.

Rendering a card only uses tile metadata and so is safe if you wish to render hundreds or even
thoughts. Rendering content is heavier, and may lead to resource contention. When content is
loaded, an intermediary `iframe` is created by the mothership, known as the shuttle. The
shuttle then sets up a service worker and a nested `iframe` into which the tile will render.
Due to browser limitations, the shuttle needs to be loaded from a website (see the Tiles Loading
Server section below), but that site doesn't get to see or know anything about the tiles.

### `TileMothership`

- `constructor`: accepts `{ loadDomain: 'load.webtiles.example' }` which is the domain from which to
  hit the tile loading server.
- `init()`: must be called once, wires the mothership to make sure that it is ready to operate
- `addLoader(someTileLoader)`: adds a specific class that knows how to load a specific kind of
  tile. You need at least one.
- `await loadTile(url)`: returns either a `Tile` object or `false` if no loader matched.

### `Tile`

This is the tile object produced when a tile is loaded.

- `renderCard()`: renders the card for the tile, returning a DOM element that you can put
  wherever.
- `renderContent(height?)`: renders the actual tile, returning a DOM element for you to insert.
  You can override the tile's height by passing your own.

## `atile` tool

The `atile` tool is used to publish tiles on AT proto. Most operations revolve
around a tile source contained in a directory, with a manifest, that you want
to publish to AT.

```
Usage: atile [options] [command]

Manipulating tiles on the AT protocol

Options:
  -V, --version                  output the version number
  -h, --help                     display help for command

Commands:
  login <handle> <appPassword>   log a handle into AT so that you can post
  logout <handle>                log a specific handle out
  default-user <handle>          set the default handle to use when unspecified
  list-users                     list all logged in handles you have
  publish [options] <dir>        publish a tile to the Atmosphere
  delete [options] <dirOrATURL>  delete a tile from the Atmosphere
  help [command]                 display help for command
```

In order to publish, you must be logged in. For that, you use the `atile login`
command, with an app password. Passwords are stored using `keytar`, which should
map to a safe option on your platform. Every time that you log in with a different
handle, it gets saved separately (and the latest one becomes the default handle).
You can then use a specific handle for other commands with the `--user` option.

You can then use `atile logout` to log a specific handle out, `atile list-users`
to list all the logged in handles, and `atile default user` to change the default
one.

To publish, use `atile publish` and give it the path to a directory that contains
a `manifest.json`, an `index.html`, and all the other files in the tile. It will
automatically populate the `resources` entry of the manifest with the correct
CID and guess the media type. If there is already an entry for that path in 
`resources`, it will keep it and just update the CID. This makes it possible to
set your own HTTP headers there. You can change the handle you use with `--user`
and ask that atile saves the AT URL of the published tile with `-s`. In the latter
case, it will automatically reuse that URL whenever it's given the same path to
publish from.

To delete a tile, use `atile delete`. It acccepts either the AT URL of the tile,
or if you've saved the published URL with `-s` it will find it given the directory.

## Tiles Loading Server

Due to limitations in browser technology, supporting tiles in browsers requires
a very minimalistic server set up so as to isolate tiles in their own origin,
while maintaining the ability to run a service worker (otherwise it's either one
or the other).

The tiles loader is expected to load from `https://load.server/.well-known/web-tiles/`.
The loading server handles that and redirects to 
`https://random-subdomain.server/.well-known/web-tiles/` with the right headers.
That's it!

You can use it either as a library or as a CLI tool.

As a library, there's a function that takes a domain and returns an Express
router configured correctly. Note that if you provide `example.site` for the
base host, it will set itself up to listen on `load.example.site` and redirect
to `twenty-random-letters.example.site`.

```js
import express from 'express';
import { createTileLoadingRouter } from '@dasl/tiles/loading-server';

const app = express();
app.set('trust proxy', 'loopback'); // need this
app.use(createTileLoadingRouter('example.site'));
````

Or just install the global tool, or run it with `npx`:

```
tiles-loading-server example.site 8080
```

## Writing

```js
import TileWrite from '@dasl/tiles/writer';

const tw = new TileWriter({
  name: `My Cat`,
  description: `This basic tile is a picture of my cat.`,
});
tw.addResource('/', { 'content-type': 'text/html' }, { path: '/path/to/index.html') });
tw.addResource('/img/kitsu.jpg', { 'content-type': 'image/jpeg' }, { path: '/path/to/rick.jpg') });
await tw.write('/path/to/output.tile');
```

## Reading from a CAR

The CAR reader indexes the whole tile and resolves paths to return the headers
and the means of creating a stream that reads just that segment of the CAR.
Note that the path resolution will correctly ignore query strings, hashes, etc.

```js
import CarTileReader from '@dasl/tiles/car-reader';

const ctr = new CarTileReader('/path/to/a/car-based.tile');
await ctr.open();
const nf = ctr.resolvePath('/not/exists');
// nf.ok = false, nf.status = 404
const root = ctr.resolvePath('/');
// root.ok = true, root.status = 200
sendHeaders(root.headers); // { 'content-type': 'text/html' }
root.createReadStream().pipe(res); // sends the content
```
