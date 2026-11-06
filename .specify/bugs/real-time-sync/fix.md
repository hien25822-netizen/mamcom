# Bug Fix: The 20-second sync poll now covers the shared price and the order delivery date/time

**Slug**: real-time-sync
**Date**: 2026-11-06

## Change Applied

### 1. The shared price is now part of every sync cycle

`index.html` — `syncAll()` (was index.html:3030):

```javascript
  var SYNC_MS = 20000;
  function syncAll(){
    loadServerState();
    loadSharedMenu();
    syncOrdersFromServer();
    syncSharedPrice();
  }
  // Giá chủ đặt được đồng bộ cho mọi máy, không chỉ lúc mở trang.
  function syncSharedPrice(){
    if(!USE_SUPABASE || typeof sharedStore.getPrice !== "function") return;
    sharedStore.getPrice().then(function(n){
      if(typeof n === "number" && n !== PRICE_PER_MAM){
        PRICE_PER_MAM = n;
        updateOrderTotal();
      }
    }).catch(function(){ /* offline — giữ giá hiện tại */ });
  }
```

The value is only applied when it actually differs, so the owner's Settings
panel is never overwritten mid-edit.

### 2. The delivery date and time are now stored and read back

`index.html` — `sharedStore.saveOrder`:

```javascript
        note: order.note || "",
        date: order.date || "",
        time: order.time || "",
        products: order.products || [],
```

`index.html` — `sharedStore.loadOrders`:

```javascript
      return SUPABASE.from("orders")
        .select("id, status, people, phone, address, note, date, time, products, schedule, total, created_at")
```

`index.html` — `syncOrdersFromServer`, for an order that already exists
locally (the owner changed the status on another device):

```javascript
        if(byId[r.id]){
          if(byId[r.id].status !== r.status){ byId[r.id].status = r.status; changed = true; }
          if(r.date && byId[r.id].date !== r.date){ byId[r.id].date = r.date; changed = true; }
          if(r.time && byId[r.id].time !== r.time){ byId[r.id].time = r.time; changed = true; }
        }else{
```

and for an order that arrives from another device:

```javascript
            note:r.note || "", date:r.date || "", time:r.time || "",
            products:r.products || [], schedule:r.schedule || [],
```

### 3. Schema

`supabase/schema.sql` — the `orders` table gains two columns, with an
idempotent `alter table ... add column if not exists` for a database where
the table already exists:

```sql
  date        text not null default '',   -- ngày nhận (yyyy-mm-dd)
  time        text not null default '',   -- giờ nhận (hh:mm)
```

```sql
alter table public.orders add column if not exists date text not null default '';
alter table public.orders add column if not exists time text not null default '';
```

## Files Touched

- `index.html` — `syncAll` / `syncSharedPrice`, `saveOrder`, `loadOrders`,
  `syncOrdersFromServer`.
- `supabase/schema.sql` — two columns on `public.orders`.

## Checks Required By The Fix

1. The poll fires every 20 s, once per document instance, and refreshes the
   counter, the menu, the orders and the price.
2. A price changed on the owner device appears on a second device within one
   cycle (≤ 20 s) without a reload.
3. An order placed on device A shows the same **Ngày nhận** on device B.
4. The counter, the menu and the reviews still sync (no regression).
5. The 6 fixed dishes, drag & drop, the copy-schedule button and the
   single-column layout are untouched.
