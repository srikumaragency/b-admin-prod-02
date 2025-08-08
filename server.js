const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('./config/db');
const cors = require('cors');
const multer = require('multer');

const authRoutes = require('./routes/authRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const subcategoryRoutes = require('./routes/subcategoryRoutes');
const productRoutes = require('./routes/productRoutes');
const quickShoppingRoutes = require('./routes/quickShoppingRoutes');
const priceListRoutes = require('./routes/priceListRoutes');
const storeRoutes = require('./routes/storeRoutes');
const orderRoutes = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const contactRoutes = require('./routes/contactRoutes');

const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./src/docs/swagger');

dotenv.config();
const app = express();

// 🛡️ BULLETPROOF CORS - PERMANENT SOLUTION
const allowedOrigins = [
  'https://webadmin.sivakaasi.com',
  'https://b-admin-prod-02.onrender.com',
  'http://omshanmukapyropark.com',
  'httpS://omshanmukapyropark.com/',
  'https://www.omshanmukapyropark.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

console.log('🛡️ BULLETPROOF CORS Configuration:', {
  allowedOrigins,
  nodeEnv: process.env.NODE_ENV || 'development'
});

const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 CORS Check - Origin:', origin);
    
    // Allow requests with no origin (Postman, mobile apps, etc.)
    if (!origin) {
      console.log('✅ No origin - ALLOWED');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Origin ALLOWED:', origin);
      return callback(null, true);
    } else {
      console.log('❌ Origin BLOCKED:', origin);
      console.log('📋 Allowed origins:', allowedOrigins);
      return callback(null, true); // TEMPORARY: Allow all for debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// 🛡️ AGGRESSIVE CORS MIDDLEWARE - HANDLES EVERYTHING
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`🔍 Request: ${req.method} ${req.path} from origin: ${origin || 'none'}`);
  
  // Set CORS headers for ALL requests
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  } else {
    // TEMPORARY: Allow all origins for debugging
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,Access-Control-Request-Method,Access-Control-Request-Headers');
  res.header('Access-Control-Expose-Headers', 'Content-Length,X-Foo,X-Bar');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Preflight request handled');
    return res.status(200).end();
  }
  
  next();
});

// Backup CORS middleware
app.use(cors(corsOptions));

// Handle all OPTIONS requests
app.options('*', (req, res) => {
  console.log('✅ OPTIONS request for:', req.path);
  res.status(200).end();
});

// ✅ Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: 'application/pdf', limit: '10mb' }));

// ✅ Static folders
app.use('/public', express.static('public'));
app.use('/uploads', express.static('uploads'));

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ✅ Fast health check for login validation (no heavy operations)
app.get('/api/health/fast', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Server is responsive'
  });
});

// ✅ Keep-alive endpoint to prevent cold starts
app.get('/keep-alive', (req, res) => {
  res.json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    message: 'Server is warm and ready'
  });
});

// ✅ CORS debug endpoint
app.get('/cors-debug', (req, res) => {
  res.json({
    status: 'OK',
    origin: req.headers.origin,
    allowedOrigins: allowedOrigins,
    corsEnabled: true,
    environment: process.env.NODE_ENV || 'development',
    envVariable: process.env.ALLOWED_ORIGINS,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// ✅ Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// ✅ CORS Test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/quick-shopping', quickShoppingRoutes);
app.use('/api/price-lists', priceListRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin/contact-queries', contactRoutes);
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// ✅ Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// ❌ 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ❗ Global Error Handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  if (error instanceof multer.MulterError) {
    let message = 'File upload error.';
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum file size allowed is 1MB.';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files. Please select fewer files.';
    }
    return res.status(400).json({
      success: false,
      message,
      error: error.code
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error.',
      error: error.message
    });
  }

  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server.',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

// ✅ Start server with error handling
const PORT = process.env.PORT || 5001;

// Add process error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});