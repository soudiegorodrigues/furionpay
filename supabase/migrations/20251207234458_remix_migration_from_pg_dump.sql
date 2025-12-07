CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: pix_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pix_status AS ENUM (
    'generated',
    'paid',
    'expired'
);


--
-- Name: block_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.block_user(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only admins can block users
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can block users';
  END IF;
  
  -- Cannot block yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;
  
  -- Update banned_until in auth.users
  UPDATE auth.users
  SET banned_until = '2999-12-31 23:59:59'::timestamptz
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;


--
-- Name: bootstrap_first_admin(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bootstrap_first_admin(admin_email text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Check if any admin already exists
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Admin already exists. Use grant_admin_role instead.';
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin');
  
  RETURN TRUE;
END;
$$;


--
-- Name: check_user_blocked(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_blocked() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_banned_until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT banned_until INTO v_banned_until
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN v_banned_until IS NOT NULL AND v_banned_until > now();
END;
$$;


--
-- Name: delete_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only admins can delete users
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  
  -- Cannot delete yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;
  
  -- Delete from auth.users (will cascade to user_roles, admin_settings, etc.)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;


--
-- Name: get_admin_settings(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_settings(input_token text) RETURNS TABLE(key text, value text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  RETURN QUERY SELECT s.key, s.value FROM public.admin_settings s;
END;
$$;


--
-- Name: get_admin_settings_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_settings_auth() RETURNS TABLE(key text, value text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY SELECT s.key, s.value FROM public.admin_settings s;
END;
$$;


--
-- Name: get_all_users_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_users_auth() RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, is_admin boolean, is_blocked boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin') as is_admin,
    (u.banned_until IS NOT NULL AND u.banned_until > now()) as is_blocked
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;


--
-- Name: get_pix_dashboard(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pix_dashboard(input_token text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  SELECT json_build_object(
    'total_generated', (SELECT COUNT(*) FROM pix_transactions),
    'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid'),
    'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'expired'),
    'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions), 0),
    'total_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid'), 0),
    'today_generated', (SELECT COUNT(*) FROM pix_transactions WHERE created_at >= CURRENT_DATE),
    'today_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_at >= CURRENT_DATE),
    'today_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_at >= CURRENT_DATE), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;


--
-- Name: get_pix_dashboard_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pix_dashboard_auth() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT json_build_object(
    'total_generated', (SELECT COUNT(*) FROM pix_transactions),
    'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid'),
    'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'expired'),
    'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions), 0),
    'total_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid'), 0),
    'today_generated', (SELECT COUNT(*) FROM pix_transactions WHERE created_at >= CURRENT_DATE),
    'today_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_at >= CURRENT_DATE),
    'today_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_at >= CURRENT_DATE), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;


--
-- Name: get_pix_transactions(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pix_transactions(input_token text, p_limit integer DEFAULT 50) RETURNS TABLE(id uuid, amount numeric, status public.pix_status, txid text, donor_name text, created_at timestamp with time zone, paid_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.amount, t.status, t.txid, t.donor_name, t.created_at, t.paid_at
  FROM public.pix_transactions t
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_pix_transactions_auth(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pix_transactions_auth(p_limit integer DEFAULT 50) RETURNS TABLE(id uuid, amount numeric, status public.pix_status, txid text, donor_name text, product_name text, created_at timestamp with time zone, paid_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.amount, t.status, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at
  FROM public.pix_transactions t
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_popup_model_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_popup_model_stats() RETURNS TABLE(popup_model text, total_generated bigint, total_paid bigint, conversion_rate numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Show global stats for ALL users so they can see which popup converts best
  RETURN QUERY
  SELECT 
    COALESCE(pt.popup_model, 'unknown') as popup_model,
    COUNT(*)::bigint as total_generated,
    COUNT(*) FILTER (WHERE pt.status = 'paid')::bigint as total_paid,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE pt.status = 'paid')::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM public.pix_transactions pt
  GROUP BY pt.popup_model;
END;
$$;


--
-- Name: get_transaction_status_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_transaction_status_by_id(p_id uuid) RETURNS TABLE(status public.pix_status, paid_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT t.status, t.paid_at
  FROM public.pix_transactions t
  WHERE t.id = p_id
  LIMIT 1;
END;
$$;


--
-- Name: get_transaction_status_by_txid(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_transaction_status_by_txid(p_txid text) RETURNS TABLE(status public.pix_status, amount numeric, paid_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT t.status, t.amount, t.paid_at
  FROM public.pix_transactions t
  WHERE t.txid = p_txid
  LIMIT 1;
END;
$$;


--
-- Name: get_user_dashboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_dashboard() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT json_build_object(
    'total_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid()),
    'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'),
    'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'expired'),
    'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid()), 0),
    'total_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'), 0),
    'today_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND created_at >= CURRENT_DATE),
    'today_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND paid_at >= CURRENT_DATE),
    'today_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND paid_at >= CURRENT_DATE), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;


--
-- Name: get_user_settings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_settings() RETURNS TABLE(key text, value text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY SELECT s.key, s.value FROM public.admin_settings s WHERE s.user_id = auth.uid();
END;
$$;


--
-- Name: get_user_transactions(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_transactions(p_limit integer DEFAULT 50) RETURNS TABLE(id uuid, amount numeric, status public.pix_status, txid text, donor_name text, product_name text, created_at timestamp with time zone, paid_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.amount, t.status, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at
  FROM public.pix_transactions t
  WHERE t.user_id = auth.uid()
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_users_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_users_count() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated as admin';
  END IF;
  
  RETURN (SELECT COUNT(*)::integer FROM auth.users);
END;
$$;


--
-- Name: get_users_revenue_ranking(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_users_revenue_ranking(p_limit integer DEFAULT 5, p_offset integer DEFAULT 0) RETURNS TABLE(user_id uuid, user_email text, total_generated numeric, total_paid numeric, total_amount_generated numeric, total_amount_paid numeric, conversion_rate numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated as admin';
  END IF;
  
  RETURN QUERY
  -- Users with transactions
  SELECT 
    u.id as user_id,
    u.email::text as user_email,
    COALESCE(COUNT(pt.id), 0)::numeric as total_generated,
    COALESCE(COUNT(pt.id) FILTER (WHERE pt.status = 'paid'), 0)::numeric as total_paid,
    COALESCE(SUM(pt.amount), 0)::numeric as total_amount_generated,
    COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'paid'), 0)::numeric as total_amount_paid,
    CASE 
      WHEN COUNT(pt.id) > 0 THEN 
        ROUND((COUNT(pt.id) FILTER (WHERE pt.status = 'paid')::numeric / COUNT(pt.id)::numeric) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM auth.users u
  LEFT JOIN public.pix_transactions pt ON pt.user_id = u.id
  GROUP BY u.id, u.email
  
  UNION ALL
  
  -- Transactions without user (null user_id)
  SELECT 
    NULL::uuid as user_id,
    'Sem usuário'::text as user_email,
    COUNT(pt.id)::numeric as total_generated,
    COUNT(pt.id) FILTER (WHERE pt.status = 'paid')::numeric as total_paid,
    COALESCE(SUM(pt.amount), 0)::numeric as total_amount_generated,
    COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'paid'), 0)::numeric as total_amount_paid,
    CASE 
      WHEN COUNT(pt.id) > 0 THEN 
        ROUND((COUNT(pt.id) FILTER (WHERE pt.status = 'paid')::numeric / COUNT(pt.id)::numeric) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM public.pix_transactions pt
  WHERE pt.user_id IS NULL
  HAVING COUNT(pt.id) > 0
  
  ORDER BY total_amount_paid DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: get_users_revenue_ranking(integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_users_revenue_ranking(p_limit integer DEFAULT 5, p_offset integer DEFAULT 0, p_date_filter text DEFAULT 'all'::text) RETURNS TABLE(user_id uuid, user_email text, total_generated numeric, total_paid numeric, total_amount_generated numeric, total_amount_paid numeric, conversion_rate numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_start_date timestamptz;
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated as admin';
  END IF;
  
  -- Calculate start date based on filter
  v_start_date := CASE p_date_filter
    WHEN 'today' THEN date_trunc('day', now())
    WHEN '7days' THEN date_trunc('day', now()) - interval '7 days'
    WHEN 'month' THEN date_trunc('month', now())
    WHEN 'year' THEN date_trunc('year', now())
    ELSE NULL
  END;
  
  RETURN QUERY
  SELECT * FROM (
    -- Users with transactions
    SELECT 
      u.id as user_id,
      u.email::text as user_email,
      COALESCE(COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date), 0)::numeric as total_generated,
      COALESCE(COUNT(pt.id) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date)), 0)::numeric as total_paid,
      COALESCE(SUM(pt.amount) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date), 0)::numeric as total_amount_generated,
      COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date)), 0)::numeric as total_amount_paid,
      CASE 
        WHEN COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date) > 0 THEN 
          ROUND((COUNT(pt.id) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date))::numeric / 
                 COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date)::numeric) * 100, 1)
        ELSE 0
      END as conversion_rate
    FROM auth.users u
    LEFT JOIN public.pix_transactions pt ON pt.user_id = u.id
    GROUP BY u.id, u.email
    
    UNION ALL
    
    -- Transactions without user (null user_id)
    SELECT 
      NULL::uuid as user_id,
      'Sem usuário'::text as user_email,
      COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date)::numeric as total_generated,
      COUNT(pt.id) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date))::numeric as total_paid,
      COALESCE(SUM(pt.amount) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date), 0)::numeric as total_amount_generated,
      COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date)), 0)::numeric as total_amount_paid,
      CASE 
        WHEN COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date) > 0 THEN 
          ROUND((COUNT(pt.id) FILTER (WHERE pt.status = 'paid' AND (v_start_date IS NULL OR pt.created_at >= v_start_date))::numeric / 
                 COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date)::numeric) * 100, 1)
        ELSE 0
      END as conversion_rate
    FROM public.pix_transactions pt
    WHERE pt.user_id IS NULL
    HAVING COUNT(pt.id) FILTER (WHERE v_start_date IS NULL OR pt.created_at >= v_start_date) > 0
  ) combined
  ORDER BY combined.total_amount_paid DESC, combined.total_paid DESC, combined.total_generated DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: grant_admin_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grant_admin_role(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only existing admins can grant admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant admin role';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN TRUE;
END;
$$;


--
-- Name: handle_new_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin_authenticated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_authenticated() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin');
END;
$$;


--
-- Name: is_user_authenticated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_authenticated() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$;


--
-- Name: log_pix_generated(numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_pix_generated(p_amount numeric, p_txid text, p_pix_code text, p_donor_name text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated')
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


--
-- Name: log_pix_generated(numeric, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_pix_generated(p_amount numeric, p_txid text, p_pix_code text, p_donor_name text, p_utm_data jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status, utm_data)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated', p_utm_data)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


--
-- Name: log_pix_generated(numeric, text, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_pix_generated(p_amount numeric, p_txid text, p_pix_code text, p_donor_name text, p_utm_data jsonb DEFAULT NULL::jsonb, p_product_name text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status, utm_data, product_name)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated', p_utm_data, p_product_name)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


--
-- Name: log_pix_generated_user(numeric, text, text, text, jsonb, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_pix_generated_user(p_amount numeric, p_txid text, p_pix_code text, p_donor_name text, p_utm_data jsonb DEFAULT NULL::jsonb, p_product_name text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status, utm_data, product_name, user_id)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated', p_utm_data, p_product_name, p_user_id)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


--
-- Name: log_pix_generated_user(numeric, text, text, text, jsonb, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_pix_generated_user(p_amount numeric, p_txid text, p_pix_code text, p_donor_name text, p_utm_data jsonb DEFAULT NULL::jsonb, p_product_name text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_popup_model text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status, utm_data, product_name, user_id, popup_model)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated', p_utm_data, p_product_name, p_user_id, p_popup_model)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


--
-- Name: mark_pix_paid(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_pix_paid(p_txid text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.pix_transactions
  SET status = 'paid', paid_at = now()
  WHERE txid = p_txid AND status = 'generated';
  
  RETURN FOUND;
END;
$$;


--
-- Name: reset_pix_transactions(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_pix_transactions(input_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  -- Use WHERE TRUE to satisfy PostgREST requirement
  DELETE FROM public.pix_transactions WHERE TRUE;
  
  RETURN TRUE;
END;
$$;


--
-- Name: reset_pix_transactions_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_pix_transactions_auth() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  DELETE FROM public.pix_transactions WHERE TRUE;
  
  RETURN TRUE;
END;
$$;


--
-- Name: reset_user_transactions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_user_transactions() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  DELETE FROM public.pix_transactions WHERE user_id = auth.uid();
  
  RETURN TRUE;
END;
$$;


--
-- Name: revoke_admin_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_admin_role(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only existing admins can revoke admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke admin role';
  END IF;
  
  -- Prevent self-revocation
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own admin role';
  END IF;
  
  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role = 'admin';
  
  RETURN TRUE;
END;
$$;


--
-- Name: unblock_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unblock_user(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only admins can unblock users
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can unblock users';
  END IF;
  
  -- Update banned_until to null
  UPDATE auth.users
  SET banned_until = NULL
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;


--
-- Name: update_admin_setting(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_admin_setting(input_token text, setting_key text, setting_value text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  -- Use UPSERT to insert or update
  INSERT INTO public.admin_settings (key, value, created_at, updated_at)
  VALUES (setting_key, setting_value, now(), now())
  ON CONFLICT (key) DO UPDATE
  SET value = setting_value, updated_at = now();
  
  RETURN TRUE;
END;
$$;


--
-- Name: update_admin_setting_auth(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_admin_setting_auth(setting_key text, setting_value text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO public.admin_settings (key, value, created_at, updated_at)
  VALUES (setting_key, setting_value, now(), now())
  ON CONFLICT (key) DO UPDATE
  SET value = setting_value, updated_at = now();
  
  RETURN TRUE;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_setting(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_setting(setting_key text, setting_value text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO public.admin_settings (key, value, user_id, created_at, updated_at)
  VALUES (setting_key, setting_value, auth.uid(), now(), now())
  ON CONFLICT (key, user_id) DO UPDATE
  SET value = setting_value, updated_at = now();
  
  RETURN TRUE;
END;
$$;


--
-- Name: validate_admin_token(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_admin_token(input_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_tokens 
    WHERE token_hash = input_token
  );
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid
);


--
-- Name: admin_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: available_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.available_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain text NOT NULL,
    name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: chat_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flow_id uuid NOT NULL,
    block_order integer DEFAULT 0 NOT NULL,
    message text NOT NULL,
    delay_ms integer DEFAULT 1000 NOT NULL,
    is_typing_indicator boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_flows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:15:00'::interval) NOT NULL,
    used boolean DEFAULT false NOT NULL
);


--
-- Name: pix_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pix_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amount numeric(10,2) NOT NULL,
    status public.pix_status DEFAULT 'generated'::public.pix_status NOT NULL,
    txid text,
    pix_code text,
    donor_name text,
    created_at timestamp with time zone DEFAULT now(),
    paid_at timestamp with time zone,
    expired_at timestamp with time zone,
    utm_data jsonb,
    product_name text,
    user_id uuid,
    popup_model text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_settings admin_settings_key_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_key_user_unique UNIQUE (key, user_id);


--
-- Name: admin_tokens admin_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_tokens
    ADD CONSTRAINT admin_tokens_pkey PRIMARY KEY (id);


--
-- Name: admin_tokens admin_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_tokens
    ADD CONSTRAINT admin_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: available_domains available_domains_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.available_domains
    ADD CONSTRAINT available_domains_domain_key UNIQUE (domain);


--
-- Name: available_domains available_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.available_domains
    ADD CONSTRAINT available_domains_pkey PRIMARY KEY (id);


--
-- Name: chat_blocks chat_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_blocks
    ADD CONSTRAINT chat_blocks_pkey PRIMARY KEY (id);


--
-- Name: chat_flows chat_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_flows
    ADD CONSTRAINT chat_flows_pkey PRIMARY KEY (id);


--
-- Name: password_reset_codes password_reset_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_pkey PRIMARY KEY (id);


--
-- Name: pix_transactions pix_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pix_transactions
    ADD CONSTRAINT pix_transactions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_available_domains_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_available_domains_active ON public.available_domains USING btree (is_active);


--
-- Name: idx_chat_blocks_flow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_blocks_flow_id ON public.chat_blocks USING btree (flow_id);


--
-- Name: idx_chat_flows_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_flows_user_id ON public.chat_flows USING btree (user_id);


--
-- Name: idx_password_reset_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_codes_code ON public.password_reset_codes USING btree (code);


--
-- Name: idx_password_reset_codes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes USING btree (email);


--
-- Name: chat_flows update_chat_flows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chat_flows_updated_at BEFORE UPDATE ON public.chat_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_settings admin_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: available_domains available_domains_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.available_domains
    ADD CONSTRAINT available_domains_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: chat_blocks chat_blocks_flow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_blocks
    ADD CONSTRAINT chat_blocks_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.chat_flows(id) ON DELETE CASCADE;


--
-- Name: pix_transactions pix_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pix_transactions
    ADD CONSTRAINT pix_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: available_domains Admins can delete domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete domains" ON public.available_domains FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: available_domains Admins can insert domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert domains" ON public.available_domains FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: available_domains Admins can update domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update domains" ON public.available_domains FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: available_domains Anyone can view active domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active domains" ON public.available_domains FOR SELECT USING ((is_active = true));


--
-- Name: chat_flows Anyone can view active flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active flows" ON public.chat_flows FOR SELECT USING ((is_active = true));


--
-- Name: chat_blocks Anyone can view blocks of active flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view blocks of active flows" ON public.chat_blocks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_flows
  WHERE ((chat_flows.id = chat_blocks.flow_id) AND (chat_flows.is_active = true)))));


--
-- Name: admin_tokens Deny all direct access to admin_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny all direct access to admin_tokens" ON public.admin_tokens USING (false);


--
-- Name: password_reset_codes Deny all direct access to password_reset_codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny all direct access to password_reset_codes" ON public.password_reset_codes USING (false);


--
-- Name: user_roles Deny all direct access to user_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny all direct access to user_roles" ON public.user_roles AS RESTRICTIVE USING (false);


--
-- Name: chat_blocks Users can create blocks for their flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create blocks for their flows" ON public.chat_blocks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_flows
  WHERE ((chat_flows.id = chat_blocks.flow_id) AND (chat_flows.user_id = auth.uid())))));


--
-- Name: chat_flows Users can create their own chat flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own chat flows" ON public.chat_flows FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: chat_blocks Users can delete blocks of their flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete blocks of their flows" ON public.chat_blocks FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.chat_flows
  WHERE ((chat_flows.id = chat_blocks.flow_id) AND (chat_flows.user_id = auth.uid())))));


--
-- Name: chat_flows Users can delete their own chat flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own chat flows" ON public.chat_flows FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: admin_settings Users can delete their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own settings" ON public.admin_settings FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: admin_settings Users can insert their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own settings" ON public.admin_settings FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: chat_blocks Users can update blocks of their flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update blocks of their flows" ON public.chat_blocks FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.chat_flows
  WHERE ((chat_flows.id = chat_blocks.flow_id) AND (chat_flows.user_id = auth.uid())))));


--
-- Name: chat_flows Users can update their own chat flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own chat flows" ON public.chat_flows FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: admin_settings Users can update their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own settings" ON public.admin_settings FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: chat_blocks Users can view blocks of their flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view blocks of their flows" ON public.chat_blocks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_flows
  WHERE ((chat_flows.id = chat_blocks.flow_id) AND (chat_flows.user_id = auth.uid())))));


--
-- Name: chat_flows Users can view their own chat flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own chat flows" ON public.chat_flows FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: admin_settings Users can view their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own settings" ON public.admin_settings FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: pix_transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.pix_transactions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: available_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.available_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_flows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_flows ENABLE ROW LEVEL SECURITY;

--
-- Name: password_reset_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: pix_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


