const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.SUPERADMIN_DB_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Update order status to paid
const updateOrderToPaid = async () => {
  try {
    console.log('💳 Updating Demo Order Status to Paid...\n');
    
    const orderId = 'ORD-010825-002';
    
    // Find and update the order
    const order = await Order.findOneAndUpdate(
      { orderId: orderId },
      { 
        paymentStatus: 'paid',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (order) {
      console.log('✅ Order updated successfully!');
      console.log(`   Order ID: ${order.orderId}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Total Profit: ₹${order.orderSummary.totalProfit}`);
      console.log(`   Total Revenue: ₹${order.orderSummary.totalOfferPrice}`);
      console.log(`   Items: ${order.orderSummary.totalItems}`);
      
      // Verify the order details
      console.log('\n📦 Order Items:');
      order.items.forEach((item, index) => {
        console.log(`   ${index + 1}. Product: ${item.productName}`);
        console.log(`      Quantity: ${item.quantity}`);
        console.log(`      Offer Price: ₹${item.offerPrice}`);
        console.log(`      Base Price: ₹${item.basePrice || 'Not set'}`);
        if (item.basePrice) {
          const itemProfit = (item.offerPrice - item.basePrice) * item.quantity;
          console.log(`      Item Profit: ₹${itemProfit}`);
        }
      });
      
      return order;
    } else {
      console.log(`❌ Order ${orderId} not found`);
      return null;
    }

  } catch (error) {
    console.error('❌ Error updating order:', error);
    return null;
  }
};

// Run the update
const runUpdate = async () => {
  await connectDB();
  const updatedOrder = await updateOrderToPaid();
  
  if (updatedOrder) {
    console.log('\n🎉 Order successfully marked as paid!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check analytics API: http://localhost:5001/api/analytics/profit');
    console.log('2. Open admin panel: http://localhost:5173/analytics');
    console.log('3. Verify profit data is now showing');
  }
  
  await mongoose.connection.close();
  process.exit(0);
};

// Execute if run directly
if (require.main === module) {
  runUpdate();
}

module.exports = { updateOrderToPaid };