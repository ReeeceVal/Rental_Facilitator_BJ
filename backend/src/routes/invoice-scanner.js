const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const pool = require('../config/database');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Debug: Check if API key is loaded (remove this after testing)
console.log('OpenAI API Key loaded:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 7)}...` : 'NOT FOUND');

// Convert image buffer to base64 for OpenAI
function imageBufferToBase64(buffer, mimeType) {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

// Get all equipment from database for matching
async function getAllEquipment() {
  try {
    const result = await pool.query(`
      SELECT id, name, description, daily_rate
      FROM equipment 
      WHERE is_active = true
      ORDER BY name ASC
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return [];
  }
}

// Find closest matching equipment using fuzzy matching
function findClosestEquipment(extractedName, equipmentList) {
  if (!extractedName || !equipmentList.length) return null;

  const extractedLower = extractedName.toLowerCase().trim();
  let bestMatch = null;
  let bestScore = 0;

  for (const equipment of equipmentList) {
    const nameLower = equipment.name.toLowerCase();
    const descLower = (equipment.description || '').toLowerCase();
    
    // Exact match gets highest score
    if (nameLower === extractedLower) {
      return equipment;
    }
    
    // Calculate similarity scores
    let score = 0;
    
    // Check if extracted name is contained in equipment name
    if (nameLower.includes(extractedLower)) {
      score += 0.8;
    } else if (extractedLower.includes(nameLower)) {
      score += 0.7;
    }
    
    // Check if extracted name is contained in description
    if (descLower.includes(extractedLower)) {
      score += 0.5;
    }
    
    // Word-by-word matching
    const extractedWords = extractedLower.split(/\s+/);
    const nameWords = nameLower.split(/\s+/);
    const descWords = descLower.split(/\s+/);
    
    let wordMatches = 0;
    for (const word of extractedWords) {
      if (word.length < 3) continue; // Skip short words
      
      if (nameWords.some(nw => nw.includes(word) || word.includes(nw))) {
        wordMatches += 0.3;
      }
      if (descWords.some(dw => dw.includes(word) || word.includes(dw))) {
        wordMatches += 0.2;
      }
    }
    score += wordMatches;
    
    // Length similarity bonus (prefer similar length matches)
    const lengthDiff = Math.abs(nameLower.length - extractedLower.length);
    if (lengthDiff < 5) score += 0.1;
    
    if (score > bestScore && score > 0.3) { // Minimum threshold
      bestScore = score;
      bestMatch = equipment;
    }
  }
  
  return bestMatch;
}

// Parse invoice image using GPT-4o vision
async function parseInvoiceImage(imageBuffer, mimeType) {
  try {
    const base64Image = imageBufferToBase64(imageBuffer, mimeType);
    
    const prompt = `You are an AI assistant that extracts structured data from invoice/rental documents. 
Analyze this image and extract the following information, then return it as a JSON object:

Required fields:
- customer_name: string (customer or client name)
- phone_number: string (phone number if found)
- rental_start_date: string (start date in YYYY-MM-DD format if found)
- rental_duration_days: number (rental duration in days, e.g., 1, 2, 7, etc.)
- notes: string (any additional notes or special instructions)  
- equipment: array of objects with fields:
  - equipment_name: string (EXACT name/description of equipment as written)
  - quantity: number (quantity, default to 1 if not specified)

IMPORTANT for duration extraction:
- Look for phrases like "1 day", "2 days", "3 day rental", "week", "weekend"
- Convert to days: "1 week" = 7, "weekend" = 2, etc.
- If you find start and end dates instead, calculate the duration in days
- If no duration is found, default to 1 day (most common rental)

IMPORTANT for equipment extraction:
- Extract the EXACT equipment names as they appear in the document
- Do NOT modify or standardize the names
- Include ALL equipment items mentioned
- If quantity is mentioned (like "2x", "3 units", etc.), extract it accurately
- IGNORE all pricing information - do not extract prices, rates, or costs

Guidelines:
- If a field is not found, set it to null or empty string
- For dates, try to parse various formats and convert to YYYY-MM-DD
- For equipment, look for items, products, rentals, or any listed items
- Be flexible with field names (e.g., "client" = customer, "item" = equipment)
- Extract phone numbers in any format and clean them
- If multiple phone numbers, use the first one found
- Look carefully at tables, lists, and any structured data in the image
- Default rental_duration_days to 1 if uncertain
- Focus only on equipment names and quantities - pricing will be automatically handled

Return only valid JSON, no explanations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content.trim();
    
    // Extract JSON from markdown code blocks if present
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }
    
    // Try to parse JSON response
    try {
      const parsedData = JSON.parse(jsonContent);
      
      // Match extracted equipment to database equipment
      if (parsedData.equipment && Array.isArray(parsedData.equipment)) {
        const allEquipment = await getAllEquipment();
        
        parsedData.equipment = parsedData.equipment.map(item => {
          const matchedEquipment = findClosestEquipment(item.equipment_name, allEquipment);
          
          if (matchedEquipment) {
            // Always use database price for matched equipment
            const finalDailyRate = parseFloat(matchedEquipment.daily_rate);
            
            return {
              equipment_id: matchedEquipment.id,
              equipment_name: matchedEquipment.name,
              description: matchedEquipment.description,
              daily_rate: finalDailyRate,
              quantity: item.quantity || 1,
              extracted_name: item.equipment_name, // Keep original for reference
              price_source: 'database', // Always use database pricing for matched equipment
              match_confidence: 'matched'
            };
          } else {
            // No match found - return as unmatched for manual review with no pricing
            return {
              equipment_id: null,
              equipment_name: item.equipment_name,
              description: '',
              daily_rate: 0, // Default to 0 for unmatched equipment
              quantity: item.quantity || 1,
              extracted_name: item.equipment_name,
              price_source: 'default',
              match_confidence: 'no_match'
            };
          }
        });
      }
      
      return parsedData;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      throw new Error('Failed to parse extracted data');
    }
  } catch (error) {
    console.error('OpenAI parsing error:', error);
    throw new Error('Failed to parse invoice data');
  }
}

// Scan invoice image endpoint
router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log('Processing image with GPT-4o:', req.file.originalname, 'Size:', req.file.size);

    // Parse image directly using GPT-4o vision
    const parsedData = await parseInvoiceImage(req.file.buffer, req.file.mimetype);

    // Return structured data
    res.json({
      success: true,
      extractedData: parsedData,
      method: 'gpt-4o-vision'
    });

  } catch (error) {
    console.error('Invoice scanning error:', error);
    
    // Handle specific error types
    if (error.message.includes('OpenAI')) {
      return res.status(500).json({ error: 'AI processing error' });
    }

    res.status(500).json({ 
      error: error.message || 'Failed to process invoice image' 
    });
  }
});

// Alternative endpoint using Tesseract.js for free OCR (lower accuracy)
router.post('/scan-free', upload.single('image'), async (req, res) => {
  try {
    const Tesseract = require('tesseract.js');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('Processing image with Tesseract:', req.file.originalname);

    // Extract text using Tesseract
    const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng', {
      logger: m => console.log('Tesseract progress:', m)
    });

    // Simple regex-based parsing for free tier
    const extractedData = {
      customer_name: extractField(text, /(?:customer|client|name)[:\s]+([^\n\r]+)/i),
      phone_number: extractField(text, /(?:phone|tel|mobile)[:\s]*([0-9\-\(\)\s\.]{10,})/i),
      rental_start_date: extractDateField(text, /(?:start|from|begin)[:\s]*([0-9\/\-\.]{8,})/i),
      notes: '',
      equipment: extractEquipmentItems(text)
    };

    res.json({
      success: true,
      extractedData,
      rawText: text
    });

  } catch (error) {
    console.error('Free OCR error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process image with free OCR' 
    });
  }
});

// Helper functions for free OCR parsing
function extractField(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function extractDateField(text, regex) {
  const match = text.match(regex);
  if (!match) return '';
  
  const dateStr = match[1].trim();
  // Try to parse and format date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return dateStr;
}

function extractEquipmentItems(text) {
  const items = [];
  const lines = text.split('\n');
  
  // Look for lines that might contain equipment
  for (const line of lines) {
    // Simple heuristic: lines with numbers might be equipment
    if (/\d+/.test(line) && line.length > 5 && line.length < 100) {
      // Try to extract quantity and name
      const quantityMatch = line.match(/(\d+)\s*x?\s*(.+)/i);
      if (quantityMatch) {
        items.push({
          equipment_name: quantityMatch[2].trim(),
          quantity: parseInt(quantityMatch[1]) || 1
        });
      } else {
        items.push({
          equipment_name: line.trim(),
          quantity: 1
        });
      }
    }
  }
  
  return items.slice(0, 10); // Limit to 10 items
}

module.exports = router;