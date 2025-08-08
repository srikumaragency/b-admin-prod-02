const mongoose = require('mongoose');

const priceListSchema = new mongoose.Schema({
  documentName: {
    type: String,
    required: [true, 'Document name is required'],
    trim: true,
    maxlength: [100, 'Document name cannot exceed 100 characters']
  },
  pdfData: {
    type: Buffer,
    required: [true, 'PDF data is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    default: 'application/pdf'
  },
  originalFileName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
priceListSchema.index({ isActive: 1 });
priceListSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PriceList', priceListSchema);