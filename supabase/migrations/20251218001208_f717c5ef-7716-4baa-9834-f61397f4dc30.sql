-- RPC function to set default acquirer with retry order in a single atomic transaction
CREATE OR REPLACE FUNCTION public.set_default_acquirer_with_retry_order(p_acquirer TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_step_id uuid;
  v_other_steps RECORD;
  v_order INT := 2;
BEGIN
  -- Check admin authentication
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate acquirer name
  IF p_acquirer NOT IN ('inter', 'spedpay', 'ativus') THEN
    RAISE EXCEPTION 'Invalid acquirer: %', p_acquirer;
  END IF;

  -- 1. Update default_acquirer in admin_settings
  INSERT INTO public.admin_settings (key, value, user_id, created_at, updated_at)
  VALUES ('default_acquirer', p_acquirer, NULL, now(), now())
  ON CONFLICT ON CONSTRAINT admin_settings_key_user_id_unique 
  DO UPDATE SET value = p_acquirer, updated_at = now();

  -- 2. Reorganize retry_flow_steps atomically
  -- First, move all steps to temporary order values to avoid unique constraint violations
  UPDATE public.retry_flow_steps
  SET step_order = step_order + 100
  WHERE payment_method = 'pix';

  -- Set selected acquirer as step_order = 1
  UPDATE public.retry_flow_steps
  SET step_order = 1
  WHERE payment_method = 'pix' AND acquirer = p_acquirer;

  -- Set other acquirers in order 2, 3, ...
  FOR v_other_steps IN 
    SELECT id FROM public.retry_flow_steps 
    WHERE payment_method = 'pix' AND acquirer != p_acquirer
    ORDER BY step_order - 100  -- Restore original relative order
  LOOP
    UPDATE public.retry_flow_steps
    SET step_order = v_order
    WHERE id = v_other_steps.id;
    v_order := v_order + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'acquirer', p_acquirer,
    'message', 'Default acquirer set successfully'
  );
END;
$function$;