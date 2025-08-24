-- WhatsApp Invoice Generator - Consolidated Database Schema
-- This file combines the main schema with all migrations to avoid conflicts

-- Equipment Categories
CREATE TABLE equipment_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Inventory
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES equipment_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    daily_rate DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Templates
CREATE TABLE invoice_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoices (with all columns from migrations)
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    rental_start_date DATE NOT NULL,
    rental_duration_days INTEGER DEFAULT 1 CHECK (rental_duration_days >= 1),
    equipment_subtotal DECIMAL(10,2) NOT NULL, -- renamed from subtotal
    vat_amount DECIMAL(10,2) DEFAULT 0, -- renamed from tax_amount
    total_due DECIMAL(10,2) NOT NULL, -- renamed from total_amount
    transport_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'cancelled')),
    notes TEXT,
    template_id INTEGER REFERENCES invoice_templates(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Line Items (with discount support)
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    equipment_id INTEGER REFERENCES equipment(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    daily_rate DECIMAL(10,2) NOT NULL,
    rental_days INTEGER NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    item_discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Screenshot Processing History
CREATE TABLE screenshot_uploads (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255),
    file_path VARCHAR(500),
    extracted_text TEXT,
    parsed_data JSONB,
    invoice_id INTEGER REFERENCES invoices(id),
    processing_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Employees table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice-Employee assignments
CREATE TABLE invoice_employee_assignments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('organizer', 'setup')),
    commission_percentage DECIMAL(5,2),
    commission_amount DECIMAL(10,2),
    base_amount DECIMAL(10,2),
    paid_at TIMESTAMP,
    payment_batch_id VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Services table
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

-- Service Employee Assignments
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

-- Create all indexes for better performance
CREATE INDEX idx_equipment_category ON equipment(category_id);
CREATE INDEX idx_equipment_active ON equipment(is_active);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_duration ON invoices(rental_duration_days);
CREATE INDEX idx_invoices_equipment_subtotal ON invoices(equipment_subtotal);
CREATE INDEX idx_invoices_transport_amount ON invoices(transport_amount);
CREATE INDEX idx_invoices_discount_amount ON invoices(discount_amount);
CREATE INDEX idx_invoices_template ON invoices(template_id);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_discount ON invoice_items(item_discount_amount);
CREATE INDEX idx_screenshot_uploads_invoice ON screenshot_uploads(invoice_id);
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_invoice_assignments_invoice ON invoice_employee_assignments(invoice_id);
CREATE INDEX idx_invoice_assignments_employee ON invoice_employee_assignments(employee_id);
CREATE INDEX idx_assignments_employee_unpaid ON invoice_employee_assignments(employee_id) 
WHERE paid_at IS NULL AND commission_amount > 0;
CREATE INDEX idx_assignments_payment_batch ON invoice_employee_assignments(payment_batch_id) 
WHERE payment_batch_id IS NOT NULL;
CREATE INDEX idx_invoice_services_invoice_id ON invoice_services(invoice_id);
CREATE INDEX idx_invoice_services_name ON invoice_services(service_name);
CREATE INDEX idx_service_employee_assignments_service_id ON service_employee_assignments(invoice_service_id);
CREATE INDEX idx_service_employee_assignments_employee_id ON service_employee_assignments(employee_id);
CREATE INDEX idx_service_employee_assignments_paid_at ON service_employee_assignments(paid_at);

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_invoice_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_service_employee_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER trigger_update_invoice_services_updated_at
    BEFORE UPDATE ON invoice_services
    FOR EACH ROW EXECUTE FUNCTION update_invoice_services_updated_at();

CREATE TRIGGER trigger_update_service_employee_assignments_updated_at
    BEFORE UPDATE ON service_employee_assignments
    FOR EACH ROW EXECUTE FUNCTION update_service_employee_assignments_updated_at();

-- Add column comments for documentation
COMMENT ON COLUMN invoices.equipment_subtotal IS 'Sum of all equipment line items (excluding transport and discount)';
COMMENT ON COLUMN invoices.transport_amount IS 'Additional transport/delivery charges';
COMMENT ON COLUMN invoices.discount_amount IS 'Discount applied to subtotal (before VAT)';
COMMENT ON COLUMN invoices.vat_amount IS 'VAT/Tax amount calculated on (equipment_subtotal + transport_amount - discount_amount)';
COMMENT ON COLUMN invoices.total_due IS 'Final amount due: equipment_subtotal + transport_amount - discount_amount + vat_amount';
COMMENT ON COLUMN invoice_items.item_discount_amount IS 'Discount amount applied to this specific line item (reduces line_total)';
COMMENT ON TABLE service_employee_assignments IS 'Assigns employees to specific invoice services with custom commission rates';
COMMENT ON COLUMN service_employee_assignments.commission_percentage IS 'Commission percentage for this employee on this specific service';
COMMENT ON COLUMN service_employee_assignments.commission_amount IS 'Calculated commission amount based on service amount and percentage';
COMMENT ON COLUMN service_employee_assignments.paid_at IS 'Timestamp when commission was paid to employee';
COMMENT ON TABLE invoice_employee_assignments IS 'Stores employee assignments to invoices with calculated commission data and payment tracking';

-- Insert sample employees
INSERT INTO employees (name, email, phone) VALUES 
('James Smith', 'james@company.com', '555-0101'),
('Jack Johnson', 'jack@company.com', '555-0102'),
('Sarah Wilson', 'sarah@company.com', '555-0103'),
('Mike Davis', 'mike@company.com', '555-0104');
