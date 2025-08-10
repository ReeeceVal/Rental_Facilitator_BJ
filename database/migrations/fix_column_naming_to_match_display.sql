-- Fix column naming to accurately represent invoice display structure
-- This migration renames columns to match what's actually displayed on the invoice

-- Rename columns to be more descriptive and accurate
ALTER TABLE invoices RENAME COLUMN subtotal TO equipment_subtotal;
ALTER TABLE invoices RENAME COLUMN tax_amount TO vat_amount;
ALTER TABLE invoices RENAME COLUMN total_amount TO total_due;

-- Update indexes to match new column names
DROP INDEX IF EXISTS idx_invoices_subtotal;
CREATE INDEX idx_invoices_equipment_subtotal ON invoices(equipment_subtotal);

-- Update existing check constraint references if needed
-- The existing constraints for transport_amount and discount_amount remain the same

-- Add comments to clarify what each column represents
COMMENT ON COLUMN invoices.equipment_subtotal IS 'Sum of all equipment line items (excluding transport and discount)';
COMMENT ON COLUMN invoices.transport_amount IS 'Additional transport/delivery charges';
COMMENT ON COLUMN invoices.discount_amount IS 'Discount applied to subtotal (before VAT)';
COMMENT ON COLUMN invoices.vat_amount IS 'VAT/Tax amount calculated on (equipment_subtotal + transport_amount - discount_amount)';
COMMENT ON COLUMN invoices.total_due IS 'Final amount due: equipment_subtotal + transport_amount - discount_amount + vat_amount';

-- Verify the structure after changes
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'invoices' AND table_schema = 'public'
-- ORDER BY ordinal_position;