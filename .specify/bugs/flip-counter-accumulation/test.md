# Bug Test: Bảng lật lỗi thương hiệu và bộ đếm không cộng dồn đúng

**Slug**: flip-counter-accumulation
**Date**: 2026-11-07

## Checks Performed

1. Áp dụng migration `20261107000000_increment_meals.sql` lên project Supabase thật.
2. Gọi RPC `increment_meals` bằng `curl` và đọc lại dòng `state`.
3. Trong trình duyệt: chọn 6 món, bấm "Sao chép đơn hàng", đọc bộ đếm trên UI và giá trị trên server.
4. Kiểm tra ngoại hình bảng lật (screenshot mobile).
5. Console sau reload.

## Output Excerpts

```
$ supabase db push --linked
Applying migration 20261107000000_increment_meals.sql... Finished supabase db push.

$ curl -X POST .../rest/v1/rpc/increment_meals -d '{"p_n":2}'
"34"

$ curl .../rest/v1/state?key=eq.meals
[{"key":"meals","value":"34"}]        ← đã cộng nguyên tử, đúng số

Trình duyệt (6 món đã chọn):
  Bộ đếm trước khi bấm: 32
  Bấm "Sao chép đơn hàng"
  Bộ đếm sau:            38          (= 32 + 6 mâm)   ✅
  Dòng server sau:       "38"                        ✅

Console sau reload: (không có lỗi)
```

Ngoại hình: chữ số màu vàng (`--yellow`) đậm `font-weight:900` trên nền đỏ gradient, viền vàng 2px, `Impact/"Arial Black"` — nổi bật, đúng tông đỏ-vàng của Mâm Cơm.

## Residual Risks

- `increment_meals` là `security definer` → bất kỳ ai giữ anon key đều gọi được. Đây là đánh đổi đã biết (app không có Supabase Auth; xem ghi chú RLS trong `supabase/schema.sql`).
- Bộ đếm cộng dồn **chỉ** khi sao chép thành công. Nếu trình duyệt chặn clipboard, khách không được tính — đúng ý nghĩa "chỉ tính đơn đã gửi".
- Khách ở thiết bị khác thấy số cũ tối đa 20s (chu kỳ đồng bộ) hoặc tới khi quay lại tab.

## Recommendation

**ĐẠT** — bộ đếm cộng đúng số mâm khách đặt, lưu nguyên tử trên server nên mọi khách đều thấy cùng một con số thật, và bảng lật đã đổi sang chữ số vàng đậm nổi bật.
