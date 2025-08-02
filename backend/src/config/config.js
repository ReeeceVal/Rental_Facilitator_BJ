require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'invoice_generator',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  upload: {
    path: process.env.UPLOAD_PATH || '../uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  },
  invoice: {
    defaultTaxRate: parseFloat(process.env.DEFAULT_TAX_RATE) || 0.08,
  }
};