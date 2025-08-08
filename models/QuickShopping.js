const mongoose = require('mongoose');

const quickShoppingSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  categoryOrder: [{
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    serialNumber: {
      type: Number,
      required: true,
    },
    products: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      serialNumber: {
        type: Number,
        required: true,
      },
    }],
  }],
}, { timestamps: true });

// Ensure one quick shopping setup per admin
quickShoppingSchema.index({ adminId: 1 }, { unique: true });

module.exports = mongoose.model('QuickShopping', quickShoppingSchema);