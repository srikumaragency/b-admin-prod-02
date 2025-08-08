const express = require('express');
const router = express.Router();
const authenticateAdmin = require('../middlewares/authMiddleware');
const quickShoppingController = require('../controllers/quickShoppingController');

// Get categories with all products (for initial setup) - temporarily no auth for testing
router.get('/categories-with-products', quickShoppingController.getCategoriesWithProducts);

// All other routes require authentication
router.use(authenticateAdmin);

// Get saved quick shopping order
router.get('/order', quickShoppingController.getQuickShoppingOrder);

// Save quick shopping order
router.post('/order', quickShoppingController.saveQuickShoppingOrder);

// Reset quick shopping order
router.delete('/order', quickShoppingController.resetQuickShoppingOrder);

module.exports = router;