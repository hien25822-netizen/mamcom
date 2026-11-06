# Bug Assessment: The shared counter and price were read from the wrong place on the Supabase response

**Slug**: supabase-single-response-shape
**Date**: 2026-11-06
**Severity**: blocking (owner-mandated constraint #5 — real-time sync)

## Report

The shared meal counter on the home page never updated from the server: it
stayed at the hard-coded `23` on every device, even though the shared
Supabase counter row read `32`. The owner-set price was also never read from
the server.

## Symptom

- The flip counter in the hero shows `23` on every device, forever.
- The live `state` table in Supabase holds `meals = 32`.
- The price field reads the local fallback (`49`) instead of the shared
  price row.
- The menu and the reviews *do* sync correctly — those code paths read
  `r.data` properly, which is why the app looks half-alive.

## Reproduction

1. Read the live value: `GET /rest/v1/state?select=key,value` →
   `{"meals":"32","price":"49"}`.
2. Load the app and read `#mealsCount` → `23`.
3. Read the counter tiles → `assets/flip-digits/2-alpha.png` and
   `3-alpha.png` (i.e. the digits of 23), never 3 and 2.

## Suspected Code Paths

- `index.html:2434` — `sharedStore.loadState()` — reads `st.value`.
- `index.html:2461` — `sharedStore.getPrice()` — reads `st.value`.
- `index.html:2492` — `sharedStore.addMeals()` — reads `st.value`.
- For contrast, the working paths: `index.html:2561` (`loadMenu`) reads
  `r.data`; `index.html:2744` (`renderReviews`) is fed `r.data` by
  `loadState` and works.

## Root Cause Hypothesis

In `supabase-js` v2, `.single()` and `.maybeSingle()` are PostgREST
"modifier" methods: they resolve with the **full response envelope**
`{ data, error, count, status, statusText }` — *not* with the row itself.
The code treats the resolved value as if it were the row and reads
`st.value` off it.

`st.value` is therefore always `undefined`, so:

- `loadState` → `meals = null` → `loadServerState` skips `renderFlip`
  entirely (`data.meals > 0` is false) → the counter keeps the value
  painted from the HTML at boot (`23`).
- `getPrice` → `n = NaN` → the promise resolves `null` → the owner's price
  is never applied to the order total.
- `addMeals` → `cur = 23` (the hard-coded fallback) → every increment
  is computed from `23` instead of the real server value, so the shared
  counter drifts and can even be *lowered* by a later write.

Verified directly in the browser against the live project:

```text
# supabase-js v2, live project
stKeys  = ["success","error","data","count","status","statusText"]
stData  = { value: "49" }
naive   = null      <- what the code computes:  (st && st.value != null) ? ... : null
correct = 49        <- what it should compute: (st.data && st.data.value != null) ? ...
```

and for the counter:

```text
# .single() on state?key=eq.meals
stData  = { value: "32" }
meals   = null      <- the code's value; renderFlip is therefore never called
```

## Proposed Remediation

Read the row from `st.data` instead of `st.value` in the three places that
use `.single()` / `.maybeSingle()`. This is a pure read-path correction; the
business logic (counter increments, price handling, menu, reviews) is
untouched.

Verification: with the fix, `#mealsCount` must equal the live `meals`
value in the `state` table on load, and `#orderTotal` must use the live
`price` row.

## Risks

- Low. The change is confined to how the response envelope is unwrapped.
- `addMeals` now starts from the true server value instead of `23`. If
  the `meals` row were ever missing, the `23` fallback still applies, so
  the counter can never go negative or become `NaN`.

## Open Questions

- None.
