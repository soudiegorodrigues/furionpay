-- Remove the overly permissive service role policy - service role bypasses RLS anyway
DROP POLICY IF EXISTS "Allow service role full access to pix_transactions" ON public.pix_transactions;

-- Remove public access to chat_flows - only owners should see their flows
DROP POLICY IF EXISTS "Anyone can view active flows" ON public.chat_flows;

-- Remove public access to chat_blocks - only owners should see their blocks
DROP POLICY IF EXISTS "Anyone can view blocks of active flows" ON public.chat_blocks;