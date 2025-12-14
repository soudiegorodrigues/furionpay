-- Drop and recreate get_transaction_backups without MIN(uuid) issue
DROP FUNCTION IF EXISTS public.get_transaction_backups();

CREATE OR REPLACE FUNCTION public.get_transaction_backups()
RETURNS TABLE(
  backup_id uuid, 
  backed_up_at timestamp with time zone, 
  transaction_count bigint, 
  backup_type text, 
  backed_up_by_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view backups';
  END IF;

  RETURN QUERY
  SELECT 
    b.backup_id,
    MIN(b.backed_up_at) as backed_up_at,
    COUNT(*) as transaction_count,
    (array_agg(b.backup_type))[1] as backup_type,
    (SELECT u.email::TEXT FROM auth.users u WHERE u.id = (array_agg(b.backed_up_by))[1]) as backed_up_by_email
  FROM pix_transactions_backup b
  GROUP BY b.backup_id
  ORDER BY MIN(b.backed_up_at) DESC;
END;
$$;