const Store = require('../models/Store');
const cloudinary = require('../config/cloudinary');

// Get store logo
const getLogo = async (req, res) => {
  try {
    const store = await Store.getStore();
    res.json({
      success: true,
      data: store.logo
    });
  } catch (error) {
    console.error('Error fetching logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logo',
      error: error.message
    });
  }
};

// Upload/Update store logo
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file provided'
      });
    }

    const store = await Store.getStore();
    
    // Delete existing logo from Cloudinary if it exists
    if (store.logo.publicId) {
      try {
        await cloudinary.uploader.destroy(store.logo.publicId);
      } catch (deleteError) {
        console.warn('Failed to delete old logo from Cloudinary:', deleteError);
      }
    }

    // Upload new logo to Cloudinary using upload_stream for memory storage
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: 'store/logos',
        transformation: [
          { width: 500, height: 500, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' }
        ]
      }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
      
      uploadStream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    // Update store with new logo
    store.logo = {
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date()
    };

    await store.save();

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: store.logo
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: error.message
    });
  }
};

// Delete store logo
const deleteLogo = async (req, res) => {
  try {
    const store = await Store.getStore();
    
    if (!store.logo.publicId) {
      return res.status(404).json({
        success: false,
        message: 'No logo found to delete'
      });
    }

    // Delete logo from Cloudinary
    try {
      await cloudinary.uploader.destroy(store.logo.publicId);
    } catch (deleteError) {
      console.warn('Failed to delete logo from Cloudinary:', deleteError);
    }

    // Remove logo from store
    store.logo = {
      url: null,
      publicId: null,
      uploadedAt: null
    };

    await store.save();

    res.json({
      success: true,
      message: 'Logo deleted successfully',
      data: store.logo
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete logo',
      error: error.message
    });
  }
};

// Get store settings (including minimum order value and contact info)
const getSettings = async (req, res) => {
  try {
    const store = await Store.getStore();
    res.json({
      success: true,
      data: {
        minimumOrderValue: store.minimumOrderValue,
        contactEmail: store.contactEmail,
        contactPhone: store.contactPhone,
        upiId: store.upiId,
        qrCode: store.qrCode,
        promotionalOffer: store.promotionalOffer,
        logo: store.logo
      }
    });
  } catch (error) {
    console.error('Error fetching store settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store settings',
      error: error.message
    });
  }
};

// Update minimum order value
const updateMinimumOrderValue = async (req, res) => {
  try {
    const { minimumOrderValue } = req.body;

    if (!minimumOrderValue || minimumOrderValue < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid minimum order value'
      });
    }

    const store = await Store.getStore();
    store.minimumOrderValue = minimumOrderValue;
    await store.save();

    res.json({
      success: true,
      message: 'Minimum order value updated successfully',
      data: {
        minimumOrderValue: store.minimumOrderValue
      }
    });
  } catch (error) {
    console.error('Error updating minimum order value:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update minimum order value',
      error: error.message
    });
  }
};

// Update contact information
const updateContactInfo = async (req, res) => {
  try {
    console.log('updateContactInfo called with body:', req.body);
    const { contactEmail, contactPhone, upiId, promotionalOffer } = req.body;

    // Basic validation
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (contactPhone && !/^\d{10}$/.test(contactPhone.replace(/\D/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }

    if (promotionalOffer && promotionalOffer.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Promotional offer text must be less than 200 characters'
      });
    }

    const store = await Store.getStore();
    
    // Update only provided fields
    if (contactEmail !== undefined) store.contactEmail = contactEmail;
    if (contactPhone !== undefined) store.contactPhone = contactPhone;
    if (upiId !== undefined) store.upiId = upiId;
    if (promotionalOffer !== undefined) store.promotionalOffer = promotionalOffer;
    
    await store.save();

    res.json({
      success: true,
      message: 'Contact information updated successfully',
      data: {
        contactEmail: store.contactEmail,
        contactPhone: store.contactPhone,
        upiId: store.upiId,
        promotionalOffer: store.promotionalOffer
      }
    });
  } catch (error) {
    console.error('Error updating contact information:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact information',
      error: error.message
    });
  }
};

// Upload/Update QR Code
const uploadQRCode = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No QR code file provided'
      });
    }

    const store = await Store.getStore();
    
    // Delete existing QR code from Cloudinary if it exists
    if (store.qrCode.publicId) {
      try {
        await cloudinary.uploader.destroy(store.qrCode.publicId);
      } catch (deleteError) {
        console.warn('Failed to delete old QR code from Cloudinary:', deleteError);
      }
    }

    // Upload new QR code to Cloudinary using upload_stream for memory storage
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: 'store/qr-codes',
        transformation: [
          { width: 500, height: 500, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' }
        ]
      }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
      
      uploadStream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    // Update store with new QR code
    store.qrCode = {
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date()
    };

    await store.save();

    res.json({
      success: true,
      message: 'QR code uploaded successfully',
      data: store.qrCode
    });
  } catch (error) {
    console.error('Error uploading QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload QR code',
      error: error.message
    });
  }
};

// Delete QR Code
const deleteQRCode = async (req, res) => {
  try {
    const store = await Store.getStore();
    
    if (!store.qrCode.publicId) {
      return res.status(404).json({
        success: false,
        message: 'No QR code found to delete'
      });
    }

    // Delete QR code from Cloudinary
    try {
      await cloudinary.uploader.destroy(store.qrCode.publicId);
    } catch (deleteError) {
      console.warn('Failed to delete QR code from Cloudinary:', deleteError);
    }

    // Remove QR code from store
    store.qrCode = {
      url: null,
      publicId: null,
      uploadedAt: null
    };

    await store.save();

    res.json({
      success: true,
      message: 'QR code deleted successfully',
      data: store.qrCode
    });
  } catch (error) {
    console.error('Error deleting QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete QR code',
      error: error.message
    });
  }
};

// Get packaging cost settings
const getPackagingCostSettings = async (req, res) => {
  try {
    const store = await Store.getStore();
    res.json({
      success: true,
      data: {
        packagingCostSettings: store.packagingCostSettings || {
          isActive: false,
          tiers: []
        }
      }
    });
  } catch (error) {
    console.error('Error fetching packaging cost settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packaging cost settings',
      error: error.message
    });
  }
};

// Update packaging cost settings
const updatePackagingCostSettings = async (req, res) => {
  try {
    const { isActive, tiers } = req.body;

    // Validate isActive
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    // Validate tiers if provided
    if (tiers !== undefined) {
      if (!Array.isArray(tiers)) {
        return res.status(400).json({
          success: false,
          message: 'Tiers must be an array'
        });
      }

      // Validate each tier
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        
        if (typeof tier.minAmount !== 'number' || tier.minAmount < 0) {
          return res.status(400).json({
            success: false,
            message: `Tier ${i + 1}: minAmount must be a non-negative number`
          });
        }

        if (tier.maxAmount !== null && (typeof tier.maxAmount !== 'number' || tier.maxAmount <= tier.minAmount)) {
          return res.status(400).json({
            success: false,
            message: `Tier ${i + 1}: maxAmount must be null or greater than minAmount`
          });
        }

        if (typeof tier.cost !== 'number' || tier.cost < 0) {
          return res.status(400).json({
            success: false,
            message: `Tier ${i + 1}: cost must be a non-negative number`
          });
        }
      }

      // Sort tiers by minAmount and validate no overlaps
      const sortedTiers = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
      
      for (let i = 0; i < sortedTiers.length - 1; i++) {
        const currentTier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];
        
        if (currentTier.maxAmount !== null && currentTier.maxAmount > nextTier.minAmount) {
          return res.status(400).json({
            success: false,
            message: 'Packaging cost tiers cannot overlap'
          });
        }
      }
    }

    const store = await Store.getStore();
    
    // Initialize packagingCostSettings if it doesn't exist
    if (!store.packagingCostSettings) {
      store.packagingCostSettings = { isActive: false, tiers: [] };
    }

    // Update settings
    store.packagingCostSettings.isActive = isActive;
    if (tiers !== undefined) {
      store.packagingCostSettings.tiers = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
    }

    await store.save();

    res.json({
      success: true,
      message: 'Packaging cost settings updated successfully',
      data: {
        packagingCostSettings: store.packagingCostSettings
      }
    });
  } catch (error) {
    console.error('Error updating packaging cost settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update packaging cost settings',
      error: error.message
    });
  }
};

// Calculate packaging cost for a given order value (utility endpoint)
const calculatePackagingCost = async (req, res) => {
  try {
    const { orderValue } = req.query;

    if (!orderValue || isNaN(orderValue) || orderValue < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid order value'
      });
    }

    const store = await Store.getStore();
    const packagingCost = store.calculatePackagingCost(parseFloat(orderValue));

    res.json({
      success: true,
      data: {
        orderValue: parseFloat(orderValue),
        packagingCost: packagingCost
      }
    });
  } catch (error) {
    console.error('Error calculating packaging cost:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate packaging cost',
      error: error.message
    });
  }
};

module.exports = {
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
};