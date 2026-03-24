-- Add logo_path to profiles for invoice/quote branding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_path text;
