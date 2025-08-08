const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.SUPERADMIN_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create optimized indexes for profit calculations
const createOptimizedIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    console.log('🚀 Creating optimized indexes...');

    // Orders collection indexes
    const ordersCollection = db.collection('orders');
    
    // 1. Compound index for profit queries (most important)
    await ordersCollection.createIndex(
      { 
        paymentStatus: 1, 
        createdAt: -1 
      },
      { 
        name: 'paymentStatus_createdAt_desc',
        background: true 
      }
    );
    console.log('✅ Created compound index: paymentStatus + createdAt');

    // 2. Index for items.productId (for lookups)
    await ordersCollection.createIndex(
      { 
        'items.productId': 1 
      },
      { 
        name: 'items_productId',
        background: true 
      }
    );
    console.log('✅ Created index: items.productId');

    // 3. Compound index for date range queries
    await ordersCollection.createIndex(
      { 
        paymentStatus: 1, 
        createdAt: -1,
        orderStatus: 1
      },
      { 
        name: 'payment_date_status',
        background: true 
      }
    );
    console.log('✅ Created compound index: paymentStatus + createdAt + orderStatus');

    // 4. Index for orderId (already exists but ensure it's there)
    await ordersCollection.createIndex(
      { orderId: 1 },
      { 
        name: 'orderId_unique',
        unique: true,
        background: true 
      }
    );
    console.log('✅ Ensured unique index: orderId');

    // Products collection indexes
    const productsCollection = db.collection('products');
    
    // 5. Index for product basePrice queries
    await productsCollection.createIndex(
      { 
        _id: 1, 
        basePrice: 1 
      },
      { 
        name: 'id_basePrice',
        background: true 
      }
    );
    console.log('✅ Created compound index: _id + basePrice');

    // 6. Index for product name and basePrice
    await productsCollection.createIndex(
      { 
        name: 1, 
        basePrice: 1 
      },
      { 
        name: 'name_basePrice',
        background: true 
      }
    );
    console.log('✅ Created compound index: name + basePrice');

    // List all indexes to verify
    console.log('\n📋 Current indexes on orders collection:');
    const orderIndexes = await ordersCollection.listIndexes().toArray();
    orderIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n📋 Current indexes on products collection:');
    const productIndexes = await productsCollection.listIndexes().toArray();
    productIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n🎉 All optimized indexes created successfully!');
    console.log('\n💡 These indexes will significantly improve profit calculation performance.');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

// Run the script
const main = async () => {
  await connectDB();
  await createOptimizedIndexes();
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});