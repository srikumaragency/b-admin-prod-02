const multer = require('multer');
const path = require('path');

// Store file in memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed (jpg, jpeg, png, gif)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  console.log('Multer error handler triggered:', error.message, error.code);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum file size allowed is 5MB.',
        error: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Please select fewer files.',
        error: 'TOO_MANY_FILES'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.',
        error: 'UNEXPECTED_FILE'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error.',
      error: error.code
    });
  }
  
  // Handle custom file filter errors
  if (error.message === 'Only images are allowed (jpg, jpeg, png, gif)') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed (jpg, jpeg, png, gif).',
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  // Pass other errors to next middleware
  next(error);
};

module.exports = { upload, handleMulterError };
