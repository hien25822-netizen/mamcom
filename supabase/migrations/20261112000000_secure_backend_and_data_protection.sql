-- Migration: 20261112000000_secure_backend_and_data_protection.sql
-- Mâm Cơm — Enterprise Hardening & Zero-Data-Loss Architecture
-- 1. Bcrypt PIN verification with brute-force lockout
-- 2. Audit logging for administrative actions
-- 3. Soft deletion for comments (never lose user feedback)
-- 4. Customer data protection (orders private by default)
-- 5. Anti-tampering on meal counter & analytics stats
-- 6. Full database JSON snapshot backup export

-- 1. Ensure pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Admin Auth Table
CREATE TABLE IF NOT EXISTS public.admin_auth (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pin_hash text NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_auth FROM anon, public;

DROP POLICY IF EXISTS "admin_auth service only" ON public.admin_auth;
CREATE POLICY "admin_auth service only" ON public.admin_auth
  FOR ALL TO service_role USING (true);

-- 3. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM anon, public;

DROP POLICY IF EXISTS "audit_logs service only" ON public.audit_logs;
CREATE POLICY "audit_logs service only" ON public.audit_logs
  FOR ALL TO service_role USING (true);

-- 4. Comments table soft delete
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 5. Harden RLS on state
DROP POLICY IF EXISTS "state anon insert" ON public.state;
DROP POLICY IF EXISTS "state anon update" ON public.state;
DROP POLICY IF EXISTS "state anon delete" ON public.state;
DROP POLICY IF EXISTS "state anon read" ON public.state;
CREATE POLICY "state anon read" ON public.state
  FOR SELECT TO anon, public USING (true);

-- 6. Harden RLS on comments
DROP POLICY IF EXISTS "comments anon delete" ON public.comments;
DROP POLICY IF EXISTS "comments anon insert" ON public.comments;
DROP POLICY IF EXISTS "comments anon update" ON public.comments;
DROP POLICY IF EXISTS "comments anon read" ON public.comments;
CREATE POLICY "comments anon read" ON public.comments
  FOR SELECT TO anon, public USING (is_deleted = false);

-- 7. Harden RLS on dishes
DROP POLICY IF EXISTS "dishes anon insert" ON public.dishes;
DROP POLICY IF EXISTS "dishes anon update" ON public.dishes;
DROP POLICY IF EXISTS "dishes anon delete" ON public.dishes;
DROP POLICY IF EXISTS "dishes anon read" ON public.dishes;
CREATE POLICY "dishes anon read" ON public.dishes
  FOR SELECT TO anon, public USING (true);

-- 8. Harden RLS on orders
DROP POLICY IF EXISTS "orders anon delete" ON public.orders;
DROP POLICY IF EXISTS "orders anon update" ON public.orders;
DROP POLICY IF EXISTS "orders anon read" ON public.orders;
DROP POLICY IF EXISTS "orders customer read" ON public.orders;
DROP POLICY IF EXISTS "orders anon insert" ON public.orders;

CREATE POLICY "orders anon insert" ON public.orders
  FOR INSERT TO anon, public
  WITH CHECK (
    char_length(id) BETWEEN 1 AND 64
    AND char_length(phone) <= 30
    AND char_length(address) <= 300
    AND total >= 0
  );

CREATE POLICY "orders customer read" ON public.orders
  FOR SELECT TO anon, public
  USING (
    visitor_id = coalesce(current_setting('request.headers', true)::json->>'x-visitor-id', '')
    OR id = coalesce(current_setting('request.headers', true)::json->>'x-order-id', '')
  );

-- 9. Rate limits table policy
DROP POLICY IF EXISTS "rate_limits service only" ON public.rate_limits;
CREATE POLICY "rate_limits service only" ON public.rate_limits
  FOR ALL TO service_role USING (true);

-- 10. Admin Functions
CREATE OR REPLACE FUNCTION public.admin_has_pin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.admin_auth WHERE id = 1 AND pin_hash IS NOT NULL AND pin_hash <> '');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_setup_initial_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF char_length(trim(p_pin)) < 4 THEN
    RAISE EXCEPTION 'Mã PIN phải có ít nhất 4 ký tự.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admin_auth WHERE id = 1) THEN
    RAISE EXCEPTION 'Mã PIN đã được thiết lập trước đó.';
  END IF;
  INSERT INTO public.admin_auth (id, pin_hash, failed_attempts, updated_at)
  VALUES (1, crypt(trim(p_pin), gen_salt('bf', 10)), 0, now());
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_setup_initial_pin', jsonb_build_object('time', now()));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_verify_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hash text;
  v_locked timestamptz;
  v_failed int;
  v_ok boolean;
BEGIN
  SELECT pin_hash, locked_until, failed_attempts
    INTO v_hash, v_locked, v_failed
    FROM public.admin_auth
   WHERE id = 1;

  IF v_hash IS NULL THEN
    IF char_length(trim(p_pin)) >= 4 THEN
      INSERT INTO public.admin_auth (id, pin_hash, failed_attempts, updated_at)
      VALUES (1, crypt(trim(p_pin), gen_salt('bf', 10)), 0, now())
      ON CONFLICT (id) DO NOTHING;
      RETURN true;
    ELSE
      RETURN false;
    END IF;
  END IF;

  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RAISE EXCEPTION 'PIN bị khóa tạm thời do nhập sai nhiều lần. Hãy đợi 10 phút.';
  END IF;

  v_ok := (v_hash = crypt(trim(p_pin), v_hash));

  IF v_ok THEN
    UPDATE public.admin_auth
       SET failed_attempts = 0, locked_until = NULL, updated_at = now()
     WHERE id = 1;
    RETURN true;
  ELSE
    v_failed := COALESCE(v_failed, 0) + 1;
    IF v_failed >= 5 THEN
      UPDATE public.admin_auth
         SET failed_attempts = v_failed,
             locked_until = now() + interval '10 minutes',
             updated_at = now()
       WHERE id = 1;
    ELSE
      UPDATE public.admin_auth
         SET failed_attempts = v_failed,
             updated_at = now()
       WHERE id = 1;
    END IF;
    RETURN false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_change_pin(p_old_pin text, p_new_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_pin(p_old_pin) THEN
    RAISE EXCEPTION 'Mã PIN hiện tại không chính xác.';
  END IF;
  IF char_length(trim(p_new_pin)) < 4 THEN
    RAISE EXCEPTION 'Mã PIN mới phải có ít nhất 4 ký tự.';
  END IF;
  UPDATE public.admin_auth
     SET pin_hash = crypt(trim(p_new_pin), gen_salt('bf', 10)),
         failed_attempts = 0,
         locked_until = NULL,
         updated_at = now()
   WHERE id = 1;
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_change_pin', jsonb_build_object('time', now()));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_price(p_pin text, p_price int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  IF p_price < 1 OR p_price > 1000000 THEN
    RAISE EXCEPTION 'Giá không hợp lệ.';
  END IF;
  INSERT INTO public.state(key, value)
  VALUES ('price', p_price::text)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_set_price', jsonb_build_object('price', p_price, 'time', now()));
  RETURN p_price;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_dish(
  p_pin text,
  p_slot int,
  p_name text,
  p_emoji text,
  p_img text,
  p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  IF p_slot < 1 OR p_slot > 6 THEN
    RAISE EXCEPTION 'Vị trí món ăn phải từ 1 đến 6.';
  END IF;
  p_name := trim(p_name);
  IF char_length(p_name) < 1 OR char_length(p_name) > 80 THEN
    RAISE EXCEPTION 'Tên món phải từ 1 đến 80 ký tự.';
  END IF;
  INSERT INTO public.dishes(slot, name, emoji, img, description, updated_at)
  VALUES (p_slot, p_name, coalesce(p_emoji, '🍽️'), coalesce(p_img, ''), coalesce(p_description, ''), now())
  ON CONFLICT (slot) DO UPDATE
    SET name = EXCLUDED.name,
        emoji = EXCLUDED.emoji,
        img = EXCLUDED.img,
        description = EXCLUDED.description,
        updated_at = now()
  RETURNING slot, name, emoji, img, description INTO v_row;
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_save_dish', jsonb_build_object('slot', p_slot, 'name', p_name, 'time', now()));
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_dishes(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  INSERT INTO public.dishes (slot, name, emoji, img, description, updated_at) VALUES
    (1, 'Gà chiên mắm',     '🍗', '', '', now()),
    (2, 'Cải cuộn thịt',    '🥬', '', '', now()),
    (3, 'Canh chua cá',     '🍲', '', '', now()),
    (4, 'Nấm xào tỏi',      '🍄', '', '', now()),
    (5, 'Đậu hũ nhồi thịt', '🧆', '', '', now()),
    (6, 'Bò kho',           '🥘', '', '', now())
  ON CONFLICT (slot) DO UPDATE
    SET name = EXCLUDED.name,
        emoji = EXCLUDED.emoji,
        img = EXCLUDED.img,
        description = EXCLUDED.description,
        updated_at = now();
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_reset_dishes', jsonb_build_object('time', now()));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_comment(p_pin text, p_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  UPDATE public.comments
     SET is_deleted = true, deleted_at = now()
   WHERE id = p_id;
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_delete_comment', jsonb_build_object('comment_id', p_id, 'time', now()));
  SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT id, rating, text, ts, name
        FROM public.comments
       WHERE is_deleted = false
       ORDER BY ts DESC, id DESC
    ) t;
  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_orders(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT id, status, people, phone, address, note, date, time, products, schedule, total, visitor_id, created_at
        FROM public.orders
       ORDER BY created_at DESC
       LIMIT 100
    ) t;
  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_order_status(p_pin text, p_order_id text, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  IF p_status NOT IN ('pending', 'confirmed', 'preparing', 'done', 'cancelled') THEN
    RAISE EXCEPTION 'Trạng thái đơn không hợp lệ.';
  END IF;
  UPDATE public.orders
     SET status = p_status
   WHERE id = p_order_id
   RETURNING id, status INTO v_row;
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_set_order_status', jsonb_build_object('order_id', p_order_id, 'status', p_status, 'time', now()));
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_export_backup(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_state jsonb;
  v_comments jsonb;
  v_dishes jsonb;
  v_orders jsonb;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO v_state FROM public.state s;
  SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) INTO v_comments FROM public.comments c;
  SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) INTO v_dishes FROM public.dishes d;
  SELECT coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) INTO v_orders FROM public.orders o;
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_export_backup', jsonb_build_object('time', now()));
  RETURN jsonb_build_object(
    'version', '1.0',
    'exported_at', now(),
    'state', v_state,
    'comments', v_comments,
    'dishes', v_dishes,
    'orders', v_orders
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_meals(p_n bigint)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_val text;
  v_add bigint;
BEGIN
  v_add := LEAST(GREATEST(COALESCE(p_n, 1), 1), 10);
  UPDATE public.state
     SET value = (COALESCE(value::bigint, 23) + v_add)::text
   WHERE key = 'meals'
   RETURNING value INTO v_val;
  RETURN v_val;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_stat(p_key text, p_n bigint DEFAULT 1)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_val text;
BEGIN
  IF p_key NOT IN ('page_views', 'order_clicks') THEN
    RAISE EXCEPTION 'Invalid stat key';
  END IF;
  INSERT INTO public.state(key, value)
  VALUES (p_key, '1')
  ON CONFLICT (key)
  DO UPDATE SET value = (COALESCE(public.state.value::bigint, 0) + 1)::text
  RETURNING value INTO v_val;
  RETURN v_val;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_orders(p_visitor_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF p_visitor_id IS NULL OR char_length(p_visitor_id) < 3 THEN
    RETURN '[]'::jsonb;
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT id, status, people, phone, address, note, date, time, products, schedule, total, created_at
        FROM public.orders
       WHERE visitor_id = p_visitor_id
       ORDER BY created_at DESC
       LIMIT 20
    ) t;
  RETURN v_rows;
END;
$$;
