-- Mô tả ngắn cho từng món (hiện khi khách chạm vào ảnh món).
-- Rút gọn: default '' để tương thích với dữ liệu cũ (ảnh vẫn hiển thị như trước).
alter table public.dishes add column if not exists description text not null default '';
alter table public.dishes
  alter column description set data type text
  using (left(coalesce(description, ''), 200));
alter table public.dishes
  add constraint dishes_description_len check (char_length(coalesce(description, '')) <= 200);
