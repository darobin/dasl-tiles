
import { equal, ok, deepStrictEqual } from 'node:assert';
import { masl, maslHTTPHeaders } from '@dasl/tile-lexicon';

describe('tile-lexicon', () => {
  describe('MASL lexicon document', () => {
    it('is a lexicon v1 with the canonical id', () => {
      equal(masl.lexicon, 1);
      equal(masl.id, 'ing.dasl.masl');
    });
    it('requires name and resources on a MASL object', () => {
      deepStrictEqual(masl.defs.masl.required, ['name', 'resources']);
      equal(masl.defs.masl.type, 'object');
    });
    it('describes resources as an opaque map (lexicon cannot type arbitrary keys)', () => {
      equal(masl.defs.masl.properties.resources.type, 'unknown');
    });
    it('constrains name and description lengths', () => {
      equal(masl.defs.masl.properties.name.maxGraphemes, 100);
      equal(masl.defs.masl.properties.description.maxGraphemes, 300);
    });
    it('requires a src on every icon and screenshot', () => {
      deepStrictEqual(masl.defs.masl.properties.icons.items.required, ['src']);
      deepStrictEqual(masl.defs.masl.properties.screenshots.items.required, ['src']);
    });
    it('pins the CAR version constant to 1', () => {
      equal(masl.defs.masl.properties.version.const, 1);
    });
  });

  describe('main record', () => {
    it('is a tid-keyed record referencing the MASL and requiring cid/tile/createdAt', () => {
      equal(masl.defs.main.type, 'record');
      equal(masl.defs.main.key, 'tid');
      deepStrictEqual(masl.defs.main.record.required, ['cid', 'tile', 'createdAt']);
      equal(masl.defs.main.record.properties.tile.ref, 'ing.dasl.masl#masl');
      equal(masl.defs.main.record.properties.createdAt.format, 'datetime');
    });
  });

  describe('supported MASL HTTP headers', () => {
    it('includes content-type and the security-relevant headers', () => {
      for (const h of ['content-type', 'content-security-policy', 'referrer-policy', 'permissions-policy', 'service-worker-allowed', 'x-content-type-options']) {
        ok(h in maslHTTPHeaders, `expected header ${h}`);
      }
    });
    it('declares every header as a string type', () => {
      for (const [k, v] of Object.entries(maslHTTPHeaders)) {
        equal(v.type, 'string', `header ${k} should be a string`);
      }
    });
  });
});
