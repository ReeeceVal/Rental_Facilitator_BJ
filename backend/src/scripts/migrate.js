const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigrations() {
  try {
    console.log('Starting database migration...');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('Database schema created successfully');
    
    // Check if seed data should be loaded
    const seedPath = path.join(__dirname, '../../../database/seeds');
    if (fs.existsSync(seedPath)) {
      const seedFiles = fs.readdirSync(seedPath).filter(file => file.endsWith('.sql'));
      
      for (const file of seedFiles) {
        console.log(`Running seed file: ${file}`);
        const seedData = fs.readFileSync(path.join(seedPath, file), 'utf8');
        await pool.query(seedData);
      }
      console.log('Seed data loaded successfully');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;