# Bug Test: The photo lightbox returns focus correctly

**Slug**: lightbox-focus-return
**Date**: 2026-11-06
**Result**: verified (no defect found — behaviour confirmed correct)

## Checks Performed

- The lightbox is reachable only through a dish photo — **passed**: the
  `<img>` click handler in `makeMedia` (index.html:1328) is the only caller
  of `showLightbox`; with no photo on any of the six live dishes, the
  trigger is simply absent, not broken. The trigger was made reachable in
  a local scratch harness with a 1-pixel data-URL image in localStorage
  only.
- The lightbox opens — **passed**: `lbHidden` goes from `true` to `false`.
- Focus moves into the lightbox — **passed**: after opening,
  `document.activeElement === document.getElementById("lightboxClose")`.
- The page behind cannot scroll — **passed**:
  `document.body.style.overflow === "hidden"` while the lightbox is open.
- Escape closes it — **passed**: a `keydown` with `key: "Escape"` hides the
  lightbox (`lbHidden === true`).
- The scroll lock is released — **passed**: `document.body.style.overflow`
  returns to `""`.
- Focus returns to the trigger — **passed**:
  `document.activeElement.className === "tile has-dish"`, i.e. the dish tile
  that was focused before opening.
- No live data was touched — **passed**: the temporary image was written to
  the browser's localStorage only; the shared `dishes` table was never
  modified, so no test image reached real visitors.

## Output Excerpts

```text
{"focusBefore":"tile has-dish",
 "open":{"lbHidden":false,"focusIsClose":true,"overflow":"hidden"},
 "tabbables":1,
 "closed":{"lbHidden":true,"overflow":"","focusReturned":"tile has-dish"}}
```

## Residual Risks

- The lightbox has a single tabbable element (the close button). A visitor
  who tabs forward leaves it — there is no visible content to focus, so this
  is not a trap in practice, and the `Escape` key and the backdrop click
  both close it.

## Recommendation

No action. The lightbox is correct.
