# WhatsApp Invoice Generator - Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Git (for version control)

## Quick Setup

### 1. Database Setup

First, create a PostgreSQL database:

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database and user
CREATE DATABASE invoice_generator;
CREATE USER invoice_user WITH ENCRYPTED PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE invoice_generator TO invoice_user;
\q
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=invoice_generator
# DB_USER=invoice_user
# DB_PASSWORD=your_password_here
# OPENAI_API_KEY=your_openai_key_here (for later AI integration)

# Run database migrations and seed data
npm run migrate

# Start the backend server
npm run dev
```

The backend will start on http://localhost:3001

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on http://localhost:5173

## What's Working

✅ **Equipment Management**
- Add, edit, delete equipment items
- Categorize equipment 
- Set daily, weekly, monthly rates
- Stock quantity tracking
- Search and filter functionality

✅ **Invoice Management**
- View all invoices with filtering
- Manual invoice creation
- PDF generation with professional templates
- Multiple invoice statuses (draft, sent, paid, cancelled)

✅ **Upload Interface** 
- Drag & drop screenshot upload
- Mock AI processing simulation
- Extracted data preview
- File validation and processing status

✅ **Template System**
- Customizable invoice templates
- Company branding and colors
- Terms and conditions
- Tax rate configuration

✅ **Dashboard**
- Overview statistics
- Recent activity
- Quick actions

## Demo Data

The system comes pre-loaded with:
- 8 equipment categories
- 30+ sample equipment items with realistic pricing
- 2 invoice templates
- Mock customer data for testing

## File Structure

```
invoice-generator/
├── backend/           # Node.js/Express API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── config/    # Database & app config
│   │   └── templates/ # PDF templates
│   └── package.json
├── frontend/          # React application
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/     # Page components
│   │   ├── hooks/     # Custom React hooks
│   │   ├── services/  # API calls
│   │   └── utils/     # Helper functions
│   └── package.json
├── database/          # Schema and migrations
└── uploads/          # File storage
```

## Next Steps - AI Integration

When ready to add AI processing:

1. **Get OpenAI API Key**
   - Sign up at https://platform.openai.com
   - Create an API key with GPT-4 Vision access
   - Add to backend/.env file

2. **Implement AI Service**
   - Replace mock processing in `backend/src/routes/upload.js`
   - Add OpenAI Vision API calls in `backend/src/services/aiService.js`
   - Update extraction logic to match equipment database

3. **Test with Real Screenshots**
   - Upload actual WhatsApp conversation screenshots
   - Verify equipment matching accuracy
   - Adjust prompts and matching logic as needed

## Troubleshooting

**Database Connection Issues:**
- Check PostgreSQL is running: `sudo service postgresql status`
- Verify credentials in .env file
- Ensure database exists: `psql -U postgres -l`

**Port Already in Use:**
- Backend (3001): `lsof -ti:3001 | xargs kill -9`
- Frontend (5173): `lsof -ti:5173 | xargs kill -9`

**Missing Dependencies:**
- Delete node_modules and package-lock.json
- Run `npm install` again

## Security Notes

- Never commit .env files to version control
- Change default passwords in production
- Use environment variables for all sensitive data
- Consider adding authentication for multi-user scenarios

## Support

This is a complete working application ready for:
- Local development and testing
- Equipment inventory management
- Professional invoice generation
- Screenshot upload workflow (ready for AI integration)

The codebase is structured to easily add the OpenAI Vision API integration when you're ready to process real WhatsApp screenshots.