-- Remove the service_fee and service_discount columns from invoices table
-- These are being replaced by the new invoice_services table

-- First migrate any existing service fees to the new table (if they exist)
INSERT INTO invoice_services (invoice_id, service_name, amount, discount)
SELECT 
    id,
    'Service Fee' as service_name,
    service_fee as amount,
    service_discount as discount
FROM invoices 
WHERE service_fee > 0 OR service_discount > 0;

-- Drop the check constraints first
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS check_service_fee_non_negative;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS check_service_discount_non_negative;

-- Drop the columns
ALTER TABLE invoices DROP COLUMN IF EXISTS service_fee;
ALTER TABLE invoices DROP COLUMN IF EXISTS service_discount;