-- Replace 'draft' status with 'unpaid' status in invoices table
-- This migration updates the check constraint and existing data

BEGIN;

-- Drop the existing check constraint first
ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;

-- Update any existing 'draft' records to 'unpaid' first
UPDATE invoices SET status = 'unpaid' WHERE status = 'draft';

-- Add the new check constraint with 'unpaid' instead of 'draft'
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status::text = ANY (ARRAY['unpaid'::character varying, 'sent'::character varying, 'paid'::character varying, 'cancelled'::character varying]::text[]));

-- Update the default value from 'draft' to 'unpaid'
ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'unpaid'::character varying;

COMMIT;