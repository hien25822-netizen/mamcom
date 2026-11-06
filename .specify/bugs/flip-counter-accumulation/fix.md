# Bug Fix: Bảng lật lỗi thương hiệu và bộ đếm không cộng dồn đúng

**Slug**: flip-counter-accumulation
**Date**: 2026-11-07

## Changes

| # | File | Thay đổi |
|---|------|----------|
| 1 | `index.html:461-478` | CSS `.flip` / `.flip__card` — nền đỏ gradient, viền vàng, chữ `Impact/"Arial Black"` màu `--yellow`, `font-weight:900`, `font-size:38px`, `text-shadow` |
| 2 | `index.html:2714-2740` | `renderFlip(n)` — dựng ô số bằng text (không dùng transform tròn cũ), giữ hiệu ứng lật khi đổi chữ số |
| 3 | `index.html:2743-2756` | `bumpMeals()` — cộng `totalTraysAllWeeks()` vào bộ đếm chung |
| 4 | `index.html:2525-2548` | `sharedStore.addMeals(n)` — gọi RPC `increment_meals` (cộng nguyên tử trong Postgres), fallback read-modify-write |
| 5 | `index.html:2425-2433` | `copyText()` — gọi `bumpMeals()` sau khi sao chép thành công |
| 6 | `supabase/migrations/20261107000000_increment_meals.sql` | Hàm mới `public.increment_meals(p_n bigint)` — `security definer`, `UPDATE … value + p_n … RETURNING value` |

### Migration (supabase/migrations/20261107000000_increment_meals.sql)

```sql
create or replace function public.increment_meals(p_n bigint)
returns text
language sql
security definer
set search_path = public
as $$
  update public.state
     set value = (value::bigint + p_n)::text
   where key = 'meals'
   returning value;
$$;

revoke execute on function public.increment_meals(bigint) from anon;
grant execute on function public.increment_meals(bigint) to anon;
```

### JS cộng dồn (index.html:2743-2756)

```javascript
// Mỗi lần khách bấm "Sao chép đơn hàng", bộ đếm chung cộng thêm đúng số
// mâm của đơn vừa đặt (vd đặt 2 mâm → +2). Số mới được lưu vào backend
// (Supabase state.key='meals') để MỌI khách truy cập đều thấy con số thật.
function bumpMeals(){
  var add = totalTraysAllWeeks();            // số mâm của đơn khách vừa đặt
  if(add <= 0) return;
  var target = currentMeals + add;
  renderFlip(target);
  sharedStore.addMeals(add).then(function(next){
    if(typeof next === "number") renderFlip(next);
  }).catch(function(){ /* backend offline — giữ số đếm cục bộ */ });
}
```

## Diff Highlights

- Cộng dồn **nguyên tử ở tầng database**: `UPDATE … SET value = value + p_n` trong một transaction của Postgres → hai khách bấm cùng lúc không mất lượt (đọc-rồi-ghi ở client sẽ mất).
- `security definer` cho phép hàm cập nhật dòng `state` mà không cần bỏ RLS cho bảng.
- `renderFlip()` tối ưu: chỉ ô nào đổi chữ số mới chạy animation `flipping`; ô còn lại đứng yên → nhảy số mượt.
- `bumpMeals()` dùng số **tối ưu** để hiển thị ngay, rồi thay bằng số **thật** từ server khi RPC trả về → không bao giờ hiển thị sai lâu.

## Tests

| Loại | Nội dung | Kết quả |
|------|----------|---------|
| SQL | `POST /rest/v1/rpc/increment_meals {"p_n":2}` | Trả về `"34"` ✅ |
| SQL | `GET /rest/v1/state?key=eq.meals` | `[{"key":"meals","value":"34"}]` ✅ |
| Migration | `supabase db push --linked` | "Applying migration … Finished supabase db push." ✅ |
| Trình duyệt | Chọn 6 món → bấm "Sao chép đơn hàng" | Bộ đếm 32 → 38, dòng server = `"38"` ✅ |
| Ngoại hình | Screenshot mobile | Số vàng đậm, nổi bật trên nền đỏ ✅ |
| Console | Reload | Không lỗi ✅ |

## Local Verification

```bash
# Gọi RPC (ngoài sandbox, qua Terminal của máy)
curl -X POST "$SUPABASE/rest/v1/rpc/increment_meals" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"p_n":2}'
# → "34"

curl "$SUPABASE/rest/v1/state?key=eq.meals" -H "apikey: $KEY"
# → [{"key":"meals","value":"34"}]
```

Sau khi kiểm thử, bộ đếm được trả về đúng giá trị thật (32).

## Deviations

- Không có.

## Follow-ups

- Khách đang mở trang khác thấy số cũ tới khi đồng bộ kế tiếp (chu kỳ 20s hoặc khi quay lại tab). Có thể gọi đồng bộ ngay sau khi cộng nếu muốn thời gian thực chặt hơn.
