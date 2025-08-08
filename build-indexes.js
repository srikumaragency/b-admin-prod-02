const mongoose = require('./config/db');
const Order = require('./models/Order');
const Product = require('./models/Product');
const Category = require('./models/Category');

async function buildIndexes() {
  try {
    console.log('🔧 Building database indexes for better performance...');
    
    // Wait for database connection
    await new Promise(resolve => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', resolve);
      }
    });
    
    console.log('✅ Database connected, building indexes...');
    
    // Build indexes for Order collection
    console.log('📊 Building Order indexes...');
    await Order.collection.createIndex({ paymentStatus: 1, createdAt: -1 });
    await Order.collection.createIndex({ paymentStatus: 1, 'orderSummary.totalProfit': 1 });
    await Order.collection.createIndex({ createdAt: -1, paymentStatus: 1, 'orderSummary.totalOfferPrice': 1 });
    console.log('✅ Order indexes built');
    
    // Build indexes for Product collection
    console.log('📦 Building Product indexes...');
    await Product.collection.createIndex({ categoryId: 1, isActive: 1 });
    await Product.collection.createIndex({ categoryId: 1, isActive: 1, name: 1 });
    await Product.collection.createIndex({ isActive: 1, name: 1 });
    console.log('✅ Product indexes built');
    
    // Build indexes for Category collection
    console.log('📂 Building Category indexes...');
    await Category.collection.createIndex({ name: 1 });
    await Category.collection.createIndex({ createdAt: -1 });
    console.log('✅ Category indexes built');
    
    // List all indexes
    console.log('\n📋 Current indexes:');
    
    const orderIndexes = await Order.collection.listIndexes().toArray();
    console.log('Order indexes:', orderIndexes.map(idx => idx.name));
    
    const productIndexes = await Product.collection.listIndexes().toArray();
    console.log('Product indexes:', productIndexes.map(idx => idx.name));
    
    const categoryIndexes = await Category.collection.listIndexes().toArray();
    console.log('Category indexes:', categoryIndexes.map(idx => idx.name));
    
    console.log('\n🎉 All indexes built successfully!');
    console.log('🚀 Database queries should now be much faster');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error building indexes:', error);
    process.exit(1);
  }
}

buildIndexes();