const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Fast dashboard stats - optimized for speed
router.get('/stats/fast', async (req, res) => {
  try {
    console.log('Fetching fast dashboard stats...');
    
    // Use aggregation for fast stats calculation
    const [orderStats, productStats, categoryStats] = await Promise.all([
      // Order stats with timeout
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            paidOrders: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
            },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
            },
            processingOrders: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'processing'] }, 1, 0] }
            },
            shippedOrders: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'shipped'] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] }
            }
          }
        }
      ]).maxTimeMS(5000), // 5 second timeout
      
      // Product stats
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            inactiveProducts: {
              $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
            }
          }
        }
      ]).maxTimeMS(3000), // 3 second timeout
      
      // Category stats
      Category.countDocuments().maxTimeMS(2000) // 2 second timeout
    ]);

    // Get today's orders count
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const newOrdersToday = await Order.countDocuments({
      createdAt: { $gte: startOfToday }
    }).maxTimeMS(2000);

    const orderStatsResult = orderStats[0] || {
      totalOrders: 0,
      paidOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0
    };

    const productStatsResult = productStats[0] || {
      totalProducts: 0,
      activeProducts: 0,
      inactiveProducts: 0
    };

    const response = {
      success: true,
      data: {
        // Order stats
        ...orderStatsResult,
        newOrdersToday,
        
        // Product stats
        totalProducts: productStatsResult.totalProducts,
        activeProducts: productStatsResult.activeProducts,
        inactiveProducts: productStatsResult.inactiveProducts,
        
        // Category stats
        totalCategories: categoryStats,
        
        // Additional quick stats
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('Fast dashboard stats completed successfully');
    res.json(response);

  } catch (error) {
    console.error('Error fetching fast dashboard stats:', error);
    
    // Return minimal stats if query fails
    res.json({
      success: true,
      data: {
        totalOrders: 0,
        paidOrders: 0,
        pendingOrders: 0,
        newOrdersToday: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        totalProducts: 0,
        activeProducts: 0,
        inactiveProducts: 0,
        totalCategories: 0,
        lastUpdated: new Date().toISOString(),
        note: 'Stats temporarily unavailable - using fallback data'
      }
    });
  }
});

module.exports = router;