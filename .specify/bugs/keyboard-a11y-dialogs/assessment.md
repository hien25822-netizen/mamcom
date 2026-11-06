# Bug Assessment: The dialogs and the star rating are keyboard-usable — no defect

**Slug**: keyboard-a11y-dialogs
**Date**: 2026-11-06
**Severity**: none (checked as part of the full-codebase scan)

## Report

Part of the whole-codebase UI audit: every pop-up (the owner PIN box, the
owner settings, the date picker, the time picker) and the 5-star rating
control were checked for keyboard usability — can the user reach the
controls, does `Tab` stay inside the open dialog, does the star group
behave like a radio group.

**Finding: no bug.** The behaviour is already correct.

## What Was Checked

- `DIALOGS` (index.html:1279) — the four pop-ups plus the lightbox.
- `dialogsOpen()` (index.html:1280) — collects the open overlays.
- The `Tab` handler (index.html:1299-1310) — wraps the focus around the
  top-most dialog.
- `focusablesIn(root)` (index.html:1291) — collects the reachable controls.
- `paintPick()` (index.html:2848) — sets `role="radio"`, `aria-checked` and
  `tabindex` on the five star buttons.
- The arrow-key handler on the star group (index.html:2865).

## Reproduction

1. Click the logo (`img.logo`) → the PIN dialog opens.
2. Inspect the dialog's class, `body.style.overflow` and the focused
   element.
3. Focus the last focusable element, press `Tab` → focus must wrap to the
   first.
4. Focus the first element, press `Shift+Tab` → focus must wrap to the last.
5. Inspect the star group: exactly one button must have
   `aria-checked="true"` and exactly one must have `tabindex="0"`.

## Observed

```text
{"opened":{"pmClass":"modal show","pmHidden":false,"overflow":"hidden","focused":"pinInput"},
 "trapCount":5,"ids":["pinClose","pinInput","pinConfirm","pinSubmit","pinSkip"]}
{"before":"pinSkip","after":"pinClose","afterShift":"pinSkip","first":"pinClose"}
{"stars":5,"checked":1,"tabbable":1}
```

- The PIN dialog opens with the class `modal show`, the background is
  scroll-locked (`overflow: "hidden"`) and focus is placed in `#pinInput`.
- `Tab` from the last element wraps to `#pinClose`; `Shift+Tab` from the
  first wraps to `#pinSkip` — the trap works in both directions.
- The star group has 5 buttons, exactly one checked and exactly one
  tabbable — the correct `radiogroup` pattern.

## Root Cause

Not applicable — no defect.

## Proposed Remediation

None.

## Risks

- None.

## Open Questions

- None.
