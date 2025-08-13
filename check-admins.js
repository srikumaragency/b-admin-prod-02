const mongoose = require('./config/db');
const Admin = require('./models/Admin');

async function checkAdmins() {
  try {
    console.log('Connecting to database...');
    
    // Wait for connection
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
    }
    
    console.log('Connected to MongoDB');
    
    // Find all admins
    const admins = await Admin.find({});
    
    console.log('\n=== All Admin Users ===');
    console.log(`Total admins found: ${admins.length}`);
    
    admins.forEach((admin, index) => {
      console.log(`\n${index + 1}. Admin Details:`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Branch: ${admin.branch}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   Created: ${admin.createdAt}`);
    });
    
    // Check specifically for the user trying to login
    const targetAdmin = await Admin.findOne({ email: 'support@oms.com' });
    
    console.log('\n=== Target Admin Check ===');
    if (targetAdmin) {
      console.log('✅ Found admin with email: support@oms.com');
      console.log(`   Name: ${targetAdmin.name}`);
      console.log(`   Active: ${targetAdmin.isActive}`);
      console.log(`   Branch: ${targetAdmin.branch}`);
    } else {
      console.log('❌ No admin found with email: support@oms.com');
    }
    
  } catch (error) {
    console.error('❌ Error checking admins:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAdmins();