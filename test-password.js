const mongoose = require('./config/db');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

async function testPassword() {
  try {
    console.log('Connecting to database...');
    
    // Wait for connection
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
    }
    
    console.log('Connected to MongoDB');
    
    // Find the admin
    const admin = await Admin.findOne({ email: 'support@oms.com' });
    
    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }
    
    console.log('✅ Admin found:', admin.email);
    console.log('Admin active:', admin.isActive);
    console.log('Admin branch:', admin.branch);
    
    // Test password
    const testPassword = 'srimathi123#';
    console.log('\nTesting password:', testPassword);
    
    const isMatch = await bcrypt.compare(testPassword, admin.password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('\n❌ Password does not match!');
      console.log('Stored hash:', admin.password);
      
      // Let's try to create a new hash with the password and compare
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('New hash for same password:', newHash);
      
      const newHashMatch = await bcrypt.compare(testPassword, newHash);
      console.log('New hash comparison works:', newHashMatch);
    } else {
      console.log('✅ Password matches!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testPassword();