# Bug Fix: No change required — the lightbox already returns focus correctly

**Slug**: lightbox-focus-return
**Date**: 2026-11-06

## Change Applied

**None.** The lightbox behaviour was reviewed and found correct; no source
file was modified for this slug.

The three pieces of logic that make it work:

1. `showLightbox` (index.html:1253) — remembers the element that was focused
   before opening:

   ```javascript
     lightboxReturnFocus = document.activeElement;
     ...
     lightbox.hidden = false;
     syncScrollLock();
     lightboxClose.focus();
   ```

2. `closeLightbox` (index.html:1263) — hides the overlay, releases the scroll
   lock and gives the focus back:

   ```javascript
     lightbox.hidden = true;
     lightboxImg.src = "";
     syncScrollLock();
     if(lightboxReturnFocus && typeof lightboxReturnFocus.focus === "function"){
       lightboxReturnFocus.focus();
       lightboxReturnFocus = null;
     }
   ```

3. `document.addEventListener("keydown", …)` (index.html:1274) — `Escape`
   closes the lightbox, so the keyboard path goes through the same
   `closeLightbox` and returns the focus too.

## Files Touched

- None.

## Checks Required By The Fix

None — nothing was changed. The verification is recorded in `test.md`.
