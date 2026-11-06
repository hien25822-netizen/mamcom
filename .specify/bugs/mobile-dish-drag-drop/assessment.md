# Bug Assessment: Kéo món trên điện thoại khó, mini-calendar to và lệch tầm

**Slug**: mobile-dish-drag-drop
**Date**: 2026-11-07
**Severity**: degraded

## Report

Chủ báo 3 điểm liên quan tới thao tác kéo món trên điện thoại (đa số khách dùng điện thoại):

1. Ở mục **"Mâm"**, các món rất khó kéo xuống mini-calendar.
2. Mini-calendar **quá to**, làm khó kéo tới.
3. Thao tác kéo món → mini-calendar **chưa thân thiện nhất có thể**.

## Symptom

- Thẻ món dạng "xấp xỉ" (media 72px + tên 12.5px + viền trên) → chiếm nhiều chiều cao, ngón tay che mất mục tiêu khi kéo.
- Mini-calendar chiếm ~330px chiều rộng, ô ngày cao ~44px → toàn bộ lịch chiếm gần hết màn hình dọc, phải cuộn nhiều lần mới tới ngày cần xếp món.
- Kéo món từ mục "Mâm" (nằm ở trên) xuống mini-calendar (nằm dưới) là một cú kéo dài, vượt quá chiều cao màn hình điện thoại → không kéo tới nổi.

## Reproduction

1. Mở https://mamcomvn.vercel.app/ trên điện thoại (viewport 375×812).
2. Cuộn tới mục "Mâm" — 6 thẻ món xếp dọc, mỗi thẻ cao ~54px.
3. Thử kéo một món xuống vùng mini-calendar ở dưới → phải cuộn tay xen vào giữa lúc kéo, thao tác giật cục.

## Suspected Code Paths

- `index.html:88` `.tile` — thẻ món: padding `5px 6px`, `min-height:52px`.
- `index.html:120` `.tile__media` — ảnh/emoji 72×72px → phần to nhất của thẻ, đẩy chiều cao thẻ lên.
- `index.html:130` `.tile__name` — padding `2px 4px` + `border-top` → thêm một đường kẻ thừa.
- `index.html:112` `.tile.drag-ghost` — bản "mảnh" theo ngón tay 84×84px, lớn hơn cả thẻ gốc → che màn hình khi kéo.
- `index.html:345` `.picker__box` — hộp mini-calendar `max-width:330px; padding:16px`.
- `index.html:358` `.cal__day` — ô ngày `padding:7px 0; font-size:13px; border-radius:9px`.
- `index.html:276` `.day__body` — vùng thả `min-height:52px; padding:8px 10px`.
- `index.html:1367` `startPointerDrag()` — kéo bằng Pointer Events; **không có cơ chế tự cuộn trang** khi ngón tay chạm mép trên/dưới màn hình.

## Root Cause Hypothesis

Ba nguyên nhân độc lập cộng lại:

1. **Kích thước thẻ món quá lớn** so với ngón tay (~9mm). Media 72px + padding làm thẻ cao ~54px; khi kéo, ngón tay đè lên chính thẻ đang kéo và giấu mục tiêu phía dưới.
2. **Mini-calendar quá cỡ**: ô ngày + padding + hộp 330px khiến lịch chiếm gần hết viewport dọc của iPhone SE/8 (~667px).
3. **Thiếu auto-scroll khi kéo**: `startPointerDrag` chỉ cập nhật vị trí "ghost" và highlight ô ngày. Không có `window.scrollBy` khi con trỏ chạm vùng mép. Khách phải nhấc ngón, cuộn, rồi kéo tiếp — trên iOS `touch-action:none` khiến cuộn bằng ngón cũng bị chặn trong lúc kéo.

## Proposed Remediation

1. Thu gọn `.tile`: media 72→48px (44px ở màn ≤560px), bỏ `border-top` ở tên, padding và khoảng cách nhỏ lại.
2. Thu gọn mini-calendar: `.picker__box` 330→300px, padding 16→12px; `.cal__day` padding 7→5px, font 13→12.5px; `.day__body` min-height 52→44px.
3. Thêm auto-scroll trong `startPointerDrag`: khi `clientY` nằm trong 64px sát mép trên/dưới → `window.scrollBy` theo tốc độ tỷ lệ với khoảng cách từ mép.
4. Nhỏ `.tile.drag-ghost` 84→62px để không che màn hình.

**Files**: `index.html` (chỉ file này — SPA một file).

**Verification**: preview ở viewport 375×812, đo `getBoundingClientRect()` của `.tile`/`.tile__media`, và thao tác kéo thật bằng pointer events để xác nhận `scrollY` thay đổi khi kéo sát mép dưới.

## Risks

- Thu gọn quá mạnh làm tên món khó đọc → giữ `font-size:13px`, `font-weight:700`.
- Auto-scroll dùng `scrollBy` mỗi sự kiện `pointermove` → có thể giật nếu tốc độ quá lớn; dùng hệ số 0.32 và trần tối độ để mượt.
- `.tile` có `touch-action:none` ở `@media (pointer:coarse)` → mọi thao tác cuộn chạm trên thẻ môn bị chặn. Cần chắc chắn `preventDefault()` chỉ được gọi **sau khi** ngón đã vượt ngưỡng 10px (đã có sẵn ở `index.html:1373`), còn lướt nhẹ trên thẻ vẫn cuộn trang bình thường.

## Open Questions

- Không có: yêu cầu đã rõ (mục tiêu chính là điện thoại).
