const mongoose = require('mongoose');
require('dotenv').config();

// Import Store model
const Store = require('./models/Store');

// Migration script to add default packaging cost tiers
async function migratePackagingCostTiers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.SUPERADMIN_DB_URI);
    console.log('✅ Connected to MongoDB');

    // Get existing store
    let store = await Store.findOne();
    
    if (!store) {
      console.log('📝 No store found, creating new one with default packaging cost tiers');
      store = await Store.getStore(); // This will create store with default tiers
    } else if (!store.packagingCostTiers || store.packagingCostTiers.length === 0) {
      console.log('📝 Adding default packaging cost tiers to existing store');
      
      // Add default packaging cost tiers
      store.packagingCostTiers = [
        { minAmount: 0, maxAmount: 5000, cost: 100 },
        { minAmount: 5000, maxAmount: 10000, cost: 200 },
        { minAmount: 10000, maxAmount: 20000, cost: 300 },
        { minAmount: 20000, maxAmount: null, cost: 500 }
      ];
      
      await store.save();
      console.log('✅ Default packaging cost tiers added successfully');
    } else {
      console.log('ℹ️ Packaging cost tiers already exist');
    }

    console.log('\n📦 Current Packaging Cost Tiers:');
    store.packagingCostTiers.forEach((tier, index) => {
      const maxText = tier.maxAmount ? `₹${tier.maxAmount.toLocaleString()}` : 'No limit';
      console.log(`   Tier ${index + 1}: ₹${tier.minAmount.toLocaleString()} - ${maxText} → ₹${tier.cost}`);
    });

    // Test calculations
    const testValues = [500, 2500, 5000, 7500, 10000, 15000, 25000, 50000];
    
    console.log('\n🧪 Testing Packaging Cost Calculations:');
    console.log('═══════════════════════════════════════');
    
    testValues.forEach(value => {
      const packagingCost = store.calculatePackagingCost(value);
      console.log(`   Order Value: ₹${value.toLocaleString()} → Packaging Cost: ₹${packagingCost}`);
    });

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the migration
migratePackagingCostTiers();