const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const mongoose = require('mongoose');
const { generateProfessionalInvoicePDF } = require('../utils/professionalPdfGenerator');
const { generateInvoiceNumber } = require('../utils/invoiceIdGenerator');

// Get all orders with pagination and filters
const getAllOrders = async (req, res) => {
  try {
    console.log('getAllOrders called with query:', req.query);
    console.log('Order model:', Order.modelName);
    console.log('Order collection name:', Order.collection.name);
    
    const { 
      page = 1, 
      limit = 20, 
      paymentStatus, 
      orderStatus, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search 
    } = req.query;

    const skip = (page - 1) * limit;
    let query = {};

    // Apply filters
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    if (orderStatus) {
      query.orderStatus = orderStatus;
    }
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } },
        { 'customerDetails.phoneNumber': { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Query filters:', query);

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    console.log('Sort options:', sortOptions);

    // Use native MongoDB driver for better performance
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    
    // Convert mongoose query to native MongoDB query
    const nativeQuery = {};
    if (query.paymentStatus) nativeQuery.paymentStatus = query.paymentStatus;
    if (query.orderStatus) nativeQuery.orderStatus = query.orderStatus;
    if (query.$or) nativeQuery.$or = query.$or;
    
    console.log('Native query:', nativeQuery);
    
    const orders = await ordersCollection
      .find(nativeQuery)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .maxTimeMS(30000)
      .toArray();

    console.log('Orders fetched:', orders.length);

    // Count using native driver
    let totalOrders = 0;
    let totalPages = 1;
    
    try {
      totalOrders = await ordersCollection.countDocuments(nativeQuery, { maxTimeMS: 10000 });
      totalPages = Math.ceil(totalOrders / limit);
      console.log('Total orders found:', totalOrders);
    } catch (countError) {
      console.log('Count operation failed, estimating from results:', countError.message);
      // If count fails, estimate based on results
      if (orders.length === parseInt(limit)) {
        totalOrders = (page * limit) + 1; // At least one more page
        totalPages = page + 1;
      } else {
        totalOrders = ((page - 1) * limit) + orders.length;
        totalPages = page;
      }
    }

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalOrders,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId })
      .populate('items.productId', 'name productCode images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

// Update payment status (admin only)
const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, adminNotes } = req.body;

    if (!['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    // Use native MongoDB driver with explicit timeout for better performance
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    
    // First, try to find the order using native driver with timeout
    let order;
    try {
      order = await ordersCollection.findOne(
        { orderId: orderId },
        { maxTimeMS: 15000 } // 15 second timeout
      );
    } catch (timeoutError) {
      console.error('Timeout finding order for payment update:', timeoutError);
      return res.status(408).json({
        success: false,
        message: 'Database operation timed out. Please try again.',
        error: 'TIMEOUT_ERROR'
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Relaxed rule: allow marking as paid without screenshot IF adminNotes are provided
    if (paymentStatus === 'paid') {
      const hasScreenshot = !!(order.paymentDetails && order.paymentDetails.paymentScreenshot);
      const hasNotes = !!(adminNotes && adminNotes.trim());
      if (!hasScreenshot && !hasNotes) {
        return res.status(400).json({
          success: false,
          message: 'Admin notes are required if marking as paid without a payment screenshot'
        });
      }
    }

    const previousPaymentStatus = order.paymentStatus;
    
    // Prepare update object
    const updateData = {
      paymentStatus: paymentStatus,
      updatedAt: new Date()
    };
    
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    // If marking as paid, update payment date and admin review info
    if (paymentStatus === 'paid') {
      if (!order.paymentDetails?.paymentDate) {
        updateData['paymentDetails.paymentDate'] = new Date();
      }
      updateData['paymentDetails.adminReviewedAt'] = new Date();
      updateData['paymentDetails.adminReviewedBy'] = req.user?.email || 'admin';
      
      // Auto-change order status to 'confirmed' when payment is marked as paid
      if (order.orderStatus === 'placed') {
        updateData.orderStatus = 'confirmed';
      }
    }

    // Update using native driver with timeout
    let updateResult;
    try {
      updateResult = await ordersCollection.updateOne(
        { orderId: orderId },
        { $set: updateData },
        { maxTimeMS: 15000 } // 15 second timeout
      );
    } catch (timeoutError) {
      console.error('Timeout updating payment status:', timeoutError);
      return res.status(408).json({
        success: false,
        message: 'Database update timed out. Please try again.',
        error: 'UPDATE_TIMEOUT_ERROR'
      });
    }

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found during update'
      });
    }

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment status was not updated. It may already have the same status.'
      });
    }

    // If transitioned to paid just now, ensure invoice meta exists
    let invoiceDataResponse = null;
    if (paymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
      try {
        const refreshed = await ordersCollection.findOne(
          { orderId: orderId },
          { maxTimeMS: 5000 }
        );
        if (refreshed && !(refreshed.invoice && refreshed.invoice.invoiceNumber)) {
          const invoiceNumber = generateInvoiceNumber(orderId);
          const inv = {
            invoiceNumber,
            generatedAt: new Date(),
            generatedBy: req.user?.email || 'admin',
            invoiceUrl: `/api/orders/${orderId}/invoice`
          };
          await ordersCollection.updateOne(
            { orderId: orderId },
            { $set: { invoice: inv } },
            { maxTimeMS: 5000 }
          );
          invoiceDataResponse = inv;
        } else if (refreshed && refreshed.invoice) {
          invoiceDataResponse = refreshed.invoice;
        }
      } catch (e) {
        console.warn('Invoice metadata creation after payment failed (will still return 200):', e.message);
      }
    }

    res.json({
      success: true,
      message: `Payment status updated successfully${paymentStatus === 'paid' && previousPaymentStatus !== 'paid' ? '. Order status automatically changed to confirmed.' : ''}`,
      data: {
        orderId: orderId,
        paymentStatus: paymentStatus,
        orderStatus: updateData.orderStatus || order.orderStatus,
        adminNotes: adminNotes || order.adminNotes,
        adminReviewedAt: updateData['paymentDetails.adminReviewedAt'],
        updatedAt: updateData.updatedAt,
        invoice: invoiceDataResponse || undefined
      }
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Database connection timeout. Please check your connection and try again.',
        error: 'CONNECTION_TIMEOUT'
      });
    }
    
    if (error.name === 'MongoNetworkError') {
      return res.status(503).json({
        success: false,
        message: 'Database network error. Please try again later.',
        error: 'NETWORK_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, adminNotes } = req.body;

    if (!['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    // Use native MongoDB driver with explicit timeout for better performance
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    
    // First, try to find the order using native driver with timeout
    let order;
    try {
      order = await ordersCollection.findOne(
        { orderId: orderId },
        { maxTimeMS: 15000 } // 15 second timeout
      );
    } catch (timeoutError) {
      console.error('Timeout finding order:', timeoutError);
      return res.status(408).json({
        success: false,
        message: 'Database operation timed out. Please try again.',
        error: 'TIMEOUT_ERROR'
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Prepare update object
    const updateData = {
      orderStatus: orderStatus,
      updatedAt: new Date()
    };
    
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    // Update using native driver with timeout
    let updateResult;
    try {
      updateResult = await ordersCollection.updateOne(
        { orderId: orderId },
        { $set: updateData },
        { maxTimeMS: 15000 } // 15 second timeout
      );
    } catch (timeoutError) {
      console.error('Timeout updating order:', timeoutError);
      return res.status(408).json({
        success: false,
        message: 'Database update timed out. Please try again.',
        error: 'UPDATE_TIMEOUT_ERROR'
      });
    }

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found during update'
      });
    }

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order status was not updated. It may already have the same status.'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: orderId,
        orderStatus: orderStatus,
        adminNotes: adminNotes || order.adminNotes,
        updatedAt: updateData.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Database connection timeout. Please check your connection and try again.',
        error: 'CONNECTION_TIMEOUT'
      });
    }
    
    if (error.name === 'MongoNetworkError') {
      return res.status(503).json({
        success: false,
        message: 'Database network error. Please try again later.',
        error: 'NETWORK_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Update tracking information
const updateTrackingInfo = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { estimatedDelivery, trackingNumber, courierPartner } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (estimatedDelivery) {
      order.trackingInfo.estimatedDelivery = new Date(estimatedDelivery);
    }
    if (trackingNumber) {
      order.trackingInfo.trackingNumber = trackingNumber;
    }
    if (courierPartner) {
      order.trackingInfo.courierPartner = courierPartner;
    }

    await order.save();

    res.json({
      success: true,
      message: 'Tracking information updated successfully',
      data: {
        orderId: order.orderId,
        trackingInfo: order.trackingInfo
      }
    });

  } catch (error) {
    console.error('Error updating tracking info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tracking information',
      error: error.message
    });
  }
};

// Update admin notes
const updateAdminNotes = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adminNotes } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.adminNotes = adminNotes || '';
    await order.save();

    res.json({
      success: true,
      message: 'Admin notes updated successfully',
      data: {
        orderId: order.orderId,
        adminNotes: order.adminNotes
      }
    });

  } catch (error) {
    console.error('Error updating admin notes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin notes',
      error: error.message
    });
  }
};



// Generate invoice for paid order
const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Use native MongoDB driver with timeout for better performance
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    
    let order;
    try {
      order = await ordersCollection.findOne(
        { orderId: orderId },
        { maxTimeMS: 5000 } // 5 second timeout
      );
    } catch (timeoutError) {
      console.error('Timeout finding order for invoice generation:', timeoutError);
      return res.status(408).json({
        success: false,
        message: 'Database operation timed out. Please try again.',
        error: 'TIMEOUT_ERROR'
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoice can only be generated for paid orders'
      });
    }

    // Generate invoice if not already generated
    if (!order.invoice?.invoiceNumber) {
      const invoiceNumber = generateInvoiceNumber(orderId);
      const invoiceData = {
        invoiceNumber: invoiceNumber,
        generatedAt: new Date(),
        generatedBy: req.user?.email || 'admin',
        invoiceUrl: `/api/orders/${orderId}/invoice`
      };

      try {
        await ordersCollection.updateOne(
          { orderId: orderId },
          { $set: { invoice: invoiceData } },
          { maxTimeMS: 5000 }
        );
        
        order.invoice = invoiceData;
      } catch (updateError) {
        console.error('Timeout updating invoice:', updateError);
        return res.status(408).json({
          success: false,
          message: 'Failed to generate invoice due to timeout. Please try again.',
          error: 'UPDATE_TIMEOUT_ERROR'
        });
      }
    }

    res.json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        orderId: order.orderId,
        invoice: order.invoice
      }
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Database connection timeout. Please check your connection and try again.',
        error: 'CONNECTION_TIMEOUT'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
};

// Upload delivery image
const uploadDeliveryImage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryNotes } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Delivery image is required'
      });
    }

    // Use native MongoDB driver with timeout for better performance
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    
    let order;
    try {
      order = await ordersCollection.findOne(
        { orderId: orderId },
        { maxTimeMS: 5000 } // 5 second timeout
      );
    } catch (timeoutError) {
      console.error('Timeout finding order for delivery upload:', timeoutError);
      return res.status(408).json({
        success: false,
        message: 'Database operation timed out. Please try again.',
        error: 'TIMEOUT_ERROR'
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Upload to Cloudinary
    const cloudinary = require('../config/cloudinary');
    
    // Delete existing delivery image from Cloudinary if it exists
    if (order.deliveryDetails?.deliveryImagePublicId) {
      try {
        await cloudinary.uploader.destroy(order.deliveryDetails.deliveryImagePublicId);
      } catch (deleteError) {
        console.warn('Failed to delete old delivery image from Cloudinary:', deleteError);
      }
    }

    // Upload new delivery image to Cloudinary using upload_stream for memory storage
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: 'delivery-images',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' }
        ]
      }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
      
      uploadStream.end(req.file.buffer);
    });

    const cloudinaryResult = await uploadPromise;

    const deliveryDetails = {
      deliveryImage: cloudinaryResult.secure_url,
      deliveryImagePublicId: cloudinaryResult.public_id,
      deliveryImageUploadedAt: new Date(),
      uploadedBy: req.user?.email || 'admin',
      deliveryNotes: deliveryNotes || ''
    };

    try {
      await ordersCollection.updateOne(
        { orderId: orderId },
        { $set: { deliveryDetails: deliveryDetails } },
        { maxTimeMS: 5000 }
      );
    } catch (updateError) {
      console.error('Timeout updating delivery details:', updateError);
      return res.status(408).json({
        success: false,
        message: 'Failed to upload delivery image due to timeout. Please try again.',
        error: 'UPDATE_TIMEOUT_ERROR'
      });
    }

    res.json({
      success: true,
      message: 'Delivery image uploaded successfully to Cloudinary',
      data: {
        orderId: orderId,
        deliveryDetails: deliveryDetails
      }
    });

  } catch (error) {
    console.error('Error uploading delivery image:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Database connection timeout. Please check your connection and try again.',
        error: 'CONNECTION_TIMEOUT'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload delivery image',
      error: error.message
    });
  }
};

// Delete delivery image
const deleteDeliveryImage = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Use native MongoDB driver with timeout for better performance
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    
    let order;
    try {
      order = await ordersCollection.findOne(
        { orderId: orderId },
        { maxTimeMS: 5000 } // 5 second timeout
      );
    } catch (timeoutError) {
      console.error('Timeout finding order for delivery image deletion:', timeoutError);
      return res.status(408).json({
        success: false,
        message: 'Database operation timed out. Please try again.',
        error: 'TIMEOUT_ERROR'
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.deliveryDetails?.deliveryImage) {
      return res.status(404).json({
        success: false,
        message: 'No delivery image found for this order'
      });
    }

    // Delete from Cloudinary if publicId exists
    if (order.deliveryDetails.deliveryImagePublicId) {
      try {
        const cloudinary = require('../config/cloudinary');
        await cloudinary.uploader.destroy(order.deliveryDetails.deliveryImagePublicId);
      } catch (deleteError) {
        console.warn('Failed to delete delivery image from Cloudinary:', deleteError);
      }
    }

    // Remove delivery details from order
    try {
      await ordersCollection.updateOne(
        { orderId: orderId },
        { $unset: { deliveryDetails: "" } },
        { maxTimeMS: 5000 }
      );
    } catch (updateError) {
      console.error('Timeout removing delivery details:', updateError);
      return res.status(408).json({
        success: false,
        message: 'Failed to delete delivery image due to timeout. Please try again.',
        error: 'UPDATE_TIMEOUT_ERROR'
      });
    }

    res.json({
      success: true,
      message: 'Delivery image deleted successfully',
      data: {
        orderId: orderId
      }
    });

  } catch (error) {
    console.error('Error deleting delivery image:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete delivery image',
      error: error.message
    });
  }
};

// Get order for customer tracking (limited information)
const getOrderForTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for order tracking'
      });
    }

    const order = await Order.findOne({ 
      orderId,
      'customerDetails.phoneNumber': phoneNumber 
    })
    .populate('items.productId', 'name images')
    .select('-profitData -adminNotes'); // Hide sensitive data from customers

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or phone number does not match'
      });
    }

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        customerDetails: order.customerDetails,
        items: order.items,
        orderSummary: order.orderSummary,
        trackingInfo: order.trackingInfo,
        deliveryDetails: order.deliveryDetails,
        invoice: order.invoice,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching order for tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: error.message
    });
  }
};

// Get invoice PDF (for both admin and customer) - IMPROVED VERSION
const getInvoicePDF = async (req, res) => {
  let order = null;
  let pdfBuffer = null;
  
  try {
    const { orderId } = req.params;
    const { phoneNumber, format = 'pdf', disposition = 'inline', retry = '0' } = req.query;
    const retryCount = parseInt(retry);
    
    console.log(`PDF request for order ${orderId}, retry: ${retryCount}`);

    // Use native MongoDB with timeout for better performance
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');

    // Build query based on access type
    let query = { orderId };
    if (phoneNumber) {
      query['customerDetails.phoneNumber'] = phoneNumber;
    }

    // Find order with timeout and retry logic
    try {
      order = await ordersCollection.findOne(query, { 
        maxTimeMS: 10000 // 10 second timeout
      });
    } catch (timeoutError) {
      if (retryCount < 2) {
        console.log(`Database timeout, redirecting for retry ${retryCount + 1}`);
        return res.redirect(`${req.originalUrl}${req.originalUrl.includes('?') ? '&' : '?'}retry=${retryCount + 1}`);
      }
      console.error('Database timeout after retries:', timeoutError);
      return res.status(408).json({
        success: false,
        message: 'Database connection timeout. Please check your internet connection and try again.',
        error: 'DATABASE_TIMEOUT',
        retry: true
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: phoneNumber ? 'Order not found or phone number mismatch' : 'Order not found'
      });
    }

    if (!order.invoice?.invoiceNumber) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not generated for this order. Please contact admin.'
      });
    }

    // Populate product details manually for better control
    const productIds = order.items.map(item => item.productId).filter(id => id);
    let products = [];
    if (productIds.length > 0) {
      try {
        products = await productsCollection.find(
          { _id: { $in: productIds } },
          { projection: { name: 1, productCode: 1 }, maxTimeMS: 5000 }
        ).toArray();
      } catch (productError) {
        console.warn('Failed to load product details:', productError.message);
      }
    }

    // Map products to items
    const productMap = {};
    products.forEach(product => {
      productMap[product._id.toString()] = product;
    });

    order.items.forEach(item => {
      if (item.productId) {
        item.productId = productMap[item.productId.toString()] || {
          name: 'Product Not Found',
          productCode: 'N/A'
        };
      }
    });

    // Get store details with fallback
    let storeDetails = {
      logo: null,
      name: 'OMS Agency', 
      address: {},
      phone: '+91 9942494345',
      email: 'osppsivakasi@gmail.com'
    };

    try {
      const store = await db.collection('stores').findOne({}, { maxTimeMS: 3000 });
      if (store) {
        storeDetails = {
          logo: store.logo?.url || null,
          name: store.name || storeDetails.name,
          address: store.address || {},
          phone: store.phone || storeDetails.phone,
          email: store.email || storeDetails.email
        };
      }
    } catch (storeError) {
      console.log('Store details not found, using defaults');
    }

    const invoiceData = {
      invoiceNumber: order.invoice.invoiceNumber,
      orderId: order.orderId,
      customerDetails: order.customerDetails,
      items: order.items,
      orderSummary: order.orderSummary,
      paymentStatus: order.paymentStatus,
      generatedAt: order.invoice.generatedAt,
      storeDetails,
      docType: 'invoice'
    };

    if (format === 'json') {
      return res.json({
        success: true,
        message: 'Invoice data retrieved successfully',
        data: invoiceData
      });
    }

    // Generate PDF - SINGLE PROFESSIONAL VERSION
    console.log(`Starting PDF generation for order: ${orderId}`);
    pdfBuffer = await generateProfessionalInvoicePDF(invoiceData);
    console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    
    // Validate PDF buffer thoroughly
    if (!pdfBuffer) {
      throw new Error('PDF buffer is null');
    }
    
    if (!Buffer.isBuffer(pdfBuffer)) {
      throw new Error('Generated content is not a valid buffer');
    }
    
    if (pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }
    
    if (pdfBuffer.length < 1000) {
      throw new Error('Generated PDF buffer is suspiciously small (possibly corrupted)');
    }

    // Verify PDF starts with correct header
    const pdfHeader = pdfBuffer.subarray(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      throw new Error('Generated buffer is not a valid PDF file');
    }
    
    console.log(`PDF validation passed. Final size: ${pdfBuffer.length} bytes`);
    
    // Set optimized headers for reliable download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Fix filename encoding issues
    const dispositionType = disposition === 'download' ? 'attachment' : 'inline';
    const cleanOrderId = orderId.replace(/[^a-zA-Z0-9]/g, ''); // Remove special characters
    const filename = `invoice_${cleanOrderId}.pdf`; // Use underscore instead of dash
    
    // Set headers with proper encoding
    res.setHeader('Content-Disposition', `${dispositionType}; filename=${filename}; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    
    // Better cache control for reliable downloads
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Additional headers for better browser compatibility
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    // Send PDF buffer
    console.log(`Sending PDF for order ${orderId}`);
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Error in getInvoicePDF:', error);
    
    // Clean up memory if PDF was generated
    if (pdfBuffer) {
      pdfBuffer = null;
    }
    
    // Handle specific error types
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      return res.status(408).json({
        success: false,
        message: 'Request timed out due to network issues. Please check your connection and try again.',
        error: 'NETWORK_TIMEOUT',
        retry: true
      });
    }
    
    if (error.message.includes('PDF') || error.message.includes('buffer')) {
      return res.status(500).json({
        success: false,
        message: 'PDF generation failed. This might be temporary. Please try again.',
        error: 'PDF_ERROR',
        retry: true
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice PDF',
      error: error.message,
      retry: true
    });
  }
};

// Test PDF generation system - SINGLE PROFESSIONAL PDF
const testPdfGeneration = async (req, res) => {
  try {
    console.log('Starting PDF generation test...');
    
    // Create sample invoice data for testing
    const testInvoiceData = {
      invoiceNumber: `TEST-INV-${Date.now()}`,
      orderId: `TEST-ORD-${Date.now()}`,
      customerDetails: {
        name: 'Test Customer',
        phoneNumber: '+91 9876543210',
        whatsappNumber: '+91 9876543210',
        address: {
          street: '123 Test Street',
          district: 'Test District',
          state: 'Tamil Nadu',
          pincode: '600001'
        }
      },
      items: [
        {
          productId: {
            name: 'Sample Firework 1',
            productCode: 'SF001'
          },
          quantity: 2,
          offerPrice: 100
        },
        {
          productId: {
            name: 'Sample Firework 2', 
            productCode: 'SF002'
          },
          quantity: 1,
          offerPrice: 150
        }
      ],
      orderSummary: {
        totalItems: 3,
        totalOfferPrice: 350,
        totalSavings: 50
      },
      paymentStatus: 'paid',
      generatedAt: new Date(),
      storeDetails: {
        logo: null,
        name: 'Omshanmukapyropark Agency',
        address: {},
        phone: '+91 9942494345',
        email: 'osppsivakasi@gmail.com'
      }
    };

    // Test Professional PDF Generator
    console.log('Testing Professional PDF generator...');
    const startTime = Date.now();
    const pdfBuffer = await generateProfessionalInvoicePDF(testInvoiceData);
    const endTime = Date.now();
    
    const testResults = {
      timestamp: new Date(),
      testData: {
        invoiceNumber: testInvoiceData.invoiceNumber,
        itemCount: testInvoiceData.items.length,
        totalAmount: testInvoiceData.orderSummary.totalOfferPrice
      },
      result: {
        success: true,
        bufferSize: pdfBuffer.length,
        generationTime: endTime - startTime,
        isValidPdf: pdfBuffer.subarray(0, 4).toString() === '%PDF',
        message: 'Professional PDF generation successful'
      },
      summary: {
        status: 'SUCCESS',
        recommendation: 'PDF generation is working properly'
      }
    };

    console.log(`PDF test completed successfully: ${pdfBuffer.length} bytes in ${endTime - startTime}ms`);

    res.json({
      success: true,
      message: 'PDF generation test completed',
      data: testResults
    });

  } catch (error) {
    console.error('Error in PDF test:', error);
    res.status(500).json({
      success: false,
      message: 'PDF generation test failed',
      error: error.message
    });
  }
};

// Auto-generate invoices for all paid orders that don't have invoices
const generateInvoicesForPaidOrders = async (req, res) => {
  try {
    // Find all paid orders without invoices
    const ordersWithoutInvoices = await Order.find({
      paymentStatus: 'paid',
      'invoice.invoiceNumber': { $exists: false }
    }).select('orderId paymentStatus createdAt');

    if (ordersWithoutInvoices.length === 0) {
      return res.json({
        success: true,
        message: 'All paid orders already have invoices',
        data: {
          processedOrders: 0,
          totalPaidOrders: await Order.countDocuments({ paymentStatus: 'paid' })
        }
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    // Generate invoices for each order
    for (const order of ordersWithoutInvoices) {
      try {
        await order.generateInvoice();
        successCount++;
        results.push({
          orderId: order.orderId,
          status: 'success',
          invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${order.orderId}`
        });
        console.log(`✅ Invoice generated for order: ${order.orderId}`);
      } catch (error) {
        failedCount++;
        results.push({
          orderId: order.orderId,
          status: 'failed',
          error: error.message
        });
        console.error(`❌ Failed to generate invoice for order ${order.orderId}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Invoice generation completed. ${successCount} successful, ${failedCount} failed.`,
      data: {
        processedOrders: ordersWithoutInvoices.length,
        successCount,
        failedCount,
        results
      }
    });

  } catch (error) {
    console.error('Error auto-generating invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-generate invoices',
      error: error.message
    });
  }
};

// Upload bill image for an order
const uploadBillImage = async (req, res) => {
  try {
    const cloudinary = require('../config/cloudinary');
    const { orderId } = req.params;
    const { billNotes } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Bill image is required'
      });
    }

    // Find the order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          folder: 'bill-images',
          public_id: `bill-${orderId}-${Date.now()}`,
          resource_type: 'auto' // Handles both images and PDFs
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // Update order with bill image details
    if (!order.invoice) {
      order.invoice = {};
    }

    // Delete old bill image from Cloudinary if exists
    if (order.invoice.billImagePublicId) {
      try {
        await cloudinary.uploader.destroy(order.invoice.billImagePublicId);
      } catch (deleteError) {
        console.warn('Failed to delete old bill image from Cloudinary:', deleteError);
      }
    }

    order.invoice.billImage = uploadResult.secure_url;
    order.invoice.billImagePublicId = uploadResult.public_id;
    order.invoice.billImageUploadedAt = new Date();
    order.invoice.billImageUploadedBy = req.user?.email || 'admin';
    order.invoice.billNotes = billNotes || '';

    await order.save();

    res.json({
      success: true,
      message: 'Bill image uploaded successfully to Cloudinary',
      data: {
        orderId: order.orderId,
        billImageUrl: uploadResult.secure_url,
        billImagePublicId: uploadResult.public_id,
        uploadedAt: order.invoice.billImageUploadedAt,
        uploadedBy: order.invoice.billImageUploadedBy,
        billNotes: order.invoice.billNotes
      }
    });

  } catch (error) {
    console.error('Error uploading bill image to Cloudinary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload bill image to Cloudinary',
      error: error.message
    });
  }
};

// Get all invoices with pagination
const getAllInvoices = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search,
      startDate,
      endDate 
    } = req.query;

    const skip = (page - 1) * limit;
    let query = { 
      'invoice.invoiceNumber': { $exists: true }
    };

    // Apply search filter
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'invoice.invoiceNumber': { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } },
        { 'customerDetails.phoneNumber': { $regex: search, $options: 'i' } }
      ];
    }

    // Apply date range filter
    if (startDate || endDate) {
      query['invoice.generatedAt'] = {};
      if (startDate) query['invoice.generatedAt'].$gte = new Date(startDate);
      if (endDate) query['invoice.generatedAt'].$lte = new Date(endDate);
    }

    // Get invoices with pagination
    const invoices = await Order.find(query)
      .select('orderId customerDetails orderSummary paymentStatus invoice createdAt')
      .sort({ 'invoice.generatedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalInvoices = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalInvoices / limit);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalInvoices,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message
    });
  }
};

// Get orders by phone number (for customer module)
const getOrdersByPhone = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { paymentStatus } = req.query;

    let query = { 'customerDetails.phoneNumber': phoneNumber };
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('Error fetching orders by phone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Upload payment screenshot (for customer module)
const uploadPaymentScreenshot = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No payment screenshot uploaded'
      });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order with payment screenshot
    order.paymentScreenshot = {
      url: `/public/uploads/${req.file.filename}`,
      uploadedAt: new Date()
    };
    
    await order.save();

    res.json({
      success: true,
      message: 'Payment screenshot uploaded successfully',
      data: order
    });

  } catch (error) {
    console.error('Error uploading payment screenshot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload payment screenshot',
      error: error.message
    });
  }
};

// Get states (for customer module)
const getStates = async (req, res) => {
  try {
    // Return Indian states
    const states = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
      'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
      'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
      'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ];

    res.json({
      success: true,
      data: states
    });

  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states',
      error: error.message
    });
  }
};

// Get districts by state (for customer module)
const getDistricts = async (req, res) => {
  try {
    const { state } = req.params;
    
    // This is a simplified version - in a real app, you'd have a proper districts database
    const districts = {
      'Kerala': ['Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'],
      'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukudi'],
      'Karnataka': ['Bengaluru Urban', 'Mysuru', 'Tumakuru', 'Kolar', 'Chikkaballapura', 'Bangalore Rural', 'Ramanagara', 'Hassan', 'Mandya', 'Chamrajanagar']
    };

    const stateDistricts = districts[state] || [];

    res.json({
      success: true,
      data: stateDistricts
    });

  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts',
      error: error.message
    });
  }
};

// Create order (for customer module)
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Generate unique order ID in format: ORD-DDMMYY-XXX (matching date + number of day format)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const dateString = `${day}${month}${year}`;
    
    // Get start and end of the day for counting orders
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Count existing orders for this date
    const existingOrdersCount = await Order.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    // Generate next order number (001, 002, 003, etc.)
    const orderNumber = String(existingOrdersCount + 1).padStart(3, '0');
    
    // Combine to create final order ID
    const orderId = `ORD-${dateString}-${orderNumber}`;
    
    const order = new Order({
      ...orderData,
      orderId,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Debug invoice generation
const debugInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get order with populated product details
    const order = await Order.findOne({ orderId })
      .populate('items.productId', 'name productCode');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get store details
    let storeDetails = null;
    try {
      const store = await Store.findOne({});
      storeDetails = {
        logo: store?.logo?.url || null,
        name: store?.name || 'Omshanmukapyropark  Agency',
        address: store?.address || {},
        phone: store?.phone || '+91 9942494345',
        email: store?.email || 'osppsivakasi@gmail.com'
      };
    } catch (storeError) {
      console.log('Store details not found, using defaults');
    }

    // Prepare invoice data
    const invoiceData = {
      invoiceNumber: order.invoice?.invoiceNumber || `INV-${orderId}-DEBUG`,
      orderId: order.orderId,
      customerDetails: order.customerDetails,
      items: order.items,
      orderSummary: order.orderSummary,
      paymentStatus: order.paymentStatus,
      generatedAt: order.invoice?.generatedAt || new Date(),
      storeDetails
    };

    // Test both PDF generators
    const testResults = {
      order: {
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        hasInvoice: !!order.invoice?.invoiceNumber,
        itemCount: order.items.length
      },
      invoiceData: {
        invoiceNumber: invoiceData.invoiceNumber,
        customerName: invoiceData.customerDetails.name,
        totalAmount: invoiceData.orderSummary.totalOfferPrice,
        itemsWithProducts: invoiceData.items.map(item => ({
          hasProduct: !!item.productId,
          productName: item.productId?.name || 'Missing',
          productCode: item.productId?.productCode || 'N/A',
          quantity: item.quantity,
          price: item.offerPrice
        }))
      },
      storeDetails: storeDetails,
      testResults: {}
    };

    // Test PDFKit generator
    try {
      const { generatePDFKitInvoicePDF } = require('../utils/pdfkitGenerator');
      const pdfBuffer = await generatePDFKitInvoicePDF(invoiceData);
      testResults.testResults.pdfkit = {
        success: true,
        bufferSize: pdfBuffer.length,
        message: 'PDFKit generation successful'
      };
    } catch (pdfkitError) {
      testResults.testResults.pdfkit = {
        success: false,
        error: pdfkitError.message,
        message: 'PDFKit generation failed'
      };
    }

    // Test html-pdf-node generator
    try {
      const { generateInvoicePDF } = require('../utils/pdfGenerator');
      const pdfBuffer = await generateInvoicePDF(invoiceData);
      testResults.testResults.htmlPdf = {
        success: true,
        bufferSize: pdfBuffer.length,
        message: 'html-pdf-node generation successful'
      };
    } catch (htmlPdfError) {
      testResults.testResults.htmlPdf = {
        success: false,
        error: htmlPdfError.message,
        message: 'html-pdf-node generation failed'
      };
    }

    res.json({
      success: true,
      message: 'Invoice debug information',
      data: testResults
    });

  } catch (error) {
    console.error('Error in debug invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug invoice',
      error: error.message
    });
  }
};

// Generate estimate (quotation) before payment
const getEstimatePDF = async (req, res) => {
  let order = null;
  try {
    const { orderId } = req.params;
    const { phone } = req.query;
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');

    // Build query - if phone is provided (public access), verify phone number
    let query = { orderId };
    if (phone) {
      query['customerDetails.mobile'] = phone;
    }

    try {
      order = await ordersCollection.findOne(query, { maxTimeMS: 8000 });
    } catch (err) {
      return res.status(408).json({ success: false, message: 'Database timeout while fetching order', error: 'TIMEOUT_ERROR' });
    }

    if (!order) {
      const message = phone ? 'Order not found or phone number does not match' : 'Order not found';
      return res.status(404).json({ success: false, message });
    }

    // Only allow estimate download for unpaid orders
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This order is already paid. Please download the invoice instead.'
      });
    }

    // Get store details (best effort)
    let store = null;
    try {
      store = await db.collection('stores').findOne({}, { maxTimeMS: 3000 });
    } catch (e) { /* ignore */ }

    const storeDetails = {
      logo: store?.logo?.url || null,
      name: store?.name || 'OMS Agency',
      address: store?.address || {},
      phone: store?.phone || '+91 9942494345',
      email: store?.email || 'osppsivakasi@gmail.com'
    };

    // For estimates, don't use invoice number
    const invoiceData = {
      invoiceNumber: '', // No invoice number for estimates
      orderId: order.orderId,
      customerDetails: order.customerDetails,
      items: order.items,
      orderSummary: order.orderSummary,
      paymentStatus: order.paymentStatus,
      generatedAt: new Date(),
      generatedBy: 'Admin System',
      storeDetails,
      docType: 'estimate' // Explicitly set as estimate
    };

    const pdfBuffer = await generateProfessionalInvoicePDF(invoiceData);

    res.setHeader('Content-Type', 'application/pdf');
    const filename = `estimate_${orderId.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Error generating estimate PDF:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate estimate PDF', error: error.message });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updatePaymentStatus,
  updateOrderStatus,
  updateTrackingInfo,
  updateAdminNotes,
  generateInvoice,
  uploadDeliveryImage,
  deleteDeliveryImage,
  getOrderForTracking,
  getInvoicePDF,
  debugInvoice,
  testPdfGeneration,
  generateInvoicesForPaidOrders,
  uploadBillImage,
  getAllInvoices,
  getOrdersByPhone,
  uploadPaymentScreenshot,
  getStates,
  getDistricts,
  createOrder,
  getEstimatePDF
};