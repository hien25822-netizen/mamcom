# Bug Fix: Dish menu and order cards rendered in multiple columns instead of one vertical column

**Slug**: single-column-layout
**Date**: 2026-11-06

## Change Applied

**`index.html:84`** — the menu grid becomes a single column at every
breakpoint:

```css
  .menu{
    list-style:none;margin:0;padding:10px;
    display:grid;
    grid-template-columns:1fr;   /* 1 CỘT DỌC DUY NHẤT (desktop + mobile) */
    gap:10px;
  }
```

Previously `grid-template-columns:repeat(3,1fr)`.

**`index.html` mobile media queries (the two rules that repeated the 3-column
value)** — both `.menu{grid-template-columns:repeat(3,1fr)}` overrides were
changed to `1fr`:

```css
    .menu{grid-template-columns:1fr}
    ...
    .menu{grid-template-columns:1fr;gap:8px;padding:8px}
```

**`index.html` — `.tile` restyled to match a one-per-row list.** The tile
was a square with the name in a footer; in a full-width single column it
became a row — image on the left, name on the right:

```css
  .tile{
    position:relative;
    /* aspect-ratio:1/1;  REMOVED — with a single column the tile is a row */
    ...
    display:flex;flex-direction:row;align-items:center;gap:10px;
  }
```

and `.tile__name` was changed from a fixed footer strip to a flexible
right-hand column:

```css
  .tile__name{
    flex:1 1 auto;min-width:0;
    padding:8px 10px;
    background:#fff;
    border-top:1px solid var(--line);
    font-size:12.5px;font-weight:700;text-align:left;line-height:1.35;
    overflow:hidden;word-wrap:break-word;
  }
```

## Which grids were deliberately NOT changed

The owner constraint is about **cards**. Two grids compute to more than one
track and are *not* card lists:

- `index.html:60` — `.board{grid-template-columns:360px 1fr}` — the page
  shell (menu column + content column). This is the app's two-panel layout.
- `index.html:326` / `index.html:640` — `.order__grid{grid-template-columns:1fr 1fr}`
  → `1fr` on mobile — the customer form's field grid (`cPeople`, `cPhone`,
  `cDate`, `cTime`, `cAddress`, `cNote`). These are input fields, not cards.

The three actual **card lists** are all single-track at every breakpoint:
`.menu` (index.html:84), `.week` (index.html:630) and `.orders__list`
(index.html:392).

## Files Touched

- `index.html` — CSS only (`.menu`, `.tile`, `.tile__name`, and the two
  mobile `.menu` overrides).

## Checks Required By The Fix

1. `getComputedStyle(...).gridTemplateColumns` track count for `.menu`,
   `.week`, `.orders__list` must be **1** at 375 px and at 1440 px.
2. Six dishes render, one per row, in the correct order.
3. Drag-and-drop still works (all 6 tiles keep `draggable="true"`).
4. The tile name is fully visible (no truncation).
