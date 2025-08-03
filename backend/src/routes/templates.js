const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const router = express.Router();

// Validation middleware for template creation/update
const templateValidation = [
  body('name').notEmpty().withMessage('Template name is required'),
  body('template_data').isObject().withMessage('Template data must be an object'),
  body('template_data.companyName').notEmpty().withMessage('Company name is required'),
  body('template_data.headerColor').isHexColor().withMessage('Valid header color is required'),
  body('template_data.taxRate').isFloat({ min: 0, max: 1 }).withMessage('Tax rate must be between 0 and 1'),
  body('template_data.currency').notEmpty().withMessage('Currency is required'),
  body('template_data.invoiceNumberPrefix').notEmpty().withMessage('Invoice number prefix is required'),
];

// Get all templates
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM invoice_templates 
      ORDER BY is_default DESC, created_at ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM invoice_templates WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Get default template
router.get('/default/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM invoice_templates 
      WHERE is_default = true 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      // If no default template exists, return the first template
      const fallbackResult = await pool.query(`
        SELECT * FROM invoice_templates 
        ORDER BY created_at ASC 
        LIMIT 1
      `);
      
      if (fallbackResult.rows.length > 0) {
        res.json(fallbackResult.rows[0]);
      } else {
        res.status(404).json({ error: 'No templates found' });
      }
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error fetching default template:', error);
    res.status(500).json({ error: 'Failed to fetch default template' });
  }
});

// Create new template
router.post('/', templateValidation, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, template_data, is_default = false } = req.body;

    // If this template is being set as default, remove default from others
    if (is_default) {
      await client.query('UPDATE invoice_templates SET is_default = false');
    }

    const result = await client.query(`
      INSERT INTO invoice_templates (name, template_data, is_default)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, JSON.stringify(template_data), is_default]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  } finally {
    client.release();
  }
});

// Update template
router.put('/:id', templateValidation, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, template_data, is_default = false } = req.body;

    // Check if template exists
    const checkResult = await client.query('SELECT * FROM invoice_templates WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // If this template is being set as default, remove default from others
    if (is_default) {
      await client.query('UPDATE invoice_templates SET is_default = false WHERE id != $1', [id]);
    }

    const result = await client.query(`
      UPDATE invoice_templates 
      SET name = $1, template_data = $2, is_default = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [name, JSON.stringify(template_data), is_default, id]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  } finally {
    client.release();
  }
});

// Set template as default
router.put('/:id/default', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if template exists
    const checkResult = await client.query('SELECT * FROM invoice_templates WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Remove default from all templates
    await client.query('UPDATE invoice_templates SET is_default = false');
    
    // Set this template as default
    const result = await client.query(`
      UPDATE invoice_templates 
      SET is_default = true, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting default template:', error);
    res.status(500).json({ error: 'Failed to set default template' });
  } finally {
    client.release();
  }
});

// Duplicate template
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const originalResult = await pool.query('SELECT * FROM invoice_templates WHERE id = $1', [id]);
    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const original = originalResult.rows[0];
    const newName = `${original.name} (Copy)`;

    const result = await pool.query(`
      INSERT INTO invoice_templates (name, template_data, is_default)
      VALUES ($1, $2, false)
      RETURNING *
    `, [newName, original.template_data]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if template exists and if it's default
    const checkResult = await client.query('SELECT * FROM invoice_templates WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = checkResult.rows[0];
    
    // Don't allow deletion of default template if it's the only one
    if (template.is_default) {
      const countResult = await client.query('SELECT COUNT(*) as count FROM invoice_templates');
      const totalCount = parseInt(countResult.rows[0].count);
      
      if (totalCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only template' });
      }
      
      // If deleting default template, set another one as default
      await client.query(`
        UPDATE invoice_templates 
        SET is_default = true, updated_at = NOW()
        WHERE id != $1 
        ORDER BY created_at ASC 
        LIMIT 1
      `, [id]);
    }

    const result = await client.query('DELETE FROM invoice_templates WHERE id = $1 RETURNING *', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  } finally {
    client.release();
  }
});

module.exports = router;