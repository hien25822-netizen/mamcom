-- Migration: 20261113000001_unlimited_dishes_and_contact.sql
-- Mâm Cơm: Allow unlimited dishes in menu & persist contact info into backend

-- 1. Remove limit of 6 dishes on dishes table
ALTER TABLE public.dishes DROP CONSTRAINT IF EXISTS dishes_slot_check;
ALTER TABLE public.dishes ADD CONSTRAINT dishes_slot_check CHECK (slot >= 1);

-- 2. Update admin_save_dish to allow any slot >= 1 and include categories
CREATE OR REPLACE FUNCTION public.admin_save_dish(
  p_pin text,
  p_slot integer,
  p_name text,
  p_emoji text,
  p_img text,
  p_description text,
  p_categories text DEFAULT ''::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_row record;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  IF p_slot < 1 THEN
    RAISE EXCEPTION 'Vị trí món ăn phải lớn hơn hoặc bằng 1.';
  END IF;
  p_name := trim(p_name);
  IF char_length(p_name) < 1 OR char_length(p_name) > 80 THEN
    RAISE EXCEPTION 'Tên món phải từ 1 đến 80 ký tự.';
  END IF;
  INSERT INTO public.dishes(slot, name, emoji, img, description, categories, updated_at)
  VALUES (p_slot, p_name, coalesce(p_emoji, '🍽️'), coalesce(p_img, ''), coalesce(p_description, ''), coalesce(p_categories, ''), now())
  ON CONFLICT (slot) DO UPDATE
    SET name = EXCLUDED.name,
        emoji = EXCLUDED.emoji,
        img = EXCLUDED.img,
        description = EXCLUDED.description,
        categories = EXCLUDED.categories,
        updated_at = now()
  RETURNING slot, name, emoji, img, description, categories INTO v_row;
  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_save_dish', jsonb_build_object('slot', p_slot, 'name', p_name, 'categories', p_categories, 'time', now()));
  RETURN to_jsonb(v_row);
END;
$$;

-- 3. Atomic admin_save_all_dishes to save all dishes in 1 transaction without losing any
CREATE OR REPLACE FUNCTION public.admin_save_all_dishes(
  p_pin text,
  p_dishes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_len int;
  v_item jsonb;
  v_idx int := 0;
  v_name text;
  v_emoji text;
  v_img text;
  v_desc text;
  v_cat text;
  v_rows jsonb;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  IF jsonb_typeof(p_dishes) <> 'array' THEN
    RAISE EXCEPTION 'Dữ liệu món ăn phải là mảng JSON.';
  END IF;
  v_len := jsonb_array_length(p_dishes);
  IF v_len < 1 THEN
    RAISE EXCEPTION 'Thực đơn phải có ít nhất 1 món.';
  END IF;

  -- Delete any dishes whose slot is greater than current array length
  DELETE FROM public.dishes WHERE slot > v_len;

  -- Upsert all dishes
  FOR v_idx IN 0..(v_len - 1) LOOP
    v_item := p_dishes->v_idx;
    v_name := trim(coalesce(v_item->>'name', 'Món ăn'));
    v_emoji := coalesce(v_item->>'emoji', '🍽️');
    v_img := coalesce(v_item->>'img', '');
    v_desc := coalesce(v_item->>'description', '');
    v_cat := coalesce(v_item->>'categories', '');

    INSERT INTO public.dishes(slot, name, emoji, img, description, categories, updated_at)
    VALUES (v_idx + 1, v_name, v_emoji, v_img, v_desc, v_cat, now())
    ON CONFLICT (slot) DO UPDATE
      SET name = EXCLUDED.name,
          emoji = EXCLUDED.emoji,
          img = EXCLUDED.img,
          description = EXCLUDED.description,
          categories = EXCLUDED.categories,
          updated_at = now();
  END LOOP;

  -- Backup to state
  INSERT INTO public.state(key, value)
  VALUES ('dishes_backup', p_dishes::text)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  INSERT INTO public.audit_logs (action, details)
  VALUES ('admin_save_all_dishes', jsonb_build_object('dish_count', v_len, 'time', now()));

  SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.slot), '[]'::jsonb)
    INTO v_rows
    FROM public.dishes d;

  RETURN v_rows;
END;
$$;

-- 4. Admin contact info save function
CREATE OR REPLACE FUNCTION public.admin_save_contact_info(
  p_pin text,
  p_address text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_val jsonb;
BEGIN
  IF NOT public.admin_verify_pin(p_pin) THEN
    RAISE EXCEPTION 'PIN không chính xác.';
  END IF;
  v_val := jsonb_build_object('address', trim(p_address), 'phone', trim(p_phone), 'updated_at', now());
  INSERT INTO public.state(key, value)
  VALUES ('contact_info', v_val::text)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  INSERT INTO public.audit_logs(action, details)
  VALUES ('admin_save_contact_info', v_val);
  RETURN v_val;
END;
$$;

-- 5. Grant permissions to anon, authenticated, service_role
GRANT EXECUTE ON FUNCTION public.admin_save_dish(text, integer, text, text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_all_dishes(text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_contact_info(text, text, text) TO anon, authenticated, service_role;
