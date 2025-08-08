const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Customer order routes (no authentication required for customer access)
router.get('/orders/phone/:phoneNumber', orderController.getOrdersByPhone);
router.get('/orders/track/:orderId', orderController.getOrderById);
router.get('/orders/:orderId/invoice', orderController.getInvoicePDF);
router.post('/orders/:orderId/upload-bill-image', orderController.uploadBillImage);
router.post('/orders/:orderId/payment-screenshot', orderController.uploadPaymentScreenshot);
router.get('/orders/states', orderController.getStates);
router.get('/orders/districts/:state', orderController.getDistricts);
router.post('/orders', orderController.createOrder);

module.exports = router;