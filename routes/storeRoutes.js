const express = require('express');
const router = express.Router();
const { 
  getLogo, 
  uploadLogo, 
  deleteLogo, 
  uploadQRCode, 
  deleteQRCode, 
  getSettings, 
  updateMinimumOrderValue, 
  updateContactInfo,
  getPackagingCostSettings,
  updatePackagingCostSettings,
  calculatePackagingCost
} = require('../controllers/storeController');
const authMiddleware = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

// Debug endpoint to test authentication
router.get('/test-auth', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email
    }
  });
});

// Get logo
router.get('/logo', authMiddleware, getLogo);

// Upload/Update logo
router.post('/logo', authMiddleware, upload.single('logo'), uploadLogo);

// Delete logo
router.delete('/logo', authMiddleware, deleteLogo);

// Upload/Update QR code
router.post('/qr-code', authMiddleware, upload.single('qrCode'), uploadQRCode);

// Delete QR code
router.delete('/qr-code', authMiddleware, deleteQRCode);

// Get store settings (including minimum order value)
router.get('/settings', authMiddleware, getSettings);

// Update minimum order value
router.put('/minimum-order-value', authMiddleware, updateMinimumOrderValue);

// Update contact information
router.put('/contact-info', authMiddleware, updateContactInfo);

// Get packaging cost settings
router.get('/packaging-cost-settings', authMiddleware, getPackagingCostSettings);

// Update packaging cost settings
router.put('/packaging-cost-settings', authMiddleware, updatePackagingCostSettings);

// Calculate packaging cost for order value (utility endpoint)
router.get('/calculate-packaging-cost', authMiddleware, calculatePackagingCost);

// Test route for contact-info (for debugging)
router.get('/contact-info-test', (req, res) => {
  res.json({ success: true, message: 'Contact info route is working' });
});

// Test PUT route without auth (for debugging)
router.put('/contact-info-test', (req, res) => {
  console.log('PUT contact-info-test called with body:', req.body);
  res.json({ success: true, message: 'PUT contact info route is working', body: req.body });
});

module.exports = router;