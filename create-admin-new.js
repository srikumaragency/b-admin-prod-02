const mongoose = require('./config/db'); // Use the existing db connection
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

async function createNewAdmin() {
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
    const existingAdmin = await Admin.findOne({ email: 'admin@gmail.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      console.log('You can use this account to login and test the dashboard');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin
    const admin = new Admin({
      name: 'Admin User',
      email: 'admin@gmail.com',
      password: hashedPassword,
      branch: 'main',
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin created successfully!');
    console.log('Email: admin@gmail.com');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    mongoose.connection.close();
  }
}

createNewAdmin();