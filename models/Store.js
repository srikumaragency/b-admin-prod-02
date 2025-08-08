const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  logo: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String,
      default: null
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },
  minimumOrderValue: {
    type: Number,
    default: 1000 // Default minimum order value is ₹1000
  },
  contactEmail: {
    type: String,
    default: null
  },
  contactPhone: {
    type: String,
    default: null
  },
  upiId: {
    type: String,
    default: null
  },
  qrCode: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String,
      default: null
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },
  promotionalOffer: {
    type: String,
    default: null,
    maxlength: 200
  },
  packagingCostSettings: {
    isActive: {
      type: Boolean,
      default: false // Default is inactive (no packaging cost)
    },
    tiers: [{
      minAmount: {
        type: Number,
        required: true
      },
      maxAmount: {
        type: Number,
        default: null // null means no upper limit for the highest tier
      },
      cost: {
        type: Number,
        required: true
      }
    }]
  }
}, {
  timestamps: true
});

// Ensure only one store document exists
storeSchema.statics.getStore = async function() {
  let store = await this.findOne();
  if (!store) {
    // Create store with packaging cost inactive by default
    store = await this.create({
      packagingCostSettings: {
        isActive: false,
        tiers: []
      }
    });
  }
  return store;
};

// Method to calculate packaging cost based on order value
storeSchema.methods.calculatePackagingCost = function(orderValue) {
  // If packaging cost is inactive, return 0
  if (!this.packagingCostSettings || !this.packagingCostSettings.isActive) {
    return 0;
  }

  // If no tiers are configured but packaging is active, return 0
  if (!this.packagingCostSettings.tiers || this.packagingCostSettings.tiers.length === 0) {
    return 0;
  }

  // Sort tiers by minAmount to ensure correct ordering
  const sortedTiers = this.packagingCostSettings.tiers.sort((a, b) => a.minAmount - b.minAmount);

  // Find the appropriate tier
  for (const tier of sortedTiers) {
    if (orderValue >= tier.minAmount) {
      // Check if order value is within this tier's range
      if (tier.maxAmount === null || orderValue < tier.maxAmount) {
        return tier.cost;
      }
    }
  }

  // If no tier matches, return 0
  return 0;
};

module.exports = mongoose.model('Store', storeSchema);