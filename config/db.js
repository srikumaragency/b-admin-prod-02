const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Disable Mongoose buffering to prevent timeout issues
mongoose.set('bufferCommands', false);

// 🔧 Database connection with better error handling
const dbUri = process.env.MONGODB_URI || process.env.SUPERADMIN_DB_URI;

console.log('🔍 Database connection attempt:', {
  hasMongoUri: !!process.env.MONGODB_URI,
  hasSuperAdminUri: !!process.env.SUPERADMIN_DB_URI,
  usingUri: dbUri ? 'URI found' : 'NO URI FOUND!'
});

if (!dbUri) {
  console.error('❌ CRITICAL: No database URI found in environment variables!');
  console.error('❌ Please set MONGODB_URI or SUPERADMIN_DB_URI');
  process.exit(1);
}

mongoose.connect(dbUri, {
  serverSelectionTimeoutMS: 30000, // 30 seconds for server selection (handles cold starts)
  socketTimeoutMS: 45000, // 45 seconds socket timeout
  connectTimeoutMS: 30000, // 30 seconds connection timeout
  maxPoolSize: 10, // Reasonable pool size
  minPoolSize: 2, // Keep minimum 2 connections warm
  maxIdleTimeMS: 60000, // 60 seconds idle timeout
  heartbeatFrequencyMS: 10000, // 10 seconds health checks
  retryWrites: true, // Enable retryable writes
  retryReads: true, // Enable retryable reads
  bufferCommands: false, // Disable mongoose buffering
})
.then(() => console.log('MongoDB connected'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('Mongoose reconnected to MongoDB');
});

// Handle application termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

module.exports = mongoose;
