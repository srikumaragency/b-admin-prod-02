const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productCode: {
    type: String,
    required: [true, 'Product code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Allow alphanumeric characters only (letters and numbers)
        return /^[A-Z0-9]+$/.test(v);
      },
      message: 'Product code must contain only letters and numbers'
    }
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  
  // ====== NEW PRICING SYSTEM ======
  // This pricing system allows flexible pricing with automatic calculations
  // 
  // Flow:
  // 1. Admin enters basePrice (e.g., 100)
  // 2. System calculates profitMarginPrice = basePrice + (basePrice * profitMarginPercentage/100)
  // 3. System calculates calculatedOriginalPrice = profitMarginPrice / (1 - discountPercentage/100)
  // 4. Customer sees: ~~calculatedOriginalPrice~~ **profitMarginPrice** (discountPercentage% OFF!)
  // 5. Customer pays: profitMarginPrice (which becomes offerPrice)
  //
  // Example: basePrice=100, profitMargin=70%, discount=80%
  // → profitMarginPrice=170, calculatedOriginalPrice=850, offerPrice=170
  // → Customer sees: ~~₹850~~ **₹170** (80% OFF!)
  
  basePrice: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Base price must be greater than 0'
    }
  },
  profitMarginPercentage: {
    type: Number,
    default: 70, // Default 70% profit margin
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 1000; // Allow up to 1000% profit margin
      },
      message: 'Profit margin percentage must be between 0 and 1000'
    }
  },
  profitMarginPrice: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Profit margin price must be non-negative'
    }
  },
  discountPercentage: {
    type: Number,
    default: 80, // Default 80% discount
    min: 0,
    max: 99.99,
    validate: {
      validator: function(v) {
        return v >= 0 && v < 100; // Discount can't be 100% or more
      },
      message: 'Discount percentage must be between 0 and 99.99'
    }
  },
  calculatedOriginalPrice: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Calculated original price must be non-negative'
    }
  },
  offerPrice: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Offer price must be non-negative'
    }
  },
  
  // Legacy fields for backward compatibility
  price: {
    type: Number,
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  subcategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory',
    required: true,
  },
  images: [
    {
      url: String,
      publicId: String,
    },
  ],
  inStock: {
    type: Boolean,
    default: true,
  },
  stockQuantity: {
    type: Number,
    default: 0,
  },
  youtubeLink: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Soft delete implementation
  isDeleted: {
    type: Boolean,
    default: false,
    index: true // Index for better query performance
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: String,
    default: null
  },
  bestSeller: {
    type: Boolean,
    default: false,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  tags: [String],
  
  // ====== NEW INVENTORY FIELDS ======
  receivedDate: {
    type: String,
    required: false, // Will be auto-generated in pre-save middleware if not provided
    validate: {
      validator: function(v) {
        // Allow empty/undefined values (will be auto-generated)
        if (!v) return true;
        // Validate DD-MM-YYYY format
        return /^\d{2}-\d{2}-\d{4}$/.test(v);
      },
      message: 'Received date must be in DD-MM-YYYY format'
    }
  },
  caseQuantity: {
    type: String,
    default: '',
    trim: true,
    // Format: "qty:100 box" or similar
  },
  receivedCase: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Received case must be non-negative'
    }
  },
  brandName: {
    type: String,
    default: '',
    trim: true,
  },
  totalAvailableQuantity: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Total available quantity must be non-negative'
    }
  },
  
  // ====== SUPPLIER FIELDS ======
  supplierName: {
    type: String,
    default: '',
    trim: true,
  },
  supplierPhone: {
    type: String,
    default: '',
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty values (optional field)
        if (!v) return true;
        // Basic phone number validation (10 digits)
        return /^\d{10}$/.test(v);
      },
      message: 'Supplier phone must be 10 digits'
    }
  },
  
  // ====== CUSTOMER QUANTITY LIMIT FIELD ======
  maxQuantityPerCustomer: {
    type: Number,
    default: null, // null means no limit
    min: 1,
    validate: {
      validator: function(v) {
        // Allow null/undefined (no limit) or positive numbers
        return v === null || v === undefined || (Number.isInteger(v) && v > 0);
      },
      message: 'Max quantity per customer must be a positive integer or null for no limit'
    }
  },
}, { timestamps: true });

// Pre-save middleware for soft delete and auto-generation of fields
productSchema.pre('save', function(next) {
  // Handle soft delete
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  if (!this.isDeleted) {
    this.deletedAt = null;
    this.deletedBy = null;
  }
  // Auto-generate received date if not provided (DD-MM-YYYY format)
  if (!this.receivedDate) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    this.receivedDate = `${day}-${month}-${year}`;
  }
  
  // Ensure mutual exclusivity between bestSeller and featured
  console.log('🔍 Model validation:', {
    bestSeller: this.bestSeller,
    featured: this.featured,
    bestSellerType: typeof this.bestSeller,
    featuredType: typeof this.featured,
    bothTrue: this.bestSeller && this.featured
  });
  
  if (this.bestSeller && this.featured) {
    const error = new Error('A product cannot be both a bestseller and featured product at the same time');
    error.name = 'ValidationError';
    return next(error);
  }
  
  next();
});

// Helper function for consistent rounding to 2 decimal places
const round2 = (num) => parseFloat(Number(num).toFixed(2));

// Static method to calculate pricing and inventory
productSchema.statics.calculatePricing = function(basePrice, profitMarginPercentage = 70, discountPercentage = 80) {
  const profitMarginPrice = round2(basePrice + (basePrice * (profitMarginPercentage / 100)));
  const calculatedOriginalPrice = round2(profitMarginPrice / (1 - (discountPercentage / 100)));
  const offerPrice = profitMarginPrice;
  
  return {
    basePrice: round2(basePrice),
    profitMarginPercentage,
    profitMarginPrice,
    discountPercentage,
    calculatedOriginalPrice,
    offerPrice,
    price: calculatedOriginalPrice // Legacy field
  };
};

// Static method to calculate total available quantity
productSchema.statics.calculateTotalQuantity = function(receivedCase, caseQuantity) {
  if (!receivedCase || !caseQuantity) return 0;
  
  // Extract numeric value from caseQuantity (e.g., "qty:100 box" -> 100)
  const qtyMatch = caseQuantity.match(/(\d+)/);
  if (qtyMatch) {
    const qty = parseInt(qtyMatch[1]);
    return receivedCase * qty;
  }
  return 0;
};

// Method to update pricing when base price or margins change
productSchema.methods.updatePricing = function(newBasePrice, newProfitMarginPercentage, newDiscountPercentage) {
  this.basePrice = newBasePrice || this.basePrice;
  this.profitMarginPercentage = newProfitMarginPercentage || this.profitMarginPercentage;
  this.discountPercentage = newDiscountPercentage || this.discountPercentage;
  
  // Recalculate all prices with consistent rounding
  this.profitMarginPrice = round2(this.basePrice + (this.basePrice * (this.profitMarginPercentage / 100)));
  this.calculatedOriginalPrice = round2(this.profitMarginPrice / (1 - (this.discountPercentage / 100)));
  this.offerPrice = this.profitMarginPrice;
  this.price = this.calculatedOriginalPrice; // Legacy field
  
  return this;
};

// Method to update inventory fields
productSchema.methods.updateInventory = function(newReceivedCase, newCaseQuantity, newBrandName, newTotalAvailableQuantity) {
  this.receivedCase = newReceivedCase !== undefined ? newReceivedCase : this.receivedCase;
  this.caseQuantity = newCaseQuantity !== undefined ? newCaseQuantity : this.caseQuantity;
  this.brandName = newBrandName !== undefined ? newBrandName : this.brandName;
  
  // Update received date when inventory is updated
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  this.receivedDate = `${day}-${month}-${year}`;
  
  // Handle total available quantity
  if (newTotalAvailableQuantity !== undefined) {
    // If manually provided, use it
    this.totalAvailableQuantity = newTotalAvailableQuantity;
  } else {
    // Otherwise, calculate from receivedCase and caseQuantity
    if (this.receivedCase && this.caseQuantity) {
      const qtyMatch = this.caseQuantity.match(/(\d+)/);
      if (qtyMatch) {
        const qty = parseInt(qtyMatch[1]);
        this.totalAvailableQuantity = this.receivedCase * qty;
      } else {
        this.totalAvailableQuantity = 0;
      }
    } else {
      this.totalAvailableQuantity = 0;
    }
  }
  
  // Update stock quantity from total available quantity
  this.stockQuantity = this.totalAvailableQuantity;
  
  return this;
};

// Static method for soft delete
productSchema.statics.softDelete = function(productId, deletedBy = null) {
  return this.findByIdAndUpdate(
    productId,
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: deletedBy,
      isActive: false // Also mark as inactive
    },
    { new: true }
  );
};

// Static method to restore deleted product
productSchema.statics.restore = function(productId) {
  return this.findByIdAndUpdate(
    productId,
    {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      isActive: true
    },
    { new: true }
  );
};

// Static method to find non-deleted products (default query)
productSchema.statics.findActive = function(query = {}) {
  return this.find({ ...query, isDeleted: { $ne: true } });
};

// Static method to find deleted products
productSchema.statics.findDeleted = function(query = {}) {
  return this.find({ ...query, isDeleted: true });
};

// Method to soft delete instance
productSchema.methods.softDelete = function(deletedBy = null) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.isActive = false;
  return this.save();
};

// Method to restore deleted instance
productSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.isActive = true;
  return this.save();
};

// Create compound indexes for better performance
productSchema.index({ name: 'text', productCode: 'text' });
productSchema.index({ isDeleted: 1, isActive: 1 }); // Index for soft delete queries
productSchema.index({ deletedAt: 1 }, { sparse: true }); // Sparse index for deleted items

// Add indexes for quick shopping queries to prevent timeouts
productSchema.index({ categoryId: 1, isActive: 1 }); // For category-based product queries
productSchema.index({ categoryId: 1, isActive: 1, name: 1 }); // For sorted category queries
productSchema.index({ isActive: 1, name: 1 }); // For active products sorted by name

module.exports = mongoose.model('Product', productSchema);
