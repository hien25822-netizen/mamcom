# Bug Test: Kéo món trên điện thoại khó, mini-calendar to và lệch tầm

**Slug**: mobile-dish-drag-drop
**Date**: 2026-11-07

## Checks Performed

1. **Kích thước thẻ món** — đo `getBoundingClientRect()` ở viewport 375×812.
2. **Mini-calendar** — đo hộp `.picker__box` và ô `.cal__day`.
3. **Auto-scroll khi kéo** — mô phỏng chuột bằng Pointer Events, kéo tới mép dưới, đọc `window.scrollY`.
4. **Bố cục 1 cột** — kiểm tra `getComputedStyle` của `.menu` và `.week`.
5. **Console** — reload rồi đọc log lỗi.

## Output Excerpts

```
.tile        → height 54px  (trước: ~64px)
.tile__media → 44 × 44 px  (trước: 72 × 72 px)
.tile__name  → font-size 13px
.picker__box → max-width 300px, padding 12px
.cal__day    → padding 5px 0, font-size 12.5px
.day__body   → min-height 44px

Kéo tới mép dưới (clientY = 780, viewport cao 812):
  scrollY trước = 0  →  scrollY sau = 214   ✅ tự cuộn

@media (max-width:560px):
  .menu → grid-template-columns: 1fr   ✅
  .week → grid-template-columns: 1fr   ✅
  .wrap → padding-left 14px

Console sau reload: (không có lỗi)
```

Ảnh chụp mobile 375×812: danh sách 6 món xếp dọc, mỗi thẻ một dòng gọn; mini-calendar nằm gọn trong một khối; bộ đếm lật hiển thị "32" bằng chữ số vàng nổi bật.

## Residual Risks

- Vùng mép 64px cuộn trang kể cả khi khách chỉ muốn đặt ngón xuống mà chưa kéo — nhưng chỉ xảy ra *sau khi* đã vượt ngưỡng 10px và đang trong chế độ kéo.
- `window.scrollBy` chạy theo tần suất sự kiện `pointermove`; trên thiết bị rất chậm có thể giật nhẹ. Hệ số 0.32 và ngưỡng tối thiểu 3px giữ cho tốc độ ở mức dễ chịu.

## Recommendation

**ĐẠT** — thẻ món gọn, mini-calendar nhỏ hơn, và kéo từ mục "Mâm" xuống lịch đã tự cuộn trên điện thoại mà không cần nhấc ngón.
