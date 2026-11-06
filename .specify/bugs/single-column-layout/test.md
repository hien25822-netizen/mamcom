# Bug Test: Dish menu and order cards rendered in multiple columns instead of one vertical column

**Slug**: single-column-layout
**Date**: 2026-11-06
**Result**: verified

## Checks Performed

- Card-list track count at desktop (1440×900) — **passed**:
  `.menu` = 1 track, `.week` = 1 track, `.orders__list` = 1 track.
- Card-list track count at mobile (375×812, reported as 454 CSS px by the
  scaled preview pane) — **passed**: `.menu` = 1, `.week` = 1,
  `.orders__list` = 1.
- Exactly six dishes, still present and in order — **passed**:
  6 `.tile` elements; screenshot at 1440×900 shows one dish per row with
  image left and name right, and the seven day rows stacked vertically.
- Drag-and-drop intact — **passed**: 6 of 6 tiles carry `draggable="true"`.
- Tile names not truncated — **passed** (visual): the longest dish name
  ("Thịt rang cháy cạnh & Canh rau muống") renders in full on one line
  beside its image.
- Non-card grids confirmed as intentional — **passed**: `.board` = 2 tracks
  (page shell) and `.order__grid` = 2 tracks (customer form fields),
  matching the reasoning in `fix.md`; neither renders cards.
- Regression — the copy-schedule button and the seven day cells still
  present — **passed**: copy button found, 7 `.day` elements.

## Output Excerpts

```text
# 1440 x 900
{"w":1440,"menuTracks":1,"weekTracks":1,"ordersTracks":1,
 "boardTracks":2,"orderGridTracks":2,"tiles":6,"draggable":6}

# 375 x 812 (pane reports 454 CSS px after scaling)
{"w":454,"menuTracks":1,"weekTracks":1,"ordersTracks":1,
 "tiles":6,"days":7,"copyBtn":true}
```

Screenshot at 1440×900: the six dishes (Thịt rang cháy cạnh & Canh rau
muống, Cải cuộn thịt, Cái cuộn cả chua, Nhím xốc tôm, Đùi chiên bơ, Bí đao) each
occupy their own full-width row in the left panel; Thứ 2 → Thứ 7 stack
vertically in the right panel.

## Residual Risks

- The dish tile now has no fixed aspect ratio, so its height is driven by
  the image and the name. On a very long dish name the row grows taller
  rather than clipping — acceptable, and the name is not truncated.
- `.board` still uses two columns on desktop (menu panel + content panel).
  If the owner ever means "the whole page is one column", that is a
  separate, larger change and would contradict the current two-panel
  design; it was not done here.

## Recommendation

No further action. The constraint is satisfied on desktop and mobile.
