-- Create service_employee_assignments table
-- This allows assigning employees to specific services with custom commission rates
-- Extends the existing employee assignment system beyond just organizer/setup roles

CREATE TABLE service_employee_assignments (
    id SERIAL PRIMARY KEY,
    invoice_service_id INTEGER NOT NULL REFERENCES invoice_services(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    commission_amount DECIMAL(10,2),
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    -- Ensure no duplicate assignments for same employee on same service
    UNIQUE(invoice_service_id, employee_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_service_employee_assignments_service_id ON service_employee_assignments(invoice_service_id);
CREATE INDEX idx_service_employee_assignments_employee_id ON service_employee_assignments(employee_id);
CREATE INDEX idx_service_employee_assignments_paid_at ON service_employee_assignments(paid_at);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_employee_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_service_employee_assignments_updated_at
    BEFORE UPDATE ON service_employee_assignments
    FOR EACH ROW EXECUTE FUNCTION update_service_employee_assignments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE service_employee_assignments IS 'Assigns employees to specific invoice services with custom commission rates';
COMMENT ON COLUMN service_employee_assignments.commission_percentage IS 'Commission percentage for this employee on this specific service';
COMMENT ON COLUMN service_employee_assignments.commission_amount IS 'Calculated commission amount based on service amount and percentage';
COMMENT ON COLUMN service_employee_assignments.paid_at IS 'Timestamp when commission was paid to employee';