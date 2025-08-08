const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer for delivery image uploads (using memory storage for Cloudinary)
const deliveryImageStorage = multer.memoryStorage();

const upload = multer({ 
  storage: deliveryImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Configure multer for bill image uploads (using memory storage for Cloudinary)
const billImageStorage = multer.memoryStorage();

const uploadBillImage = multer({ 
  storage: billImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files and PDF are allowed!'));
    }
  }
});

// Health check route without auth to check database connectivity
router.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const startTime = Date.now();
    
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    if (dbState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected',
        data: {
          dbState: dbStates[dbState],
          connectionTime: Date.now() - startTime
        }
      });
    }
    
    // Test database operation with timeout
    let testResult = null;
    let testError = null;
    
    try {
      const db = mongoose.connection.db;
      const ordersCollection = db.collection('orders');
      
      // Simple ping test
      const pingResult = await db.admin().ping();
      
      // Quick count test with timeout
      const orderCount = await ordersCollection.countDocuments({}, { maxTimeMS: 5000 });
      
      testResult = {
        ping: pingResult,
        orderCount: orderCount,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      testError = error.message;
    }
    
    res.json({
      success: testError === null,
      message: testError ? 'Database health check failed' : 'Database is healthy',
      data: {
        dbState: dbStates[dbState],
        dbName: mongoose.connection.db?.databaseName,
        testResult: testResult,
        testError: testError,
        responseTime: Date.now() - startTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Test route without auth to check database connectivity and orders
router.get('/test', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const mongoose = require('mongoose');
    
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Try using native MongoDB driver directly with reduced timeout
    let nativeResult = [];
    let nativeError = null;
    
    try {
      const db = mongoose.connection.db;
      const ordersCollection = db.collection('orders');
      nativeResult = await ordersCollection.find({})
        .limit(2)
        .maxTimeMS(10000) // Reduced to 10 seconds
        .toArray();
    } catch (error) {
      nativeError = error.message;
    }
    
    res.json({
      success: true,
      message: 'Database connection test',
      data: {
        dbState: dbStates[dbState],
        dbName: mongoose.connection.db.databaseName,
        collectionName: Order.collection.name,
        allCollections: collectionNames,
        nativeResult: nativeResult.map(order => ({
          orderId: order.orderId,
          customerName: order.customerDetails?.name,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt
        })),
        nativeError: nativeError
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Customer tracking route (no auth required, but phone number verification)
router.get('/track/:orderId', orderController.getOrderForTracking);

// Apply auth middleware to all other routes except test and tracking
router.use(authMiddleware);

// Order management routes
router.get('/all', orderController.getAllOrders);
router.get('/:orderId', orderController.getOrderById);
router.put('/:orderId/payment-status', orderController.updatePaymentStatus);
router.put('/:orderId/order-status', orderController.updateOrderStatus);
router.put('/:orderId/tracking', orderController.updateTrackingInfo);
router.put('/:orderId/admin-notes', orderController.updateAdminNotes);

// Invoice and delivery management routes
router.post('/:orderId/generate-invoice', orderController.generateInvoice);
router.post('/:orderId/upload-delivery-image', upload.single('deliveryImage'), orderController.uploadDeliveryImage);
router.delete('/:orderId/delivery-image', orderController.deleteDeliveryImage);
router.get('/:orderId/invoice', orderController.getInvoicePDF);
router.get('/:orderId/invoice/debug', orderController.debugInvoice);

// PDF generation test route (no orderId required)
router.get('/test-pdf-generation', orderController.testPdfGeneration);

// Bill image upload route
router.post('/:orderId/upload-bill-image', uploadBillImage.single('billImage'), orderController.uploadBillImage);

// Auto-generate invoices for all paid orders
router.post('/generate-invoices-for-paid', orderController.generateInvoicesForPaidOrders);

// Get all invoices with pagination
router.get('/invoices/all', orderController.getAllInvoices);




module.exports = router;