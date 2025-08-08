const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  // Product snapshot - captured at time of order to preserve data even if product is deleted
  productSnapshot: {
    productCode: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    images: [{
      url: String,
      publicId: String,
    }],
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategory'
    },
    brandName: {
      type: String,
      default: ''
    },
    youtubeLink: {
      type: String,
      default: ''
    },
    // Pricing snapshot at time of order
    basePrice: {
      type: Number,
      required: true
    },
    profitMarginPercentage: {
      type: Number,
      default: 65
    },
    discountPercentage: {
      type: Number,
      default: 81
    },
    calculatedOriginalPrice: {
      type: Number,
      required: true
    }
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  offerPrice: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerDetails: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    deliveryContact: {
      type: String,
      required: true,
      trim: true
    },
    couponCode: {
      type: String,
      required: false,
      trim: true,
      default: ''
    },
    address: {
      state: {
        type: String,
        required: true,
        enum: ['Tamil Nadu', 'Kerala', 'Karnataka', 'Telangana', 'Andhra Pradesh'],
        trim: true
      },
      district: {
        type: String,
        required: true,
        trim: true
      },
      nearestTown: {
        type: String,
        required: false,
        trim: true,
        default: ''
      },
      street: {
        type: String,
        required: false,
        trim: true,
        default: ''
      },
      pincode: {
        type: String,
        required: false,
        trim: true,
        default: ''
      },
      landmark: {
        type: String,
        required: false,
        trim: true,
        default: ''
      },
      country: {
        type: String,
        required: true,
        default: 'India',
        trim: true
      }
    }
  },
  deliveryMethod: {
    type: String,
    enum: ['transport_office', 'on_the_go', 'home_delivery'],
    default: 'transport_office',
    required: true
  },
  items: [orderItemSchema],
  orderSummary: {
    totalItems: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    totalOfferPrice: {
      type: Number,
      required: true
    },
    totalSavings: {
      type: Number,
      required: true
    },
    packagingPrice: {
      type: Number,
      required: true,
      default: 100
    },
    totalWithPackaging: {
      type: Number,
      required: true
    },
    totalProfit: {
      type: Number,
      required: true,
      default: 0
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  orderStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'placed',
    index: true
  },
  paymentDetails: {
    upiId: {
      type: String,
      default: 'srimathimathi5-1@oksbi'
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    paymentScreenshot: {
      type: String, // Cloudinary URL
      default: null
    },
    paymentDate: {
      type: Date,
      default: null
    },
    screenshotUploadedAt: {
      type: Date,
      default: null
    },
    adminReviewedAt: {
      type: Date,
      default: null
    },
    adminReviewedBy: {
      type: String,
      default: null
    }
  },
  adminNotes: {
    type: String,
    default: ''
  },

  trackingInfo: {
    estimatedDelivery: {
      type: Date,
      default: null
    },
    trackingNumber: {
      type: String,
      default: null
    },
    courierPartner: {
      type: String,
      default: null
    }
  },
  // Invoice details
  invoice: {
    invoiceNumber: {
      type: String,
      default: null
    },
    invoiceUrl: {
      type: String, // PDF URL
      default: null
    },
    generatedAt: {
      type: Date,
      default: null
    },
    generatedBy: {
      type: String,
      default: 'system'
    },
    // Bill image fields
    billImage: {
      type: String, // Cloudinary URL for bill image
      default: null
    },
    billImagePublicId: {
      type: String, // Cloudinary public ID for bill image
      default: null
    },
    billImageUploadedAt: {
      type: Date,
      default: null
    },
    billImageUploadedBy: {
      type: String, // Admin who uploaded the bill image
      default: null
    },
    billNotes: {
      type: String, // Additional notes about the bill
      default: ''
    }
  },
  // Delivery details
  deliveryDetails: {
    deliveryImage: {
      type: String, // Cloudinary URL for delivery proof image
      default: null
    },
    deliveryImageUploadedAt: {
      type: Date,
      default: null
    },
    uploadedBy: {
      type: String, // Admin who uploaded
      default: null
    },
    deliveryNotes: {
      type: String,
      default: ''
    }
  }
}, { 
  timestamps: true 
});

// Generate order ID and auto-calculate profit before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderId = `ORD${timestamp}${random}`;
  }
  

  
  // Also auto-calculate profit when payment status changes to 'paid' (recalculate if needed)
  if (this.isModified('paymentStatus') && this.paymentStatus === 'paid') {
    try {
      // Generate invoice when payment is confirmed
      if (!this.invoice?.invoiceNumber) {
        await this.generateInvoice();
        console.log(`✅ Invoice generated for order: ${this.orderId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to generate invoice on payment for ${this.orderId}:`, error);
    }
  }
  
  next();
});

// Method to generate invoice
orderSchema.methods.generateInvoice = async function() {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const invoiceNumber = `INV-${timestamp}-${this.orderId}`;
  
  // Update invoice data
  this.invoice = {
    invoiceNumber: invoiceNumber,
    invoiceUrl: null, // Will be updated after PDF generation
    generatedAt: new Date(),
    generatedBy: 'system'
  };
  
  return this.save();
};



// Create indexes for better performance
orderSchema.index({ 'customerDetails.phoneNumber': 1, paymentStatus: 1 });
orderSchema.index({ orderId: 1, 'customerDetails.phoneNumber': 1 });
orderSchema.index({ createdAt: -1 });

// Add critical indexes for analytics queries to prevent timeouts
orderSchema.index({ paymentStatus: 1, createdAt: -1 }); // For analytics queries
orderSchema.index({ paymentStatus: 1, 'orderSummary.totalProfit': 1 }); // For profit queries
orderSchema.index({ createdAt: -1, paymentStatus: 1, 'orderSummary.totalOfferPrice': 1 }); // Compound index for analytics


module.exports = mongoose.model('Order', orderSchema);