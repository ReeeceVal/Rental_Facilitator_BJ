const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const pool = require('../config/database');
const config = require('../config/config');
const { sanitizeFilename } = require('../utils/helpers');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/screenshots'));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = sanitizeFilename(file.originalname);
    cb(null, `screenshot-${timestamp}-${sanitized}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Upload and process screenshot
router.post('/screenshot', upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { filename, originalname, mimetype, size, path: filePath } = req.file;

    // Process image with Sharp (optimize/resize if needed)
    const processedImagePath = path.join(path.dirname(filePath), `processed-${filename}`);
    
    await sharp(filePath)
      .resize(1920, 1080, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toFile(processedImagePath);

    // Save upload record to database
    const uploadResult = await pool.query(`
      INSERT INTO screenshot_uploads (original_filename, file_path, processing_status)
      VALUES ($1, $2, 'pending')
      RETURNING *
    `, [originalname, processedImagePath]);

    const uploadRecord = uploadResult.rows[0];

    // TODO: This is where AI processing would happen
    // For now, we'll return a mock response structure
    
    // Simulate processing delay
    setTimeout(async () => {
      try {
        // Mock extracted data - this would come from OpenAI Vision API
        const mockExtractedData = {
          customer_name: "Demo Customer",
          phone_number: "+1 (555) 123-4567",
          rental_start_date: new Date().toISOString().split('T')[0],
          rental_end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          equipment: [
            {
              equipment_id: 1,
              equipment_name: "JBL EON615 15\" Powered Speaker",
              quantity: 2,
              confidence: "high"
            }
          ],
          notes: "Demo processing - AI integration pending",
          conversation_summary: "Mock conversation summary for demonstration"
        };

        // Update database with processed results
        await pool.query(`
          UPDATE screenshot_uploads 
          SET processing_status = 'completed', 
              parsed_data = $1, 
              extracted_text = $2
          WHERE id = $3
        `, [
          JSON.stringify(mockExtractedData),
          'Mock extracted text from image',
          uploadRecord.id
        ]);

      } catch (error) {
        console.error('Error processing screenshot:', error);
        await pool.query(`
          UPDATE screenshot_uploads 
          SET processing_status = 'failed', 
              error_message = $1
          WHERE id = $2
        `, [error.message, uploadRecord.id]);
      }
    }, 3000); // 3 second delay to simulate AI processing

    // Return immediate response
    res.status(201).json({
      id: uploadRecord.id,
      status: 'uploaded',
      message: 'Screenshot uploaded successfully. Processing will begin shortly.',
      file_info: {
        original_name: originalname,
        size: size,
        type: mimetype
      }
    });

  } catch (error) {
    console.error('Error uploading screenshot:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
});

// Get processing status
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT id, original_filename, processing_status, parsed_data, error_message, created_at
      FROM screenshot_uploads 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const upload = result.rows[0];
    
    res.json({
      id: upload.id,
      status: upload.processing_status,
      filename: upload.original_filename,
      created_at: upload.created_at,
      error: upload.error_message,
      extracted_data: upload.parsed_data
    });

  } catch (error) {
    console.error('Error fetching upload status:', error);
    res.status(500).json({ error: 'Failed to fetch upload status' });
  }
});

// Get upload history
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(`
      SELECT su.id, su.original_filename, su.processing_status, su.created_at,
             i.id as invoice_id, i.invoice_number
      FROM screenshot_uploads su
      LEFT JOIN invoices i ON su.invoice_id = i.id
      ORDER BY su.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM screenshot_uploads');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      uploads: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching upload history:', error);
    res.status(500).json({ error: 'Failed to fetch upload history' });
  }
});

// Delete upload
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM screenshot_uploads WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // TODO: Also delete the physical file
    // const fs = require('fs').promises;
    // await fs.unlink(result.rows[0].file_path);

    res.json({ message: 'Upload deleted successfully' });
  } catch (error) {
    console.error('Error deleting upload:', error);
    res.status(500).json({ error: 'Failed to delete upload' });
  }
});

module.exports = router;