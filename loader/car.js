
import { ContentSchemeTileLoader } from "./content-scheme.js";

// ### CAR Tiles
export class CARTileLoader extends ContentSchemeTileLoader {
  constructor (schemes) {
    super(schemes);
  }
  async processContent (car, scheme) {
    // XXX
    //  - if it's not CAR data, return false
    //  - for http we assume that we have the file in memory (we could do range
    //    requests but let's not right now)
    //  - for file, we scan and save offsets
    //  - extract the manifest
    //  - make a path loader that will point to the right part depending on scheme
  }
}
