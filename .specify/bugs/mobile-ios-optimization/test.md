# Bug Test: Chưa tối ưu cho điện thoại, đặc biệt iOS

**Slug**: mobile-ios-optimization
**Date**: 2026-11-07

## Checks Performed

1. Preview ở viewport iPhone 375×812.
2. Đo kích thước/khoảng cách bằng `getComputedStyle` cho thẻ món, nút, vùng chạm.
3. Kiểm tra bố cục 1 cột cho menu, tuần và thẻ đơn hàng.
4. Screenshot màn hình mobile.
5. Console sau reload.

## Output Excerpts

```
Viewport 375×812

.tile        → padding 4px 5px, min-height 48px   ✅
.tile__media → 44 × 44 px, font-size 22px          ✅
.tile__name  → font-size 13px, line-height 1.25    ✅
.tile__edit  → 30 × 30 px                          ✅
.chip__x     → 22 × 22 px (dễ chạm hơn 16px)      ✅
.btn         → padding 12px 14px (cao ~44px)       ✅
.wrap        → padding-left 14px                   ✅
h1           → font-size 20px                       ✅

@media (max-width:560px)
  .menu        → grid-template-columns: 1fr   ✅
  .week        → grid-template-columns: 1fr   ✅
  .order__grid → grid-template-columns: 1fr   ✅  (đơn hàng 1 cột dọc)

<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">  ✅

Console sau reload: (không có lỗi)
```

Screenshot mobile: danh sách 6 món 1 cột, thẻ gọn; lịch và đơn hàng 1 cột dọc; bộ đếm lật chữ số vàng nổi bật.

## Residual Risks

- `env(safe-area-inset-*)` = 0 trên desktop/thiết bị không có notch → bố cục desktop không đổi.
- Chưa kiểm thử trực tiếp trên thiết bị iOS thật (chỉ mô phỏng viewport + user-agent mobile trong preview) — khuyến nghị chủ mở trên iPhone sau khi deploy để xác nhận cuối cùng.

## Recommendation

**ĐẠT** — giao diện đã tối ưu cho điện thoại: nút chạm dễ hơn, tôn trọng vùng an toàn iOS, không còn viền xanh khi chạm, và đơn hàng vẫn 1 cột dọc như ràng buộc đã đóng băng.
