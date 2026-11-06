-- Mâm Cơm — thêm hàm cộng dồn bộ đếm bữa ăn (chạy một lần, idempotent).
-- create or replace → chạy lại nhiều lần không lỗi.

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
