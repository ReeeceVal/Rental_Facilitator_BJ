const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { generateInvoiceNumber } = require('../utils/helpers');
const pdfService = require('../services/pdfService');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { formatCurrency, formatDate } = require('../utils/helpers');
const router = express.Router();

const calculateCommissions = async (invoiceId, totalAmount, client = pool) => {
  try {
    const assignments = await client.query(
      'SELECT * FROM invoice_employee_assignments WHERE invoice_id = $1',
      [invoiceId]
    );

    if (assignments.rows.length === 0) return;

    const organizerAssignments = assignments.rows.filter(a => a.role === 'organizer');
    const setupAssignments = assignments.rows.filter(a => a.role === 'setup');

    const organizerCommission = 0.05; // 5%
    const setupTotalCommission = 0.30; // 30% total
    const setupIndividualCommission = setupAssignments.length > 0 ? 
      setupTotalCommission / setupAssignments.length : 0;

    // Update organizer assignments with commission calculations
    for (const assignment of organizerAssignments) {
      const commissionAmount = totalAmount * organizerCommission;
      
      await client.query(`
        UPDATE invoice_employee_assignments 
        SET commission_percentage = $1, 
            commission_amount = $2,
            base_amount = $3
        WHERE id = $4
      `, [organizerCommission * 100, commissionAmount, totalAmount, assignment.id]);
    }

    // Update setup assignments with commission calculations
    for (const assignment of setupAssignments) {
      const commissionAmount = totalAmount * setupIndividualCommission;
      
      await client.query(`
        UPDATE invoice_employee_assignments 
        SET commission_percentage = $1, 
            commission_amount = $2,
            base_amount = $3
        WHERE id = $4
      `, [setupIndividualCommission * 100, commissionAmount, totalAmount, assignment.id]);
    }
  } catch (error) {
    console.error('Error calculating commissions:', error);
    throw error;
  }
};

// Validation middleware
const invoiceValidation = [
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID is required'),
  body('rental_start_date').isISO8601().withMessage('Valid start date is required'),
  body('rental_duration_days').isInt({ min: 1 }).withMessage('Rental duration must be at least 1 day'),
  body('transport_amount').optional().isFloat({ min: 0 }).withMessage('Transport amount must be positive'),
  body('transport_discount').optional().isFloat({ min: 0 }).withMessage('Transport discount must be positive'),
  body('services').optional().isArray().withMessage('Services must be an array'),
  body('services.*.name').optional().isString().withMessage('Service name must be a string'),
  body('services.*.amount').optional().isFloat({ min: 0 }).withMessage('Service amount must be positive'),
  body('services.*.discount').optional().isFloat({ min: 0 }).withMessage('Service discount must be positive'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.equipment_id').isInt({ min: 1 }).withMessage('Valid equipment ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.rental_days').isInt({ min: 1 }).withMessage('Rental days must be at least 1'),
  body('items.*.item_discount_amount').optional().isFloat({ min: 0 }).withMessage('Item discount must be positive'),
];

// Get all invoices with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      customer_id, 
      start_date, 
      end_date, 
      page = 1, 
      limit = 10 
    } = req.query;

    let query = `
      SELECT i.*, c.name as customer_name, c.phone as customer_phone
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND i.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (customer_id) {
      paramCount++;
      query += ` AND i.customer_id = $${paramCount}`;
      queryParams.push(parseInt(customer_id));
    }

    if (start_date) {
      paramCount++;
      query += ` AND i.rental_start_date >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND i.rental_start_date + INTERVAL '1 day' * i.rental_duration_days <= $${paramCount}`;
      queryParams.push(end_date);
    }

    query += ' ORDER BY i.created_at DESC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Map database column names to frontend expected names for backward compatibility
    const invoices = result.rows.map(invoice => ({
      ...invoice,
      total_amount: invoice.total_due,
      subtotal: invoice.equipment_subtotal,
      tax_amount: invoice.vat_amount
    }));

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM invoices i
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND i.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (customer_id) {
      countParamCount++;
      countQuery += ` AND i.customer_id = $${countParamCount}`;
      countParams.push(parseInt(customer_id));
    }

    if (start_date) {
      countParamCount++;
      countQuery += ` AND i.rental_start_date >= $${countParamCount}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countParamCount++;
      countQuery += ` AND i.rental_start_date + INTERVAL '1 day' * i.rental_duration_days <= $${countParamCount}`;
      countParams.push(end_date);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      invoices: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get calendar events (rental dates) - MUST be before /:id route
router.get('/calendar', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let query = `
      SELECT 
        i.id,
        i.invoice_number,
        i.rental_start_date,
        i.rental_duration_days,
        i.total_due,
        i.status,
        c.name as customer_name,
        COALESCE(
          array_agg(
            DISTINCT jsonb_build_object(
              'name', e.name,
              'quantity', ii.quantity
            )
          ) FILTER (WHERE e.name IS NOT NULL), 
          '{}'::jsonb[]
        ) as equipment
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      LEFT JOIN equipment e ON ii.equipment_id = e.id
      WHERE i.status <> 'cancelled'
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    // Filter by year and month if provided
    if (year) {
      query += ` AND EXTRACT(YEAR FROM i.rental_start_date) = $${paramCount}`;
      queryParams.push(parseInt(year));
      paramCount++;
    }
    
    if (month) {
      query += ` AND EXTRACT(MONTH FROM i.rental_start_date) = $${paramCount}`;
      queryParams.push(parseInt(month));
      paramCount++;
    }
    
    query += `
      GROUP BY i.id, i.invoice_number, i.rental_start_date, i.rental_duration_days, 
               i.total_due, i.status, c.name
      ORDER BY i.rental_start_date ASC
    `;
    
    const result = await pool.query(query, queryParams);
    
    // Transform data into calendar events
    const events = result.rows.map(row => {
      const startDate = new Date(row.rental_start_date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (row.rental_duration_days || 1) - 1);
      
      return {
        id: row.id,
        title: `${row.customer_name} - ${row.invoice_number}`,
        start: row.rental_start_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        end: endDate.toISOString().split('T')[0], // Calculate end date from duration
        totalAmount: parseFloat(row.total_due),
        status: row.status,
        customer: row.customer_name,
        equipment: row.equipment || [],
        invoiceNumber: row.invoice_number,
        duration: row.rental_duration_days || 1
      };
    });
    
    res.json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar events',
      error: error.message
    });
  }
});

// Get single invoice with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get invoice with customer details
    const invoiceResult = await pool.query(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, 
             c.email as customer_email, c.address as customer_address
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get invoice items with equipment details
    const itemsResult = await pool.query(`
      SELECT ii.*, e.name as equipment_name, e.description as equipment_description, e.rate as equipment_rate
      FROM invoice_items ii
      LEFT JOIN equipment e ON ii.equipment_id = e.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.id
    `, [id]);

    const invoice = invoiceResult.rows[0];
    invoice.items = itemsResult.rows;

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create new invoice
router.post('/', invoiceValidation, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      customer_id,
      rental_start_date,
      rental_duration_days = 1,
      items,
      notes,
      tax_amount = 0,
      template_id
    } = req.body;

    // Calculate totals - get equipment rates from database
    let subtotal = 0;
    for (const item of items) {
      const equipmentResult = await client.query('SELECT rate FROM equipment WHERE id = $1', [item.equipment_id]);
      const equipmentRate = parseFloat(equipmentResult.rows[0]?.rate || 0);
      const itemDiscount = parseFloat(item.item_discount_amount || 0);
      subtotal += (equipmentRate * item.quantity * item.rental_days) - itemDiscount;
    }
    
    const total_amount = subtotal + parseFloat(tax_amount);
    const invoice_number = generateInvoiceNumber();

    // Create invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (invoice_number, customer_id, rental_start_date, 
                           rental_duration_days, subtotal, tax_amount, total_amount, notes, template_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [invoice_number, customer_id, rental_start_date, rental_duration_days,
        subtotal, tax_amount, total_amount, notes, template_id]);

    const invoice = invoiceResult.rows[0];

    // Create invoice items
    for (const item of items) {
      const equipmentResult = await client.query('SELECT rate FROM equipment WHERE id = $1', [item.equipment_id]);
      const equipmentRate = parseFloat(equipmentResult.rows[0]?.rate || 0);
      const itemDiscount = parseFloat(item.item_discount_amount || 0);
      const line_total = (equipmentRate * item.quantity * item.rental_days) - itemDiscount;
      
      await client.query(`
        INSERT INTO invoice_items (invoice_id, equipment_id, quantity, rental_days, item_discount_amount, line_total)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [invoice.id, item.equipment_id, item.quantity, item.rental_days, itemDiscount, line_total]);
    }

    await client.query('COMMIT');

    // Fetch the complete invoice with items
    const completeInvoice = await pool.query(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [invoice.id]);

    res.status(201).json(completeInvoice.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    client.release();
  }
});

// Update invoice status only
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['unpaid', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: unpaid, paid, cancelled' });
    }

    const result = await pool.query(`
      UPDATE invoices 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// Update invoice
router.put('/:id', invoiceValidation, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      customer_id,
      customer_data,
      rental_start_date,
      rental_duration_days,
      transport_amount = 0,
      transport_discount = 0,
      services = [],
      items,
      notes,
      tax_amount = 0,
      status,
      template_id
    } = req.body;

    // Calculate equipment subtotal (including item discounts)
    let equipment_subtotal = 0;
    for (const item of items) {
      const equipmentResult = await client.query('SELECT rate FROM equipment WHERE id = $1', [item.equipment_id]);
      const equipmentRate = parseFloat(equipmentResult.rows[0]?.rate || 0);
      const item_discount = parseFloat(item.item_discount_amount) || 0;
      const line_total = (equipmentRate * item.quantity * item.rental_days) - item_discount;
      equipment_subtotal += line_total;
    }
    
    // Calculate services totals (for backward compatibility with DB schema)
    const service_fee = services.reduce((sum, service) => sum + (parseFloat(service.amount) || 0), 0);
    const service_discount = services.reduce((sum, service) => sum + (parseFloat(service.discount) || 0), 0);
    
    // Calculate full invoice subtotal (equipment + transport + service fees - discounts)
    const invoice_subtotal = equipment_subtotal + parseFloat(transport_amount) - parseFloat(transport_discount) + service_fee - service_discount;
    
    // Calculate VAT on the full invoice subtotal
    const vat_amount = invoice_subtotal * 0.15; // 15% VAT
    
    // Calculate total due (subtotal + VAT)
    const total_amount = invoice_subtotal + vat_amount;

    // Update customer information if provided
    if (customer_data && customer_id) {
      await client.query(`
        UPDATE customers 
        SET name = $1, phone = $2, email = $3, address = $4, updated_at = NOW()
        WHERE id = $5
      `, [
        customer_data.name || '',
        customer_data.phone || '',
        customer_data.email || '',
        customer_data.address || '',
        customer_id
      ]);
    }

    // Update invoice
    const invoiceResult = await client.query(`
      UPDATE invoices 
      SET customer_id = $1, rental_start_date = $2, rental_duration_days = $3, 
          equipment_subtotal = $4, vat_amount = $5, transport_amount = $6, transport_discount = $7,
          service_fee = $8, service_discount = $9, total_due = $10, notes = $11, 
          status = $12, template_id = $13, updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `, [customer_id, rental_start_date, rental_duration_days, equipment_subtotal, vat_amount, 
        transport_amount, transport_discount, service_fee, service_discount, total_amount, notes, status, template_id, id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Delete existing items and recreate
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

    // Create new invoice items
    for (const item of items) {
      const equipmentResult = await client.query('SELECT rate FROM equipment WHERE id = $1', [item.equipment_id]);
      const equipmentRate = parseFloat(equipmentResult.rows[0]?.rate || 0);
      const item_discount = parseFloat(item.item_discount_amount) || 0;
      const line_total = (equipmentRate * item.quantity * item.rental_days) - item_discount;
      
      await client.query(`
        INSERT INTO invoice_items (invoice_id, equipment_id, quantity, rental_days, item_discount_amount, line_total)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, item.equipment_id, item.quantity, item.rental_days, item_discount, line_total]);
    }

    await client.query('COMMIT');
    res.json(invoiceResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  } finally {
    client.release();
  }
});

// Generate PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get complete invoice data
    const invoiceResult = await pool.query(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, 
             c.email as customer_email, c.address as customer_address
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const itemsResult = await pool.query(`
      SELECT ii.*, e.name as equipment_name, e.description as equipment_description, e.rate as equipment_rate
      FROM invoice_items ii
      LEFT JOIN equipment e ON ii.equipment_id = e.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.id
    `, [id]);

    const invoice = invoiceResult.rows[0];
    invoice.items = itemsResult.rows;
    
    // Ensure numeric fields are properly converted for PDF generation
    invoice.equipment_subtotal = parseFloat(invoice.equipment_subtotal) || 0;
    invoice.vat_amount = parseFloat(invoice.vat_amount) || 0;
    invoice.transport_amount = parseFloat(invoice.transport_amount) || 0;
    invoice.transport_discount = parseFloat(invoice.transport_discount) || 0;
    invoice.service_fee = parseFloat(invoice.service_fee) || 0;
    invoice.service_discount = parseFloat(invoice.service_discount) || 0;
    invoice.total_due = parseFloat(invoice.total_due) || 0;
    
    // For backward compatibility with template, map to old names
    invoice.subtotal = invoice.equipment_subtotal;
    invoice.tax_amount = invoice.vat_amount;
    invoice.total_amount = invoice.total_due;
    
    // Convert service_fee and service_discount to services array for template
    invoice.services = [];
    if (invoice.service_fee > 0 || invoice.service_discount > 0) {
      invoice.services.push({
        name: 'Service Fee',
        amount: parseFloat(invoice.service_fee) || 0,
        discount: parseFloat(invoice.service_discount) || 0
      });
    }

    // Get template configuration (use invoice's template or fall back to default)
    let templateResult;
    if (invoice.template_id) {
      templateResult = await pool.query(`
        SELECT template_data FROM invoice_templates 
        WHERE id = $1
      `, [invoice.template_id]);
    }
    
    // Fall back to default template if no specific template found
    if (!templateResult || templateResult.rows.length === 0) {
      templateResult = await pool.query(`
        SELECT template_data FROM invoice_templates 
        WHERE is_default = true 
        LIMIT 1
      `);
    }
    
    const template_config = templateResult.rows.length > 0 
      ? templateResult.rows[0].template_data 
      : { headerColor: '#2563eb' };

    const pdfBuffer = await pdfService.generateInvoicePDF(invoice, template_config);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Render invoice HTML (for preview)
router.get('/:id/html', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get complete invoice data
    const invoiceResult = await pool.query(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, 
             c.email as customer_email, c.address as customer_address
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const itemsResult = await pool.query(`
      SELECT ii.*, e.name as equipment_name, e.description as equipment_description, e.rate as equipment_rate
      FROM invoice_items ii
      LEFT JOIN equipment e ON ii.equipment_id = e.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.id
    `, [id]);

    const invoice = invoiceResult.rows[0];
    invoice.items = itemsResult.rows;
    
    // Ensure numeric fields are properly converted for HTML preview
    invoice.equipment_subtotal = parseFloat(invoice.equipment_subtotal) || 0;
    invoice.vat_amount = parseFloat(invoice.vat_amount) || 0;
    invoice.transport_amount = parseFloat(invoice.transport_amount) || 0;
    invoice.transport_discount = parseFloat(invoice.transport_discount) || 0;
    invoice.service_fee = parseFloat(invoice.service_fee) || 0;
    invoice.service_discount = parseFloat(invoice.service_discount) || 0;
    invoice.total_due = parseFloat(invoice.total_due) || 0;
    
    // For backward compatibility with template, map to old names
    invoice.subtotal = invoice.equipment_subtotal;
    invoice.tax_amount = invoice.vat_amount;
    invoice.total_amount = invoice.total_due;
    
    // Convert service_fee and service_discount to services array for template
    invoice.services = [];
    if (invoice.service_fee > 0 || invoice.service_discount > 0) {
      invoice.services.push({
        name: 'Service Fee',
        amount: parseFloat(invoice.service_fee) || 0,
        discount: parseFloat(invoice.service_discount) || 0
      });
    }

    // Get template configuration (use invoice's template or fall back to default)
    let templateResult;
    if (invoice.template_id) {
      templateResult = await pool.query(`
        SELECT template_data FROM invoice_templates 
        WHERE id = $1
      `, [invoice.template_id]);
    }
    
    // Fall back to default template if no specific template found
    if (!templateResult || templateResult.rows.length === 0) {
      templateResult = await pool.query(`
        SELECT template_data FROM invoice_templates 
        WHERE is_default = true 
        LIMIT 1
      `);
    }
    
    const template_config = templateResult.rows.length > 0 
      ? templateResult.rows[0].template_data 
      : { headerColor: '#2563eb' };

    // Use the same template rendering logic as PDF service
    const templatePath = path.join(__dirname, '../templates', 'invoice.hbs');
    const templateSource = await fs.readFile(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    
    // Register helpers (same as PDF service)
    handlebars.registerHelper('formatCurrency', formatCurrency);
    handlebars.registerHelper('formatDate', formatDate);
    handlebars.registerHelper('multiply', (a, b) => a * b);
    handlebars.registerHelper('subtract', (a, b) => a - b);
    handlebars.registerHelper('add', (a, b) => a + b);
    handlebars.registerHelper('gt', (a, b) => a > b);
    handlebars.registerHelper('eq', (a, b) => a === b);
    handlebars.registerHelper('or', (...args) => {
      const values = args.slice(0, -1);
      return values.some(val => val);
    });

    // Prepare data for template (same as PDF service)
    const companyInfo = template_config ? {
      name: template_config.companyName || 'Sound Rental Pro',
      address: template_config.companyAddress || '123 Music Street\nAudio City, AC 12345',
      phone: template_config.companyPhone || '(555) 123-4567',
      email: template_config.companyEmail || 'info@soundrentalpro.com'
    } : {
      name: 'Sound Rental Pro',
      address: '123 Music Street\nAudio City, AC 12345',
      phone: '(555) 123-4567',
      email: 'info@soundrentalpro.com'
    };
    
    const templateData = {
      ...invoice,
      company: companyInfo,
      templateConfig: template_config || { headerColor: '#2563eb' },
      formatCurrency,
      formatDate,
      generatedDate: new Date().toISOString()
    };

    // Generate HTML
    const html = template(templateData);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error rendering invoice HTML:', error);
    res.status(500).json({ error: 'Failed to render invoice HTML' });
  }
});

// Preview template with sample data
router.post('/preview-template', async (req, res) => {
  try {
    const { templateData, invoiceData } = req.body;
    
    // Use actual invoice data if provided, otherwise use sample data
    let sampleData;
    
    if (invoiceData && invoiceData.customer && invoiceData.items && invoiceData.items.length > 0) {
      // Use actual form data
      sampleData = {
        invoice_number: invoiceData.invoice_number || (templateData?.invoiceNumberPrefix ? `${templateData.invoiceNumberPrefix}001` : 'INV-001'),
        created_at: invoiceData.date || new Date().toISOString(),
        customer_name: invoiceData.customer.name || 'Customer Name',
        customer_phone: invoiceData.customer.phone || '',
        customer_email: invoiceData.customer.email || '',
        customer_address: invoiceData.customer.address || '',
        rental_start_date: invoiceData.rental_start_date || new Date().toISOString(),
        rental_duration_days: invoiceData.rental_duration_days || 1,
        items: invoiceData.items.map(item => ({
          equipment_name: item.name || item.equipment_name,
          equipment_description: item.description || '',
          quantity: item.quantity || 1,
          rental_days: item.days || item.rental_days || 1,
          rate: item.rate || 0,
          item_discount_amount: item.item_discount_amount || 0,
          line_total: item.total || item.line_total || 0
        })),
        equipment_subtotal: invoiceData.subtotal || 0,
        vat_amount: invoiceData.tax_amount || (templateData?.taxRate ? (invoiceData.subtotal * templateData.taxRate) : 0),
        transport_amount: invoiceData.transport_amount || 0,
        transport_discount: invoiceData.transport_discount || 0,
        service_fee: invoiceData.service_fee || 0,
        service_discount: invoiceData.service_discount || 0,
        total_due: invoiceData.total || 0,
        // For backward compatibility
        subtotal: invoiceData.subtotal || 0,
        tax_amount: invoiceData.tax_amount || (templateData?.taxRate ? (invoiceData.subtotal * templateData.taxRate) : 0),
        total_amount: invoiceData.total || 0,
        notes: invoiceData.notes || ''
      };
    } else {
      // Use sample data as fallback
      sampleData = {
        invoice_number: templateData?.invoiceNumberPrefix ? `${templateData.invoiceNumberPrefix}001` : 'INV-001',
        created_at: new Date().toISOString(),
        customer_name: 'Sample Customer',
        customer_phone: '(555) 987-6543',
        customer_email: 'customer@example.com',
        customer_address: '456 Customer Ave\nSample City, SC 54321',
        rental_start_date: new Date().toISOString(),
        rental_duration_days: 1,
        items: [
          {
            equipment_name: 'Professional Microphone',
            equipment_description: 'Wireless handheld microphone with receiver',
            quantity: 2,
            rental_days: 1,
            rate: 25.00,
            item_discount_amount: 0,
            line_total: 50.00
          },
          {
            equipment_name: 'Speaker System',
            equipment_description: 'Full range PA speakers with stands',
            quantity: 1,
            rental_days: 1,
            rate: 75.00,
            item_discount_amount: 0,
            line_total: 75.00
          }
        ],
        equipment_subtotal: 125.00,
        vat_amount: templateData?.taxRate ? (125.00 * templateData.taxRate) : 10.00,
        transport_amount: 15.00, // Sample transport amount
        total_due: 150.00,       // Updated total: 125 + 10 + 15 = 150
        // For backward compatibility
        subtotal: 125.00,
        tax_amount: templateData?.taxRate ? (125.00 * templateData.taxRate) : 10.00,
        total_amount: 150.00,
        notes: 'Sample invoice for template preview'
      };
    }

    // Use PDFService to generate HTML (eliminates code duplication)
    const html = await pdfService.generateInvoiceHTML(sampleData, templateData);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

// Create invoice and generate PDF with template
router.post('/create-and-generate-pdf', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      customer_data,
      rental_start_date,
      rental_duration_days = 1,
      transport_amount = 0,
      transport_discount = 0,
      services = [],
      items,
      notes,
      tax_amount = 0,
      template_config,
      template_id
    } = req.body;

    // Create or find customer
    let customer_id;
    if (customer_data) {
      const customerResult = await client.query(`
        INSERT INTO customers (name, phone, email, address) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id
      `, [
        customer_data.name || 'Customer', 
        customer_data.phone || '', 
        customer_data.email || '', 
        customer_data.address || ''
      ]);
      customer_id = customerResult.rows[0].id;
    } else {
      // Fallback customer_id if provided
      customer_id = req.body.customer_id || 1;
    }

    // Calculate equipment subtotal (including item discounts)
    let equipment_subtotal = 0;
    for (const item of items) {
      const equipmentResult = await client.query('SELECT rate FROM equipment WHERE id = $1', [item.equipment_id]);
      const equipmentRate = parseFloat(equipmentResult.rows[0]?.rate || item.rate || 0);
      const item_discount = parseFloat(item.item_discount_amount) || 0;
      const line_total = (equipmentRate * item.quantity * item.rental_days) - item_discount;
      equipment_subtotal += line_total;
    }
    
    // Calculate services totals (for backward compatibility with DB schema)
    const service_fee = services.reduce((sum, service) => sum + (parseFloat(service.amount) || 0), 0);
    const service_discount = services.reduce((sum, service) => sum + (parseFloat(service.discount) || 0), 0);
    
    // Calculate full invoice subtotal (equipment + transport + service fees - discounts)
    const invoice_subtotal = equipment_subtotal + parseFloat(transport_amount) - parseFloat(transport_discount) + service_fee - service_discount;
    
    // Calculate VAT on the full invoice subtotal
    const vat_amount = invoice_subtotal * 0.15; // 15% VAT
    
    // Calculate total due (subtotal + VAT)
    const total_amount = invoice_subtotal + vat_amount;
    const invoice_number = generateInvoiceNumber();

    // Create invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (invoice_number, customer_id, rental_start_date, 
                           rental_duration_days, equipment_subtotal, vat_amount, transport_amount, 
                           transport_discount, service_fee, service_discount, total_due, notes, template_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [invoice_number, customer_id, rental_start_date, rental_duration_days,
        equipment_subtotal, vat_amount, transport_amount, transport_discount, service_fee, service_discount, total_amount, notes, template_id]);

    const invoice = invoiceResult.rows[0];

    // Create invoice items (and equipment if needed)
    for (const item of items) {
      let equipment_id = item.equipment_id;
      let equipmentRate = parseFloat(item.rate || 0);
      
      // If equipment_id not provided, check if equipment exists by name first
      if (!equipment_id && item.equipment_name) {
        // First try to find existing equipment by name (case-insensitive)
        const existingEquipment = await client.query(`
          SELECT id, rate FROM equipment 
          WHERE LOWER(name) = LOWER($1) AND is_active = true
          LIMIT 1
        `, [item.equipment_name.trim()]);
        
        if (existingEquipment.rows.length > 0) {
          // Use existing equipment and its rate
          equipment_id = existingEquipment.rows[0].id;
          equipmentRate = parseFloat(existingEquipment.rows[0].rate);
        } else {
          // Only create new equipment if none exists with this name
          const equipmentResult = await client.query(`
            INSERT INTO equipment (name, description, rate, stock_quantity) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, rate
          `, [
            item.equipment_name.trim(),
            item.description || '',
            equipmentRate,
            item.quantity || 1
          ]);
          equipment_id = equipmentResult.rows[0].id;
          equipmentRate = parseFloat(equipmentResult.rows[0].rate);
        }
      } else if (equipment_id) {
        // Get rate from existing equipment
        const equipmentResult = await client.query('SELECT rate FROM equipment WHERE id = $1', [equipment_id]);
        equipmentRate = parseFloat(equipmentResult.rows[0]?.rate || 0);
      }
      
      const item_discount = parseFloat(item.item_discount_amount) || 0;
      const line_total = (equipmentRate * item.quantity * item.rental_days) - item_discount;
      
      await client.query(`
        INSERT INTO invoice_items (invoice_id, equipment_id, quantity, rental_days, item_discount_amount, line_total)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [invoice.id, equipment_id, item.quantity, item.rental_days, item_discount, line_total]);
    }

    await client.query('COMMIT');

    // Get complete invoice data for PDF
    const completeInvoiceResult = await pool.query(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, 
             c.email as customer_email, c.address as customer_address
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [invoice.id]);

    const itemsResult = await pool.query(`
      SELECT ii.*, e.name as equipment_name, e.description as equipment_description, e.rate as equipment_rate
      FROM invoice_items ii
      LEFT JOIN equipment e ON ii.equipment_id = e.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.id
    `, [invoice.id]);

    const completeInvoice = completeInvoiceResult.rows[0];
    completeInvoice.items = itemsResult.rows;
    
    // Convert services array back to template format
    completeInvoice.services = services.filter(service => service.name && service.name.trim());

    // Generate PDF with template configuration
    const pdfBuffer = await pdfService.generateInvoicePDF(completeInvoice, template_config);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${completeInvoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice and generating PDF:', error);
    res.status(500).json({ error: 'Failed to create invoice and generate PDF' });
  } finally {
    client.release();
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

router.post('/:id/assign-employees', async (req, res) => {
  try {
    const { id } = req.params;
    const { assignments } = req.body;

    if (!assignments || !Array.isArray(assignments)) {
      return res.status(400).json({ error: 'Assignments array is required' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM invoice_employee_assignments WHERE invoice_id = $1', [id]);

      for (const assignment of assignments) {
        if (!assignment.employee_id || !assignment.role) {
          continue;
        }

        await client.query(`
          INSERT INTO invoice_employee_assignments (invoice_id, employee_id, role)
          VALUES ($1, $2, $3)
        `, [id, assignment.employee_id, assignment.role]);
      }

      const invoiceResult = await client.query('SELECT total_due FROM invoices WHERE id = $1', [id]);
      if (invoiceResult.rows.length > 0) {
        await calculateCommissions(id, parseFloat(invoiceResult.rows[0].total_due), client);
      }

      await client.query('COMMIT');

      const assignmentsResult = await client.query(`
        SELECT iea.*, e.name as employee_name
        FROM invoice_employee_assignments iea
        JOIN employees e ON iea.employee_id = e.id
        WHERE iea.invoice_id = $1
      `, [id]);

      res.json({ 
        message: 'Employees assigned successfully',
        assignments: assignmentsResult.rows 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error assigning employees:', error);
    res.status(500).json({ error: 'Failed to assign employees' });
  }
});

router.get('/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        iea.*,
        e.name as employee_name,
        e.email as employee_email
      FROM invoice_employee_assignments iea
      JOIN employees e ON iea.employee_id = e.id
      WHERE iea.invoice_id = $1
      ORDER BY iea.role, e.name
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoice assignments:', error);
    res.status(500).json({ error: 'Failed to fetch invoice assignments' });
  }
});

router.get('/:id/commissions', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        iea.*,
        e.name as employee_name,
        i.invoice_number,
        c.name as customer_name
      FROM invoice_employee_assignments iea
      JOIN employees e ON iea.employee_id = e.id
      JOIN invoices i ON iea.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE iea.invoice_id = $1
        AND iea.commission_amount IS NOT NULL
      ORDER BY iea.role, e.name
    `, [id]);

    const totalCommission = result.rows.reduce((sum, row) => {
      return sum + parseFloat(row.commission_amount || 0);
    }, 0);

    res.json({
      commissions: result.rows,
      total_commission: totalCommission
    });
  } catch (error) {
    console.error('Error fetching invoice commissions:', error);
    res.status(500).json({ error: 'Failed to fetch invoice commissions' });
  }
});

module.exports = router;