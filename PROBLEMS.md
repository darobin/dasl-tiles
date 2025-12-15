
## Approach 001

- Mothership loads shuttle with sandboxed frame
- Shuttle loads SW
- SW intercepts iframe in shuttle

FAIL: Shuttle can't load SW because it has a different origin.

WAIT:
- This is failing even without the sandboxing…
  - ✅ try flattening the files (this works but we changed a lot of stuff)
  - ✅ try loading the worker in shuttle init
  - try reintroducing sandboxing
  - try unflattening the files

## Approach 002

Same as 001 but the sandboxing happens dynamically.

## Approach 003

Same as 001 but the SW is loaded as a blob.

## Approach 00X

Something with srcdoc.
