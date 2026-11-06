# Bug Fix: Đổi tên tiêu đề và nút trong mục Tạo đơn hàng

**Slug**: order-section-renaming
**Date**: 2026-11-07

## Changes

| # | File | Thay đổi |
|---|------|----------|
| 1 | `index.html:793` | `Đặt mâm (tạo đơn hàng)` → `Tạo đơn hàng` |
| 2 | `index.html:822` | `Sao chép lộ trình thực đơn` → `Sao chép đơn hàng` |

## Diff Highlights

- Chỉ đổi văn bản hiển thị. Không đổi `id`, tên biến, hay handler gắn sự kiện.
- Không đụng tới 5 ràng buộc nghiệp vụ đã đóng băng (kéo-thả 6 món, cột dọc, 5 trường trên thẻ đơn, đồng bộ real-time).

## Tests

| Loại | Nội dung | Kết quả |
|------|----------|---------|
| Grep | `grep "Đặt mâm" index.html` | Không còn kết quả ✅ |
| Grep | `grep "Sao chép đơn hàng" index.html` | Có 1 kết quả ✅ |
| Trình duyệt | Mở trang, đọc tiêu đề và nút | Đúng chuỗi mới ✅ |
| Console | Reload | Không lỗi ✅ |

## Local Verification

Mở `index.html` qua preview cục bộ, kiểm tra tiêu đề mục và nút bấm; click nút "Sao chép đơn hàng" vẫn sao chép món + lịch trình như cũ (đã xác nhận ở luồng kiểm thử bộ đếm: 6 món → bộ đếm +6).

## Deviations

- Không có.

## Follow-ups

- Không có.
