# WhatsApp Invoice Generator

A local web application for sound rental business that allows uploading WhatsApp conversation screenshots, extracting rental information using AI, and automatically generating invoices.

## Features

- Upload WhatsApp screenshots for automatic data extraction
- AI-powered equipment matching with local inventory
- Automatic invoice generation with PDF output
- Equipment management system
- Customer database management
- Invoice templates and customization

## Tech Stack

### Frontend
- React 18 with Vite
- Tailwind CSS
- React Router
- React Hook Form
- React Query

### Backend
- Node.js with Express.js
- PostgreSQL
- OpenAI Vision API (GPT-4o)
- Multer for file uploads
- Sharp for image processing

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key

### Installation

1. Clone the repository
2. Set up the database (see database/README.md)
3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```
4. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Project Structure

```
/invoice-generator
├── /frontend          # React frontend application
├── /backend           # Node.js Express backend
├── /database          # Database schema and migrations
├── /uploads           # Local file storage
└── README.md
```

## Development

This application is designed as a single-user local application with no authentication complexity. All data is stored locally on your device for privacy and simplicity.

## License

Private use only.