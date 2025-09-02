// Script: Generate a 100-item test invoice PDF to verify multi-page layout
// Usage: node scripts/generate-test-invoice-100.js

const fs = require('fs');
const path = require('path');
const { generateProfessionalInvoicePDF } = require('../utils/professionalPdfGenerator');

async function main() {
  const items = Array.from({ length: 100 }).map((_, i) => ({
    productSnapshot: {
      name: `Test Product ${i + 1}`,
      productCode: String(1000 + i),
      price: 50 + (i % 10),
      discountPercentage: 80,
    },
    quantity: 1 + (i % 3),
    price: 50 + (i % 10),
    discountPercentage: 80,
  }));

  const totals = items.reduce(
    (acc, it) => {
      const qty = it.quantity;
      const rate = it.price;
      const actual = qty * rate;
      const discount = (actual * (it.discountPercentage || 0)) / 100;
      const total = actual - discount;
      acc.quantity += qty;
      acc.actual += actual;
      acc.discount += discount;
      acc.total += total;
      return acc;
    },
    { quantity: 0, actual: 0, discount: 0, total: 0 }
  );

  const invoiceData = {
    docType: 'invoice',
    invoiceNumber: 'TEST-100',
    orderId: 'ORD-TEST-100',
    generatedAt: new Date(),
    customerDetails: {
      name: 'Test Customer',
      mobile: '9000000000',
      address: {
        street: '123 Test Street',
        landmark: 'Near Test Landmark',
        nearestTown: 'Test Town',
        district: 'Test District',
        state: 'Test State',
        pincode: '600001',
      },
    },
    items,
    orderSummary: {
      totalPrice: totals.actual,
      totalSavings: totals.discount,
      totalOfferPrice: totals.actual - totals.discount,
      packagingPrice: 0,
      totalWithPackaging: totals.total,
    },
    paymentStatus: 'paid',
    storeDetails: {},
  };

  try {
    const buffer = await generateProfessionalInvoicePDF(invoiceData);
    const outPath = path.resolve(__dirname, '../test-invoice-100-items.pdf');
    fs.writeFileSync(outPath, buffer);
    console.log('Generated:', outPath);
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  }
}

main();