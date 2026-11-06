# Bug Test: "BẠN TIẾT KIỆM ĐƯỢC" tính số lần vô lý

**Slug**: saved-time-proportional
**Date**: 2026-11-07

## Checks Performed

1. Chọn lần lượt 1, 2, 3, 6 món ở mục "Mâm" và đọc hai danh sách ("trong tuần", "trong một năm").
2. Kiểm tra khối "năm" không còn dùng mốc nhỏ (nghỉ cuối tuần, buổi chiều thảnh thơi).
3. Kiểm tra không còn trường hợp hứa "1 lần" cho hoạt động vượt quá tổng thời gian đã tiết kiệm.
4. Kiểm tra fallback khi tiết kiệm rất ít.
5. Console sau reload.

## Output Excerpts

```
6 món:
  Trong tuần:    ≈ 9 lần uống một ly cà phê thật chậm
                 ≈ 6 lần đọc một chương sách
                 ≈ 4 lần một buổi đi bơi / tập gym
                 ≈ 2 lần xem trọn một bộ phim
  Trong một năm: ≈ 9 lần một ngày trọn vẹn không phải nghĩ món
                 ≈ 4 lần hai ngày cuối tuần chỉ để ở nhà
                 ≈ 3 lần một chuyến du lịch gia đình 3 ngày
                 ≈ 1 lần một chuyến du lịch xa 7 ngày

3 món:
  Trong tuần:    ≈ 4 lần cà phê / 3 lần đọc sách / 2 lần gym / 1 lần xem phim
  Trong một năm: ≈ 4 lần một ngày trọn vẹn / 2 lần hai ngày cuối tuần
                 ≈ 1 lần du lịch 3 ngày        (KHÔNG có "1 lần du lịch 7 ngày")

1 món:
  Trong tuần:    ≈ 1 lần cà phê
  Trong một năm: ≈ 1 lần một ngày trọn vẹn    (đúng tỷ lệ, trước đây hứa 1 lần spa)

Khối "năm" không còn "nghỉ cuối tuần" / "buổi chiều thảnh thơi"   ✅

Console sau reload: (không có lỗi)
```

Đối chiếu trước/sau ở 3 món: trước đây khối năm in "≈ 91 lần một buổi chiều thảnh thơi" và "≈ 1 lần du lịch xa 7 ngày" trong khi tổng thời gian tiết kiệm chỉ vài chục giờ — nay đã bỏ hết.

## Residual Risks

- Cụm "≈ N lần ..." vẫn là ước lượng làm tròn xuống (`Math.floor`) → con số luôn là ước lượng trung thực, không vượt quá thực tế.
- Với lượng tiết kiệm rất nhỏ, danh sách "năm" có thể rất ngắn — chấp nhận được và đúng ý nghĩa.

## Recommendation

**ĐẠT** — mọi con số giờ tỷ lệ đúng với thời gian thực đã tiết kiệm, quy mô "năm" chỉ dùng mốc từ 1 ngày trở lên, không còn lời hứa vượt quá khả năng.
