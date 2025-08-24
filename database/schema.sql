-- WhatsApp Invoice Generator Database Schema

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

-- Invoice Templates (MOVED UP - must come before invoices)
CREATE TABLE invoice_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    rental_start_date DATE NOT NULL,
    rental_duration_days INTEGER DEFAULT 1 CHECK (rental_duration_days >= 1),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    notes TEXT,
    template_id INTEGER REFERENCES invoice_templates(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    equipment_id INTEGER REFERENCES equipment(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    daily_rate DECIMAL(10,2) NOT NULL,
    rental_days INTEGER NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
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

-- Create indexes for better performance
CREATE INDEX idx_equipment_category ON equipment(category_id);
CREATE INDEX idx_equipment_active ON equipment(is_active);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_duration ON invoices(rental_duration_days);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_screenshot_uploads_invoice ON screenshot_uploads(invoice_id);