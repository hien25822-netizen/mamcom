# Mâm Cơm — On Air: Supabase (data) + Vercel (hosting)

Web này được thiết kế chạy **song song hai chế độ** trong cùng một `index.html`:

- **Chưa cấu hình Supabase** (mặc định hiện tại): mọi dữ liệu dùng `localStorage` +
  `server.py` (SQLite `mamcom.db`) — chạy như trước, không cần gì thêm.
- **Sau khi cấu hình Supabase** (bước 3 bên dưới): counter số mâm, danh sách đánh giá
  và thực đơn 6 món được **chia sẻ chung** cho mọi khách; ảnh món lưu trong Supabase
  Storage; chống spam đánh giá ~1 bình luận / 60s theo thiết bị (chạy trên Edge
  Function, không bị bypass được như timer phía client).

Kế hoạch tuần của khách (món nào ngày nào) và PIN chủ vẫn **riêng tư, chỉ trong
`localStorage`** — không bao giờ lên máy chủ.

> ⚠️ **Lưu ý bảo mật (nên đọc trước khi bấm publish):**
> - PIN chủ là **client-side (localStorage SHA-256)**, chỉ là "chốt" chống người vô ý
>   chứ **không chặn được ai mở DevTools**. Nó không bảo vệ dữ liệu chung (counter /
>   thực đơn / đánh giá) — chỉ che giấu phần "chế độ chủ" trên màn hình khách.
> - Trùng hợp với `server.py` cũ (không có auth): **ai cũng có thể xóa bình luận** qua
>   API (chính sách RLS để `delete` mở cho anon). Nếu muốn chỉ chủ mới xóa được, cần
>   thêm Supabase Auth sau — đây là điểm yếu có chủ ý, không phải bug.

---

## 1. Tạo dự án Supabase

1. Vào [supabase.com](https://supabase.com) → **New project**.
2. Đặt tên (vd `mamcom`), chọn region gần Việt Nam nhất.
3. Chờ ~1–2 phút cho provision xong.

> **Dự án `mamcom` hiện tại nằm ở Central EU (Frankfurt)** — ref
> `sdlpldhldyyytkbpujdk`. Đây là project đã được nối vào `index.html`, nên không
> đổi region sau khi đã có dữ liệu. Latency từ Việt Nam cao hơn so với Singapore,
> nhưng với quy mô hiện tại (~50 người đồng thời) vẫn hoàn toàn ổn.

## 2. Chạy `schema.sql` một lần

- Mở **SQL Editor** trong dashboard dự án.
- Dán toàn bộ nội dung [`supabase/schema.sql`](supabase/schema.sql) rồi **Run**.
- Kết quả: các bảng `state` (counter), `comments` (đánh giá), `rate_limits` (chống
  spam), `dishes` (thực đơn 6 món), bucket Storage `dish-images` (public), RLS, và
  dữ liệu seed.

> Hoặc chạy từ CLI (đã link sẵn vào project):
> ```bash
> supabase db query --linked -f supabase/schema.sql
> supabase db query --linked -f supabase/migrations/20261107000000_increment_meals.sql
> ```

## 3. Cấu hình `index.html`

Ở đầu script trong `index.html` (dòng ~788, sau `"use strict"`), có khối:

```js
var MAMCOM_SUPABASE = {
  url:      "YOUR-SUPABASE-PROJECT-URL",   // e.g. https://xxxx.supabase.co
  anonKey:  "YOUR-SUPABASE-ANON-KEY",     // từ Supabase → Project Settings → API
  projectRef: "YOUR-PROJECT-REF"          // e.g. xxxx (chỉ dùng cho CLI)
};
```

Thay vào:

- `url` — từ **Project Settings → API → Project URL**.
- `anonKey` — từ **Project Settings → API → `anon` / `public` key** (key này
  **an toàn dùng trong trình duyệt** vì RLS giới hạn quyền của nó; **KHÔNG**
  dùng `service_role` key ở đây — key đó bí mật tuyệt đối, chỉ để trong
  Edge Function).

Khi `url`/`anonKey` còn là `YOUR-...` thì app tự động **bỏ qua Supabase** và chạy
chế độ cũ (localStorage + server.py). Khi điền đủ hai giá trị thật, app chuyển sang
dùng Supabase ngay. `projectRef` không dùng ở runtime, chỉ ghi để tiện.

## 4. Deploy Edge Function (chống spam ~1/60s)

Edge function [`supabase/functions/add-comment/index.ts`](supabase/functions/add-comment/index.ts)
làm việc: nhận `{rating, text, visitorId}`, kiểm tra `rate_limits` (trùng lặp
ngay nếu còn trong 60s → trả `429`), insert vào `comments`, rồi trả về danh
sách đánh giá mới nhất để client render lại.

Cách deploy:

```bash
# Cài Supabase CLI (nếu chưa có):
brew install supabase

# Ở thư mục gốc của project (nơi có supabase/):
cd /Users/nguyenhien/Hienrrr/Apps/mamcom

# Link vào dự án của bạn (chạy một lần):
supabase link --project-ref <YOUR-PROJECT-REF>

# Deploy:
supabase functions deploy add-comment
```

`supabase/config.toml` đã khai báo `verify_jwt = false` cho `add-comment` — đúng
như thiết kế (app dùng anon key, không có Supabase Auth).

> **Kiểm tra nhanh:** sau deploy, mở dashboard → **Edge Functions** →
> `add-comment` phải có trạng thái `deployed`.

## 5. Deploy lên Vercel

1. Đẩy mã nguồn lên GitHub (repo `mamcom`). Nếu chưa, tạo một repo mới rồi:
   ```bash
   git init && git add . && git commit -m "Mâm Cơm on-air (Supabase + Vercel)"
   git remote add origin https://github.com/<you>/mamcom.git
   git push -u origin main
   ```
2. Vào [vercel.com](https://vercel.com) → **Add New Project** → import repo
   `mamcom`.
3. Vercel tự nhận ra `vercel.json` — không cần framework (plain static).
   `.vercelignore` loại `server.py` / `mamcom.db` / `supabase/` khỏi bản deploy.
4. **Deploy**. Sau đó URL dạng `https://mamcom-xxxx.vercel.app` sẽ mở web.

> Hoặc deploy từ CLI (cần `vercel login` trước):
> ```bash
> vercel --prod          # hoặc: npx vercel@latest --prod
> ```

> Mỗi lần sửa `index.html` (vd sửa thực đơn, UI) → `git push` → Vercel tự
> redeploy. `server.py`, `mamcom.db`, `assets/` không được deploy (Vercel chỉ
> đọc `index.html` + `vercel.json`) — không cần lo.

## 6. (Tuỳ chọn) Domain riêng

Mua/đăng ký domain (vd `mamcom.vn`) → Vercel → **Domains** → gắn domain →
thêm record `CNAME` / `A` theo hướng dẫn. Supabase giữ nguyên (chỉ có
`url` + `anonKey`, không phụ thuộc domain).

## Sau khi up — cần làm gì nếu muốn thêm

- **Hạng 100+ khách đồng thời:** vẫn được, Supabase Edge Function + Postgres
  handle 100 QPS dễ; chỉ cần theo dõi usage dashboard. Nếu spike lên vài
  nghìn, cân nhắc thêm cache (Vercel Edge Config) cho `loadMenu()`.
- **Xóa đánh giá do chủ PIN:** hiện ở chế độ chung (mọi người đều xóa được).
  Muốn giới hạn chủ mới xóa được → thêm Supabase Auth cho một tài khoản
  chủ (email + pass) rồi đổi chính sách `delete` thành "chỉ authed". Đây
  là một buổi làm việc nhỏ, không cần gấp.

---

## File liên quan

| File | Tác dụng |
| --- | --- |
| `index.html` | Web (SPA single-file, Supabase + fallback) |
| `supabase/schema.sql` | Chạy một lần trong SQL editor |
| `supabase/config.toml` | Cấu hình Supabase CLI (verify_jwt off) |
| `supabase/functions/add-comment/index.ts` | Edge Function chống spam |
| `vercel.json` | Cấu hình Vercel (static) |
| `server.py` / `server_dev.py` | Backend cục bộ — chỉ dùng khi chưa có Supabase |
| `mamcom.db` | SQLite cục bộ — không dùng nữa sau khi Supabase sẵn |
