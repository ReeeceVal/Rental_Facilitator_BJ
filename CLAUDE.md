# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a WhatsApp Invoice Generator for a sound rental business. It's a full-stack web application that allows uploading WhatsApp conversation screenshots, extracting rental information using AI, and automatically generating invoices. The system is designed as a single-user local application with no authentication complexity.

## Architecture

### Tech Stack
- **Frontend**: React 18 with Vite, Tailwind CSS, React Router, React Query
- **Backend**: Node.js with Express.js, PostgreSQL, OpenAI Vision API (GPT-4o)
- **Database**: PostgreSQL with custom schema and migrations system
- **File Processing**: Multer for uploads, Sharp for image processing, Puppeteer for PDF generation

### Core Structure
```
/frontend (React SPA) ←→ /backend (Express API) ←→ PostgreSQL Database
      ↓                           ↓
   Vite Dev Server         File Storage (/uploads)
```

## Development Commands

### Backend Commands
```bash
cd backend
npm run dev          # Start development server with nodemon
npm start            # Production server
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
npm test             # Run Jest tests
```

### Frontend Commands
```bash
cd frontend  
npm run dev          # Start Vite development server (port 5173)
npm run build        # Build for production
npm run lint         # Run ESLint
npm preview          # Preview production build
```

### Database Operations
Database credentials: `PGPASSWORD='Kromrivier2025$' psql -h localhost -U invoice_user -d invoice_generator`

Key database management:
- Schema: `/database/schema.sql`
- Migrations: `/database/migrations/` (manually executed via psql)
- Seeds: `/database/seeds/` (equipment categories, sample data, templates)

## Key Architecture Components

### Database Design
- **Equipment Management**: `equipment` and `equipment_categories` tables with daily rates and inventory tracking
- **Invoice System**: `invoices`, `invoice_items`, and `invoice_services` tables with flexible service management
- **Employee & Commission**: `employees` and `invoice_employee_assignments` with automatic commission calculations
- **Template System**: `invoice_templates` with JSONB configuration for customizable PDF generation

### Invoice Services Architecture
Recently refactored from single `service_fee`/`service_discount` columns to a flexible `invoice_services` table allowing multiple custom services per invoice:
- Frontend: Services stored as array with `name`, `amount`, `discount` properties
- Backend: Expects services with `service_name` or `name`, maps to database `service_name` column
- API: Returns services with `service_name` property from `invoice_services` table

### PDF Generation System
Uses Handlebars templates with Puppeteer for professional invoice PDFs:
- Template: `/backend/src/templates/invoice.hbs`
- Service: `/backend/src/services/pdfService.js`
- Supports dynamic company branding, tax rates, and custom terms

### AI Integration (OpenAI)
Configured for WhatsApp screenshot processing but with mock implementation:
- Route: `/backend/src/routes/invoice-scanner.js`  
- Expected to extract customer info, rental dates, and equipment lists
- Equipment matching against local inventory database

## Common Development Patterns

### API Structure
- RESTful routes in `/backend/src/routes/`
- Express validation middleware using `express-validator`
- Error handling with try/catch and proper HTTP status codes
- CORS enabled for local development (localhost:5173)

### Frontend Patterns
- React Query for server state management (see `/frontend/src/hooks/`)
- Custom hooks for each API resource (useInvoices, useEquipment, etc.)
- Tailwind CSS with custom utility classes
- Form handling with controlled components and validation

### Database Patterns
- All tables include `created_at`/`updated_at` timestamps
- Foreign key constraints with CASCADE deletes for related data
- Comprehensive indexing for performance
- JSONB columns for flexible configuration (templates, extracted data)

## Important File Locations

### Configuration
- Backend config: `/backend/src/config/config.js`
- Database config: Environment variables in `/backend/.env`
- Frontend proxy: Vite config routes `/api` to backend

### Core Business Logic  
- Invoice creation: `/backend/src/routes/invoices.js:322` (POST) and `:434` (PUT)
- Equipment management: `/backend/src/routes/equipment.js`
- PDF generation: `/backend/src/services/pdfService.js`
- Commission calculations: `/backend/src/routes/invoices.js:12-58`

### Frontend Components
- Invoice form: `/frontend/src/components/invoice/InvoiceForm.jsx`
- Equipment management: `/frontend/src/components/equipment/EquipmentManager.jsx`
- PDF preview: `/frontend/src/components/invoice/InvoicePreview.jsx`

## Testing & Quality

### Database Testing Commands
```bash
# Check invoice services after editing
curl -s http://localhost:3001/api/invoices/[ID] | jq '.services'

# Verify database structure  
PGPASSWORD='Kromrivier2025$' psql -h localhost -U invoice_user -d invoice_generator -c "\d invoice_services"
```

### Known Issues & Solutions
- **Port conflicts**: Backend (3001), Frontend (5173) - use `lsof -ti:PORT | xargs kill -9`
- **Service editing bug**: Services now load from `invoice_services` table, not legacy `service_fee` columns
- **PDF rendering**: Requires Puppeteer browser install, handled in `/backend/src/services/pdfService.js`

## Environment Setup Requirements

1. **PostgreSQL 14+** with database `invoice_generator` and user `invoice_user`
2. **Node.js 18+** for both frontend and backend
3. **OpenAI API Key** in `/backend/.env` (optional, has mock implementation)
4. **File permissions** for `/uploads` directory (logos, screenshots)

The application includes comprehensive seed data and is ready for local development without external dependencies beyond the database.