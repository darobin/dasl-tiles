
import { cwd } from "node:process";
import { createReadStream } from "node:fs";
import { readdir, readFile } from 'node:fs/promises';
import { join, basename, isAbsolute, resolve, normalize } from 'node:path';
import { AtpAgent } from '@atproto/api';
import { TID } from "@atproto/common";

import { create, CODEC_RAW, CODEC_DCBOR as CODEC_DRISL, toCidLink, toString } from '@atcute/cid';
import { encode } from '@atcute/cbor';
import { detectFilenameMime } from 'mime-detect';
import { fileTypeFromBuffer } from 'file-type';
import TileWriter from '@dasl/tile-writer';
import { getSavedIdentifier, saveIdentifier } from './settings.js'
import type { WriterMasl, BlobRef, CidLink, MaslHeaders } from '@dasl/tile-lexicon';

async function resolvePDS (handle: string): Promise<string> {
  try {
    const { did } = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`).then(r => r.json()) as { did: string };
    const url = did.startsWith('did:web:') ? `https://${did.slice(8)}/.well-known/did.json` : `https://plc.directory/${did}`;
    const didDoc = await fetch(url).then(r => r.json()) as { service?: Array<{ id?: string; serviceEndpoint?: string }> };
    return didDoc?.service?.find(s => s.id === '#atproto_pds')?.serviceEndpoint ?? 'https://bsky.social';
  }
  catch (_) { return 'https://bsky.social'; }
}

export interface TilePublisherOptions {
  reuseIdentifiers?: boolean;
  tid?: string;
}

export interface PublishResult {
  record: unknown;
  uri?: string;
  success: boolean;
}

export class TilePublisher extends EventTarget {
  #manifest: WriterMasl = { resources: {} };
  #at: AtpAgent | undefined;
  #sourceDirectory: string | false = false;
  #sourceMap: Record<string, string> = {};
  #identifier: string | undefined;
  #reuseIdentifiers = false;
  #tid: string | undefined;
  constructor (options: TilePublisherOptions = {}) {
    super();
    if (options.tid) {
      this.#tid = options.tid;
    }
    else {
      this.#reuseIdentifiers = !!options?.reuseIdentifiers;
    }
  }
  async login (identifier: string, password: string) {
    this.#identifier = identifier;
    this.#at = new AtpAgent({ service: await resolvePDS(identifier) });
    await this.#at.login({ identifier, password });
  }
  // XXX this should also be able to process CAR Tiles
  // And maybe an option to publish to a CAR.
  async loadFromDirectory (path: string) {
    if (!isAbsolute(path)) path = normalize(resolve(cwd(), path));
    if (this.#sourceDirectory) throw new Error('TilePublisher has already loaded a directory.');
    this.#sourceDirectory = path;
    const files = (await readdir(path, { recursive: true, withFileTypes: true }))
      .filter(ent => ent.isFile())
      .map(ent => {
        const f = join(ent.parentPath, ent.name).replace(path, '');
        return `/${f.replace(/^\.?\//, '')}`;
      })
      .filter(f => f !== '/manifest.json')
    ;
    this.#manifest = JSON.parse(await readFile(join(path, 'manifest.json'), 'utf8'));
    if (!this.#manifest.resources) this.#manifest.resources = {};
    for (const file of files) {
      if (basename(file) === '.DS_Store') continue;
      console.warn(`File is ${file} for path ${path}`);
      const src = join(path, file);
      const res = (file === '/index.html') ? '/' : file;
      this.#sourceMap[res] = src;
      const buf = await readFile(src);
      const cid = await create(CODEC_RAW, buf);
      if (!this.#manifest.resources[res]) this.#manifest.resources[res] = {};
      this.#manifest.resources[res].src = {
        $type: 'blob',
        ref: (toCidLink(cid) as unknown as { toJSON(): unknown }).toJSON() as CidLink, // atcute expects automatic toJSON, but with CBOR this will bite you
        mimeType: (await fileTypeFromBuffer(buf))?.mime || 'application/octet-stream', // CAUTION: *NOT* THE REAL TYPE
        size: buf.length,
      };
      if (!this.#manifest.resources[res]['content-type']) {
        let mime = detectFilenameMime(src);
        if (/text\/html\s*;\s*charset=us-ascii/.test(mime)) mime = 'text/html';
        this.#manifest.resources[res]['content-type'] = mime;
      }
    }
  }
  validate () {
    if (!this.#manifest.name) throw new Error('Cannot publish tile without name');
    if (!this.#manifest.icons?.[0]?.src) this.event('warn', { message: 'Tile has no icon' });
    if (!this.#manifest.description) this.event('warn', { message: 'Tile has no description' });
    (this.#manifest.icons || []).forEach(icon => {
      if (!icon.src) throw new Error('Tile icon has no src');
      if (!this.#manifest.resources[icon.src]) throw new Error(`Tile icon "${icon.src}" is not in resources`);
    });
    (this.#manifest.screenshots || []).forEach(shot => {
      if (!shot.src) throw new Error('Tile screenshot has no src');
      if (!this.#manifest.resources[shot.src]) throw new Error(`Tile screenshot "${shot.src}" is not in resources`);
    });
    if (!this.#manifest.resources['/']) throw new Error('Tile does not have default "/" resource');
  }
  async publish (): Promise<PublishResult> {
    this.validate();
    const at = this.#at!;

    // upload all the things
    await Promise.all(
      Object.keys(this.#manifest.resources).map(async (res) => {
        this.event('start-upload', { resource: res });
        const rs = createReadStream(this.#sourceMap[res]);
        const src = this.#manifest.resources[res].src as BlobRef;
        const uploaded = await at.com.atproto.repo.uploadBlob(rs as unknown as Uint8Array, { encoding: src.mimeType });
        const pdsCID = uploaded.data.blob.ref.toString();
        const cid = src.ref.$link;
        if (pdsCID !== cid) {
          this.event('fail-upload', { resource: res });
          throw new Error(`CID for "${res}" does not match: ${cid} (ours) vs ${pdsCID} (PDS)`);
        }
        this.event('done-upload', { resource: res });
      })
    );

    // publish the tile
    const collection = 'ing.dasl.masl';
    // const $type = `${collection}#tile`;
    const cid = await create(CODEC_DRISL, encode(this.#manifest));
    const record = {
      $type: collection,
      cid: toString(cid),
      tile: this.#manifest,
      createdAt: new Date().toISOString(),
    };
    let rkey = this.#tid || TID.nextStr();
    if (this.#reuseIdentifiers) {
      const uri = this.#sourceDirectory ? await getSavedIdentifier(this.#sourceDirectory) : undefined;
      if (uri) {
        const [did, , tid] = uri.replace(/^at:\/\//, '').split('/');
        if (tid) {
          if (did !== at.assertDid && did !== this.#identifier) {
            this.event('warn', { message: 'Cannot reuse previous identifier when the handle has changed.' });
          }
          rkey = tid;
        }
      }
    }
    const putData = { repo: at.assertDid, collection, rkey, record };
    const res = await at.com.atproto.repo.putRecord(putData);
    if (res.success && this.#reuseIdentifiers && this.#sourceDirectory) saveIdentifier(this.#sourceDirectory, res.data?.uri);
    return {
      record,
      uri: res.data?.uri,
      success: res.success,
    };
  }
  async delete (dirOrURL: string): Promise<{ uri: string; success: boolean }> {
    const at = this.#at!;
    let url: string | undefined;
    if (/^at:\/\//.test(dirOrURL)) {
      url = dirOrURL;
    }
    else {
      if (!isAbsolute(dirOrURL)) dirOrURL = normalize(resolve(cwd(), dirOrURL));
      url = await getSavedIdentifier(dirOrURL);
      if (!url) throw new Error(`Cannot recover saved URL for ${dirOrURL}, please provide AT URL directly.`);
    }
    const [repo, collection, rkey] = url.replace(/^at:\/\//, '').split('/');
    const res = await at.com.atproto.repo.deleteRecord({ repo, collection, rkey });
    return {
      uri: url,
      success: res.success,
    };
  }
  async bundle (out: string): Promise<boolean> {
    const tw = new TileWriter(this.#manifest);
    Object.keys(this.#manifest.resources).map(async (res) => {
      tw.addResource(res, { ...this.#manifest.resources[res], src: undefined } as MaslHeaders, { path: this.#sourceMap[res] });
    });
    await tw.write(out);
    return true;
  }
  event (type: string, data: Record<string, unknown>) {
    const evt = new Event(type);
    Object.entries(data).forEach(([k, v]) => (evt as unknown as Record<string, unknown>)[k] = v);
    this.dispatchEvent(evt);
  }
}
