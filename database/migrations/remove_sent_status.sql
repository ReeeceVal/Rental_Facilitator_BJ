-- Remove 'sent' status from invoices table constraint since it's not being used
-- This migration updates the check constraint to only allow the three active statuses

BEGIN;

-- Drop the existing check constraint
ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;

-- Add the new check constraint without 'sent' status
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status::text = ANY (ARRAY['unpaid'::character varying, 'paid'::character varying, 'cancelled'::character varying]::text[]));

COMMIT;