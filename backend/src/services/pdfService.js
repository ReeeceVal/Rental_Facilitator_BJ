const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { formatCurrency, formatDate } = require('../utils/helpers');

// Register Handlebars helpers
handlebars.registerHelper('formatCurrency', formatCurrency);
handlebars.registerHelper('formatDate', formatDate);
handlebars.registerHelper('multiply', (a, b) => a * b);
handlebars.registerHelper('eq', (a, b) => a === b);
handlebars.registerHelper('or', (...args) => {
  // Remove the last argument (Handlebars options object)
  const values = args.slice(0, -1);
  return values.some(val => val);
});

class PDFService {
  constructor() {
    this.templateCache = new Map();
  }

  async getTemplate(templateName) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    const templatePath = path.join(__dirname, '../templates', `${templateName}.hbs`);
    const templateSource = await fs.readFile(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    
    this.templateCache.set(templateName, template);
    return template;
  }

  async generateInvoiceHTML(invoiceData, templateConfig = null) {
    try {
      // Get the template
      const template = await this.getTemplate('invoice');
      
      // Use provided template config or fallback to default
      const companyInfo = templateConfig ? {
        name: templateConfig.companyName || 'Sound Rental Pro',
        address: templateConfig.companyAddress || '123 Music Street\nAudio City, AC 12345',
        phone: templateConfig.companyPhone || '(555) 123-4567',
        email: templateConfig.companyEmail || 'info@soundrentalpro.com'
      } : {
        name: 'Sound Rental Pro',
        address: '123 Music Street\nAudio City, AC 12345',
        phone: '(555) 123-4567',
        email: 'info@soundrentalpro.com'
      };
      
      // Prepare data for template
      const templateData = {
        ...invoiceData,
        company: companyInfo,
        templateConfig: templateConfig || { headerColor: '#2563eb' },
        formatCurrency,
        formatDate,
        generatedDate: new Date().toISOString()
      };

      // Generate and return HTML
      return template(templateData);
    } catch (error) {
      console.error('Error generating HTML:', error);
      throw new Error('Failed to generate HTML');
    }
  }

  async generateInvoicePDF(invoiceData, templateConfig = null) {
    try {
      // Generate HTML using the shared method
      const html = await this.generateInvoiceHTML(invoiceData, templateConfig);

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set content and wait for it to load
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        }
      });

      await browser.close();

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }
}

module.exports = new PDFService();