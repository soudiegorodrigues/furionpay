-- Create function to get total paid amount for a user (bypasses 1000 row limit)
CREATE OR REPLACE FUNCTION public.get_user_total_paid(p_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM pix_transactions 
     WHERE user_id = p_user_id AND status = 'paid'), 
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;