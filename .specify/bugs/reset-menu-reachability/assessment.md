# Bug Assessment: "Khôi phục 6 món mặc định" is reachable — no defect

**Slug**: reset-menu-reachability
**Date**: 2026-11-06
**Severity**: none (checked as part of the full-codebase scan)

## Report

The menu panel has a button `🔒 Khôi phục món mặc định (cần PIN chủ)`
inside `.menu__foot`, which is `hidden` in the HTML. A hidden button that is
never revealed would make the function unreachable — a real bug. The audit
checked whether the button actually becomes visible.

**Finding: no bug.** The button is revealed on purpose, and a second,
always-visible copy exists in the owner settings panel.

## What Was Checked

- `.menu__foot` is `hidden` in the markup (index.html:739).
- `unlockOwner` (index.html:1204-1207) reveals it once the owner PIN has
  been entered:

  ```javascript
  // Nút "khôi phục món mặc định" nằm trong .menu__foot (mặc định hidden) —
  // phải bật lên khi chủ đã mở khóa, nếu không nút này không bao giờ hiện.
  var menuFoot = document.querySelector(".menu__foot");
  if(menuFoot) menuFoot.hidden = false;
  ```

- The click handler (index.html:1809) asks for the PIN when the owner is not
  yet unlocked, so the button is safe even if it were shown early.
- A second copy, `#setResetMenu` (index.html:920), lives in the owner
  settings panel and is reachable by clicking the logo.

## Reproduction

1. Load the page as a visitor → `.menu__foot.hidden === true` (the button
   is not shown to guests).
2. Unlock the owner PIN → `unlockOwner` sets `menuFoot.hidden = false`.
3. Independently: the button `#setResetMenu` is present in the DOM and sits
   in the owner settings panel.

## Observed

```text
{"menuFootHidden":true,"setResetMenu":true}
```

`menuFootHidden: true` for a visitor is the intended state; the owner-only
copy in the settings panel exists, and the menu copy is revealed by
`unlockOwner` as soon as the PIN is entered.

## Root Cause

Not applicable — no defect.

## Proposed Remediation

None.

## Risks

- None.

## Open Questions

- None.
