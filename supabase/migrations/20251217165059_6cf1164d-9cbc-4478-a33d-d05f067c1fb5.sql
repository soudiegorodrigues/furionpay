-- Create export_full_backup function for downloading all system data
CREATE OR REPLACE FUNCTION public.export_full_backup()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Only admins can export
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can export backup';
  END IF;

  SELECT json_build_object(
    'exported_at', NOW(),
    'version', '1.0',
    'tables', json_build_object(
      'pix_transactions', (SELECT COALESCE(json_agg(t), '[]'::json) FROM pix_transactions t),
      'profiles', (SELECT COALESCE(json_agg(p), '[]'::json) FROM profiles p),
      'products', (SELECT COALESCE(json_agg(pr), '[]'::json) FROM products pr),
      'product_offers', (SELECT COALESCE(json_agg(po), '[]'::json) FROM product_offers po),
      'product_checkout_configs', (SELECT COALESCE(json_agg(pcc), '[]'::json) FROM product_checkout_configs pcc),
      'product_testimonials', (SELECT COALESCE(json_agg(pt), '[]'::json) FROM product_testimonials pt),
      'product_folders', (SELECT COALESCE(json_agg(pf), '[]'::json) FROM product_folders pf),
      'checkout_offers', (SELECT COALESCE(json_agg(co), '[]'::json) FROM checkout_offers co),
      'checkout_templates', (SELECT COALESCE(json_agg(ct), '[]'::json) FROM checkout_templates ct),
      'fee_configs', (SELECT COALESCE(json_agg(fc), '[]'::json) FROM fee_configs fc),
      'withdrawal_requests', (SELECT COALESCE(json_agg(wr), '[]'::json) FROM withdrawal_requests wr),
      'admin_settings', (SELECT COALESCE(json_agg(ase), '[]'::json) FROM admin_settings ase),
      'available_domains', (SELECT COALESCE(json_agg(ad), '[]'::json) FROM available_domains ad),
      'email_templates', (SELECT COALESCE(json_agg(et), '[]'::json) FROM email_templates et),
      'popup_configurations', (SELECT COALESCE(json_agg(pc), '[]'::json) FROM popup_configurations pc),
      'retry_flow_steps', (SELECT COALESCE(json_agg(rfs), '[]'::json) FROM retry_flow_steps rfs),
      'rewards', (SELECT COALESCE(json_agg(r), '[]'::json) FROM rewards r),
      'reward_requests', (SELECT COALESCE(json_agg(rr), '[]'::json) FROM reward_requests rr),
      'chat_flows', (SELECT COALESCE(json_agg(cf), '[]'::json) FROM chat_flows cf),
      'chat_blocks', (SELECT COALESCE(json_agg(cb), '[]'::json) FROM chat_blocks cb),
      'finance_categories', (SELECT COALESCE(json_agg(fcat), '[]'::json) FROM finance_categories fcat),
      'finance_accounts', (SELECT COALESCE(json_agg(facc), '[]'::json) FROM finance_accounts facc),
      'finance_transactions', (SELECT COALESCE(json_agg(ft), '[]'::json) FROM finance_transactions ft),
      'finance_goals', (SELECT COALESCE(json_agg(fg), '[]'::json) FROM finance_goals fg),
      'user_roles', (SELECT COALESCE(json_agg(ur), '[]'::json) FROM user_roles ur),
      'user_verification', (SELECT COALESCE(json_agg(uv), '[]'::json) FROM user_verification uv),
      'user_documents', (SELECT COALESCE(json_agg(ud), '[]'::json) FROM user_documents ud),
      'api_clients', (SELECT COALESCE(json_agg(ac), '[]'::json) FROM api_clients ac),
      'daily_user_stats', (SELECT COALESCE(json_agg(dus), '[]'::json) FROM daily_user_stats dus),
      'daily_global_stats', (SELECT COALESCE(json_agg(dgs), '[]'::json) FROM daily_global_stats dgs)
    ),
    'record_counts', json_build_object(
      'pix_transactions', (SELECT COUNT(*) FROM pix_transactions),
      'profiles', (SELECT COUNT(*) FROM profiles),
      'products', (SELECT COUNT(*) FROM products),
      'product_offers', (SELECT COUNT(*) FROM product_offers),
      'product_checkout_configs', (SELECT COUNT(*) FROM product_checkout_configs),
      'product_testimonials', (SELECT COUNT(*) FROM product_testimonials),
      'checkout_offers', (SELECT COUNT(*) FROM checkout_offers),
      'checkout_templates', (SELECT COUNT(*) FROM checkout_templates),
      'fee_configs', (SELECT COUNT(*) FROM fee_configs),
      'withdrawal_requests', (SELECT COUNT(*) FROM withdrawal_requests),
      'admin_settings', (SELECT COUNT(*) FROM admin_settings),
      'available_domains', (SELECT COUNT(*) FROM available_domains),
      'email_templates', (SELECT COUNT(*) FROM email_templates),
      'popup_configurations', (SELECT COUNT(*) FROM popup_configurations),
      'retry_flow_steps', (SELECT COUNT(*) FROM retry_flow_steps),
      'rewards', (SELECT COUNT(*) FROM rewards),
      'reward_requests', (SELECT COUNT(*) FROM reward_requests),
      'chat_flows', (SELECT COUNT(*) FROM chat_flows),
      'chat_blocks', (SELECT COUNT(*) FROM chat_blocks),
      'finance_categories', (SELECT COUNT(*) FROM finance_categories),
      'finance_accounts', (SELECT COUNT(*) FROM finance_accounts),
      'finance_transactions', (SELECT COUNT(*) FROM finance_transactions),
      'finance_goals', (SELECT COUNT(*) FROM finance_goals),
      'user_roles', (SELECT COUNT(*) FROM user_roles),
      'user_verification', (SELECT COUNT(*) FROM user_verification),
      'user_documents', (SELECT COUNT(*) FROM user_documents),
      'api_clients', (SELECT COUNT(*) FROM api_clients),
      'daily_user_stats', (SELECT COUNT(*) FROM daily_user_stats),
      'daily_global_stats', (SELECT COUNT(*) FROM daily_global_stats)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;