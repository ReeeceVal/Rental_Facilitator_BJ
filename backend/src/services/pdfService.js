const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { formatCurrency, formatDate } = require('../utils/helpers');

// Register Handlebars helpers
handlebars.registerHelper('formatCurrency', formatCurrency);
handlebars.registerHelper('formatDate', formatDate);
handlebars.registerHelper('multiply', (a, b) => a * b);
handlebars.registerHelper('add', (a, b) => a + b);
handlebars.registerHelper('subtract', (a, b) => a - b);
handlebars.registerHelper('eq', (a, b) => a === b);
handlebars.registerHelper('gt', (a, b) => a > b);
handlebars.registerHelper('or', (...args) => {
  // Remove the last argument (Handlebars options object)
  const values = args.slice(0, -1);
  return values.some(val => val);
});
handlebars.registerHelper('invoiceSubtotal', (subtotal, transport_amount, transport_discount, services) => {
  const serviceTotal = services ? services.reduce((sum, service) => {
    const amount = parseFloat(service.amount) || 0;
    const discount = parseFloat(service.discount) || 0;
    return sum + (amount - discount);
  }, 0) : 0;
  
  return parseFloat(subtotal || 0) + parseFloat(transport_amount || 0) - parseFloat(transport_discount || 0) + serviceTotal;
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

  async generateInvoiceHTML(invoiceData, templateConfig = null, isPDF = false) {
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
      
      // Modify template config for PDF context
      let finalTemplateConfig = { ...(templateConfig || { headerColor: '#2563eb' }) };
      if (isPDF && finalTemplateConfig.logoUrl) {
        // For PDF generation, convert image to base64 to avoid CORS issues
        try {
          const logoPath = path.join(__dirname, '../..', finalTemplateConfig.logoUrl);
          const logoBuffer = await fs.readFile(logoPath);
          const logoMimeType = finalTemplateConfig.logoUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
          finalTemplateConfig.logoUrl = `data:${logoMimeType};base64,${logoBuffer.toString('base64')}`;
        } catch (error) {
          console.error('Failed to load logo for PDF:', error);
          finalTemplateConfig.logoUrl = null; // Remove logo if it can't be loaded
        }
      }
      
      // Prepare data for template
      const templateData = {
        ...invoiceData,
        company: companyInfo,
        templateConfig: finalTemplateConfig,
        formatCurrency,
        formatDate,
        generatedDate: new Date().toISOString()
      };

      // Debug: Log template config to see logo URL
      console.log('Template config in PDF service:', JSON.stringify(finalTemplateConfig, null, 2));

      // Generate and return HTML
      return template(templateData);
    } catch (error) {
      console.error('Error generating HTML:', error);
      throw new Error('Failed to generate HTML');
    }
  }

  async generateInvoicePDF(invoiceData, templateConfig = null) {
    try {
      // Generate HTML using the shared method with PDF flag
      const html = await this.generateInvoiceHTML(invoiceData, templateConfig, true);

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
      
      // Enable request interception for debugging
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        console.log('PDF Puppeteer request:', request.url());
        request.continue();
      });
      
      page.on('requestfailed', (request) => {
        console.log('PDF Puppeteer request failed:', request.url(), request.failure()?.errorText);
      });
      
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