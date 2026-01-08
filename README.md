
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
