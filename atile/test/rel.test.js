
import { equal, ok } from 'node:assert';
import makeRel from '../dist/rel.js';

describe('atile – makeRel', () => {
  it('resolves paths relative to the given module URL and strips file://', () => {
    const rel = makeRel('file:///home/user/app/dist/atile.js');
    equal(rel('../package.json'), '/home/user/app/package.json');
    equal(rel('./sibling.js'), '/home/user/app/dist/sibling.js');
    ok(!rel('./x').startsWith('file://'), 'no file:// scheme in the result');
  });
});
