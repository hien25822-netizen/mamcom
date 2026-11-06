# Bug Fix: No change required — the dialogs and the star rating are already keyboard-usable

**Slug**: keyboard-a11y-dialogs
**Date**: 2026-11-06

## Change Applied

**None.** The keyboard behaviour was reviewed and found correct; no source
file was modified for this slug.

The logic that makes it work:

1. **Every pop-up is listed** (index.html:1279):

   ```javascript
   var DIALOGS = ["pinModal","settingsModal","dateModal","timeModal"];
   ```

2. **The top-most open overlay is found** (index.html:1280):

   ```javascript
   function dialogsOpen(){
     return DIALOGS.map(function(id){ return document.getElementById(id); })
       .filter(function(el){ return el && el.classList.contains("show"); })
       .concat([lightbox.hidden ? null : lightbox]).filter(Boolean);
   }
   ```

3. **`Tab` wraps inside the top-most dialog** (index.html:1299-1310):

   ```javascript
   document.addEventListener("keydown", function(e){
     if(e.key !== "Tab") return;
     var list = dialogsOpen();
     if(!list.length) return;
     var root = list[list.length - 1];   // hộp trên cùng
     var f = focusablesIn(root);
     if(!f.length) return;
     var first = f[0], last = f[f.length - 1];
     if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
     else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
     else if(!root.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
   });
   ```

4. **The star group follows the radio-group pattern** (index.html:2848):

   ```javascript
   b.setAttribute("role", "radio");
   b.setAttribute("aria-checked", i === pickRating - 1 ? "true" : "false");
   b.setAttribute("tabindex", i === pickRating - 1 ? "0" : "-1");
   ```

   plus the arrow-key handler at index.html:2865 that moves the selection
   with `ArrowRight/Left/Up/Down`.

## Files Touched

- None.

## Checks Required By The Fix

None — nothing was changed. The verification is recorded in `test.md`.
