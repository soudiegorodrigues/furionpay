-- Add domain_type column to available_domains
ALTER TABLE available_domains 
ADD COLUMN domain_type text NOT NULL DEFAULT 'popup';

-- Add check constraint for valid domain types
ALTER TABLE available_domains 
ADD CONSTRAINT available_domains_domain_type_check 
CHECK (domain_type IN ('popup', 'checkout'));