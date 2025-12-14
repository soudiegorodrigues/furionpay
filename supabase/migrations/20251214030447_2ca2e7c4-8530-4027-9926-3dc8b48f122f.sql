-- Enable REPLICA IDENTITY FULL for complete row data in realtime updates
ALTER TABLE public.pix_transactions REPLICA IDENTITY FULL;

-- Add the table to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.pix_transactions;