
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
