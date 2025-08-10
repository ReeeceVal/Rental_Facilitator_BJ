const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const router = express.Router();

// Validation middleware
const equipmentValidation = [
  body('name').notEmpty().trim().withMessage('Equipment name is required'),
  body('rate').isFloat({ min: 0 }).withMessage('Rate must be a positive number'),
  body('category_id').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
];

// Get all equipment with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      active = 'true', 
      search, 
      page = 1, 
      limit = 20 
    } = req.query;

    let query = `
      SELECT e.*, ec.name as category_name 
      FROM equipment e 
      LEFT JOIN equipment_categories ec ON e.category_id = ec.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (active !== 'all') {
      paramCount++;
      query += ` AND e.is_active = $${paramCount}`;
      queryParams.push(active === 'true');
    }

    if (category) {
      paramCount++;
      query += ` AND e.category_id = $${paramCount}`;
      queryParams.push(parseInt(category));
    }

    if (search) {
      paramCount++;
      query += ` AND (e.name ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY e.name ASC`;

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM equipment e 
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (active !== 'all') {
      countParamCount++;
      countQuery += ` AND e.is_active = $${countParamCount}`;
      countParams.push(active === 'true');
    }

    if (category) {
      countParamCount++;
      countQuery += ` AND e.category_id = $${countParamCount}`;
      countParams.push(parseInt(category));
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (e.name ILIKE $${countParamCount} OR e.description ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      equipment: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// Get equipment categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment_categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single equipment item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT e.*, ec.name as category_name 
      FROM equipment e 
      LEFT JOIN equipment_categories ec ON e.category_id = ec.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// Create new equipment
router.post('/', equipmentValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      description,
      rate,
      category_id,
      stock_quantity = 1,
      is_active = true
    } = req.body;

    const result = await pool.query(`
      INSERT INTO equipment (name, description, rate, category_id, stock_quantity, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, rate, category_id, stock_quantity, is_active]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating equipment:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    res.status(500).json({ error: 'Failed to create equipment' });
  }
});

// Update equipment
router.put('/:id', equipmentValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      name,
      description,
      rate,
      category_id,
      stock_quantity,
      is_active
    } = req.body;

    const result = await pool.query(`
      UPDATE equipment 
      SET name = $1, description = $2, rate = $3, 
          category_id = $4, stock_quantity = $5, 
          is_active = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [name, description, rate, category_id, stock_quantity, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating equipment:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

// Delete equipment (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if equipment is used in any invoices
    const invoiceCheck = await pool.query(
      'SELECT COUNT(*) as count FROM invoice_items WHERE equipment_id = $1',
      [id]
    );

    if (parseInt(invoiceCheck.rows[0].count) > 0) {
      // Soft delete instead of hard delete
      const result = await pool.query(`
        UPDATE equipment 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      return res.json({ 
        message: 'Equipment deactivated (used in existing invoices)', 
        equipment: result.rows[0] 
      });
    }

    // Hard delete if not used in invoices
    const result = await pool.query('DELETE FROM equipment WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
});

module.exports = router;