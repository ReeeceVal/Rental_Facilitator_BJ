-- Add transport amount and discount amount columns to invoices table
-- This migration adds support for transport costs and discounts in invoices

ALTER TABLE invoices 
ADD COLUMN transport_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- Add check constraints to ensure non-negative values
ALTER TABLE invoices 
ADD CONSTRAINT check_transport_amount_non_negative CHECK (transport_amount >= 0),
ADD CONSTRAINT check_discount_amount_non_negative CHECK (discount_amount >= 0);

-- Update existing invoices to have 0 transport and discount amounts (already handled by DEFAULT)
-- The total_amount column will be recalculated by the application logic when needed

-- Add indexes for potential filtering/reporting
CREATE INDEX idx_invoices_transport_amount ON invoices(transport_amount);
CREATE INDEX idx_invoices_discount_amount ON invoices(discount_amount);