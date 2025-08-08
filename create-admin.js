const mongoose = require('./config/db'); // Use the existing db connection
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

async function createDefaultAdmin() {
  try {
    console.log('Using existing database connection...');
    
    // Wait for connection to be established
    if (mongoose.connection.readyState !== 1) {
      console.log('Waiting for database connection...');
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
    }
    
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'branch2@gmail.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      console.log('You can use this account to login and test the dashboard');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin
    const admin = new Admin({
      name: 'Branch Admin',
      email: 'branch2@gmail.com',
      password: hashedPassword,
      branch: 'branch2',
      isActive: true
    });

    await admin.save();
    console.log('✅ Branch admin created successfully!');
    console.log('Email: branch2@gmail.com');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    mongoose.connection.close();
  }
}

createDefaultAdmin();