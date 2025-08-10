-- Add item-level discount support to invoice_items table
-- This migration adds individual discount capabilities for each invoice line item

-- Add item_discount_amount column to invoice_items table
ALTER TABLE invoice_items 
ADD COLUMN item_discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- Add check constraint to ensure non-negative discount values
ALTER TABLE invoice_items 
ADD CONSTRAINT check_item_discount_non_negative CHECK (item_discount_amount >= 0);

-- Add index for potential filtering/reporting on item discounts
CREATE INDEX idx_invoice_items_discount ON invoice_items(item_discount_amount);

-- Add column comment to explain what this field represents
COMMENT ON COLUMN invoice_items.item_discount_amount IS 'Discount amount applied to this specific line item (reduces line_total)';

-- Update existing invoice items to have 0 item discount (already handled by DEFAULT)
-- The line_total should be recalculated by the application logic: (quantity * daily_rate * rental_days) - item_discount_amount

-- Display current structure for verification
-- \d invoice_items;