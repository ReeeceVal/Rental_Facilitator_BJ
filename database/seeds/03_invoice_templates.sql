-- Seed data for invoice templates
INSERT INTO invoice_templates (name, template_data, is_default) VALUES
(
    'Standard Sound Rental Invoice',
    '{
        "companyName": "Sound Rental Pro",
        "companyAddress": "123 Music Street\nAudio City, AC 12345",
        "companyPhone": "(555) 123-4567",
        "companyEmail": "info@soundrentalpro.com",
        "logoUrl": "",
        "headerColor": "#2563eb",
        "accentColor": "#1d4ed8",
        "footerText": "Thank you for your business! Equipment must be returned in the same condition as rented.",
        "termsAndConditions": "1. Equipment must be returned by the specified return date.\n2. Late returns subject to additional daily charges.\n3. Renter is responsible for any damage or loss.\n4. Payment due within 30 days of invoice date.\n5. Setup and breakdown services available for additional fee.",
        "taxRate": 0.08,
        "currency": "USD",
        "invoiceNumberPrefix": "SR-"
    }',
    true
);