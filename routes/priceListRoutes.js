const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  uploadPriceList,
  getAllPriceLists,
  getPriceListById,
  updatePriceList,
  deletePriceList,
  togglePriceListStatus,
  getActivePriceList,
  downloadPriceList,
  downloadActivePriceList
} = require('../controllers/priceListController');

const router = express.Router();

// Configure multer for file upload (memory storage for Cloudinary)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Only allow PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (reasonable for MongoDB)
    files: 1 // Only one file at a time
  }
});

// Public routes (no authentication required)
router.get('/active', getActivePriceList);
router.get('/download/active', downloadActivePriceList);
router.get('/download/:id', downloadPriceList);

// Apply authentication middleware to admin routes
router.use(authMiddleware);

// Admin routes
router.post('/upload', upload.single('pdf'), uploadPriceList);
router.get('/', getAllPriceLists);
router.get('/:id', getPriceListById);
router.put('/:id', upload.single('pdf'), updatePriceList);
router.delete('/:id', deletePriceList);
router.patch('/:id/toggle-status', togglePriceListStatus);

module.exports = router;