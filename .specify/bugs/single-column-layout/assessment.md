# Bug Assessment: Dish menu and order cards rendered in multiple columns instead of one vertical column

**Slug**: single-column-layout
**Date**: 2026-11-06
**Severity**: blocking (owner-mandated constraint #3)

## Report

The owner's requirement #3 is verbatim: *"UI cards MUST display as a single
vertical column on both desktop AND mobile."* The dish menu was rendering as
a three-column grid on desktop, so the six dishes appeared as a 3×2 block
rather than a vertical list.

## Symptom

On a desktop browser the six fixed dishes appeared side by side in three
columns. The owner asked for one dish per row, top to bottom, on every
screen size.

## Reproduction

1. Open `index.html` at a desktop width (≥ 900 px).
2. Inspect `.menu` — it computes to three grid columns.
3. Before the fix: `getComputedStyle(document.querySelector(".menu")).gridTemplateColumns`
   returned three track widths; after: one.

## Suspected Code Paths

- `index.html:84` — `.menu{ grid-template-columns: repeat(3,1fr) }` — the
  menu grid, three columns on desktop.
- `index.html:392` — `.orders__list{ grid-template-columns: 1fr }` — the
  order-card list; already single-column, verified below.
- `index.html:630` — `.week{ grid-template-columns: 1fr }` in the mobile
  media query — the day/week grid.
- `index.html:60` — `.board{ grid-template-columns: 360px 1fr }` — the page
  shell (sidebar + content), **not** a card list.
- `index.html:326` / `index.html:640` — `.order__grid` — the customer form
  field grid (`cPeople`, `cPhone`, `cDate`, `cTime`, `cAddress`,
  `cNote`), **not** a card list.

## Root Cause Hypothesis

The menu grid was authored as a 3-column tile grid for the original
square-tile design (`.tile` also had `aspect-ratio:1/1`). The owner later
asked for a single vertical column, and the tile was restyled to a
horizontal row (image left, name right) to suit the narrow shape — but the
grid track count was never changed, leaving a 3-wide grid of wide rows.

## Proposed Remediation

Change `.menu` to a single track (`grid-template-columns:1fr`) at every
breakpoint, and confirm the other card-list containers (`.week`,
`.orders__list`) are also single-track. Page-shell and form-field grids are
not card lists and are left alone.

Verification: read the computed `grid-template-columns` track count of
`.menu`, `.week` and `.orders__list` at 375 px and 1440 px; all must be 1.

## Risks

- Widening the tiles to full row width changes the dish-tile proportions.
  The tile was already converted to a row layout (image left, name right) in
  this change set, so the visual result is a list item, not a stretched
  square.
- `.tile` lost `aspect-ratio:1/1`; without it a grid item in a 1-column
  grid sizes to content height, which is what a row-style tile wants.

## Open Questions

- None.
