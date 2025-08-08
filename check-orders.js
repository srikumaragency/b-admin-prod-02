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

const checkOrders = async () => {
  try {
    const Order = require('./models/Order');
    
    console.log('🔍 Checking orders in database...\n');
    
    // Check total orders
    const totalOrders = await Order.countDocuments();
    console.log(`📊 Total orders: ${totalOrders}`);
    
    // Check paid orders
    const paidOrders = await Order.countDocuments({ paymentStatus: 'paid' });
    console.log(`💳 Paid orders: ${paidOrders}`);
    
    // Check pending orders
    const pendingOrders = await Order.countDocuments({ paymentStatus: 'pending' });
    console.log(`⏳ Pending orders: ${pendingOrders}`);
    
    // Check failed orders
    const failedOrders = await Order.countDocuments({ paymentStatus: 'failed' });
    console.log(`❌ Failed orders: ${failedOrders}`);
    
    // Get sample orders
    const sampleOrders = await Order.find().limit(3).select('orderId paymentStatus orderStatus createdAt items').lean();
    
    console.log('\n📋 Sample orders:');
    sampleOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.orderId}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Order Status: ${order.orderStatus}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Items: ${order.items?.length || 0}`);
      console.log('   ─────────────────');
    });
    
    if (paidOrders === 0) {
      console.log('\n💡 No paid orders found. To test the profit system:');
      console.log('   1. Create some test orders');
      console.log('   2. Mark them as paid using the admin panel');
      console.log('   3. The profit will be calculated automatically');
    }
    
  } catch (error) {
    console.error('❌ Error checking orders:', error);
  }
};

const main = async () => {
  await connectDB();
  await checkOrders();
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});