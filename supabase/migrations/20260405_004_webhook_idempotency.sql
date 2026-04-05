-- Prevent duplicate subscription payment records from Mollie webhook retries
ALTER TABLE public.subscription_payments
ADD CONSTRAINT uq_subscription_payments_mollie_id UNIQUE(mollie_payment_id);
