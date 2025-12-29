-- Remove the old unique constraint that only checks domain
ALTER TABLE public.available_domains
  DROP CONSTRAINT IF EXISTS available_domains_domain_key;

-- Remove the old index if it exists
DROP INDEX IF EXISTS public.available_domains_domain_key;

-- Add the new composite unique constraint (domain + domain_type)
ALTER TABLE public.available_domains
  ADD CONSTRAINT available_domains_domain_domain_type_key
  UNIQUE (domain, domain_type);