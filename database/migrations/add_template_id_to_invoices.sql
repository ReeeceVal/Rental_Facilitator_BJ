-- Add template_id column to invoices table to track which template was used
ALTER TABLE invoices 
ADD COLUMN template_id INTEGER REFERENCES invoice_templates(id);

-- Create index for better performance
CREATE INDEX idx_invoices_template ON invoices(template_id);

-- Set existing invoices to use the default template if one exists
UPDATE invoices 
SET template_id = (
    SELECT id 
    FROM invoice_templates 
    WHERE is_default = true 
    LIMIT 1
) 
WHERE template_id IS NULL;