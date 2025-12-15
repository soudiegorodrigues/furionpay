-- Add acquirer column to withdrawal_requests table
ALTER TABLE withdrawal_requests 
ADD COLUMN IF NOT EXISTS acquirer TEXT DEFAULT 'ativus';

-- Add comment explaining the column
COMMENT ON COLUMN withdrawal_requests.acquirer IS 'Adquirente used to process the withdrawal (spedpay, inter, ativus)';