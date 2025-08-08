const PriceList = require('../models/PriceList');

// Upload PDF to MongoDB and save to database
const uploadPriceList = async (req, res) => {
  try {
    const { documentName } = req.body;
    const adminId = req.admin.id;

    // Validate required fields
    if (!documentName) {
      return res.status(400).json({
        success: false,
        message: 'Document name is required'
      });
    }

    // Check if a price list already exists (only one allowed)
    const existingPriceList = await PriceList.findOne();
    if (existingPriceList) {
      return res.status(400).json({
        success: false,
        message: 'A price list already exists. Please delete the existing one before uploading a new one.'
      });
    }

    // Check if file is provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required'
      });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    // Validate file size (50MB = 52428800 bytes - reasonable limit for MongoDB)
    if (req.file.size > 52428800) {
      return res.status(400).json({
        success: false,
        message: 'File size cannot exceed 50MB'
      });
    }

    // Save to database with PDF data
    const priceList = new PriceList({
      documentName: documentName.trim(),
      pdfData: req.file.buffer,
      mimeType: req.file.mimetype,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: adminId
    });

    await priceList.save();

    // Populate the uploadedBy field for response (exclude pdfData from response)
    await priceList.populate('uploadedBy', 'username email');

    // Create response without pdfData to avoid sending large buffer
    const responseData = {
      _id: priceList._id,
      documentName: priceList.documentName,
      originalFileName: priceList.originalFileName,
      mimeType: priceList.mimeType,
      fileSize: priceList.fileSize,
      isActive: priceList.isActive,
      uploadedBy: priceList.uploadedBy,
      createdAt: priceList.createdAt,
      updatedAt: priceList.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Price list uploaded successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Upload price list error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to upload price list',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all price lists
const getAllPriceLists = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (search) {
      filter.documentName = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get price lists with pagination (exclude pdfData from response)
    const priceLists = await PriceList.find(filter)
      .select('-pdfData') // Exclude pdfData field
      .populate('uploadedBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await PriceList.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: priceLists,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get price lists error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price lists',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get single price list by ID
const getPriceListById = async (req, res) => {
  try {
    const { id } = req.params;

    const priceList = await PriceList.findById(id)
      .select('-pdfData') // Exclude pdfData field
      .populate('uploadedBy', 'username email');

    if (!priceList) {
      return res.status(404).json({
        success: false,
        message: 'Price list not found'
      });
    }

    res.status(200).json({
      success: true,
      data: priceList
    });

  } catch (error) {
    console.error('Get price list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price list',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update price list
const updatePriceList = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentName, isActive } = req.body;

    const priceList = await PriceList.findById(id);
    if (!priceList) {
      return res.status(404).json({
        success: false,
        message: 'Price list not found'
      });
    }

    // Update fields
    if (documentName !== undefined) priceList.documentName = documentName.trim();
    if (isActive !== undefined) priceList.isActive = isActive;

    // If new PDF file is provided, replace the old one
    if (req.file) {
      // Validate file type
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({
          success: false,
          message: 'Only PDF files are allowed'
        });
      }

      // Validate file size (50MB = 52428800 bytes)
      if (req.file.size > 52428800) {
        return res.status(400).json({
          success: false,
          message: 'File size cannot exceed 50MB'
        });
      }

      // Update file information
      priceList.pdfData = req.file.buffer;
      priceList.mimeType = req.file.mimetype;
      priceList.originalFileName = req.file.originalname;
      priceList.fileSize = req.file.size;
    }

    await priceList.save();
    await priceList.populate('uploadedBy', 'username email');

    // Create response without pdfData
    const responseData = {
      _id: priceList._id,
      documentName: priceList.documentName,
      originalFileName: priceList.originalFileName,
      mimeType: priceList.mimeType,
      fileSize: priceList.fileSize,
      isActive: priceList.isActive,
      uploadedBy: priceList.uploadedBy,
      createdAt: priceList.createdAt,
      updatedAt: priceList.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Price list updated successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Update price list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update price list',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete price list
const deletePriceList = async (req, res) => {
  try {
    const { id } = req.params;

    const priceList = await PriceList.findById(id);
    if (!priceList) {
      return res.status(404).json({
        success: false,
        message: 'Price list not found'
      });
    }

    // Delete from database (PDF data is automatically removed with the document)
    await PriceList.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Price list deleted successfully'
    });

  } catch (error) {
    console.error('Delete price list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete price list',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Toggle active status
const togglePriceListStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const priceList = await PriceList.findById(id);
    if (!priceList) {
      return res.status(404).json({
        success: false,
        message: 'Price list not found'
      });
    }

    priceList.isActive = !priceList.isActive;
    await priceList.save();
    await priceList.populate('uploadedBy', 'username email');

    // Create response without pdfData
    const responseData = {
      _id: priceList._id,
      documentName: priceList.documentName,
      originalFileName: priceList.originalFileName,
      mimeType: priceList.mimeType,
      fileSize: priceList.fileSize,
      isActive: priceList.isActive,
      uploadedBy: priceList.uploadedBy,
      createdAt: priceList.createdAt,
      updatedAt: priceList.updatedAt
    };

    res.status(200).json({
      success: true,
      message: `Price list ${priceList.isActive ? 'activated' : 'deactivated'} successfully`,
      data: responseData
    });

  } catch (error) {
    console.error('Toggle price list status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle price list status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get active price list for customers (public endpoint)
const getActivePriceList = async (req, res) => {
  try {
    const priceList = await PriceList.findOne({ isActive: true })
      .select('documentName originalFileName mimeType fileSize createdAt updatedAt');

    if (!priceList) {
      return res.status(404).json({
        success: false,
        message: 'No active price list found'
      });
    }

    res.status(200).json({
      success: true,
      data: priceList
    });

  } catch (error) {
    console.error('Get active price list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active price list',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Download PDF file (public endpoint)
const downloadPriceList = async (req, res) => {
  try {
    const { id } = req.params;

    const priceList = await PriceList.findById(id)
      .select('documentName originalFileName mimeType pdfData fileSize isActive');

    if (!priceList) {
      return res.status(404).json({
        success: false,
        message: 'Price list not found'
      });
    }

    if (!priceList.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Price list is not active'
      });
    }

    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', priceList.mimeType);
    res.setHeader('Content-Length', priceList.fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${priceList.originalFileName}"`);
    
    // Send the PDF data
    res.send(priceList.pdfData);

  } catch (error) {
    console.error('Download price list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download price list',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Download active price list (public endpoint)
const downloadActivePriceList = async (req, res) => {
  try {
    const priceList = await PriceList.findOne({ isActive: true })
      .select('documentName originalFileName mimeType pdfData fileSize');

    if (!priceList) {
      return res.status(404).json({
        success: false,
        message: 'No active price list found'
      });
    }

    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', priceList.mimeType);
    res.setHeader('Content-Length', priceList.fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${priceList.originalFileName}"`);
    
    // Send the PDF data
    res.send(priceList.pdfData);

  } catch (error) {
    console.error('Download active price list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download active price list',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  uploadPriceList,
  getAllPriceLists,
  getPriceListById,
  updatePriceList,
  deletePriceList,
  togglePriceListStatus,
  getActivePriceList,
  downloadPriceList,
  downloadActivePriceList
};