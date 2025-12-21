-- Criar função para obter a meta global de faturamento
CREATE OR REPLACE FUNCTION public.get_global_billing_goal()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  goal_value numeric;
BEGIN
  SELECT value::numeric INTO goal_value 
  FROM admin_settings 
  WHERE key = 'global_billing_goal' 
    AND user_id IS NULL
  LIMIT 1;
  
  -- Valor padrão se não configurado: R$ 1.000.000
  RETURN COALESCE(goal_value, 1000000);
END;
$$;

-- Permitir que todos os usuários autenticados leiam a meta global
GRANT EXECUTE ON FUNCTION public.get_global_billing_goal() TO authenticated;