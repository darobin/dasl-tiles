
# Web Tiles

Web Tiles are a DASL technology. They basically make content addressed resource work well
in a web context, and make web content available safely and in privacy-friendly
ways in non-web contexts such as social, commercial, or agentic protocols.

This library is a toolbox for tiles.

## Writing

```js
import TileWrite from '@dasl/tiles/writer.js';

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
const ctr = new CarTileReader('/path/to/a/car-based.tile');
await ctr.open();
const nf = ctr.resolvePath('/not/exists');
// nf.ok = false, nf.status = 404
const root = ctr.resolvePath('/');
// root.ok = true, root.status = 200
sendHeaders(root.headers); // { 'content-type': 'text/html' }
root.createReadStream().pipe(res); // sends the content
```
