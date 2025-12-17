-- Populate checkout_templates with initial templates (only if table is empty)
INSERT INTO checkout_templates (name, description, template_code, layout_config, is_published, is_default)
SELECT * FROM (VALUES
  ('Padrão', 'Template clássico e profissional', 'padrao', '{}'::jsonb, true, true),
  ('Clean', 'Design minimalista e moderno', 'afilia', '{}'::jsonb, true, false),
  ('Dark', 'Tema escuro elegante', 'vega', '{}'::jsonb, true, false),
  ('Minimal', 'Ultra simplificado multistep', 'multistep', '{}'::jsonb, true, false)
) AS t(name, description, template_code, layout_config, is_published, is_default)
WHERE NOT EXISTS (SELECT 1 FROM checkout_templates LIMIT 1);