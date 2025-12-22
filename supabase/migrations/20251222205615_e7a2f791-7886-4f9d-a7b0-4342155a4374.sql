-- Remover a função antiga que está causando conflito de overload
DROP FUNCTION IF EXISTS public.get_user_transactions_paginated(
  p_status text,
  p_date_filter text,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_page integer,
  p_per_page integer,
  p_search text
);