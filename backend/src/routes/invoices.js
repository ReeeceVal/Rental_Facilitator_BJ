const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { generateInvoiceNumber } = require('../utils/helpers');
const pdfService = require('../services/pdfService');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { formatCurrency, formatDate } = require('../utils/helpers');
const { safeParseFloat } = require('../utils/invoiceCalculations');

// Helper function to generate PDF filename
const generatePDFFilename = (invoice) => {
  const invoiceNumber = invoice.invoice_number || 'INV-Unknown';
  const customerName = (invoice.customer_name || 'Unknown Customer')
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .substring(0, 30); // Limit length
  
  const rentalDate = invoice.rental_start_date 
    ? new Date(invoice.rental_start_date).toISOString().split('T')[0] // Format as YYYY-MM-DD
    : 'Unknown-Date';
  
  return `${invoiceNumber}-${customerName}-(${rentalDate}).pdf`;
};
const router = express.Router();

const calculateCommissions = async (invoiceId, totalAmount, client = pool) => {
  try {
    // Calculate standard role commissions (organizer/setup)
    const assignments = await client.query(
      'SELECT * FROM invoice_employee_assignments WHERE invoice_id = $1',
      [invoiceId]
    );

    if (assignments.rows.length > 0) {
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
    }

    // Calculate service-specific commissions
    const serviceAssignments = await client.query(`
      SELECT sea.*, ins.amount as service_amount, ins.discount as service_discount
      FROM service_employee_assignments sea
      JOIN invoice_services ins ON sea.invoice_service_id = ins.id
      WHERE ins.invoice_id = $1
    `, [invoiceId]);

    // Update service-specific assignments with commission calculations
    for (const assignment of serviceAssignments.rows) {
      const serviceNetAmount = parseFloat(assignment.service_amount) - parseFloat(assignment.service_discount || 0);
      const commissionDecimal = parseFloat(assignment.commission_percentage) / 100;
      const commissionAmount = serviceNetAmount * commissionDecimal;
      
      await client.query(`
        UPDATE service_employee_assignments 
        SET commission_amount = $1
        WHERE id = $2
      `, [commissionAmount, assignment.id]);
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
  body('services.*.service_name').optional().isString().withMessage('Service name must be a string'),
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
      total_due: invoice.total_due,
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

    // Get invoice services
    const servicesResult = await pool.query(`
      SELECT id, service_name, amount, discount
      FROM invoice_services
      WHERE invoice_id = $1
      ORDER BY id
    `, [id]);

    const invoice = invoiceResult.rows[0];
    invoice.items = itemsResult.rows;
    invoice.services = servicesResult.rows;

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
    
    const total_due = subtotal + parseFloat(tax_amount);
    const invoice_number = generateInvoiceNumber();

    // Create invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (invoice_number, customer_id, rental_start_date, 
                           rental_duration_days, subtotal, tax_amount, total_due, notes, template_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [invoice_number, customer_id, rental_start_date, rental_duration_days,
        subtotal, tax_amount, total_due, notes, template_id]);

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

    // Get template tax rate first
    let template_tax_rate = 0;
    if (template_id) {
      const templateResult = await client.query('SELECT template_data FROM invoice_templates WHERE id = $1', [template_id]);
      if (templateResult.rows.length > 0) {
        template_tax_rate = parseFloat(templateResult.rows[0].template_data?.taxRate) || 0;
      }
    }

    // Calculate equipment subtotal (including item discounts)
    let equipment_subtotal = 0;
    for (const item of items) {
      const equipmentResult = await client.query('SELECT rate FROM equipment WHERE id = $1', [item.equipment_id]);
      const equipmentRate = parseFloat(equipmentResult.rows[0]?.rate || 0);
      const item_discount = parseFloat(item.item_discount_amount) || 0;
      const line_total = (equipmentRate * item.quantity * item.rental_days) - item_discount;
      equipment_subtotal += line_total;
    }
    
    // Calculate services totals
    const service_fee = services.reduce((sum, service) => sum + (parseFloat(service.amount) || 0), 0);
    const service_discount = services.reduce((sum, service) => sum + (parseFloat(service.discount) || 0), 0);
    
    // Calculate full invoice subtotal (equipment + transport + service fees - discounts)
    const invoice_subtotal = equipment_subtotal + parseFloat(transport_amount) - parseFloat(transport_discount) + service_fee - service_discount;
    
    // Calculate VAT using template tax rate
    const vat_amount = invoice_subtotal * template_tax_rate;
    
    // Calculate total due (subtotal + VAT)
    const total_due = invoice_subtotal + vat_amount;

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
          total_due = $8, notes = $9, status = $10, template_id = $11, updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [customer_id, rental_start_date, rental_duration_days, equipment_subtotal, vat_amount, 
        transport_amount, transport_discount, total_due, notes, status, template_id, id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Delete existing items and services, then recreate
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
    
    // Store existing service employee assignments before deleting services
    const existingServiceAssignments = await client.query(`
      SELECT sea.*, ins.service_name
      FROM service_employee_assignments sea
      JOIN invoice_services ins ON sea.invoice_service_id = ins.id
      WHERE ins.invoice_id = $1
    `, [id]);
    
    await client.query('DELETE FROM invoice_services WHERE invoice_id = $1', [id]);

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

    // Create new invoice services and restore employee assignments
    const serviceAssignmentMap = {};
    for (const service of services) {
      const serviceName = service.service_name || service.name;
      if (serviceName && serviceName.trim()) {
        const serviceResult = await client.query(`
          INSERT INTO invoice_services (invoice_id, service_name, amount, discount)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [id, serviceName, parseFloat(service.amount) || 0, parseFloat(service.discount) || 0]);
        
        const newServiceId = serviceResult.rows[0].id;
        serviceAssignmentMap[serviceName] = newServiceId;
      }
    }
    
    // Restore service employee assignments with new service IDs
    for (const assignment of existingServiceAssignments.rows) {
      const newServiceId = serviceAssignmentMap[assignment.service_name];
      if (newServiceId) {
        await client.query(`
          INSERT INTO service_employee_assignments (invoice_service_id, employee_id, commission_percentage, commission_amount, paid_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [newServiceId, assignment.employee_id, assignment.commission_percentage, assignment.commission_amount, assignment.paid_at]);
      }
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
    
    // Get invoice services
    const servicesResult = await pool.query(`
      SELECT service_name, amount, discount
      FROM invoice_services
      WHERE invoice_id = $1
      ORDER BY id
    `, [id]);
    
    // Ensure numeric fields are properly converted and add services data
    invoice.equipment_subtotal = safeParseFloat(invoice.equipment_subtotal);
    invoice.vat_amount = safeParseFloat(invoice.vat_amount);
    invoice.transport_amount = safeParseFloat(invoice.transport_amount);
    invoice.transport_discount = safeParseFloat(invoice.transport_discount);
    invoice.total_due = safeParseFloat(invoice.total_due);
    
    // Add services from the new table
    invoice.services = servicesResult.rows.map(service => ({
      name: service.service_name,
      amount: safeParseFloat(service.amount),
      discount: safeParseFloat(service.discount)
    }));

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

    // Use stored database values as the source of truth
    // (No recalculation needed - trust the database)
    
    // For backward compatibility with template, map to old names
    invoice.subtotal = invoice.equipment_subtotal;
    invoice.tax_amount = invoice.vat_amount;
    invoice.tax_rate = safeParseFloat(template_config?.taxRate);

    const pdfBuffer = await pdfService.generateInvoicePDF(invoice, template_config);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${generatePDFFilename(invoice)}"`);
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
    
    // Get invoice services
    const servicesResult = await pool.query(`
      SELECT service_name, amount, discount
      FROM invoice_services
      WHERE invoice_id = $1
      ORDER BY id
    `, [id]);
    
    // Ensure numeric fields are properly converted and add services data
    invoice.equipment_subtotal = safeParseFloat(invoice.equipment_subtotal);
    invoice.vat_amount = safeParseFloat(invoice.vat_amount);
    invoice.transport_amount = safeParseFloat(invoice.transport_amount);
    invoice.transport_discount = safeParseFloat(invoice.transport_discount);
    invoice.total_due = safeParseFloat(invoice.total_due);
    
    // Add services from the new table
    invoice.services = servicesResult.rows.map(service => ({
      name: service.service_name,
      amount: safeParseFloat(service.amount),
      discount: safeParseFloat(service.discount)
    }));

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

    // Use stored database values as the source of truth
    // (No recalculation needed - trust the database)
    
    // For backward compatibility with template, map to old names
    invoice.subtotal = invoice.equipment_subtotal;
    invoice.tax_amount = invoice.vat_amount;
    invoice.tax_rate = safeParseFloat(template_config?.taxRate);

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
    handlebars.registerHelper('invoiceSubtotal', (subtotal, transport_amount, transport_discount, services) => {
      const serviceTotal = services ? services.reduce((sum, service) => {
        const amount = parseFloat(service.amount) || 0;
        const discount = parseFloat(service.discount) || 0;
        return sum + (amount - discount);
      }, 0) : 0;
      
      return parseFloat(subtotal || 0) + parseFloat(transport_amount || 0) - parseFloat(transport_discount || 0) + serviceTotal;
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
        tax_rate: templateData?.taxRate || 0,
        transport_amount: invoiceData.transport_amount || 0,
        transport_discount: invoiceData.transport_discount || 0,
        services: invoiceData.services || [],
        total_due: invoiceData.total || 0,
        // For backward compatibility
        subtotal: invoiceData.subtotal || 0,
        tax_amount: invoiceData.tax_amount || (templateData?.taxRate ? (invoiceData.subtotal * templateData.taxRate) : 0),
        total_due: invoiceData.total || 0,
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
        tax_rate: templateData?.taxRate || 0,
        transport_amount: 15.00, // Sample transport amount
        total_due: 150.00,       // Updated total: 125 + 10 + 15 = 150
        // For backward compatibility
        subtotal: 125.00,
        tax_amount: templateData?.taxRate ? (125.00 * templateData.taxRate) : 10.00,
        total_due: 150.00,
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

    // Get template tax rate first
    let template_tax_rate = 0;
    if (template_id) {
      const templateResult = await client.query('SELECT template_data FROM invoice_templates WHERE id = $1', [template_id]);
      if (templateResult.rows.length > 0) {
        template_tax_rate = parseFloat(templateResult.rows[0].template_data?.taxRate) || 0;
      }
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
    
    // Calculate services totals
    const service_fee = services.reduce((sum, service) => sum + (parseFloat(service.amount) || 0), 0);
    const service_discount = services.reduce((sum, service) => sum + (parseFloat(service.discount) || 0), 0);
    
    // Calculate full invoice subtotal (equipment + transport + service fees - discounts)
    const invoice_subtotal = equipment_subtotal + parseFloat(transport_amount) - parseFloat(transport_discount) + service_fee - service_discount;
    
    // Calculate VAT using template tax rate
    const vat_amount = invoice_subtotal * template_tax_rate;
    
    // Calculate total due (subtotal + VAT)
    const total_due = invoice_subtotal + vat_amount;
    const invoice_number = generateInvoiceNumber();

    // Create invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (invoice_number, customer_id, rental_start_date, 
                           rental_duration_days, equipment_subtotal, vat_amount, transport_amount, 
                           transport_discount, total_due, notes, template_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [invoice_number, customer_id, rental_start_date, rental_duration_days,
        equipment_subtotal, vat_amount, transport_amount, transport_discount, total_due, notes, template_id]);

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

    // Create invoice services
    for (const service of services) {
      const serviceName = service.service_name || service.name;
      if (serviceName && serviceName.trim()) {
        await client.query(`
          INSERT INTO invoice_services (invoice_id, service_name, amount, discount)
          VALUES ($1, $2, $3, $4)
        `, [invoice.id, serviceName, parseFloat(service.amount) || 0, parseFloat(service.discount) || 0]);
      }
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

    // Add tax_rate from template to invoice data for PDF generation
    completeInvoice.tax_rate = template_config?.taxRate || 0;

    // Generate PDF with template configuration
    const pdfBuffer = await pdfService.generateInvoicePDF(completeInvoice, template_config);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${generatePDFFilename(completeInvoice)}"`);
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

// Service Employee Assignment Endpoints

// Get all service employee assignments for an invoice
router.get('/:id/service-assignments', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        sea.id,
        sea.invoice_service_id,
        sea.employee_id,
        sea.commission_percentage,
        sea.commission_amount,
        sea.paid_at,
        e.name as employee_name,
        ins.service_name,
        ins.amount as service_amount,
        ins.discount as service_discount
      FROM service_employee_assignments sea
      JOIN employees e ON sea.employee_id = e.id
      JOIN invoice_services ins ON sea.invoice_service_id = ins.id
      WHERE ins.invoice_id = $1
      ORDER BY ins.service_name, e.name
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching service assignments:', error);
    res.status(500).json({ error: 'Failed to fetch service assignments' });
  }
});

// Create service employee assignment
router.post('/:id/service-assignments', [
  body('invoice_service_id').isInt({ min: 1 }).withMessage('Valid service ID is required'),
  body('employee_id').isInt({ min: 1 }).withMessage('Valid employee ID is required'),
  body('commission_percentage').isFloat({ min: 0, max: 100 }).withMessage('Commission percentage must be between 0 and 100'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { invoice_service_id, employee_id, commission_percentage } = req.body;

    // Verify the service belongs to the invoice
    const serviceCheck = await pool.query(
      'SELECT id FROM invoice_services WHERE id = $1 AND invoice_id = $2',
      [invoice_service_id, id]
    );

    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found for this invoice' });
    }

    // Check if assignment already exists
    const existingAssignment = await pool.query(
      'SELECT id FROM service_employee_assignments WHERE invoice_service_id = $1 AND employee_id = $2',
      [invoice_service_id, employee_id]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({ error: 'Employee is already assigned to this service' });
    }

    // Create the assignment
    const result = await pool.query(`
      INSERT INTO service_employee_assignments (invoice_service_id, employee_id, commission_percentage)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [invoice_service_id, employee_id, commission_percentage]);

    // Recalculate commissions for the invoice
    const invoiceResult = await pool.query('SELECT total_due FROM invoices WHERE id = $1', [id]);
    if (invoiceResult.rows.length > 0) {
      await calculateCommissions(id, parseFloat(invoiceResult.rows[0].total_due));
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating service assignment:', error);
    res.status(500).json({ error: 'Failed to create service assignment' });
  }
});

// Update service employee assignment
router.put('/:id/service-assignments/:assignmentId', [
  body('commission_percentage').isFloat({ min: 0, max: 100 }).withMessage('Commission percentage must be between 0 and 100'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, assignmentId } = req.params;
    const { commission_percentage } = req.body;

    // Verify the assignment belongs to a service of this invoice
    const assignmentCheck = await pool.query(`
      SELECT sea.id 
      FROM service_employee_assignments sea
      JOIN invoice_services ins ON sea.invoice_service_id = ins.id
      WHERE sea.id = $1 AND ins.invoice_id = $2
    `, [assignmentId, id]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found for this invoice' });
    }

    // Update the assignment
    const result = await pool.query(`
      UPDATE service_employee_assignments 
      SET commission_percentage = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [commission_percentage, assignmentId]);

    // Recalculate commissions for the invoice
    const invoiceResult = await pool.query('SELECT total_due FROM invoices WHERE id = $1', [id]);
    if (invoiceResult.rows.length > 0) {
      await calculateCommissions(id, parseFloat(invoiceResult.rows[0].total_due));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating service assignment:', error);
    res.status(500).json({ error: 'Failed to update service assignment' });
  }
});

// Delete service employee assignment
router.delete('/:id/service-assignments/:assignmentId', async (req, res) => {
  try {
    const { id, assignmentId } = req.params;

    // Verify the assignment belongs to a service of this invoice
    const assignmentCheck = await pool.query(`
      SELECT sea.id 
      FROM service_employee_assignments sea
      JOIN invoice_services ins ON sea.invoice_service_id = ins.id
      WHERE sea.id = $1 AND ins.invoice_id = $2
    `, [assignmentId, id]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found for this invoice' });
    }

    // Delete the assignment
    await pool.query('DELETE FROM service_employee_assignments WHERE id = $1', [assignmentId]);

    res.json({ message: 'Service assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting service assignment:', error);
    res.status(500).json({ error: 'Failed to delete service assignment' });
  }
});

module.exports = router;