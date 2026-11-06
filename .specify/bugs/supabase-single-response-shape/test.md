# Bug Test: The shared counter and price were read from the wrong place on the Supabase response

**Slug**: supabase-single-response-shape
**Date**: 2026-11-06
**Result**: verified

## Checks Performed

- Live `state` table read — **passed**: `meals = "32"`, `price = "49"` in
  the production Supabase project.
- Counter showed the hard-coded value before the fix — **passed (bug
  reproduced)**: `#mealsCount` = `23` and the flip tiles were
  `assets/flip-digits/2-alpha.png` + `3-alpha.png` (the digits of 23)
  while the server held 32.
- Response shape confirmed live — **passed**: the object resolved by
  `.single()` has keys
  `["success","error","data","count","status","statusText"]` and
  `data = { value: "32" }`. The old expression
  `(st && st.value != null) ? … : null` evaluated to `null`; the fixed
  expression `(st.data && st.data.value != null) ? … : null` evaluates to
  `32` / `49`.
- Counter reads the server value after the fix — **passed**:
  `#mealsCount` = `32`; the flip tiles are `3-alpha.png` + `2-alpha.png`
  (the digits of 32).
- Price reads the server value after the fix — **passed**: with a stale
  `mamcom.price = 999` planted in localStorage, the page still showed
  `49k × 2 mâm × 2 người` and a total of `196k` — the server value wins.
  The stale local key was removed again afterwards.
- Counter increment starts from the true server value — **passed**: the
  read now yields `32`, so an increment of 3 would write `35`, not
  `23 + 3 = 26`.
- Reviews still sync (regression) — **passed**: `5 đánh giá` and the
  review list renders, i.e. the `comments` query in `loadState` was not
  disturbed.
- Dish menu still syncs (regression) — **passed**: the six tiles render
  from the shared `dishes` table.
- No new console errors — **passed**: the only failures are the expected
  `404` on `/rest/v1/orders` (the missing `orders` table, tracked
  separately in the `orders-table-missing` bug set) and `404` on the
  local `/api/*` endpoints that only exist under the old local server.

## Output Excerpts

```text
# BEFORE the fix
{"domMeals":"23",
 "flipImgs":["assets/flip-digits/2-alpha.png","assets/flip-digits/2-alpha.png",
             "assets/flip-digits/3-alpha.png","assets/flip-digits/3-alpha.png"]}
serverMeals = 32

# envelope shape (live project)
{"stKeys":["success","error","data","count","status","statusText"],
 "stData":{"value":"49"},"naive":null,"correct":49}

# AFTER the fix
{"domMeals":"32",
 "flipImgs":["assets/flip-digits/3-alpha.png","assets/flip-digits/3-alpha.png",
             "assets/flip-digits/2-alpha.png","assets/flip-digits/2-alpha.png"]}

# price: server wins over a stale local value
{"localPrice":"999","calc":"49k × 2 mâm × 2 người","domTotal":"196k"}
```

## Residual Risks

- `addMeals` is a read-modify-write; two devices ordering at the exact
  same instant can still lose one increment. That race existed before and
  is unchanged — it only affects the display number, never order data.
- The `orders` table still does not exist in the live project, so orders
  do not yet sync across devices. See the `orders-table-missing` bug set
  for the DDL the owner needs to run.

## Recommendation

No further action. The shared counter and the shared price now sync from
the server on every device.
