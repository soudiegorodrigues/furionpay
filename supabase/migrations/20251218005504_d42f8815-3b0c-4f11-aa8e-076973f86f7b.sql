-- Update the RPC function to properly handle NULL user_id without duplicate issues
CREATE OR REPLACE FUNCTION public.set_default_acquirer_with_retry_order(p_acquirer TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step_id uuid;
  v_other_steps RECORD;
  v_order INT := 2;
  v_existing_id uuid;
BEGIN
  -- Check admin authentication
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate acquirer name
  IF p_acquirer NOT IN ('inter', 'spedpay', 'ativus') THEN
    RAISE EXCEPTION 'Invalid acquirer: %', p_acquirer;
  END IF;

  -- 1. Check if setting exists for NULL user_id (use explicit check for NULL)
  SELECT id INTO v_existing_id 
  FROM public.admin_settings 
  WHERE key = 'default_acquirer' AND user_id IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing record
    UPDATE public.admin_settings 
    SET value = p_acquirer, updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    -- Insert new record only if none exists
    INSERT INTO public.admin_settings (key, value, user_id, created_at, updated_at)
    VALUES ('default_acquirer', p_acquirer, NULL, now(), now());
  END IF;

  -- 2. Reorganize retry_flow_steps atomically
  UPDATE public.retry_flow_steps
  SET step_order = step_order + 100
  WHERE payment_method = 'pix';

  UPDATE public.retry_flow_steps
  SET step_order = 1
  WHERE payment_method = 'pix' AND acquirer = p_acquirer;

  FOR v_other_steps IN 
    SELECT id, acquirer FROM public.retry_flow_steps 
    WHERE payment_method = 'pix' AND acquirer != p_acquirer
    ORDER BY step_order
  LOOP
    UPDATE public.retry_flow_steps
    SET step_order = v_order
    WHERE id = v_other_steps.id;
    v_order := v_order + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'acquirer', p_acquirer,
    'message', 'Default acquirer and retry order updated'
  );
END;
$$;