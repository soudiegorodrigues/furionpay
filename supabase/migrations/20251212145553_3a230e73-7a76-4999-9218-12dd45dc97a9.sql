-- Allow all authenticated users to view fee configs (needed for net amount calculation)
CREATE POLICY "Authenticated users can view fee configs" 
ON public.fee_configs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);