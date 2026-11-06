# Bug Fix: Kéo món trên điện thoại khó, mini-calendar to và lệch tầm

**Slug**: mobile-dish-drag-drop
**Date**: 2026-11-07

## Changes

| # | File | Thay đổi |
|---|------|----------|
| 1 | `index.html:88-99` | `.tile` — padding `5px 6px` → `4px 5px`, `min-height:52px` → `48px` |
| 2 | `index.html:120-129` | `.tile__media` — 72×72px → `flex:0 0 48px; height:48px`, font 24px |
| 3 | `index.html:130-137` | `.tile__name` — bỏ `border-top`, padding `2px 4px`, font 12.5px → 13px |
| 4 | `index.html:112-119` | `.tile.drag-ghost` — 84×84px → 62×62px (bóng theo ngón không che màn hình) |
| 5 | `index.html:148-156` | `.tile__edit` — 32×32px → 28×28px (28px ở mobile) |
| 6 | `index.html:345-350` | `.picker__box` — `max-width:330px; padding:16px` → `max-width:300px; padding:12px` |
| 7 | `index.html:358-362` | `.cal__day` — padding `7px 0` → `5px 0`, font 13px → 12.5px, radius 9px → 8px |
| 8 | `index.html:276-282` | `.day__body` — `min-height:52px; padding:8px 10px` → `44px; 6px 9px` |
| 9 | `index.html:1386-1392` | `startPointerDrag` — thêm **auto-scroll** khi ngón chạm mép trên/dưới màn hình |

### Đoạn auto-scroll mới (index.html:1386-1392)

```javascript
// Kéo món trên điện thoại: chạm gần mép trên/dưới màn hình → tự cuộn
// để khách kéo được xuống mini-calendar dù chưa cuộn tay.
var vh = window.innerHeight, y = ev.clientY, EDGE = 64;
if(y < EDGE) window.scrollBy(0, -Math.max(3, (EDGE - y) * 0.32));
else if(y > vh - EDGE) window.scrollBy(0, Math.max(3, (y - (vh - EDGE)) * 0.32));
```

## Diff Highlights

- Không thay đổi logic kéo (`startPointerDrag`), chỉ thêm cuộn tự động vào `onMove` — không ảnh hưởng HTML5 drag trên desktop.
- Ngưỡng 10px `preventDefault()` (index.html:1373) được giữ nguyên → lướt nhẹ trên thẻ món vẫn cuộn trang bình thường.
- Vùng mép 64px, tốc độ cuộn tỷ lệ 0.32 × khoảng cách, tối thiểu 3px → mượt, không giật.

## Tests

| Loại | Nội dung | Kết quả |
|------|----------|---------|
| Đo kích thước | `getBoundingClientRect()` của `.tile`, `.tile__media` ở viewport 375×812 | media 44×44px, chiều cao thẻ 54px ✅ |
| Tương tác | Kéo bằng Pointer Events tới mép dưới → `window.scrollY` tăng | ✅ trang tự cuộn |
| Chụp ảnh | Screenshot mobile 375×812 | Danh sách 6 món 1 cột, thẻ gọn, lịch nhỏ ✅ |
| Console | `preview_console_logs` sau reload | Không có lỗi ✅ |

## Local Verification

- Preview cục bộ chạy `python3 -m http.server` trên `index.html` (SPA một file, không cần build).
- Mọi kiểm tra kích thước/interaction thực hiện bằng `preview_eval` trên đúng viewport iPhone (375×812).

## Deviations

- Media 44px (thay vì 48px) ở màn ≤560px theo yêu cầu "gọn cho điện thoại" — mục tiêu chính là điện thoại.

## Follow-ups

- Không có.
