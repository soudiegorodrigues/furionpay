-- Marcar transações Valorion pagas hoje baseado nos nomes identificados
-- As transações foram pagas durante os testes de integração

UPDATE pix_transactions 
SET 
  status = 'paid', 
  paid_at = NOW()
WHERE acquirer = 'valorion' 
AND status = 'generated'
AND donor_name IN (
  'Larissa Cristiane Alves',
  'Isabela Nascimento Costa', 
  'Rafael Henrique Oliveira',
  'Leonardo Silva Ribeiro',
  'Thiago Martins Barbosa',
  'Marcos Vinicius Lima',
  'Patricia Regina Rocha',
  'Mateus'
)
AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = '2025-12-18';