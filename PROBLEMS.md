
## Approach 004

- load.webtil.es redirects to a random origin
- random origin has the loader code
- but all of that code is generic, it just talks back to the mothership, which is
 where all the smarts are
- steps:
  - Caddy mapping for webtiles.bast, *.webtiles.bast
  - server:
    - / on load.webtiles redirects to a random subdomain
    - loading random.webtiles/.wk... is just the right kind of static site with the right content
  - client:
    - it's just the mothership


# ABANDONED

It's impossible to use origin sandboxing:
- If you start in a sandbox, the SW can't be loaded (HTTP will fail SO check, non-HTTP fails)
- If you don't start in a sandbox, you can't dynamically sandbox (even if you reload
  the SW will be on the root origin)

## Approach 001

- Mothership loads shuttle with sandboxed frame
- Shuttle loads SW
- SW intercepts iframe in shuttle

⛔️ FAIL: Shuttle can't load SW because it has a different origin.

WAIT:
- This is failing even without the sandboxing…
  - ✅ try flattening the files (this works but we changed a lot of stuff)
  - ✅ try loading the worker in shuttle init
  - ⛔️ try reintroducing sandboxing
  - try unflattening the files
  - CONFIRM: can't load a worker into an origin-sandboxed environment

## Approach 002

Same as 001 but the sandboxing happens dynamically.

- first, test that dynamic sandboxing works at all

## Approach 003

Same as 001 but the SW is loaded as a blob.
⛔️ FAIL: SW has to be on HTTP scheme.

## Approach 00X

Something with srcdoc.
