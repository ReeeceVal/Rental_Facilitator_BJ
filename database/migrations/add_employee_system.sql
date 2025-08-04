-- Employee Commission System Migration
-- Add employees table and commission tracking

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
    created_at TIMESTAMP DEFAULT NOW()
);

-- Commission calculations tracking
CREATE TABLE commission_calculations (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    employee_id INTEGER REFERENCES employees(id),
    role VARCHAR(50),
    base_amount DECIMAL(10,2),
    commission_percentage DECIMAL(5,2),
    commission_amount DECIMAL(10,2),
    calculation_date TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_invoice_assignments_invoice ON invoice_employee_assignments(invoice_id);
CREATE INDEX idx_invoice_assignments_employee ON invoice_employee_assignments(employee_id);
CREATE INDEX idx_commission_calculations_employee ON commission_calculations(employee_id);
CREATE INDEX idx_commission_calculations_invoice ON commission_calculations(invoice_id);

-- Insert sample employees
INSERT INTO employees (name, email, phone) VALUES 
('James Smith', 'james@company.com', '555-0101'),
('Jack Johnson', 'jack@company.com', '555-0102'),
('Sarah Wilson', 'sarah@company.com', '555-0103'),
('Mike Davis', 'mike@company.com', '555-0104');