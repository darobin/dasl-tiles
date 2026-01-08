
import JSZip from "jszip";
import mime from 'mime/lite';
import { parse } from 'smol-toml';
import { Tile } from "../loader.js";
import { ContentSchemeTileLoader } from "./content-scheme.js";
import { MemoryPathLoader } from './memory.js';

// ### WebXDC (DeltaChat) Loader
// WebXDC works this way:
//  - It's a zip file with a bunch of files, you have to guess the media type.
//  - It must have an index.html at the root, which is the /.
//  - It may have icon.{png,jpg} at the root.
//  - It may have a manifest.toml (seriously), that may have a name entry and
//    one pointing to the source.
export class WebXDCTileLoader extends ContentSchemeTileLoader {
  constructor (schemes) {
    super(schemes);
  }
  async processContent (zipData, _, url, mothership) {
    const zip = new JSZip();
    try {
      await zip.loadAsync(zipData);
    }
    catch (e) {
      return false;
    }
    const manifest = {
      resources: {},
    };
    // We could extract a description from index.html
    for (const path of Object.keys(zip.files)) {
      if (zip.files[path].dir) continue;
      const keyPath = (path === 'index.html') ? '/' : `/${path}`;
      if (/^icon\.(png|jpg)$/.test(path)) {
        if (!manifest.icons) manifest.icons = [];
        manifest.icons.push({ src: keyPath });
      }
      else if (path === 'manifest.toml') {
        const toml = parse(await zip.file(path).async('text'));
        manifest.name = toml.name;
      }
      const mediaType = mime.getType(path);
      console.warn(mediaType, path, zip);
      manifest.resources[keyPath] = {
        src: await zip.files[path].async('arraybuffer'),
        'content-type': mediaType,
      };
    }
    const loader = new MemoryPathLoader(manifest);
    return new Tile(mothership, url, manifest, loader);
  }
}
