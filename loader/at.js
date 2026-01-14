
import { Tile } from "../loader.js";
import { NOT_FOUND, maslResponse } from "../lib/masl.js";

async function did2pds (did) {
  if (!/^did:plc:/.test(did)) return false; // we should add did:web
  const res = await fetch(`https://plc.directory/${did}`);
  if (!res.ok) return false;
  const doc = await res.json();
  const pds = doc.service?.find(s => s.id === '#atproto_pds')?.serviceEndpoint;
  return pds;
}
async function fetchFromPDS (did, query, params) {
  const pds = await did2pds(did);
  if (!pds) return;
  const url = new URL(pds);
  url.pathname = `/xrpc/${query}`;
  const prm = url.searchParams;
  Object.entries(params).forEach(([k, v]) => prm.set(k, v));
  return await fetch(url.toString());
}
async function getRecord (repo, collection, rkey) {
  const res = await fetchFromPDS(repo, 'com.atproto.repo.getRecord', { repo, collection, rkey })
  if (!res.ok) return false;
  return await res.json();
}
async function getBlob (did, cid) {
  const res = await fetchFromPDS(did, 'com.atproto.sync.getBlob', { did, cid })
  if (!res.ok) return false;
  return await res.arrayBuffer();
}

// ### AT Loader
// at://did:plc:izttpdp3l6vss5crelt5kcux/ing.dasl.masl/3mceykgxbkk2r
export class ATTileLoader {
  async load (url, mothership) {
    if (!/^at:\/\//.test(url)) return false;
    const [repo, collection, rkey] = url.replace(/^at:\/\//, '').split('/');
    if (collection !== 'ing.dasl.masl') return;
    const res = await getRecord(repo, collection, rkey);
    if (!res) return false;
    const manifest = res.value?.tile;
    if (!manifest) return false;
    const loader = new ATPathLoader(repo, manifest);
    return new Tile(mothership, url, manifest, loader);
  }
}
export class ATPathLoader {
  #did;
  #manifest;
  constructor (did, manifest) {
    this.#did = did;
    this.#manifest = manifest;
  }
  async resolvePath (path) {
    const entry = this.#manifest?.resources?.[path];
    if (!entry?.src) return NOT_FOUND;
    const cid = entry.src.$link;
    const data = await getBlob(this.#did, cid);
    if (!data) return NOT_FOUND;
    return maslResponse(entry, data);
  }
}
