
-- Update reset_user_transactions to disassociate transactions instead of deleting
-- This keeps all historical data visible in admin panel
CREATE OR REPLACE FUNCTION public.reset_user_transactions()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Instead of deleting, set user_id to NULL so admin can still see the transactions
  -- but user's dashboard shows empty (no transactions with their user_id)
  UPDATE public.pix_transactions 
  SET user_id = NULL 
  WHERE user_id = auth.uid();
  
  RETURN TRUE;
END;
$function$;
