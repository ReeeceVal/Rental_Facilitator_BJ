-- Simplify Commission System Migration
-- Remove redundant commission_calculations table and enhance invoice_employee_assignments

-- First, enhance the invoice_employee_assignments table with additional fields
ALTER TABLE invoice_employee_assignments 
ADD COLUMN base_amount DECIMAL(10,2),
ADD COLUMN paid_at TIMESTAMP,
ADD COLUMN payment_batch_id VARCHAR(50),
ADD COLUMN notes TEXT;

-- Copy any existing commission data from commission_calculations to assignments
-- (This handles any edge cases where data might exist in commission_calculations)
UPDATE invoice_employee_assignments iea
SET base_amount = cc.base_amount
FROM commission_calculations cc
WHERE iea.invoice_id = cc.invoice_id 
  AND iea.employee_id = cc.employee_id
  AND iea.role = cc.role
  AND iea.base_amount IS NULL;

-- Drop the redundant commission_calculations table
DROP TABLE IF EXISTS commission_calculations;

-- Add indexes for better performance on the enhanced table
CREATE INDEX idx_assignments_employee_unpaid ON invoice_employee_assignments(employee_id) 
WHERE paid_at IS NULL AND commission_amount > 0;

CREATE INDEX idx_assignments_payment_batch ON invoice_employee_assignments(payment_batch_id) 
WHERE payment_batch_id IS NOT NULL;

-- Add a comment to document the table's purpose
COMMENT ON TABLE invoice_employee_assignments IS 'Stores employee assignments to invoices with calculated commission data and payment tracking';