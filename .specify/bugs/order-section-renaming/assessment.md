# Bug Assessment: Đổi tên tiêu đề và nút trong mục Tạo đơn hàng

**Slug**: order-section-renaming
**Date**: 2026-11-07
**Severity**: cosmetic

## Report

Chủ yêu cầu đổi 2 nhãn hiển thị:

1. Tiêu đề/label **"Đặt mâm (tạo đơn hàng)"** → **"Tạo đơn hàng"**
2. Nút **"Sao chép lộ trình thực đơn"** → **"Sao chép đơn hàng"**

## Symptom

Cụm "Đặt mâm (tạo đơn hàng)" thừa chữ, khách đọc lúng túng không biết nghĩa "đặt mâm". Cụm "Sao chép lộ trình thực đơn" dài và lệch — thao tác này thực chất sao chép **đơn hàng** (món + lịch trình) sang ngày khác.

## Reproduction

1. Mở https://mamcomvn.vercel.app/, cuộn tới mục tạo đơn.
2. Đọc tiêu đề mục: "Đặt mâm (tạo đơn hàng)".
3. Đọc nút sao chép: "Sao chép lộ trình thực đơn".

## Suspected Code Paths

- `index.html:793` — tiêu đề mục.
- `index.html:822` — nút sao chép.
- `index.html:~2660` — handler gắn vào nút (giữ nguyên, chỉ đổi chữ hiển thị).

## Root Cause Hypothesis

Chữ trên giao diện viết theo cách nội bộ ("mâm", "lộ trình thực đơn") thay vì cách khách hiểu ("đơn hàng"). Không có lỗi logic — thuần túy văn bản.

## Proposed Remediation

Đổi chuỗi hiển thị, **không** đổi `id`/biến/handler để không đụng logic.

- `Đặt mâm (tạo đơn hàng)` → `Tạo đơn hàng`
- `Sao chép lộ trình thực đơn` → `Sao chép đơn hàng`

**Files**: `index.html`.

**Verification**: `grep` xác nhận chuỗi cũ không còn; mở trang và đọc tiêu đề + nút.

## Risks

- Rất thấp. Rủi ro duy nhất: đổi nhầm chuỗi nằm trong code sinh ra (nếu có) — kiểm tra bằng grep trước khi sửa.

## Open Questions

- Không có.
