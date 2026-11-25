-- Migration: 20261125000000_admin_v2_site_config_and_batches.sql
-- Mâm Cơm Admin v2: site_config RPC, batch delivery tracking, trash delete RPCs, wizard funnel metrics

-- 1. Track batch delivery checkboxes (Đợt 1 / Đợt 2 for 4-meal packages) safely on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS batch_status jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Include batch_status in admin_get_orders
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
      SELECT id, status, people, phone, address, note, date, time, products, schedule, total, visitor_id, created_at, batch_status
        FROM public.orders
       ORDER BY created_at DESC
       LIMIT 200
    ) t;
  RETURN v_rows;
END;
$$;

-- 3. Toggle batch1 / batch2 delivery status with PIN verification
CREATE OR REPLACE FUNCTION public.admin_set_order_batch(
  p_pin text,
  p_order_id text,
  p_batch text,
  p_done boolean
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
  IF p_batch NOT IN ('batch1', 'batch2') THEN
    RAISE EXCEPTION 'Mã đợt giao không hợp lệ.';
  END IF;
  UPDATE public.orders
     SET batch_status = jsonb_set(coalesce(batch_status, '{}'::jsonb), ARRAY[p_batch], to_jsonb(coalesce(p_done, false)), true)
   WHERE id = p_order_id
   RETURNING id, batch_status INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đơn hàng.';
  END IF;
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_set_order_batch', jsonb_build_object('order_id', p_order_id, 'batch', p_batch, 'done', p_done, 'time', now()));
  RETURN to_jsonb(v_row);
END;
$$;

-- 4. Delete order permanently from Trash / clear Trash (RLS previously blocked anon deletes silently)
CREATE OR REPLACE FUNCTION public.admin_delete_order(p_pin text, p_order_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  DELETE FROM public.orders WHERE id = p_order_id;
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_delete_order', jsonb_build_object('order_id', p_order_id, 'time', now()));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_trash(p_pin text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cnt int := 0;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  WITH del AS (
    DELETE FROM public.orders WHERE status = 'cancelled' RETURNING id
  )
  SELECT count(*) INTO v_cnt FROM del;
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_clear_trash', jsonb_build_object('deleted', v_cnt, 'time', now()));
  RETURN v_cnt;
END;
$$;

-- 5. Unified site_config persistence (pricing matrix, recommendations, time slots, FAQ, contact)
CREATE OR REPLACE FUNCTION public.admin_save_site_config(p_pin text, p_config text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_json jsonb;
  v_contact jsonb;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  IF p_config IS NULL OR char_length(trim(p_config)) = 0 THEN
    RAISE EXCEPTION 'Cấu hình không hợp lệ.';
  END IF;
  v_json := p_config::jsonb;
  INSERT INTO public.state(key, value)
  VALUES ('site_config', p_config)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  IF v_json ? 'contact' AND jsonb_typeof(v_json->'contact') = 'object' THEN
    v_contact := jsonb_build_object(
      'address', coalesce(v_json->'contact'->>'address', ''),
      'phone', coalesce(v_json->'contact'->>'phone', ''),
      'updated_at', now()
    );
    INSERT INTO public.state(key, value)
    VALUES ('contact_info', v_contact::text)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  END IF;

  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_save_site_config', jsonb_build_object('time', now()));
  RETURN p_config;
END;
$$;

-- 6. Extend increment_stat for Wizard 3-step funnel tracking
CREATE OR REPLACE FUNCTION public.increment_stat(p_key text, p_n bigint DEFAULT 1)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_val text;
  v_add bigint;
BEGIN
  IF p_key NOT IN ('page_views', 'order_clicks', 'step1_done', 'step2_done', 'qr_opened') THEN
    RAISE EXCEPTION 'Invalid stat key';
  END IF;
  v_add := LEAST(GREATEST(COALESCE(p_n, 1), 1), 10);
  INSERT INTO public.state(key, value)
  VALUES (p_key, v_add::text)
  ON CONFLICT (key)
  DO UPDATE SET value = (COALESCE(public.state.value::bigint, 0) + v_add)::text
  RETURNING value INTO v_val;
  RETURN v_val;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_orders(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_order_batch(text, text, text, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_order(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_clear_trash(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_site_config(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_stat(text, bigint) TO anon, authenticated, service_role;
