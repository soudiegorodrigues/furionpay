-- Fix security vulnerability: Remove overly permissive policy on profiles
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;

-- Fix security vulnerability: Remove public access to popup_configurations
DROP POLICY IF EXISTS "Anyone can view popup configurations by user_id" ON public.popup_configurations;