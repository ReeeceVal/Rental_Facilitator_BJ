# WhatsApp Invoice Generator - Development Plan

## Project Overview

A local web application for sound rental business that allows uploading WhatsApp conversation screenshots, extracting rental information using AI, and automatically generating invoices by matching discussed equipment to a local database.

### Business Requirements
- **30+ equipment items** in inventory
- **Single-user local application** for personal use
- **Equipment management** functionality
- **AI-powered extraction** from screenshots of conversations
- **Automatic invoice generation** with PDF output
- **Future-ready architecture** for potential multi-user mobile expansion

## Architecture Strategy

### Current: Local Single-User Application
Build as a responsive web app that runs locally with no authentication complexity.

**Benefits:**
- Simple development and deployment
- No user management overhead
- data storage and control
- Fast iteration and testing

### Future Consideration: Multi-User Mobile Extension
Architecture designed to easily add authentication and multi-user functionality later if needed.

## Technology Stack

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** for responsive design
- **React Router** for navigation
- **React Hook Form** for form handling
- **React Query** for API state management

### Backend
- **Node.js** with Express.js
- **PostgreSQL** for local data persistence
- **Multer** for file uploads
- **Sharp** for image processing
- **No authentication** (single-user local app)

### AI Integration
- **GPT-4o** for single-step screenshot analysis --> must extract text from screenshot of whatsapp conversations. This being: rentee name, date of rental, phone number, equipment the person whats to rent.  The AI must be able to infer from the whatsapp chat what equipment they would like to rent and correlate that with what equipment is in the database. Once this is done, this information must populate the database entry for the invoice. which will store that invoice in the log and allow the admin to adjust the invoice entry as well as 'print to pdf' 
- **Direct API calls** (no agent frameworks needed)

### File Storage
- **Local filesystem** for MVP (migrate to Cloudinary later)

### Deployment
- **Local Development:** Run frontend and backend locally
- **Future Cloud Option:** Vercel/Netlify + Railway/Render if multi-user needed

## Database Schema (PostgreSQL)

```sql
-- Equipment Categories
CREATE TABLE equipment_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Inventory
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES equipment_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    daily_rate DECIMAL(10,2) NOT NULL,
    weekly_rate DECIMAL(10,2),
    monthly_rate DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    rental_start_date DATE NOT NULL,
    rental_end_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    equipment_id INTEGER REFERENCES equipment(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    daily_rate DECIMAL(10,2) NOT NULL,
    rental_days INTEGER NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Screenshot Processing History
CREATE TABLE screenshot_uploads (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255),
    file_path VARCHAR(500),
    extracted_text TEXT,
    parsed_data JSONB,
    invoice_id INTEGER REFERENCES invoices(id),
    processing_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Templates
CREATE TABLE invoice_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Project Structure

```
/invoice-generator
├── /frontend
│   ├── /src
│   │   ├── /components
│   │   │   ├── /equipment
│   │   │   │   ├── EquipmentManager.jsx
│   │   │   │   └── EquipmentForm.jsx
│   │   │   ├── /upload
│   │   │   │   ├── ImageUpload.jsx
│   │   │   │   └── ProcessingStatus.jsx
│   │   │   ├── /invoice
│   │   │   │   ├── InvoiceReview.jsx
│   │   │   │   ├── InvoiceList.jsx
│   │   │   │   └── InvoiceForm.jsx
│   │   │   ├── /shared
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Layout.jsx
│   │   │   │   └── LoadingSpinner.jsx
│   │   │   └── /ui
│   │   │       ├── Button.jsx
│   │   │       ├── Input.jsx
│   │   │       └── Modal.jsx
│   │   ├── /pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Equipment.jsx
│   │   │   ├── Upload.jsx
│   │   │   ├── Invoices.jsx
│   │   │   └── Templates.jsx
│   │   ├── /hooks
│   │   │   ├── useEquipment.js
│   │   │   ├── useInvoices.js
│   │   │   └── useUpload.js
│   │   ├── /services
│   │   │   └── api.js
│   │   └── /utils
│   │       ├── constants.js
│   │       └── helpers.js
│   ├── package.json
│   └── vite.config.js
├── /backend
│   ├── /src
│   │   ├── /routes
│   │   │   ├── equipment.js
│   │   │   ├── invoices.js
│   │   │   ├── upload.js
│   │   │   └── customers.js
│   │   ├── /middleware
│   │   │   ├── upload.js
│   │   │   └── validation.js
│   │   ├── /services
│   │   │   ├── aiService.js
│   │   │   ├── pdfService.js
│   │   │   └── databaseService.js
│   │   ├── /models
│   │   │   ├── Equipment.js
│   │   │   ├── Invoice.js
│   │   │   └── Customer.js
│   │   ├── /config
│   │   │   ├── database.js
│   │   │   └── config.js
│   │   └── app.js
│   ├── package.json
│   └── .env.example
├── /database
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
├── /uploads
│   └── screenshots/
├── README.md
└── DEVELOPMENT_PLAN.md
```

## Development Phases

### Phase 1: Foundation (Week 1-2)

#### Week 1: Backend Setup
- [ ] Initialize Node.js project with Express
- [ ] Set up local PostgreSQL database
- [ ] Create database schema and migrations
- [ ] Create equipment CRUD API endpoints
- [ ] Set up file upload handling

#### Week 2: Frontend Setup
- [ ] Initialize React project with Vite
- [ ] Set up Tailwind CSS and basic styling
- [ ] Create basic routing and navigation
- [ ] Build equipment management interface
- [ ] Implement responsive layout system

### Phase 2: Core Features (Week 3-4)

#### Week 3: AI Integration
- [ ] Integrate OpenAI Vision API
- [ ] Create screenshot upload endpoint
- [ ] Implement single-step AI processing workflow
- [ ] Build equipment matching logic
- [ ] Create invoice data extraction service

#### Week 4: Invoice System
- [ ] Design invoice creation workflow
- [ ] Implement PDF generation
- [ ] Create customer management system
- [ ] Build invoice review and editing interface
- [ ] Add invoice history and search

### Phase 3: Polish & Local Setup (Week 5)

- [ ] Add comprehensive error handling
- [ ] Implement proper loading states
- [ ] Optimize for local development workflow
- [ ] Add data backup/restore functionality
- [ ] Create equipment seeding for initial setup
- [ ] Write documentation and user guides

## AI Integration Workflow

### Single API Call Process

```javascript
// Complete workflow in one OpenAI Vision API call
const processScreenshot = async (imageFile, equipmentList) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `Analyze this WhatsApp screenshot and extract rental information. 
          Match equipment to our inventory:

          EQUIPMENT INVENTORY:
          ${equipmentList.map(item => 
            `- ${item.name} (ID: ${item.id}) - $${item.daily_rate}/day`
          ).join('\n')}

          Extract and return JSON:
          {
            "customer_name": "",
            "phone_number": "",
            "rental_start_date": "YYYY-MM-DD",
            "rental_end_date": "YYYY-MM-DD",
            "equipment": [
              {
                "equipment_id": 123,
                "equipment_name": "Equipment Name",
                "quantity": 1,
                "confidence": "high|medium|low"
              }
            ],
            "notes": "special requirements or context",
            "conversation_summary": "brief summary of the conversation"
          }`
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`
          }
        }
      ]
    }],
    max_tokens: 1000,
    temperature: 0.1
  });

  return JSON.parse(response.choices[0].message.content);
};
```

### Error Handling Strategy

1. **AI Processing Failures**: Manual fallback form
2. **Low Confidence Matches**: Present options for manual selection
3. **Missing Information**: Prompt user for required fields
4. **Invalid Dates**: Date picker for corrections

## Local Application Features

### Core Functionality
- Equipment CRUD operations
- Screenshot upload and AI processing
- Invoice creation and management
- Customer database
- PDF generation
- Invoice templates

### Future Multi-User Considerations
The architecture is designed to easily add:
- User authentication system
- Role-based permissions
- Multi-user database schema
- Cloud deployment options
- Mobile PWA separation

### Local Development Benefits
- No authentication complexity
- Direct database access
- Simple backup/restore
- Fast iteration
- No deployment concerns

## Local Setup Strategy

### Development Environment
```
Local Development:
- Local PostgreSQL database
- Local file storage for screenshots
- OpenAI API key in .env
- Frontend and backend running locally
```

### Running the Application
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend  
cd frontend
npm install
npm run dev
```

### Data Management
- PostgreSQL database with pg_dump for backups
- Local uploads folder for screenshots
- JSON export/import for equipment data
- Database backup/restore via PostgreSQL tools

## Cost Estimates

### Development Costs
- **Development Time**: 4-5 weeks (simplified single-user version)
- **Freelancer Cost**: $8,000-15,000
- **In-house Development**: Time investment

### Operating Costs
- **OpenAI API**: $20-100/month (based on usage)
- **No hosting costs** (local application)
- **No database costs** (local PostgreSQL)
- **No file storage costs** (local filesystem)

### Usage Cost Breakdown
- **Per Screenshot Analysis**: ~$0.01-0.02
- **200 screenshots/month**: ~$2-5
- **PDF Generation**: Free (local generation)
- **Total Monthly Cost**: ~$20-100 (just AI API)

## Security Considerations

### Data Protection
- Input validation and sanitization
- File type restrictions for uploads
- Rate limiting on API endpoints
- Local data storage (no cloud exposure)

### Privacy
- All data stored locally on your device
- No user accounts or authentication complexity
- Customer data never leaves your machine
- OpenAI API only receives screenshot images
- Local file system permissions protect data

## Success Metrics

### MVP Success Criteria
- Upload screenshots and get accurate equipment matching (>80% accuracy)
- Invoice generation time reduced from 30+ minutes to <5 minutes
- All 30+ equipment items properly recognized by AI
- Responsive interface works well on desktop and mobile browsers
- Easy equipment management and template customization

### Future Enhancement Goals
- Multi-user authentication system
- Separate mobile PWA for staff
- Advanced analytics and reporting
- Integration with accounting software
- Cloud deployment options

## Next Steps

1. **Review and approve this plan**
2. **Set up local development environment**
3. **Create initial project structure**
4. **Initialize local PostgreSQL database**
5. **Begin Phase 1 development**

---

*This plan focuses on creating a simple, local single-user application that can be extended to multi-user cloud deployment later if needed.*