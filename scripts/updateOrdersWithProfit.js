const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.SUPERADMIN_DB_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Update existing orders with profit calculation
const updateOrdersWithProfit = async () => {
  try {
    console.log('🔄 Starting profit calculation for existing orders...');
    
    // Get all orders that don't have totalProfit or have totalProfit = 0
    const ordersToUpdate = await Order.find({
      $or: [
        { 'orderSummary.totalProfit': { $exists: false } },
        { 'orderSummary.totalProfit': 0 }
      ]
    }).populate('items.productId');

    console.log(`📊 Found ${ordersToUpdate.length} orders to update`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const order of ordersToUpdate) {
      try {
        let totalProfit = 0;

        // Calculate profit for each item in the order
        for (const item of order.items) {
          if (item.productId) {
            const product = item.productId;
            const quantity = item.quantity;
            const offerPrice = item.offerPrice;
            
            // Try to get basePrice from admin product model
            let basePrice = null;
            try {
              const adminProduct = await Product.findOne({ 
                $or: [
                  { _id: product._id },
                  { productCode: product.productCode }
                ]
              });
              
              if (adminProduct && adminProduct.basePrice) {
                basePrice = adminProduct.basePrice;
              }
            } catch (err) {
              console.log(`⚠️  Could not find admin product for ${product.productCode || product._id}`);
            }

            // If no basePrice found, use fallback calculation (60% of offer price)
            if (!basePrice) {
              basePrice = offerPrice * 0.6;
            }

            // Calculate profit for this item
            const itemProfit = (offerPrice - basePrice) * quantity;
            totalProfit += itemProfit;

            console.log(`   📦 ${product.name || product.productCode}: ${quantity}x (₹${offerPrice} - ₹${basePrice.toFixed(2)}) = ₹${itemProfit.toFixed(2)}`);
          }
        }

        // Update the order with calculated profit
        await Order.updateOne(
          { _id: order._id },
          { 
            $set: { 
              'orderSummary.totalProfit': Math.round(totalProfit * 100) / 100 // Round to 2 decimal places
            }
          }
        );

        updatedCount++;
        console.log(`✅ Updated order ${order.orderId}: Total Profit = ₹${totalProfit.toFixed(2)}`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating order ${order.orderId}:`, error.message);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} orders`);
    console.log(`❌ Errors: ${errorCount} orders`);
    console.log(`📊 Total processed: ${ordersToUpdate.length} orders`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Run the migration
const runMigration = async () => {
  await connectDB();
  await updateOrdersWithProfit();
  
  console.log('\n🎉 Migration completed! Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
};

// Execute if run directly
if (require.main === module) {
  runMigration();
}

module.exports = { updateOrdersWithProfit };