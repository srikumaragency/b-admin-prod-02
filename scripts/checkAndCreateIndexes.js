const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.SUPERADMIN_DB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Check existing indexes and create missing ones
const checkAndCreateIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    console.log('🔍 Checking existing indexes...');

    // Orders collection
    const ordersCollection = db.collection('orders');
    const orderIndexes = await ordersCollection.listIndexes().toArray();
    
    console.log('\n📋 Current indexes on orders collection:');
    orderIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Products collection
    const productsCollection = db.collection('products');
    const productIndexes = await productsCollection.listIndexes().toArray();
    
    console.log('\n📋 Current indexes on products collection:');
    productIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Check if we have the essential indexes for profit calculations
    const hasPaymentStatusCreatedAt = orderIndexes.some(index => 
      index.key.paymentStatus && index.key.createdAt
    );

    const hasItemsProductId = orderIndexes.some(index => 
      index.key['items.productId']
    );

    const hasProductBasePrice = productIndexes.some(index => 
      index.key.basePrice
    );

    console.log('\n🔍 Index Analysis:');
    console.log(`   ✅ PaymentStatus + CreatedAt: ${hasPaymentStatusCreatedAt ? 'EXISTS' : 'MISSING'}`);
    console.log(`   ✅ Items.ProductId: ${hasItemsProductId ? 'EXISTS' : 'MISSING'}`);
    console.log(`   ✅ Product BasePrice: ${hasProductBasePrice ? 'EXISTS' : 'MISSING'}`);

    // Create missing indexes
    let indexesCreated = 0;

    if (!hasItemsProductId) {
      try {
        await ordersCollection.createIndex(
          { 'items.productId': 1 },
          { name: 'items_productId_1', background: true }
        );
        console.log('✅ Created index: items.productId');
        indexesCreated++;
      } catch (error) {
        console.log(`⚠️  Index items.productId might already exist: ${error.message}`);
      }
    }

    if (!hasProductBasePrice) {
      try {
        await productsCollection.createIndex(
          { basePrice: 1 },
          { name: 'basePrice_1', background: true }
        );
        console.log('✅ Created index: basePrice');
        indexesCreated++;
      } catch (error) {
        console.log(`⚠️  Index basePrice might already exist: ${error.message}`);
      }
    }

    // Create a sparse index for better performance on profit queries
    try {
      await ordersCollection.createIndex(
        { 
          paymentStatus: 1, 
          createdAt: -1,
          'items.productId': 1
        },
        { 
          name: 'profit_query_optimized',
          background: true,
          sparse: true
        }
      );
      console.log('✅ Created optimized compound index for profit queries');
      indexesCreated++;
    } catch (error) {
      console.log(`⚠️  Optimized compound index might already exist: ${error.message}`);
    }

    console.log(`\n🎉 Process completed! Created ${indexesCreated} new indexes.`);
    
    if (indexesCreated === 0) {
      console.log('💡 All essential indexes already exist. Your database is optimized!');
    }
    
  } catch (error) {
    console.error('❌ Error checking/creating indexes:', error);
  }
};

// Run the script
const main = async () => {
  await connectDB();
  await checkAndCreateIndexes();
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});