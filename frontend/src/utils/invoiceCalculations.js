/**
 * Frontend invoice calculation utilities
 * Mirrors backend calculation logic for consistency
 */

/**
 * Safely parse a numeric value with proper fallback
 * @param {any} value - Value to parse
 * @param {number} fallback - Fallback value if parsing fails
 * @returns {number} Parsed number or fallback
 */
export function safeParseFloat(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Calculate service total with proper NaN handling
 * @param {Object} service - Service object with amount and discount
 * @returns {number} Service total (amount - discount)
 */
export function calculateServiceTotal(service) {
  const amount = safeParseFloat(service.amount);
  const discount = safeParseFloat(service.discount);
  return amount - discount;
}

/**
 * Calculate total for all services
 * @param {Array} services - Array of service objects
 * @returns {number} Total of all services
 */
export function calculateServicesTotal(services) {
  if (!services || !Array.isArray(services)) {
    return 0;
  }
  
  return services.reduce((sum, service) => {
    return sum + calculateServiceTotal(service);
  }, 0);
}

/**
 * Calculate item total with proper NaN handling
 * @param {Object} item - Item object with quantity, rate, days, and discount
 * @returns {number} Item total
 */
export function calculateItemTotal(item) {
  const quantity = safeParseFloat(item.quantity, 1);
  const rate = safeParseFloat(item.rate);
  const days = safeParseFloat(item.days, 1);
  const discount = safeParseFloat(item.item_discount_amount);
  
  const subtotal = quantity * rate * days;
  return subtotal - discount;
}

/**
 * Calculate invoice totals for frontend display
 * @param {Object} formData - Form data object
 * @param {number} taxRate - Tax rate as decimal (e.g., 0.15 for 15%)
 * @returns {Object} Calculated totals
 */
export function calculateInvoiceTotals(formData, taxRate = 0) {
  // Equipment subtotal
  const equipmentSubtotal = (formData.items || []).reduce((sum, item) => {
    return sum + calculateItemTotal(item);
  }, 0);
  
  // Transport amounts
  const transportAmount = safeParseFloat(formData.transport_amount);
  const transportDiscount = safeParseFloat(formData.transport_discount);
  
  // Services total
  const servicesSubtotal = calculateServicesTotal(formData.services);
  
  // Invoice subtotal (before tax)
  const invoiceSubtotal = equipmentSubtotal + transportAmount - transportDiscount + servicesSubtotal;
  
  // Tax amount
  const taxAmount = invoiceSubtotal * safeParseFloat(taxRate);
  
  // Total due
  const totalDue = invoiceSubtotal + taxAmount;
  
  return {
    equipmentSubtotal,
    transportAmount,
    transportDiscount,
    servicesSubtotal,
    invoiceSubtotal,
    taxAmount,
    totalDue
  };
}