const multer = require('multer');

// Middleware to validate file size before processing
const validateFileSize = (maxSize = 1024 * 1024) => { // Default 1MB
  return (req, res, next) => {
    // Check if request has files
    if (!req.files && !req.file) {
      return next();
    }
    
    const files = req.files || [req.file];
    
    for (let file of files) {
      if (file && file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File "${file.originalname}" is too large. Maximum file size allowed is ${Math.round(maxSize / (1024 * 1024))}MB.`,
          error: 'FILE_TOO_LARGE'
        });
      }
    }
    
    next();
  };
};

// Middleware to handle file upload errors gracefully
const handleUploadError = (error, req, res, next) => {
  console.error('File upload error:', error);
  
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum file size allowed is 1MB.',
          error: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Please select fewer files.',
          error: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field.',
          error: 'UNEXPECTED_FILE'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error.',
          error: error.code
        });
    }
  }
  
  if (error.message === 'Only images are allowed (jpg, jpeg, png)') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed (jpg, jpeg, png).',
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  // Pass other errors to the global error handler
  next(error);
};

module.exports = {
  validateFileSize,
  handleUploadError
};