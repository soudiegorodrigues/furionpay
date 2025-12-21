
-- =====================================================
-- LIMPEZA SEGURA: Remover colunas órfãs da tabela system_backups
-- Colunas contêm apenas arrays vazios []
-- NÃO afeta: dados existentes, funções de backup, sistema
-- =====================================================

-- Remover colunas que referenciam tabelas inexistentes
ALTER TABLE public.system_backups 
DROP COLUMN IF EXISTS chat_flows_data;

ALTER TABLE public.system_backups 
DROP COLUMN IF EXISTS chat_blocks_data;

-- Adicionar comentário de documentação na tabela
COMMENT ON TABLE public.system_backups IS 'Backups do sistema. Atualizado em 2024-12: removidas colunas chat_flows_data e chat_blocks_data (tabelas não existem mais).';
