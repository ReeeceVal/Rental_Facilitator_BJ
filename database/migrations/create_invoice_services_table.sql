-- Create invoice_services table to replace service_fee and service_discount columns
-- This allows multiple custom services per invoice instead of just one aggregated service

CREATE TABLE invoice_services (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_service_amount_non_negative CHECK (amount >= 0),
    CONSTRAINT check_service_discount_non_negative CHECK (discount >= 0),
    CONSTRAINT check_service_name_not_empty CHECK (TRIM(service_name) != '')
);

-- Create indexes for better query performance
CREATE INDEX idx_invoice_services_invoice_id ON invoice_services(invoice_id);
CREATE INDEX idx_invoice_services_name ON invoice_services(service_name);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_invoice_services_updated_at
    BEFORE UPDATE ON invoice_services
    FOR EACH ROW EXECUTE FUNCTION update_invoice_services_updated_at();