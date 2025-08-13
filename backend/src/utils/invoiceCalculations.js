/**
 * Centralized invoice calculation utilities
 * Provides consistent calculation logic across frontend and backend
 */

/**
 * Safely parse a numeric value with proper fallback
 * @param {any} value - Value to parse
 * @param {number} fallback - Fallback value if parsing fails
 * @returns {number} Parsed number or fallback
 */
function safeParseFloat(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Calculate invoice totals from database values
 * This should be the single source of truth for all calculations
 * @param {Object} invoice - Invoice object from database
 * @returns {Object} Calculated totals
 */
function calculateInvoiceTotals(invoice) {
  // Parse all numeric values safely
  const equipmentSubtotal = safeParseFloat(invoice.equipment_subtotal);
  const transportAmount = safeParseFloat(invoice.transport_amount);
  const transportDiscount = safeParseFloat(invoice.transport_discount);
  const vatAmount = safeParseFloat(invoice.vat_amount);
  
  // Calculate services total from services array if provided
  let servicesTotal = 0;
  if (invoice.services && Array.isArray(invoice.services)) {
    servicesTotal = invoice.services.reduce((sum, service) => {
      const amount = safeParseFloat(service.amount);
      const discount = safeParseFloat(service.discount);
      return sum + (amount - discount);
    }, 0);
  }
  
  // Calculate invoice subtotal (before VAT)
  const invoiceSubtotal = equipmentSubtotal + transportAmount - transportDiscount + servicesTotal;
  
  // Calculate total due (subtotal + VAT)
  const totalDue = invoiceSubtotal + vatAmount;
  
  return {
    equipmentSubtotal,
    transportAmount,
    transportDiscount,
    servicesTotal,
    invoiceSubtotal,
    vatAmount,
    totalDue
  };
}

/**
 * Calculate service totals from services array
 * @param {Array} services - Array of service objects
 * @returns {number} Total services amount
 */
function calculateServicesTotal(services) {
  if (!services || !Array.isArray(services)) {
    return 0;
  }
  
  return services.reduce((sum, service) => {
    const amount = safeParseFloat(service.amount);
    const discount = safeParseFloat(service.discount);
    return sum + (amount - discount);
  }, 0);
}

/**
 * Validate that all invoice calculations are consistent
 * @param {Object} invoice - Invoice object
 * @returns {boolean} True if calculations are consistent
 */
function validateInvoiceCalculations(invoice) {
  const calculated = calculateInvoiceTotals(invoice);
  const storedTotalDue = safeParseFloat(invoice.total_due);
  
  // Allow small floating point differences (within 0.01)
  const difference = Math.abs(calculated.totalDue - storedTotalDue);
  return difference < 0.01;
}

module.exports = {
  safeParseFloat,
  calculateInvoiceTotals,
  calculateServicesTotal,
  validateInvoiceCalculations
};