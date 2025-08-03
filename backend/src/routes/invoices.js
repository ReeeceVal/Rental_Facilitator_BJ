const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { generateInvoiceNumber } = require('../utils/helpers');
const pdfService = require('../services/pdfService');
const router = express.Router();

// Validation middleware
const invoiceValidation = [
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer ID is required'),
  body('rental_start_date').isISO8601().withMessage('Valid start date is required'),
  body('rental_end_date').isISO8601().withMessage('Valid end date is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.equipment_id').isInt({ min: 1 }).withMessage('Valid equipment ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.daily_rate').isFloat({ min: 0 }).withMessage('Daily rate must be positive'),
  body('items.*.rental_days').isInt({ min: 1 }).withMessage('Rental days must be at least 1'),
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
      query += ` AND i.rental_end_date <= $${paramCount}`;
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
      countQuery += ` AND i.rental_end_date <= $${countParamCount}`;
      countParams.push(end_date);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      invoices: result.rows,
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
        i.rental_end_date,
        i.total_amount,
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
      GROUP BY i.id, i.invoice_number, i.rental_start_date, i.rental_end_date, 
               i.total_amount, i.status, c.name
      ORDER BY i.rental_start_date ASC
    `;
    
    const result = await pool.query(query, queryParams);
    
    // Transform data into calendar events
    const events = result.rows.map(row => ({
      id: row.id,
      title: `${row.customer_name} - ${row.invoice_number}`,
      start: row.rental_start_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      end: row.rental_end_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      totalAmount: parseFloat(row.total_amount),
      status: row.status,
      customer: row.customer_name,
      equipment: row.equipment || [],
      invoiceNumber: row.invoice_number
    }));
    
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
      SELECT ii.*, e.name as equipment_name, e.description as equipment_description
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
      rental_end_date,
      rental_duration_days = 1,
      items,
      notes,
      tax_amount = 0
    } = req.body;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.daily_rate * item.quantity * item.rental_days);
    }, 0);
    
    const total_amount = subtotal + tax_amount;
    const invoice_number = generateInvoiceNumber();

    // Create invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (invoice_number, customer_id, rental_start_date, rental_end_date, 
                           rental_duration_days, subtotal, tax_amount, total_amount, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [invoice_number, customer_id, rental_start_date, rental_end_date, rental_duration_days,
        subtotal, tax_amount, total_amount, notes]);

    const invoice = invoiceResult.rows[0];

    // Create invoice items
    for (const item of items) {
      const line_total = item.daily_rate * item.quantity * item.rental_days;
      
      await client.query(`
        INSERT INTO invoice_items (invoice_id, equipment_id, quantity, daily_rate, rental_days, line_total)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [invoice.id, item.equipment_id, item.quantity, item.daily_rate, item.rental_days, line_total]);
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
      rental_start_date,
      rental_end_date,
      items,
      notes,
      tax_amount = 0,
      status
    } = req.body;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.daily_rate * item.quantity * item.rental_days);
    }, 0);
    
    const total_amount = subtotal + tax_amount;

    // Update invoice
    const invoiceResult = await client.query(`
      UPDATE invoices 
      SET customer_id = $1, rental_start_date = $2, rental_end_date = $3, 
          subtotal = $4, tax_amount = $5, total_amount = $6, notes = $7, 
          status = $8, updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [customer_id, rental_start_date, rental_end_date, subtotal, tax_amount, 
        total_amount, notes, status, id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Delete existing items and recreate
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

    // Create new invoice items
    for (const item of items) {
      const line_total = item.daily_rate * item.quantity * item.rental_days;
      
      await client.query(`
        INSERT INTO invoice_items (invoice_id, equipment_id, quantity, daily_rate, rental_days, line_total)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, item.equipment_id, item.quantity, item.daily_rate, item.rental_days, line_total]);
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
      SELECT ii.*, e.name as equipment_name, e.description as equipment_description
      FROM invoice_items ii
      LEFT JOIN equipment e ON ii.equipment_id = e.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.id
    `, [id]);

    const invoice = invoiceResult.rows[0];
    invoice.items = itemsResult.rows;

    const pdfBuffer = await pdfService.generateInvoicePDF(invoice);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
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
      rental_end_date,
      rental_duration_days = 1,
      items,
      notes,
      tax_amount = 0,
      template_config
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

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.daily_rate * item.quantity * item.rental_days);
    }, 0);
    
    const total_amount = subtotal + tax_amount;
    const invoice_number = generateInvoiceNumber();

    // Create invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (invoice_number, customer_id, rental_start_date, rental_end_date, 
                           rental_duration_days, subtotal, tax_amount, total_amount, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [invoice_number, customer_id, rental_start_date, rental_end_date, rental_duration_days,
        subtotal, tax_amount, total_amount, notes]);

    const invoice = invoiceResult.rows[0];

    // Create invoice items (and equipment if needed)
    for (const item of items) {
      const line_total = item.daily_rate * item.quantity * item.rental_days;
      
      let equipment_id = item.equipment_id;
      
      // If equipment_id not provided, create equipment from name
      if (!equipment_id && item.equipment_name) {
        const equipmentResult = await client.query(`
          INSERT INTO equipment (name, description, daily_rate, stock_quantity) 
          VALUES ($1, $2, $3, $4) 
          RETURNING id
        `, [
          item.equipment_name,
          item.description || '',
          item.daily_rate,
          item.quantity
        ]);
        equipment_id = equipmentResult.rows[0].id;
      }
      
      await client.query(`
        INSERT INTO invoice_items (invoice_id, equipment_id, quantity, daily_rate, rental_days, line_total)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [invoice.id, equipment_id, item.quantity, item.daily_rate, item.rental_days, line_total]);
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
      SELECT ii.*, e.name as equipment_name, e.description as equipment_description
      FROM invoice_items ii
      LEFT JOIN equipment e ON ii.equipment_id = e.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.id
    `, [invoice.id]);

    const completeInvoice = completeInvoiceResult.rows[0];
    completeInvoice.items = itemsResult.rows;

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

module.exports = router;