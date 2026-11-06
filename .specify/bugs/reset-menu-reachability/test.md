# Bug Test: The "Khôi phục món mặc định" button is reachable

**Slug**: reset-menu-reachability
**Date**: 2026-11-06
**Result**: verified (no defect found — the button is reachable by design)

## Checks Performed

- The menu-panel button `#resetMenu` exists inside `.menu__foot` — **passed**.
- `.menu__foot` is hidden for a visitor — **passed**: `footHidden: true`
  (the intended state — the button is owner-only).
- Clicking `#resetMenu` while not unlocked asks for the PIN instead of
  failing silently — **passed**: the PIN modal goes from `modal` to
  `modal show`, so the button is not a dead control.
- The owner-settings copy `#setResetMenu` exists in the DOM and is
  reachable through the logo → PIN flow — **passed**: `setResetMenu: true`.
- `unlockOwner` (index.html:1204-1207) sets `menuFoot.hidden = false`
  after the correct PIN, so the menu copy becomes visible for the owner.

## Output Excerpts

```text
{"menuFootHidden":true,"setResetMenu":true}
{"btnExists":true,"footHidden":true,"pmBefore":"modal","pmAfter":"modal show","msg":null}
```

## Residual Risks

- None. Both entry points call the same `doResetMenu()` (index.html:1818),
  which restores the default 6 dishes and re-saves the shared menu.

## Recommendation

No action. The reset control works and stays owner-only.
