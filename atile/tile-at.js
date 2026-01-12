
import { createReadStream } from "node:fs";
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AtpAgent } from '@atproto/api';
import { create, CODEC_RAW, toCidLink, toString } from '@atcute/cid';
import { detectBufferMime, detectFilenameMime } from 'mime-detect';

export class TilePublisher extends EventTarget {
  #manifest = { resources: {} };
  #at;
  #sourceDirectory = false;
  #sourceMap = {};
  constructor () {
    super();
    this.#at = new AtpAgent({ service: 'https://bsky.social' });
  }
  async login (identifier, password) {
    await this.#at.login({ identifier, password });
  }
  // XXX this should also be able to process CAR Tiles
  // And maybe an option to publish to a CAR.
  async loadFromDirectory (path) {
    if (this.#sourceDirectory) throw new Error('TilePublisher has already loaded a directory.');
    this.#sourceDirectory = path;
    const files = await readdir(path, { recursive: true, withFileTypes: true })
      .filter(ent => ent.isFile())
      .map(ent => {
        const f = join(ent.parentPath, ent.name);
        return `/${f.replace(/^.\//, '')}`;
      })
      .filter(f => f !== '/manifest.json')
    ;
    this.#manifest = JSON.parse(readFile(join(path, 'manifest.json')));
    if (!this.#manifest.resources) this.#manifest.resources = {};
    for (const file of files) {
      const src = join(path, file);
      const res = (file === '/index.html') ? '/' : file;
      this.#sourceMap[res] = src;
      const buf = await readFile(src);
      const cid = await create(CODEC_RAW, buf);
      if (!this.#manifest.resources[res]) this.#manifest.resources[res] = {};
      this.#manifest.resources[res].src = toCidLink(cid);
      if (!this.#manifest.resources[res]['content-type']) {
        this.#manifest.resources[res]['content-type'] = detectFilenameMime(src, await detectBufferMime(buf));
      }
    }
  }
  async publish () {
    // validate
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

    // upload all the things
    await Promise.all(
      Object.keys(this.#manifest.resources).map(async (res) => {
        this.event('start-upload', { resource: res });
        const rs = createReadStream(this.#sourceMap[res]);
        const uploaded = await this.#at.com.atproto.repo.uploadBlob(rs, { encoding: 'application/octet-stream' });
        const pdsCID = uploaded.data.blob.ref.toString();
        const cid = toString(this.#manifest.resources[res].src);
        if (pdsCID !== cid) {
          this.event('fail-upload', { resource: res });
          throw new Error(`CID for "${res}" does not match: ${cid} (ours) vs ${pdsCID} (PDS)`);
        }
        this.event('done-upload', { resource: res });
      })
    );

    // publish the tile

    // XXX
    //  - publish the tile
    //  - return the at-uri
  }
  event (type, data) {
    const evt = new Event(type, data);
    this.dispatchEvent(evt);
  }
}
