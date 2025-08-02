const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const router = express.Router();

// Validation middleware
const customerValidation = [
  body('name').notEmpty().trim().withMessage('Customer name is required'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number format'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
];

// Get all customers with optional search
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    let query = 'SELECT * FROM customers WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR phone ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ' ORDER BY name ASC';

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
    let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR phone ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      customers: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Search customers (for autocomplete)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const result = await pool.query(`
      SELECT id, name, phone, email 
      FROM customers 
      WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
      ORDER BY name ASC
      LIMIT 10
    `, [`%${q}%`]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer
router.post('/', customerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, email, address } = req.body;

    // Check for duplicate customer (by name and phone)
    if (phone) {
      const existingCustomer = await pool.query(
        'SELECT id FROM customers WHERE name = $1 AND phone = $2',
        [name, phone]
      );

      if (existingCustomer.rows.length > 0) {
        return res.status(400).json({ error: 'Customer with this name and phone already exists' });
      }
    }

    const result = await pool.query(`
      INSERT INTO customers (name, phone, email, address)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, phone, email, address]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', customerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, phone, email, address } = req.body;

    const result = await pool.query(`
      UPDATE customers 
      SET name = $1, phone = $2, email = $3, address = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, phone, email, address, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer has invoices
    const invoiceCheck = await pool.query(
      'SELECT COUNT(*) as count FROM invoices WHERE customer_id = $1',
      [id]
    );

    if (parseInt(invoiceCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with existing invoices' 
      });
    }

    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;