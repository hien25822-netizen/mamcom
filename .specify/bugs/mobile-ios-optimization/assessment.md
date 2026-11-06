# Bug Assessment: Chưa tối ưu cho điện thoại, đặc biệt iOS

**Slug**: mobile-ios-optimization
**Date**: 2026-11-07
**Severity**: degraded

## Report

Toàn bộ web app phải thân thiện với điện thoại, **đặc biệt iOS** (đa số khách dùng iPhone).

## Symptom

- Thẻ món, nút bấm và vùng chạm nhỏ — ngón cái iPhone khó bấm chính xác.
- Không tôn trọng vùng an toàn (notch / home bar) → nội dung mép màn có thể bị che.
- Hiện tượng "nháy xanh" khi chạm nút (tap highlight) trên iOS.
- Đơn hàng không phải 1 cột dọc trên mobile (vi phạm ràng buộc nghiệp vụ đã đóng băng).

## Reproduction

1. Mở https://mamcomvn.vercel.app/ trên iPhone (viewport 375×812).
2. Bấm các nút — thấy viền xanh nháy (iOS default tap highlight).
3. So sánh nội dung với mép trên/dưới màn hình — không có bù vùng an toàn.
4. So sánh bố cục đơn hàng trên desktop và mobile — cần đảm bảo 1 cột dọc ở cả hai.

## Suspected Code Paths

- `index.html:5` — `<meta name="viewport">` (cần `viewport-fit=cover`).
- `index.html:628-642` — khối `@media (max-width:560px)` — phủ mobile.
- `index.html:720` — `<header>` trang (cần `padding-top: env(safe-area-inset-top)`).
- `index.html` `.wrap` — padding nội dung (cần thêm `env(safe-area-inset-*)`).

## Root Cause Hypothesis

Trang viết cho desktop trước, mobile mới ghép về sau nên thiếu:
1. `viewport-fit=cover` → không truy cập được `env(safe-area-inset-*)`.
2. Không có CSS bù vùng an toàn (notch + home bar).
3. Nút cao chưa đủ kích thước chạm (44×44px theo chuẩn iOS).
4. Không khoá bố cục đơn hàng thành 1 cột dọc ở mọi kích thước màn hình (ràng buộc đã đóng băng).

## Proposed Remediation

1. Thêm `viewport-fit=cover` vào `<meta name="viewport">`.
2. Khối `@media (max-width:560px)`: thu nhỏ thẻ món (ảnh 44px), giữ 1 cột dọc, phím bấm cao ≥ 44px, `.week` 1 cột.
3. CSS an toàn iOS: `env(safe-area-inset-*)` cho `.wrap` (trên/dưới/trái/phải) và `<header>`.
4. `@supports (-webkit-touch-callout:none)` → `-webkit-tap-highlight-color: transparent`.
5. Modal: `max-height: min(86dvh, 760px)` để không tràn dưới home bar.

**Files**: `index.html`.

**Verification**: preview viewport 375×812, đo các thuộc tính CSS theo `getComputedStyle`, và screenshot.

## Risks

- `env(safe-area-inset-*)` trên trình duyệt desktop (không có notch) trả về 0 → không ảnh hưởng.
- `@supports (-webkit-touch-callout:none)` chỉ khớp trên Safari → đúng ý (chỉ loại highlight của iOS).
- Thu nhỏ ảnh món (44px) có thể làm logo emoji hơi nhỏ → bù bằng font-size 22px.

## Open Questions

- Không có.
