# Bug Fix: No change required — the reset-menu button is reachable

**Slug**: reset-menu-reachability
**Date**: 2026-11-06

## Change Applied

**None.** Two entry points already exist:

1. The menu-panel button (`#resetMenu` inside `.menu__foot`,
   index.html:740). The container is `hidden` for visitors and revealed by
   `unlockOwner` once the owner PIN is entered (index.html:1204-1207). The
   click handler additionally asks for the PIN when the owner is not yet
   unlocked (index.html:1809-1817), so the button is safe in either state.
2. The settings-panel button (`#setResetMenu`, index.html:920), reachable
   through the logo → PIN flow, owner-only.

Both call the same `doResetMenu()` (index.html:1818), which restores the
default 6 dishes, saves the menu and rebuilds the UI — the frozen business
logic.

## Files Touched

- None.

## Checks Required By The Fix

None — nothing was changed. The verification is recorded in `test.md`.
