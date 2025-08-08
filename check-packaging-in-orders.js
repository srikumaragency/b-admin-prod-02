const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.SUPERADMIN_DB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkPackagingInOrders = async () => {
  try {
    const Order = require('./models/Order');
    
    console.log('🔍 Checking packaging cost in orders...\n');
    
    // Get all orders with their order summary
    const orders = await Order.find()
      .select('orderId paymentStatus orderSummary items')
      .lean();
    
    console.log(`📊 Total orders found: ${orders.length}\n`);
    
    orders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.orderId}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      
      if (order.orderSummary) {
        const summary = order.orderSummary;
        console.log(`   📦 Order Summary:`);
        console.log(`      Total Price: ₹${summary.totalPrice || 'N/A'}`);
        console.log(`      Total Savings: ₹${summary.totalSavings || 'N/A'}`);
        console.log(`      Packaging Price: ₹${summary.packagingPrice || 'N/A'}`);
        console.log(`      Total With Packaging: ₹${summary.totalWithPackaging || 'N/A'}`);
        
        // Check if packaging is properly added
        const expectedTotal = (summary.totalPrice || 0) - (summary.totalSavings || 0) + (summary.packagingPrice || 0);
        const actualTotal = summary.totalWithPackaging || 0;
        
        console.log(`   🧮 Calculation Check:`);
        console.log(`      Expected Total: ₹${expectedTotal} (totalPrice - totalSavings + packagingPrice)`);
        console.log(`      Actual Total: ₹${actualTotal}`);
        console.log(`      ✅ Match: ${Math.abs(expectedTotal - actualTotal) < 0.01 ? 'YES' : 'NO'}`);
        
        if (Math.abs(expectedTotal - actualTotal) >= 0.01) {
          console.log(`      ⚠️  MISMATCH DETECTED!`);
        }
      } else {
        console.log(`   ❌ No order summary found`);
      }
      
      console.log(`   Items: ${order.items?.length || 0}`);
      console.log('   ─────────────────────────────────────────');
    });
    
  } catch (error) {
    console.error('❌ Error checking orders:', error);
  }
};

const main = async () => {
  await connectDB();
  await checkPackagingInOrders();
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});