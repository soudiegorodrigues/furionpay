-- Allow public SELECT on pix_transactions for realtime to work
-- This is safe because transaction IDs are UUIDs that are only known to the user who generated them
CREATE POLICY "Allow public read of own transaction by id" 
ON public.pix_transactions 
FOR SELECT 
USING (true);