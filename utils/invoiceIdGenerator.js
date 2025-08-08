const Order = require('../models/Order');

/**
 * Generate proper invoice ID in format: ORD-DDMMYY-XXX
 * @param {Date} date - The date for the invoice (default: today)
 * @returns {Promise<string>} - The generated invoice ID
 */
const generateInvoiceId = async (date = new Date()) => {
  try {
    // Format date as DDMMYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const dateString = `${day}${month}${year}`;
    
    // Get start and end of the day for counting orders
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Count existing orders for this date
    const existingOrdersCount = await Order.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    // Generate next order number (001, 002, 003, etc.)
    const orderNumber = String(existingOrdersCount + 1).padStart(3, '0');
    
    // Combine to create final invoice ID
    const invoiceId = `ORD-${dateString}-${orderNumber}`;
    
    console.log(`Generated invoice ID: ${invoiceId} for date: ${date.toDateString()}`);
    return invoiceId;
    
  } catch (error) {
    console.error('Error generating invoice ID:', error);
    // Fallback to timestamp-based ID
    const timestamp = Date.now().toString().slice(-6);
    return `ORD-${timestamp}`;
  }
};

/**
 * Generate invoice number from order ID
 * @param {string} orderId - The order ID (e.g., ORD-210725-001)
 * @returns {string} - The invoice number (e.g., INV-210725-001)
 */
const generateInvoiceNumber = (orderId) => {
  if (orderId && orderId.startsWith('ORD-')) {
    return orderId.replace('ORD-', 'INV-');
  }
  
  // For old format order IDs, generate new format invoice number
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const dateString = `${day}${month}${year}`;
  
  // Use timestamp for unique number if old format
  const uniqueNumber = orderId ? orderId.slice(-3) : String(Date.now()).slice(-3);
  
  return `INV-${dateString}-${uniqueNumber}`;
};

/**
 * Parse invoice ID to get components
 * @param {string} invoiceId - The invoice ID (e.g., ORD-210725-001)
 * @returns {object} - Parsed components
 */
const parseInvoiceId = (invoiceId) => {
  const match = invoiceId.match(/^ORD-(\d{2})(\d{2})(\d{2})-(\d{3})$/);
  
  if (match) {
    const [, day, month, year, orderNum] = match;
    return {
      day: parseInt(day),
      month: parseInt(month),
      year: parseInt(year) + 2000, // Convert YY to YYYY
      orderNumber: parseInt(orderNum),
      isValid: true
    };
  }
  
  return {
    isValid: false,
    original: invoiceId
  };
};

module.exports = {
  generateInvoiceId,
  generateInvoiceNumber,
  parseInvoiceId
};