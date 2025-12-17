-- Limpeza pós-otimização: remover funções RPC não utilizadas

-- 1. Remover função de teste/comparação (usada apenas durante desenvolvimento)
DROP FUNCTION IF EXISTS public.compare_dashboard_functions();

-- 2. Remover V1 do dashboard do usuário (substituída por get_user_dashboard_v2)
DROP FUNCTION IF EXISTS public.get_user_dashboard();

-- 3. Remover função legada sem uso no frontend
DROP FUNCTION IF EXISTS public.get_pix_dashboard(text);