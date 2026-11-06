# Bug Assessment: Bảng lật lỗi thương hiệu và bộ đếm không cộng dồn đúng

**Slug**: flip-counter-accumulation
**Date**: 2026-11-07
**Severity**: high

## Report

Chủ yêu cầu 2 việc trên bảng lật đếm số mâm:

1. **Ngoại hình**: bảng lật hiện tại xấu, lệch tông thương hiệu → đổi sang chữ số nổi bật, màu hợp với thương hiệu.
2. **Logic cộng dồn**: mỗi lần khách bấm "Sao chép đơn hàng", bộ đếm phải **cộng thêm đúng số mâm khách vừa đặt** (đặt 2 mâm → hiện tại + 2), và **số mới phải được lưu lại đúng** để **MỌI khách** đều thấy cùng một con số thật.

## Symptom

- Bảng lật dùng màu/kiểu chữ mặc định, không nổi bật, lệch với tông đỏ-vàng của Mâm Cơm.
- Trước đây bộ đếm là số **tĩnh** nạp một lần từ server: bấm "Sao chép đơn hàng" không đổi số. Hoặc nếu có tăng thì tăng ở client và bị mất khi tải lại trang.
- Cộng dồn bằng cách đọc-số-hiện-tại → rồi ghi đè: hai khách bấm gần như cùng lúc thì một lượt bị mất ("last write wins").

## Reproduction

1. Mở https://mamcomvn.vercel.app/, chọn 2 món, bấm "Sao chép đơn hàng".
2. Bộ đếm **không tăng** (hoặc tăng rồi mất khi tải lại trang).
3. Mở cùng trang ở 2 thiết bị, bấm đồng thời → mất lượt cộng.

## Suspected Code Paths

- `index.html:461-478` — CSS `.flip` / `.flip__card`: nền đỏ, chữ mặc định, `font-size:38px`.
- `index.html:2714-2740` — `renderFlip(n)`: dựng ô số, có hiệu ứng lật.
- `index.html:2743-2756` — `bumpMeals()`: cộng dồn.
- `index.html:2525-2548` — `sharedStore.addMeals(n)`: ghi xuống Supabase.
- `index.html:1126-1128` — `totalTraysAllWeeks()`: đếm số mâm của cả hai tuần.
- `index.html:2425-2433` — `copyText()` gọi `bumpMeals()` sau khi sao chép thành công.
- `supabase/migrations/20261107000000_increment_meals.sql` — hàm `increment_meals(p_n bigint)`.

## Root Cause Hypothesis

1. **Ngoại hình**: `.flip` dùng bảng màu gradient đỏ + chữ không nổi; `.flip__card` không đặt font-family/weight đặc trưng → trông như bảng số mặc định, lệch thương hiệu.
2. **Logic**: bộ đếm được nạp 1 lần (`loadServerState`) và không được cập nhật khi khách đặt mâm → không có đường ghi nào chạy khi bấm "Sao chép đơn hàng".
3. **Race**: cách cộng an toàn duy nhất là cộng **trong database** (`UPDATE ... SET value = value + n`), không phải đọc rồi ghi ở client.

## Proposed Remediation

1. **Ngoại hình**: `.flip__card` dùng `font-family: Impact, "Arial Black", sans-serif; font-weight:900; color:var(--yellow); text-shadow` trên nền gradient đỏ, viền vàng — chữ số to, đậm, nổi bật, đúng tông thương hiệu.
2. **Cộng dồn**: gọi `bumpMeals()` sau khi sao chép thành công, cộng `totalTraysAllWeeks()` (số mâm của đơn vừa đặt).
3. **Lưu đúng & mọi khách thấy giống nhau**: tạo hàm Postgres `increment_meals(p_n bigint)` (`security definer`, `UPDATE state SET value = value + p_n WHERE key='meals' RETURNING value`) và gọi qua `SUPABASE.rpc("increment_meals", {p_n: n})` → cộng nguyên tử, mọi thiết bị đều đọc cùng một dòng `state.key='meals'`.
4. Có fallback read-modify-write nếu RPC chưa được tạo trên server.

**Files**: `index.html`, `supabase/migrations/20261107000000_increment_meals.sql`.

**Verification**: gọi RPC bằng `curl` và đọc `GET /rest/v1/state?key=eq.meals`; trong trình duyệt, bấm "Sao chép đơn hàng" với 6 món → bộ đếm +6 và dòng server cập nhật tương ứng.

## Risks

- `security definer` bỏ qua RLS của `state` → anon có thể cộng tùy ý. Đã chấp nhận (bộ đếm là con số trang trí, app vốn không có Auth — xem ghi chú trong `supabase/schema.sql`).
- `bumpMeals()` chạy sau khi clipboard thành công; nếu trình duyệt chặn clipboard, số **không** cộng. Đây là hành vi đúng: chỉ khi đơn hàng thực sự được gửi mới tính.
- Cộng nguyên tử không trả về con số cho khách khác đang mở trang → họ thấy số cũ cho tới lần đồng bộ kế tiếp (20s). Chấp nhận được; có thể gọi đồng bộ ngay sau khi cộng.

## Open Questions

- Không có.
