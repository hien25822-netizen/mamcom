# Bug Test: Đổi tên tiêu đề và nút trong mục Tạo đơn hàng

**Slug**: order-section-renaming
**Date**: 2026-11-07

## Checks Performed

1. Grep toàn bộ `index.html` tìm chuỗi cũ.
2. Grep chuỗi mới.
3. Mở trang và đọc tiêu đề mục + nút.
4. Click nút "Sao chép đơn hàng" để chắc chắn handler cũ vẫn chạy.
5. Console sau reload.

## Output Excerpts

```
$ grep -n "Đặt mâm" index.html
(không có kết quả)

$ grep -n "Sao chép đơn hàng" index.html
822:  ... <button ...>Sao chép đơn hàng</button>

Tiêu đề mục hiển thị: "Tạo đơn hàng"   ✅
Nút hiển thị:          "Sao chép đơn hàng"   ✅

Click "Sao chép đơn hàng" với 6 món đã chọn:
  → 6 món được nhân bản sang ngày đích, bộ đếm lật 32 → 38   ✅ (luồng cũ vẫn chạy)

Console sau reload: (không có lỗi)
```

## Residual Risks

- Không có.

## Recommendation

**ĐẠT** — cả hai nhãn đã đúng ý chủ, logic không đổi.
