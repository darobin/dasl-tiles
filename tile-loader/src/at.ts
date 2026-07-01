
import { Tile } from "./index.js";
import type { TileMothership } from "./index.js";
import { NOT_FOUND, maslResponse } from "./lib/masl.js";
import type { StoredMasl, MaslResponse } from "@dasl/tile-lexicon";

interface DidDocument {
  service?: Array<{ id?: string; type?: string; serviceEndpoint?: string }>;
}
interface ATRecord {
  value?: { tile?: StoredMasl };
}

async function did2pds (did: string): Promise<string | false | undefined> {
  if (!/^did:plc:/.test(did)) return false; // we should add did:web
  const res = await fetch(`https://plc.directory/${did}`);
  if (!res.ok) return false;
  const doc = await res.json() as DidDocument;
  const pds = doc.service?.find(s => s.id === '#atproto_pds')?.serviceEndpoint;
  return pds;
}
async function fetchFromPDS (did: string, query: string, params: Record<string, string>): Promise<Response | undefined> {
  const pds = await did2pds(did);
  if (!pds) return;
  const url = new URL(pds);
  url.pathname = `/xrpc/${query}`;
  const prm = url.searchParams;
  Object.entries(params).forEach(([k, v]) => prm.set(k, v));
  return await fetch(url.toString());
}
async function getRecord (repo: string, collection: string, rkey: string): Promise<ATRecord | false> {
  const res = await fetchFromPDS(repo, 'com.atproto.repo.getRecord', { repo, collection, rkey })
  if (!res || !res.ok) return false;
  return await res.json() as ATRecord;
}
async function getBlob (did: string, cid: string): Promise<ArrayBuffer | false> {
  const res = await fetchFromPDS(did, 'com.atproto.sync.getBlob', { did, cid })
  if (!res || !res.ok) return false;
  return await res.arrayBuffer();
}

// ### AT Loader
// at://did:plc:izttpdp3l6vss5crelt5kcux/ing.dasl.masl/3mceykgxbkk2r
export class ATTileLoader {
  async load (url: string, mothership: TileMothership): Promise<Tile | false | undefined> {
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
  #did: string;
  #manifest: StoredMasl;
  constructor (did: string, manifest: StoredMasl) {
    this.#did = did;
    this.#manifest = manifest;
  }
  async resolvePath (path: string): Promise<MaslResponse> {
    const entry = this.#manifest?.resources?.[path];
    if (!entry?.src) return NOT_FOUND;
    const src = entry.src;
    const cid = '$link' in src ? src.$link : src.ref.$link;
    const data = await getBlob(this.#did, cid);
    if (!data) return NOT_FOUND;
    return maslResponse(entry, data);
  }
}
