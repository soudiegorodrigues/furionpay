-- Add position columns to funnel_steps for free-form canvas positioning
ALTER TABLE funnel_steps 
ADD COLUMN IF NOT EXISTS position_x integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS position_y integer DEFAULT 100;