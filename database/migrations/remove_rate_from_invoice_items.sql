-- Migration: Remove rate column from invoice_items table
-- The rate will now come from the equipment table only

BEGIN;

-- Remove the rate column from invoice_items table
ALTER TABLE invoice_items DROP COLUMN rate;

COMMIT;