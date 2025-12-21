-- Drop the OLD function signature that has different parameter order
-- This removes the duplicate that's causing the PGRST203 error
DROP FUNCTION IF EXISTS public.get_user_transactions_paginated(
  integer, integer, text, timestamptz, timestamptz, text, text
);