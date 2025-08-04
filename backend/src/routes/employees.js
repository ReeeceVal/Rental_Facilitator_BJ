const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const router = express.Router();

const employeeValidation = [
  body('name').notEmpty().trim().withMessage('Employee name is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().trim(),
];

router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20, active_only = 'true' } = req.query;

    let query = 'SELECT * FROM employees WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    if (active_only === 'true') {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      queryParams.push(true);
    }

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ' ORDER BY name ASC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    let countQuery = 'SELECT COUNT(*) as total FROM employees WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (active_only === 'true') {
      countParamCount++;
      countQuery += ` AND is_active = $${countParamCount}`;
      countParams.push(true);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      employees: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const result = await pool.query(`
      SELECT id, name, email, phone 
      FROM employees 
      WHERE is_active = true AND (name ILIKE $1 OR email ILIKE $1)
      ORDER BY name ASC
      LIMIT 10
    `, [`%${q}%`]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching employees:', error);
    res.status(500).json({ error: 'Failed to search employees' });
  }
});

// Get unpaid commissions for all employees (payment summary)
router.get('/unpaid-commissions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.id,
        e.name as employee_name,
        e.email,
        SUM(iea.commission_amount) as total_owed,
        COUNT(iea.id) as invoice_count,
        MIN(i.rental_start_date) as oldest_invoice_date,
        MAX(i.rental_start_date) as newest_invoice_date
      FROM invoice_employee_assignments iea
      JOIN employees e ON iea.employee_id = e.id
      JOIN invoices i ON iea.invoice_id = i.id
      WHERE iea.commission_amount > 0
        AND iea.paid_at IS NULL
        AND i.status = 'paid'
      GROUP BY e.id, e.name, e.email
      ORDER BY total_owed DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching unpaid commissions:', error);
    res.status(500).json({ error: 'Failed to fetch unpaid commissions' });
  }
});

// Get paid commissions for all employees (grouped by payment batch)
router.get('/paid-commissions', async (req, res) => {
  try {
    const { start_date, end_date, employee_id, payment_batch_id } = req.query;
    
    let query = `
      SELECT 
        e.id as employee_id,
        e.name as employee_name,
        e.email,
        iea.payment_batch_id,
        iea.paid_at,
        iea.notes as payment_notes,
        SUM(iea.commission_amount) as total_paid,
        COUNT(iea.id) as invoice_count,
        MIN(i.rental_start_date) as oldest_invoice_date,
        MAX(i.rental_start_date) as newest_invoice_date,
        array_agg(
          json_build_object(
            'id', iea.id,
            'invoice_id', i.id,
            'invoice_number', i.invoice_number,
            'customer_name', c.name, 
            'rental_start_date', i.rental_start_date,
            'role', iea.role,
            'commission_amount', iea.commission_amount,
            'commission_percentage', iea.commission_percentage,
            'base_amount', iea.base_amount
          ) ORDER BY i.rental_start_date DESC
        ) as commission_details
      FROM invoice_employee_assignments iea
      JOIN employees e ON iea.employee_id = e.id
      JOIN invoices i ON iea.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE iea.commission_amount > 0
        AND iea.paid_at IS NOT NULL
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      query += ` AND iea.paid_at >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND iea.paid_at <= $${paramCount}`;
      queryParams.push(end_date);
    }

    if (employee_id) {
      paramCount++;
      query += ` AND e.id = $${paramCount}`;
      queryParams.push(employee_id);
    }

    if (payment_batch_id) {
      paramCount++;
      query += ` AND iea.payment_batch_id = $${paramCount}`;
      queryParams.push(payment_batch_id);
    }

    query += `
      GROUP BY e.id, e.name, e.email, iea.payment_batch_id, iea.paid_at, iea.notes
      ORDER BY iea.paid_at DESC, e.name ASC
    `;

    const result = await pool.query(query, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching paid commissions:', error);
    res.status(500).json({ error: 'Failed to fetch paid commissions' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

router.post('/', employeeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone } = req.body;

    const existingEmployee = await pool.query(
      'SELECT id FROM employees WHERE name = $1',
      [name]
    );

    if (existingEmployee.rows.length > 0) {
      return res.status(400).json({ error: 'Employee with this name already exists' });
    }

    const result = await pool.query(`
      INSERT INTO employees (name, email, phone)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, email, phone]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.put('/:id', employeeValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, email, phone, is_active = true } = req.body;

    const result = await pool.query(`
      UPDATE employees 
      SET name = $1, email = $2, phone = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, email, phone, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const assignmentCheck = await pool.query(
      'SELECT COUNT(*) as count FROM invoice_employee_assignments WHERE employee_id = $1',
      [id]
    );

    if (parseInt(assignmentCheck.rows[0].count) > 0) {
      const result = await pool.query(`
        UPDATE employees 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json({ message: 'Employee deactivated (has existing assignments)' });
    } else {
      const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json({ message: 'Employee deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

router.get('/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(`
      SELECT 
        iea.*,
        i.invoice_number,
        i.rental_start_date,
        i.rental_end_date,
        i.total_amount,
        i.status,
        c.name as customer_name
      FROM invoice_employee_assignments iea
      JOIN invoices i ON iea.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE iea.employee_id = $1
      ORDER BY i.rental_start_date DESC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM invoice_employee_assignments WHERE employee_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].total);

    res.json({
      assignments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching employee assignments:', error);
    res.status(500).json({ error: 'Failed to fetch employee assignments' });
  }
});

router.get('/:id/commissions', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        iea.*,
        i.invoice_number,
        i.rental_start_date,
        i.rental_end_date,
        c.name as customer_name
      FROM invoice_employee_assignments iea
      JOIN invoices i ON iea.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE iea.employee_id = $1
        AND iea.commission_amount IS NOT NULL
        AND iea.commission_amount > 0
    `;
    const queryParams = [id];
    let paramCount = 1;

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

    query += ' ORDER BY i.rental_start_date DESC';

    const result = await pool.query(query, queryParams);

    const totalCommission = result.rows.reduce((sum, row) => {
      return sum + parseFloat(row.commission_amount || 0);
    }, 0);

    res.json({
      commissions: result.rows,
      total_commission: totalCommission
    });
  } catch (error) {
    console.error('Error fetching employee commissions:', error);
    res.status(500).json({ error: 'Failed to fetch employee commissions' });
  }
});

// Mark employee commissions as paid
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_batch_id, notes } = req.body;

    const result = await pool.query(`
      UPDATE invoice_employee_assignments 
      SET paid_at = NOW(),
          payment_batch_id = $1,
          notes = $2
      WHERE employee_id = $3 
        AND paid_at IS NULL
        AND commission_amount > 0
      RETURNING *
    `, [payment_batch_id, notes, id]);

    const totalPaid = result.rows.reduce((sum, row) => {
      return sum + parseFloat(row.commission_amount || 0);
    }, 0);

    res.json({
      message: 'Commissions marked as paid',
      invoices_paid: result.rows.length,
      total_amount: totalPaid,
      assignments: result.rows
    });
  } catch (error) {
    console.error('Error marking commissions as paid:', error);
    res.status(500).json({ error: 'Failed to mark commissions as paid' });
  }
});

module.exports = router;