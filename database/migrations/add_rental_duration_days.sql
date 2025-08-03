-- Migration: Add rental_duration_days column to invoices table
-- This allows storing rental duration separately from calculated end dates

-- Add the new column
ALTER TABLE invoices ADD COLUMN rental_duration_days INTEGER DEFAULT 1;

-- Update existing records to calculate duration from start/end dates
UPDATE invoices 
SET rental_duration_days = GREATEST(1, (rental_end_date - rental_start_date) + 1)
WHERE rental_duration_days IS NULL;

-- Add constraint to ensure duration is at least 1 day
ALTER TABLE invoices ADD CONSTRAINT check_rental_duration_positive 
CHECK (rental_duration_days >= 1);

-- Create index for better performance on duration queries
CREATE INDEX idx_invoices_duration ON invoices(rental_duration_days);

-- Add comment to document the column
COMMENT ON COLUMN invoices.rental_duration_days IS 'Duration of rental in days (e.g., 1 for single day, 7 for week)';