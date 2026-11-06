# Bug Assessment: The photo lightbox returns focus correctly — no defect

**Slug**: lightbox-focus-return
**Date**: 2026-11-06
**Severity**: none (checked as part of the full-codebase scan)

## Report

While scanning the whole codebase for UI defects, the photo lightbox
(`#lightbox`) was checked for the usual accessibility problems: focus trapped
in the background while the lightbox is open, focus lost to `<body>` after it
closes, and the page scrolling behind the overlay.

**Finding: no bug.** The behaviour is already correct.

## What Was Checked

- `showLightbox` (index.html:1253) stores `document.activeElement` in
  `lightboxReturnFocus` before opening.
- `closeLightbox` (index.html:1263) hides the lightbox, restores the scroll
  lock and calls `lightboxReturnFocus.focus()`.
- `syncScrollLock` (index.html:1287) sets `document.body.style.overflow` to
  `hidden` while any overlay is open.
- `document.addEventListener("keydown", …)` closes the lightbox on `Escape`
  (index.html:1274).

## Reproduction

The lightbox is only reachable when a dish has a photo (`makeMedia`,
index.html:1322-1335: the `<img>` click handler). None of the six live
dishes currently has a photo, so the trigger was made reachable in a local
scratch harness (`_a11ytest.html`, a copy of `index.html` with the Supabase
key removed) by giving dish 1 a 1-pixel data-URL image in *localStorage
only*. **No row was written to the live shared `dishes` table**, so no test
data reached real visitors.

1. Focus the dish tile.
2. Click the dish photo.
3. Inspect the lightbox state, the focused element and `body.style.overflow`.
4. Press `Escape` and inspect the same values again.

## Observed

```text
{"focusBefore":"tile has-dish",
 "open":{"lbHidden":false,"focusIsClose":true,"overflow":"hidden"},
 "tabbables":1,
 "closed":{"lbHidden":true,"overflow":"","focusReturned":"tile has-dish"}}
```

- On open: the lightbox is visible, focus moves to the close button
  (`#lightboxClose`), and the page behind it cannot scroll
  (`body.style.overflow = "hidden"`).
- On close: the lightbox is hidden, the scroll lock is released
  (`overflow = ""`), and focus returns to the tile the user came from.

## Root Cause

Not applicable — no defect.

## Proposed Remediation

None. The implementation is correct as it stands.

## Risks

- None.

## Open Questions

- None.
