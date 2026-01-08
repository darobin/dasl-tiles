
import { ContentSchemeTileLoader } from "./content-scheme.js";

// ### WebXDC (DeltaChat) Loader
export class WebXDCTileLoader extends ContentSchemeTileLoader {
  constructor (schemes) {
    super(schemes);
  }
  async processContent (zipData, scheme) {
    // XXX
    //  - if it's not zip data, return false
    //  - generate a synthetic manifest
    //  - make a path loader that will point to the right part
    //  - scheme doesn't matter because we always do this in memory
  }
}
