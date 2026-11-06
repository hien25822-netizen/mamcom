# Bug Test: sharedStore.getPrice returns a non-Promise in local mode, aborting the boot script

**Slug**: getprice-promise-contract
**Date**: 2026-11-06
**Result**: verified

## Checks Performed

- Original reproduction (no-Supabase path): **passed** — built a local test
  copy (`_gptest.html`) with the anon key replaced by a placeholder so the
  `USE_SUPABASE` gate takes the local branch, plus a
  `window.__bootReachedEnd = true` marker just before `startSync()`
  (index.html:3067). Reloaded in the preview browser:
  - **With the fix reverted** (harness only, source untouched):
    `__bootReachedEnd === false`, `#orderTotal === "0đ"` → boot script
    aborted, exactly the reported symptom.
  - **With the fix in place** (index.html:2468): `__bootReachedEnd === true`,
    splash gone, 6 dish tiles rendered, menu week built.
- Fix check — stored owner price actually applies in local mode: seeded
  `localStorage["mamcom.price"] = "69000"`, reloaded,
  `#orderTotalCalc === "69000k × 2 mâm × 2 người"` → the `.then` path at
  index.html:2997 ran to completion with the resolved number.
- Console: only 404s for the local `server.py` REST fallback
  (`/api/state` — expected, the static server has no `/api`; every caller
  has a `.catch`, Principle III holds). No `TypeError` in either run.
- Regression check — the other 12 `sharedStore` methods were not touched;
  their call sites and bodies are unchanged in `index.html` (diff shows a
  single-line change at 2468).

## Output Excerpts

```text
# pre-fix harness
{"bootReachedEnd": false, "total": "0đ"}

# post-fix harness, no price stored
{"path":"/_gptest.html","bootReachedEnd":true,"dishes":6,"splashGone":true}

# post-fix harness, price stored = 69000
{"total":"276000k","calc":"69000k × 2 mâm × 2 người"}
```

## Residual Risks

- The `_gptest.html` harness is a scratch copy; it is deleted before commit
  and must not be deployed.
- The live Supabase branch of `getPrice` was not exercised (no auth token
  in the sandbox); it is a `sharedStore.loadState`-style
  `return Promise.resolve(...)`/supabase call unchanged by this fix, and
  the app in normal mode already worked pre-fix, so regression risk is
  minimal.

## Recommendation

No further action. Close the bug. The scratch harness `_gptest.html` is
removed; only the one-line change at `index.html:2468` is committed.
