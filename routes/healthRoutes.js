const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: {
        status: 'unknown',
        connected: false
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    };

    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthStatus.database.status = 'connected';
      healthStatus.database.connected = true;
      
      // Test database with a simple query
      await mongoose.connection.db.admin().ping();
      healthStatus.database.ping = 'success';
    } else {
      healthStatus.database.status = 'disconnected';
      healthStatus.database.connected = false;
      healthStatus.status = 'unhealthy';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        status: 'error',
        connected: false
      }
    });
  }
});

// Fast health check (no database ping)
router.get('/api/health/fast', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connected: mongoose.connection.readyState === 1
    }
  });
});

// CORS debug endpoint
router.get('/cors-debug', (req, res) => {
  res.status(200).json({
    origin: req.headers.origin,
    headers: req.headers,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    message: 'CORS debug endpoint - if you can see this, CORS is working'
  });
});

module.exports = router;