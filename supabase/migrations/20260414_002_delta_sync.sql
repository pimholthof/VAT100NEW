-- Delta-sync: preciezere cursors voor externe data synchronisatie

-- Bank sync: track de laatst geziene booking_date als cursor
-- Hiermee hoeft de volgende sync alleen transacties na die datum op te halen
ALTER TABLE bank_connections ADD COLUMN last_synced_booking_date date;

-- Agent cron: track wanneer agents voor het laatst gedraaid zijn per user
-- Hiermee kan de cron recent verwerkte users overslaan
ALTER TABLE profiles ADD COLUMN last_agent_run_at timestamptz;
