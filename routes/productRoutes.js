const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const { upload, handleMulterError } = require('../middlewares/uploadMiddleware');
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  hardDeleteProduct,
  restoreProduct,
  getDashboardStats,
  getProductCountsByCategory,
  checkProductCodeAvailability,
  getFeaturedProducts,
  getBestSellerProducts,
  toggleFeaturedStatus,
  toggleBestSellerStatus,
  toggleActiveStatus,
} = require('../controllers/productController');

router.post('/', protect, upload.array('images', 3), handleMulterError, createProduct);
router.get('/', getAllProducts);
router.get('/dashboard/stats', protect, getDashboardStats);
router.get('/stats/categories', getProductCountsByCategory);
router.get('/check-code/:productCode', checkProductCodeAvailability);
router.get('/featured', getFeaturedProducts);
router.get('/best-sellers', getBestSellerProducts);
router.patch('/:id/toggle-featured', protect, toggleFeaturedStatus);
router.patch('/:id/toggle-bestseller', protect, toggleBestSellerStatus);
router.patch('/:id/toggle-active', protect, toggleActiveStatus);
router.get('/:id', getProductById);
router.put('/:id', protect, upload.array('images', 3), handleMulterError, updateProduct);
router.delete('/:id', protect, deleteProduct); // Soft delete
router.delete('/:id/hard', protect, hardDeleteProduct); // Hard delete (admin only)
router.patch('/:id/restore', protect, restoreProduct); // Restore soft deleted product

module.exports = router;
