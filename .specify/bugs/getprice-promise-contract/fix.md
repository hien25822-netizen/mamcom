# Bug Fix: sharedStore.getPrice returns a non-Promise in local mode, aborting the boot script

**Slug**: getprice-promise-contract
**Date**: 2026-11-06

## Change Applied

`index.html:2466-2468` — the local (no-Supabase) branch of `sharedStore.getPrice`
now returns a Promise.

Before:

```javascript
      var v = parseInt(localStorage.getItem("mamcom.price") || "", 10);
      return isFinite(v) && v > 0 ? v : null;
    },
```

After:

```javascript
      var v = parseInt(localStorage.getItem("mamcom.price") || "", 10);
      return Promise.resolve(isFinite(v) && v > 0 ? v : null);
    },
```

No other source file was modified. No behaviour visible to the owner changes:
the resolved value is identical to what the previous branch produced.

## Why This Is The Root Cause

`sharedStore` is the only abstraction over "Supabase if available, else
localStorage". Every method of it returns a Promise on both branches so the
callers never need to know which branch ran. `getPrice` broke that contract
on the local branch, so the single `.then()` call site blew up exactly when
the backend was absent — the case the abstraction exists to protect.

## Files Touched

- `index.html` (1 line)

## Checks Required By The Fix

1. No-Supabase reproduction: boot script completes without a TypeError.
2. Regression: with Supabase reachable, the price still loads and the price
   field is populated as before.
3. Regression: the other 12 `sharedStore` methods are untouched.
