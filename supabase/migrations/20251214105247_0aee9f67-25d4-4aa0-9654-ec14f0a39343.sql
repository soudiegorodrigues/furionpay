-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_utmify_sync ON public.pix_transactions;

-- Create trigger that fires AFTER INSERT OR UPDATE on pix_transactions
CREATE TRIGGER trigger_utmify_sync
AFTER INSERT OR UPDATE ON public.pix_transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_utmify_sync();

-- Add comment explaining the trigger
COMMENT ON TRIGGER trigger_utmify_sync ON public.pix_transactions IS 
'Automatically sends transaction events to Utmify integration when transactions are created or status changes';