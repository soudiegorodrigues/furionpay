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
-- Dumped by pg_dump version 17.7

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
-- Name: pix_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pix_status AS ENUM (
    'generated',
    'paid',
    'expired'
);


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
-- Name: is_admin_authenticated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_authenticated() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Any authenticated user can access admin for now
  -- You can add role checking here later
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
    updated_at timestamp with time zone DEFAULT now()
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
    product_name text
);


--
-- Name: admin_settings admin_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_key_key UNIQUE (key);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


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
-- Name: pix_transactions pix_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pix_transactions
    ADD CONSTRAINT pix_transactions_pkey PRIMARY KEY (id);


--
-- Name: pix_transactions Allow public read of own transaction by id; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read of own transaction by id" ON public.pix_transactions FOR SELECT USING (true);


--
-- Name: admin_settings Deny all direct access to admin_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny all direct access to admin_settings" ON public.admin_settings USING (false);


--
-- Name: admin_tokens Deny all direct access to admin_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny all direct access to admin_tokens" ON public.admin_tokens USING (false);


--
-- Name: pix_transactions Deny all direct access to pix_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny all direct access to pix_transactions" ON public.pix_transactions AS RESTRICTIVE USING (false);


--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: pix_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


