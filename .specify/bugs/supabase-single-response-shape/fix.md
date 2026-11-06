# Bug Fix: The shared counter and price were read from the wrong place on the Supabase response

**Slug**: supabase-single-response-shape
**Date**: 2026-11-06

## Change Applied

In `supabase-js` v2, `.single()` / `.maybeSingle()` resolve with the full
response envelope `{ data, error, count, status, statusText }`. The code was
reading the row off the envelope itself (`st.value`) instead of off
`st.data`, so every read of the shared `state` table returned `undefined`.

Three read sites were corrected.

### 1. `index.html:2434` — `sharedStore.loadState()` (the meal counter)

```javascript
        return SUPABASE.from("state").select("value").eq("key","meals").single()
          .then(function(st){
            // .single() trả về {data, error, ...} — hàng nằm ở st.data.
            var row = st && st.data;
            var meals = (row && row.value != null) ? parseInt(row.value, 10) : null;
```

### 2. `index.html:2463` — `sharedStore.getPrice()` (the owner-set price)

```javascript
        return SUPABASE.from("state").select("value").eq("key","price").maybeSingle()
          .then(function(st){
            var row = st && st.data;
            var n = (row && row.value != null) ? parseInt(row.value, 10) : NaN;
```

### 3. `index.html:2495` — `sharedStore.addMeals()` (the counter increment)

```javascript
        return SUPABASE.from("state").select("value").eq("key","meals").single()
          .then(function(st){
            var row = st && st.data;
            var cur = (row && row.value != null) ? parseInt(row.value, 10) : 23; // chưa có dòng thì khởi điểm mặc định 23
```

The `23` fallback stays as the "row not created yet" seed, exactly as
before — it is only reached when the `meals` row genuinely does not exist.

## Why This Is The Root Cause

`.single()` is a PostgREST *modifier*, not a terminal accessor. It resolves
with the same envelope every other query resolves with. The three sites
above were the only ones that treated the resolved value as the row. Every
other Supabase call in the file already reads `r.data` correctly:

- `loadMenu` (index.html:2567) — reads `r.data`
- `loadOrders` (index.html:2633) — reads `r.data`
- `deleteComment` (index.html:2544) — reads `r.data`
- `savePrice` / `addMeals` upserts (index.html:2477, 2500) — read
  `res.error` and use the locally computed value, so they were never wrong

That is exactly why the menu and the reviews synced correctly while the
counter and the price did not: they go through different code paths.

## Files Touched

- `index.html` — three read sites in `sharedStore`.

## Checks Required By The Fix

1. Load the app with the live `state.meals` at a value other than the
   hard-coded `23`; `#mealsCount` must show the server value.
2. Load the app with a stale `mamcom.price` in localStorage; the shared
   price from the server must win.
3. Confirm the counter increment starts from the true server value and
   never from the `23` fallback.
4. Confirm the reviews and the dish menu still sync (regression).
