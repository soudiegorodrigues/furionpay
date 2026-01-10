-- Remover a versão duplicada com timestamp (mantendo a versão com text)
DROP FUNCTION IF EXISTS get_user_stats_by_period(
  text, 
  timestamp with time zone, 
  timestamp with time zone, 
  text, 
  text
);