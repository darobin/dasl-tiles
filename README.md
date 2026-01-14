
# Web Tiles

Web Tiles are a DASL technology. They basically make content addressed resource work well
in a web context, and make web content available safely and in privacy-friendly
ways in non-web contexts such as social, commercial, or agentic protocols.

This library is a toolbox for tiles.

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
