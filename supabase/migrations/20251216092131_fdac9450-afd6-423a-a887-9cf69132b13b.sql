-- Fix 1: Enable RLS on db_performance_metrics table
ALTER TABLE public.db_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Admin-only read access for db_performance_metrics
CREATE POLICY "Admins can view performance metrics"
  ON public.db_performance_metrics
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Block all direct inserts (only SECURITY DEFINER functions should insert)
CREATE POLICY "Block direct inserts to performance metrics"
  ON public.db_performance_metrics
  FOR INSERT
  WITH CHECK (false);

-- Block all direct updates
CREATE POLICY "Block direct updates to performance metrics"
  ON public.db_performance_metrics
  FOR UPDATE
  USING (false);

-- Block all direct deletes
CREATE POLICY "Block direct deletes to performance metrics"
  ON public.db_performance_metrics
  FOR DELETE
  USING (false);

-- Fix 2: Replace overly permissive policy on pix_rate_limits
-- Drop the permissive policy
DROP POLICY IF EXISTS "Service role full access to rate limits" ON public.pix_rate_limits;

-- Admin-only access for management
CREATE POLICY "Admins can manage rate limits"
  ON public.pix_rate_limits
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Block anonymous/public access completely
CREATE POLICY "Block anonymous access to rate limits"
  ON public.pix_rate_limits
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);