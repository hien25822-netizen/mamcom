# Bug Fix: Chưa tối ưu cho điện thoại, đặc biệt iOS

**Slug**: mobile-ios-optimization
**Date**: 2026-11-07

## Changes

| # | File | Thay đổi |
|---|------|----------|
| 1 | `index.html:5` | `<meta name="viewport" … viewport-fit=cover>` |
| 2 | `index.html:628-642` | Khối `@media (max-width:560px)` viết lại: `.menu`/`.week` 1 cột, `.tile` gọn, `.order` 1 cột, `.btn` cao 12px |
| 3 | `index.html` (sau khối media) | CSS vùng an toàn iOS: `.wrap` bù trái/phải/dưới, `header` bù trên |
| 4 | `index.html` (sau khối media) | `@supports (-webkit-touch-callout:none)` → `-webkit-tap-highlight-color:transparent` |
| 5 | `index.html` | `.modal__box{max-height:min(86dvh,760px);overflow:auto}` |

### CSS an toàn iOS đã thêm

```css
/* iOS: bỏ viền xanh khi bấm, và tôn trọng vùng an toàn (notch / home bar) */
@supports (-webkit-touch-callout:none){
  button,a,input,select,textarea{-webkit-tap-highlight-color:transparent}
}
.wrap{padding-left:max(14px,env(safe-area-inset-left));
      padding-right:max(14px,env(safe-area-inset-right))}
header{padding-top:env(safe-area-inset-top)}
.modal__box{max-height:min(86dvh,760px);overflow:auto}
```

### Khối mobile (rút gọn)

```css
@media (max-width:560px){
  .menu{grid-template-columns:1fr;gap:8px;padding:8px}
  .wrap{padding:18px 14px calc(32px + env(safe-area-inset-bottom))}
  h1{font-size:20px}
  .tile__name{font-size:13px;line-height:1.25}
  .tile__media{flex:0 0 44px;height:44px;font-size:22px;border-radius:9px}
  .tile{padding:4px 5px;min-height:48px}
  .tile__edit{width:30px;height:30px;font-size:15px}
  .week{grid-template-columns:1fr;gap:8px}
  .day__head{padding:7px 9px}
  .day__name{font-size:12.5px}
  .day__count{font-size:10px;padding:1px 6px;min-width:22px}
  .day__body{min-height:0;padding:6px 7px;gap:5px}
  .day__empty{font-size:11.5px;padding:3px 2px}
  .chip{font-size:12px;gap:5px;padding:4px 5px 4px 4px}
  .chip__media{width:22px;height:22px;font-size:13px}
  .chip__x{width:22px;height:22px;font-size:13px}
  .order{margin-top:10px;padding:10px 12px}
  .order__grid{grid-template-columns:1fr;gap:8px}
  .btn{padding:12px 14px}
}
```

## Diff Highlights

- **Ràng buộc "đơn hàng 1 cột dọc"** được đảm bảo ở cả desktop lẫn mobile: `.week{grid-template-columns:1fr}` và `.order__grid{grid-template-columns:1fr}` trong media query, khớp với `.order` 1 cột sẵn có ngoài media query.
- `.chip__x` (nút xoá món trong lịch) to 22px ở mobile thay vì 16px → dễ chạm.
- `dvh` (dynamic viewport height) cho modal: đúng trên iOS khi thanh địa chỉ thu/cuộn.
- Không đụng tới 5 ràng buộc nghiệp vụ đã đóng băng.

## Tests

| Loại | Nội dung | Kết quả |
|------|----------|---------|
| Đo CSS | `getComputedStyle` ở 375×812 | `.tile__media` 44×44px, `.wrap` padding-left 14px ✅ |
| Bố cục | `.menu` / `.week` / `.order__grid` | `grid-template-columns: 1fr` ✅ |
| Screenshot | 375×812 | Danh sách món 1 cột gọn ✅ |
| Console | Reload | Không lỗi ✅ |

## Local Verification

Preview cục bộ ở viewport iPhone (375×812). Screenshot cho thấy danh sách 6 món xếp dọc, mỗi thẻ một dòng gọn; bộ đếm lật hiển thị chữ số vàng "32".

## Deviations

- `.day__body{min-height:0}` ở mobile (thay vì giữ 44px) — vùng thả trong lịch nhỏ lại, tránh mỗi ngày trống chiếm nhiều dòng trên điện thoại.

## Follow-ups

- Không có.
