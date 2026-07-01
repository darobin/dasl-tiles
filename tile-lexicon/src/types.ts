// Shared type definitions for DASL tiles / MASL metadata.
//
// These are the single source of truth for the manifest, resource, and response
// shapes used across @dasl/tile-loader, @dasl/tile-writer, and
// @dasl/tile-car-reader. They are type-only and erase at runtime.

/** A DASL/IPLD CID link, as it appears in JSON (`{ "$link": "bafy…" }`). */
export interface CidLink {
  $link: string;
}

/** An AT Protocol blob reference, as embedded in a published tile record. */
export interface BlobRef {
  $type: 'blob';
  ref: CidLink;
  mimeType: string;
  size: number;
}

/** HTTP headers a MASL resource may carry. */
export interface MaslHeaders {
  'content-disposition'?: string;
  'content-encoding'?: string;
  'content-language'?: string;
  'content-security-policy'?: string;
  'content-type'?: string;
  'link'?: string;
  'permissions-policy'?: string;
  'referrer-policy'?: string;
  'service-worker-allowed'?: string;
  'sourcemap'?: string;
  'speculation-rules'?: string;
  'supports-loading-mode'?: string;
  'x-content-type-options'?: string;
}

/** A resource entry as stored in / read from a CAR file or AT record. */
export interface StoredResourceEntry extends MaslHeaders {
  src: CidLink | BlobRef;
}

/**
 * A resource entry being assembled by a writer or publisher. The `src` is
 * filled in when the tile is written, so it is optional while building.
 */
export interface WriterResourceEntry extends MaslHeaders {
  src?: CidLink | BlobRef;
}

/** A resource entry that carries its content directly (memory / webxdc loaders). */
export interface InMemoryResourceEntry extends MaslHeaders {
  src: ArrayBuffer | Uint8Array | string;
}

/** Any of the context-specific resource entry shapes. */
export type ResourceEntry =
  | StoredResourceEntry
  | WriterResourceEntry
  | InMemoryResourceEntry;

export interface MaslIcon {
  src: string;
  sizes?: string;
  purpose?: string;
}

export interface MaslScreenshot {
  src: string;
  sizes?: string;
  label?: string;
}

export interface MaslSizing {
  width: number;
  height: number;
}

/**
 * MASL manifest metadata, generic over the shape of its resource entries so the
 * same shape can describe stored, in-flight, and in-memory tiles.
 */
export interface Masl<E extends MaslHeaders = StoredResourceEntry> {
  name?: string;
  description?: string;
  categories?: string[];
  background_color?: string;
  icons?: MaslIcon[];
  screenshots?: MaslScreenshot[];
  sizing?: MaslSizing;
  short_name?: string;
  theme_color?: string;
  prev?: CidLink;
  version?: number;
  roots?: unknown[];
  resources: Record<string, E>;
}

export type StoredMasl = Masl<StoredResourceEntry>;
export type WriterMasl = Masl<WriterResourceEntry>;
export type InMemoryMasl = Masl<InMemoryResourceEntry>;
/** A manifest whose entries may be any of the context-specific shapes. */
export type AnyMasl = Masl<ResourceEntry>;

/** A successful MASL resource response. */
export interface MaslResponseOk {
  ok: true;
  status: number;
  statusText: string;
  headers: MaslHeaders;
  body: Uint8Array | ArrayBuffer | string;
}

/** A negative MASL resource response (e.g. not found). */
export interface MaslResponseError {
  ok: false;
  status: number;
  statusText: string;
}

export type MaslResponse = MaslResponseOk | MaslResponseError;
