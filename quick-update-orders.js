const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.SUPERADMIN_DB_URI;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Update orders to paid status
const updateOrdersToPaid = async () => {
  try {
    console.log('💳 Updating Demo Orders to Paid Status...\n');
    
    // Update both demo orders to paid
    const result = await Order.updateMany(
      { 
        orderId: { $in: ['ORD-010825-001', 'ORD-010825-002'] },
        paymentStatus: 'pending'
      },
      { 
        $set: { 
          paymentStatus: 'paid',
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} orders to paid status`);
    
    // Verify the updates
    const updatedOrders = await Order.find({
      orderId: { $in: ['ORD-010825-001', 'ORD-010825-002'] }
    }).select('orderId paymentStatus orderSummary.totalProfit orderSummary.totalOfferPrice createdAt');
    
    console.log('\n📋 Updated Orders:');
    let totalProfit = 0;
    let totalRevenue = 0;
    
    updatedOrders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.orderId}`);
      console.log(`   Status: ${order.paymentStatus}`);
      console.log(`   Profit: ₹${order.orderSummary.totalProfit}`);
      console.log(`   Revenue: ₹${order.orderSummary.totalOfferPrice}`);
      console.log(`   Date: ${order.createdAt.toDateString()}`);
      
      totalProfit += order.orderSummary.totalProfit;
      totalRevenue += order.orderSummary.totalOfferPrice;
    });
    
    console.log('\n📊 Expected Analytics:');
    console.log(`Total Profit: ₹${totalProfit}`);
    console.log(`Total Revenue: ₹${totalRevenue}`);
    console.log(`Total Orders: ${updatedOrders.length}`);
    
    return updatedOrders;
    
  } catch (error) {
    console.error('❌ Error updating orders:', error.message);
    return null;
  }
};

// Test analytics query directly
const testAnalyticsQuery = async () => {
  try {
    console.log('\n🧪 Testing Analytics Query...');
    
    // Test the same query our analytics API uses
    const result = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          totalProfit: { $sum: '$orderSummary.totalProfit' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$orderSummary.totalOfferPrice' }
        }
      }
    ]).maxTimeMS(10000);
    
    if (result.length > 0) {
      const stats = result[0];
      console.log('✅ Analytics Query Results:');
      console.log(`   Total Profit: ₹${stats.totalProfit}`);
      console.log(`   Total Orders: ${stats.totalOrders}`);
      console.log(`   Total Revenue: ₹${stats.totalRevenue}`);
    } else {
      console.log('⚠️ No paid orders found in analytics query');
    }
    
    // Test today's query
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const todayResult = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startOfToday, $lte: endOfToday }
        }
      },
      {
        $group: {
          _id: null,
          todayProfit: { $sum: '$orderSummary.totalProfit' },
          todayOrders: { $sum: 1 },
          todayRevenue: { $sum: '$orderSummary.totalOfferPrice' }
        }
      }
    ]).maxTimeMS(10000);
    
    if (todayResult.length > 0) {
      const todayStats = todayResult[0];
      console.log('\n📅 Today\'s Analytics:');
      console.log(`   Today's Profit: ₹${todayStats.todayProfit}`);
      console.log(`   Today's Orders: ${todayStats.todayOrders}`);
      console.log(`   Today's Revenue: ₹${todayStats.todayRevenue}`);
    } else {
      console.log('\n📅 No orders found for today');
    }
    
  } catch (error) {
    console.error('❌ Analytics query failed:', error.message);
  }
};

// Run the update and test
const runUpdate = async () => {
  await connectDB();
  const orders = await updateOrdersToPaid();
  
  if (orders && orders.length > 0) {
    await testAnalyticsQuery();
    
    console.log('\n🎉 Orders Updated Successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test analytics API: http://localhost:5001/api/analytics/profit');
    console.log('2. Open admin panel: http://localhost:5173/analytics');
    console.log('3. Verify profit data is now showing');
  }
  
  await mongoose.connection.close();
  process.exit(0);
};

runUpdate();