
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
  async processContent(zipData, _, url, mothership) {
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
    // Add webxdc.js. NOTE: we need to make this pluggable so that it can actually
    // do some useful work.
    manifest.resources['/webxdc.js'] = {
      src: makeWebXDCAPI(),
      'content-type': 'application/javascript',
    };
    const loader = new MemoryPathLoader(manifest);
    return new Tile(mothership, url, manifest, loader);
  }
}

// This is the resource that implements webxdc.js. (Based on webxdc/hello.)
// Note that joinRealtimeChannel() is marked as optional, so we skip it.
// These are mostly stubs, e.g. sendToChat() just dumps to the console,
// setUpdateListener() does nothing at all.
function makeWebXDCAPI ({ selfName = 'Dazzling Kitten', selfAddr } = {}) {
  return [
    // self-func
    `window.webxdc = (() => {`,

    // returned object
    `return {`,
    // selfies
    `selfAddr: "${selfAddr || crypto.randomUUID()}",
    selfName: "${selfName}",`,

    // updates
    `sendUpdate: (update) => {
      console.log('sendUpdate', update);
    },
    setUpdateListener: () => {
    },
    getAllUpdates: () => {
      console.log("[Webxdc] WARNING: getAllUpdates() is deprecated.");
      return Promise.resolve([]);
    },`,

    // sendToChat
    `sendToChat: async (content) => {
      if (!content.file && !content.text) {
        alert("🚨 Error: either file or text need to be set. (or both)");
        return Promise.reject(
          "Error from sendToChat: either file or text need to be set",
        );
      }
      console.info('sendToChat', content);
    },`,

    // importFiles
    `importFiles: (filters) => {
      const accept = [
        ...(filters.extensions || []),
        ...(filters.mimeTypes || []),
      ].join(",");
      const element = document.createElement("input");
      element.setAttribute('type', 'file');
      element.setAttribute('accept', accept);
      if (filters.multiple) element.setAttribute('multiple', 'multiple');
      const promise = new Promise((resolve) => {
        element.onchange = () => {
          const files = Array.from(element.files || []);
          document.body.removeChild(element);
          resolve(files);
        };
      });
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      return promise;
    },`,
    // close object
    `};`,
    // close self-func
    `})();`
  ].join('\n');
}
