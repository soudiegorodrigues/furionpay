-- Create function to notify utmify-sync edge function on pix_transactions changes
CREATE OR REPLACE FUNCTION public.notify_utmify_sync()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  supabase_url TEXT;
  anon_key TEXT;
BEGIN
  -- Only trigger for INSERT (new transactions) or UPDATE when status changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Build payload with new record and operation type
    payload := jsonb_build_object(
      'type', TG_OP,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    );
    
    -- Get Supabase URL and anon key from environment (available in pg_net)
    supabase_url := current_setting('app.settings.supabase_url', true);
    anon_key := current_setting('app.settings.supabase_anon_key', true);
    
    -- If settings not available, try to get from vault or use default project URL
    IF supabase_url IS NULL OR supabase_url = '' THEN
      supabase_url := 'https://qtlhwjotfkyyqzgxlmkg.supabase.co';
    END IF;
    
    IF anon_key IS NULL OR anon_key = '' THEN
      anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bGh3am90Zmt5eXF6Z3hsbWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMzg0NTYsImV4cCI6MjA4MDcxNDQ1Nn0.ZvhXJYReYFdJlFTmHfY1lKcdGA2f9siWePRr8UPMl5I';
    END IF;
    
    -- Call edge function asynchronously using pg_net
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/utmify-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := payload
    );
    
    RAISE LOG '[UTMIFY-TRIGGER] Sent % event for txid: %', TG_OP, NEW.txid;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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