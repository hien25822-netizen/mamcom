# Bug Test: The dialogs and the star rating are keyboard-usable

**Slug**: keyboard-a11y-dialogs
**Date**: 2026-11-06
**Result**: verified (no defect found — behaviour confirmed correct)

## Checks Performed

- All four dialogs exist in the DOM — **passed**:
  `["pinModal:present","settingsModal:present","dateModal:present","timeModal:present"]`.
- Clicking the logo opens the PIN dialog — **passed**:
  `#pinModal` gets the class `modal show` and `pmHidden` becomes `false`.
- The background is scroll-locked while the dialog is open — **passed**:
  `document.body.style.overflow === "hidden"` (checked after the opening
  animation tick, when `syncScrollLock` has run).
- Focus is placed inside the dialog — **passed**: after opening,
  `document.activeElement.id === "pinInput"`.
- The dialog has usable focusable controls — **passed**: 5 of them —
  `pinClose`, `pinInput`, `pinConfirm`, `pinSubmit`, `pinSkip`.
- `Tab` wraps from the last control back to the first — **passed**: focused
  `pinSkip` (the last), pressed `Tab` → focus is on `pinClose` (the first).
- `Shift+Tab` wraps from the first control back to the last — **passed**:
  focused `pinClose` (the first), pressed `Shift+Tab` → focus is on
  `pinSkip` (the last).
- The star group is a correct radio group — **passed**: 5 buttons,
  exactly 1 with `aria-checked="true"` and exactly 1 with `tabindex="0"`.
- The scroll lock is released when the dialog closes — **passed**:
  `document.body.style.overflow` returns to `""`.

## Output Excerpts

```text
{"dialogs":["pinModal:present:closed","settingsModal:present:closed",
            "dateModal:present:closed","timeModal:present:closed"]}

{"opened":{"pmClass":"modal show","pmHidden":false,"overflow":"hidden",
           "focused":"pinInput"},
 "trapCount":5,"ids":["pinClose","pinInput","pinConfirm","pinSubmit","pinSkip"]}

{"before":"pinSkip","after":"pinClose","afterShift":"pinSkip","first":"pinClose"}

{"stars":5,"checked":1,"tabbable":1}
```

## Residual Risks

- The dialogs are not marked up with `role="dialog"` / `aria-modal`. The
  focus trap, the scroll lock and the `Escape` key already make them
  behave correctly for a keyboard and a screen reader, but a full ARIA
  upgrade would be a larger change than the scan requires and would touch
  the frozen UI structure.

## Recommendation

No action. The keyboard behaviour is correct.
