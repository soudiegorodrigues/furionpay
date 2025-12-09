-- Add name column to cloakers table
ALTER TABLE public.cloakers ADD COLUMN name TEXT NOT NULL DEFAULT 'Cloaker';