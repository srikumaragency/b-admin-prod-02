const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import models
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Admin = require('../models/Admin');
const Banner = require('../models/Banner');
const QuickShopping = require('../models/QuickShopping');

const optimizeAdminDatabase = async () => {
  try {
    console.log('🚀 Starting admin database optimization...');
    
    // Get database URI
    const dbUri = process.env.MONGODB_URI || process.env.SUPERADMIN_DB_URI;
    
    if (!dbUri) {
      console.error('❌ No database URI found!');
      process.exit(1);
    }
    
    // Connect to database
    await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
      bufferCommands: false,
    });
    
    console.log('✅ Connected to Admin MongoDB');

    // Create indexes for better performance
    console.log('📊 Creating admin database indexes...');

    // Product indexes
    await Product.collection.createIndex({ isActive: 1, isDeleted: 1 });
    await Product.collection.createIndex({ category: 1, subcategory: 1 });
    await Product.collection.createIndex({ name: 'text', description: 'text' });
    await Product.collection.createIndex({ price: 1, offerPrice: 1 });
    await Product.collection.createIndex({ createdAt: -1 });
    await Product.collection.createIndex({ updatedAt: -1 });
    await Product.collection.createIndex({ stockQuantity: 1 });
    await Product.collection.createIndex({ inStock: 1 });
    console.log('✅ Product indexes created');

    // Category indexes
    await Category.collection.createIndex({ isActive: 1 });
    await Category.collection.createIndex({ name: 1 });
    await Category.collection.createIndex({ serialNumber: 1 });
    await Category.collection.createIndex({ createdAt: -1 });
    console.log('✅ Category indexes created');

    // Order indexes
    await Order.collection.createIndex({ phoneNumber: 1 });
    await Order.collection.createIndex({ status: 1 });
    await Order.collection.createIndex({ paymentStatus: 1 });
    await Order.collection.createIndex({ createdAt: -1 });
    await Order.collection.createIndex({ updatedAt: -1 });
    await Order.collection.createIndex({ totalAmount: 1 });
    await Order.collection.createIndex({ 'customerInfo.phoneNumber': 1 });
    console.log('✅ Order indexes created');

    // Admin indexes
    await Admin.collection.createIndex({ email: 1 }, { unique: true });
    await Admin.collection.createIndex({ isActive: 1 });
    await Admin.collection.createIndex({ role: 1 });
    console.log('✅ Admin indexes created');

    // Banner indexes
    await Banner.collection.createIndex({ isActive: 1 });
    await Banner.collection.createIndex({ serialNumber: 1 });
    await Banner.collection.createIndex({ updatedAt: -1 });
    console.log('✅ Banner indexes created');

    // QuickShopping indexes
    await QuickShopping.collection.createIndex({ branch: 1 });
    await QuickShopping.collection.createIndex({ updatedAt: -1 });
    await QuickShopping.collection.createIndex({ 'categoryOrder.categoryId': 1 });
    await QuickShopping.collection.createIndex({ 'categoryOrder.products.productId': 1 });
    console.log('✅ QuickShopping indexes created');

    // Check database statistics
    console.log('📈 Admin Database Statistics:');
    const stats = await mongoose.connection.db.stats();
    console.log(`📊 Database size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 Index size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 Collections: ${stats.collections}`);
    console.log(`📊 Objects: ${stats.objects}`);

    // List all indexes
    console.log('📋 Current Admin Indexes:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const indexes = await mongoose.connection.db.collection(collection.name).indexes();
      console.log(`📁 ${collection.name}:`, indexes.map(idx => idx.name).join(', '));
    }

    // Clean up old/unused data (optional)
    console.log('🧹 Cleaning up old data...');
    
    // Remove old deleted products (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deletedProductsResult = await Product.deleteMany({
      isDeleted: true,
      updatedAt: { $lt: thirtyDaysAgo }
    });
    console.log(`🗑️ Removed ${deletedProductsResult.deletedCount} old deleted products`);

    console.log('🎉 Admin database optimization completed successfully!');
    
  } catch (error) {
    console.error('❌ Admin database optimization failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Admin database connection closed');
    process.exit(0);
  }
};

// Run optimization
optimizeAdminDatabase();