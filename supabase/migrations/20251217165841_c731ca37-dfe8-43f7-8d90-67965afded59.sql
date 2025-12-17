-- Create import_full_backup function for restoring data from JSON file
CREATE OR REPLACE FUNCTION public.import_full_backup(p_backup_data jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imported_counts JSON;
  v_table_name TEXT;
  v_records JSONB;
BEGIN
  -- Only admins can import
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can import backup';
  END IF;

  -- Validate backup structure
  IF NOT (p_backup_data ? 'tables' AND p_backup_data ? 'version') THEN
    RAISE EXCEPTION 'Invalid backup format: missing tables or version';
  END IF;

  -- Import profiles (upsert to avoid conflicts)
  IF p_backup_data->'tables' ? 'profiles' THEN
    INSERT INTO profiles (id, full_name, is_approved, created_at, updated_at)
    SELECT 
      (r->>'id')::uuid,
      r->>'full_name',
      COALESCE((r->>'is_approved')::boolean, false),
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(p_backup_data->'tables'->'profiles') r
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      is_approved = EXCLUDED.is_approved,
      updated_at = now();
  END IF;

  -- Import fee_configs
  IF p_backup_data->'tables' ? 'fee_configs' THEN
    INSERT INTO fee_configs (id, name, is_default, pix_percentage, pix_fixed, pix_repasse_percentage, pix_repasse_days, boleto_percentage, boleto_fixed, boleto_repasse_percentage, boleto_repasse_days, cartao_percentage, cartao_fixed, cartao_repasse_percentage, cartao_repasse_days, saque_percentage, saque_fixed, created_at, updated_at)
    SELECT 
      (r->>'id')::uuid,
      r->>'name',
      COALESCE((r->>'is_default')::boolean, false),
      COALESCE((r->>'pix_percentage')::numeric, 0),
      COALESCE((r->>'pix_fixed')::numeric, 0),
      COALESCE((r->>'pix_repasse_percentage')::numeric, 0),
      COALESCE((r->>'pix_repasse_days')::integer, 0),
      COALESCE((r->>'boleto_percentage')::numeric, 0),
      COALESCE((r->>'boleto_fixed')::numeric, 0),
      COALESCE((r->>'boleto_repasse_percentage')::numeric, 0),
      COALESCE((r->>'boleto_repasse_days')::integer, 0),
      COALESCE((r->>'cartao_percentage')::numeric, 0),
      COALESCE((r->>'cartao_fixed')::numeric, 0),
      COALESCE((r->>'cartao_repasse_percentage')::numeric, 0),
      COALESCE((r->>'cartao_repasse_days')::integer, 0),
      COALESCE((r->>'saque_percentage')::numeric, 0),
      COALESCE((r->>'saque_fixed')::numeric, 0),
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(p_backup_data->'tables'->'fee_configs') r
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_default = EXCLUDED.is_default,
      pix_percentage = EXCLUDED.pix_percentage,
      pix_fixed = EXCLUDED.pix_fixed,
      updated_at = now();
  END IF;

  -- Import admin_settings
  IF p_backup_data->'tables' ? 'admin_settings' THEN
    INSERT INTO admin_settings (id, key, value, user_id, created_at, updated_at)
    SELECT 
      (r->>'id')::uuid,
      r->>'key',
      r->>'value',
      (r->>'user_id')::uuid,
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(p_backup_data->'tables'->'admin_settings') r
    ON CONFLICT (id) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = now();
  END IF;

  -- Import available_domains
  IF p_backup_data->'tables' ? 'available_domains' THEN
    INSERT INTO available_domains (id, domain, name, domain_type, is_active, created_at, created_by)
    SELECT 
      (r->>'id')::uuid,
      r->>'domain',
      r->>'name',
      COALESCE(r->>'domain_type', 'popup'),
      COALESCE((r->>'is_active')::boolean, true),
      COALESCE((r->>'created_at')::timestamptz, now()),
      (r->>'created_by')::uuid
    FROM jsonb_array_elements(p_backup_data->'tables'->'available_domains') r
    ON CONFLICT (id) DO UPDATE SET
      domain = EXCLUDED.domain,
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active;
  END IF;

  -- Import checkout_templates
  IF p_backup_data->'tables' ? 'checkout_templates' THEN
    INSERT INTO checkout_templates (id, name, description, template_code, layout_config, preview_image_url, is_published, is_default, created_at, updated_at, created_by)
    SELECT 
      (r->>'id')::uuid,
      r->>'name',
      r->>'description',
      r->>'template_code',
      COALESCE(r->'layout_config', '{}'::jsonb),
      r->>'preview_image_url',
      COALESCE((r->>'is_published')::boolean, false),
      COALESCE((r->>'is_default')::boolean, false),
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'updated_at')::timestamptz, now()),
      (r->>'created_by')::uuid
    FROM jsonb_array_elements(p_backup_data->'tables'->'checkout_templates') r
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      layout_config = EXCLUDED.layout_config,
      is_published = EXCLUDED.is_published,
      updated_at = now();
  END IF;

  -- Import email_templates
  IF p_backup_data->'tables' ? 'email_templates' THEN
    INSERT INTO email_templates (id, template_key, name, subject, html_content, available_variables, is_customized, created_at, updated_at)
    SELECT 
      (r->>'id')::uuid,
      r->>'template_key',
      r->>'name',
      r->>'subject',
      r->>'html_content',
      COALESCE(r->'available_variables', '[]'::jsonb),
      COALESCE((r->>'is_customized')::boolean, false),
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(p_backup_data->'tables'->'email_templates') r
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      subject = EXCLUDED.subject,
      html_content = EXCLUDED.html_content,
      is_customized = EXCLUDED.is_customized,
      updated_at = now();
  END IF;

  -- Import retry_flow_steps
  IF p_backup_data->'tables' ? 'retry_flow_steps' THEN
    INSERT INTO retry_flow_steps (id, payment_method, acquirer, step_order, is_active, created_at, updated_at)
    SELECT 
      (r->>'id')::uuid,
      COALESCE(r->>'payment_method', 'pix'),
      r->>'acquirer',
      COALESCE((r->>'step_order')::integer, 0),
      COALESCE((r->>'is_active')::boolean, true),
      COALESCE((r->>'created_at')::timestamptz, now()),
      COALESCE((r->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(p_backup_data->'tables'->'retry_flow_steps') r
    ON CONFLICT (id) DO UPDATE SET
      acquirer = EXCLUDED.acquirer,
      step_order = EXCLUDED.step_order,
      is_active = EXCLUDED.is_active,
      updated_at = now();
  END IF;

  -- Import user_roles
  IF p_backup_data->'tables' ? 'user_roles' THEN
    INSERT INTO user_roles (id, user_id, role, created_at)
    SELECT 
      (r->>'id')::uuid,
      (r->>'user_id')::uuid,
      (r->>'role')::app_role,
      COALESCE((r->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(p_backup_data->'tables'->'user_roles') r
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Return summary
  SELECT json_build_object(
    'success', true,
    'imported_at', now(),
    'message', 'Backup importado com sucesso'
  ) INTO v_imported_counts;

  RETURN v_imported_counts;
END;
$$;