# Bug Assessment: "BẠN TIẾT KIỆM ĐƯỢC" tính số lần vô lý

**Slug**: saved-time-proportional
**Date**: 2026-11-07
**Severity**: content

## Report

Ở mục **"BẠN TIẾT KIỆM ĐƯỢC"**, phần "một năm" dùng cách tính không hợp lý — ví dụ "39 giờ một năm chỉ được 1 buổi spa". Chủ yêu cầu tính lại thời gian tiết kiệm theo cách cụ thể, hợp lý, tỷ lệ với thực tế.

## Symptom

- Dòng "một năm" in ra những con số vô nghĩa: "≈ 12 lần uống một ly cà phê", "≈ 78 lần một buổi nghỉ cuối tuần", "≈ 91 lần một buổi chiều thảnh thơi".
- Ngay cả khi thời gian tiết kiệm **không đủ** cho một hoạt động, vẫn hứa "1 lần" (ép tối thiểu) — 39 giờ tiết kiệm nhưng lại hứa "1 lần du lịch 7 ngày".

## Reproduction

1. Mở https://mamcomvn.vercel.app/, tới mục "BẠN TIẾT KIỆM ĐƯỢC".
2. Chọn 1–6 món.
3. Đọc danh sách "trong tuần" và "trong một năm".

## Suspected Code Paths

- `index.html:2303-2311` — `WEEK_IDEAS` (nay đã đổi thành `WEEK_ACTS`).
- `index.html:2312-2320` — `YEAR_IDEAS` (nay đã đổi thành `YEAR_ACTS`).
- `index.html:2329-2351` — `fillIdeaList()` (nay đã đổi thành `fillCountList()`).
- `index.html:2353` — `updateSavings()` nơi gọi hai hàm trên.

## Root Cause Hypothesis

Ba lỗi cộng lại:

1. **Mỗi hoạt động không có thời lượng thật** → không có mốc để quy đổi. Chỉ có câu chữ, nên code phải "đoán" một hệ số tùy ý.
2. **Ép tối thiểu 1 lần** (`Math.max(1, ...)`) — sinh ra lời hứa vượt quá thời gian thực tế có. Đây là lỗi nghiêm trọng nhất: nó nói dối khách.
3. **Cộng dồn hoạt động nhỏ lên quy mô năm** — 1 buổi 30 phút × 52 tuần → "91 lần một buổi chiều thảnh thơi", nghe vô nghĩa.

Ngoài ra, danh sách "năm" dùng chung bộ ý tưởng nhỏ với "tuần" → quy mô không khớp.

## Proposed Remediation

1. Gắn **thời lượng thật (phút)** cho từng hoạt động.
2. Số lần = `floor(tổng phút tiết kiệm ÷ thời lượng hoạt động)` — bỏ hoàn toàn `Math.max(1, ...)`. Nếu chưa đủ cho 1 lần thì **không hiện** hoạt động đó.
3. Tách bộ hoạt động theo quy mô:
   - **Tuần**: hoạt động 30–180 phút (cà phê, đọc sách, gym, xem phim, buổi chiều gia đình).
   - **Năm**: chỉ dùng mốc **từ 1 ngày trở lên** (1440 / 2880 / 4320 / 10080 / 20160 phút) → "1 ngày trọn vẹn", "2 ngày cuối tuần", "du lịch 3 ngày", "du lịch 7 ngày", "1 tháng ở nhà".
4. Nếu không hoạt động nào đủ 1 lần → fallback "≈ N ngày không phải đi chợ, nghĩ món".

**Files**: `index.html`.

**Verification**: chọn lần lượt 1, 2, 3, 6 món, đọc kết quả phải hợp lý và **không bao giờ** hứa 1 lần cho hoạt động vượt quá thời gian đã tiết kiệm.

## Risks

- Bỏ ép tối thiểu có thể làm danh sách trống khi tiết kiệm ít → đã có fallback theo ngày.
- Đổi tên biến (`WEEK_IDEAS`→`WEEK_ACTS` v.v.) → phải cập nhật cả nơi gọi.

## Open Questions

- Không có: chủ đã nêu rõ "concrete, logical, proportional real-world uses".
