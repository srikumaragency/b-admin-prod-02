const mongoose = require('mongoose');

const contactQuerySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  phoneNumber: {
    type: String,
    trim: true,
    maxlength: 15
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 100
  },
  query: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['new', 'viewed', 'in-progress', 'resolved', 'closed'],
    default: 'new'
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
contactQuerySchema.index({ createdAt: -1 });
contactQuerySchema.index({ status: 1 });

// Validation: At least phone number or email must be provided
contactQuerySchema.pre('validate', function(next) {
  if (!this.phoneNumber && !this.email) {
    this.invalidate('contact', 'Either phone number or email must be provided');
  }
  next();
});

module.exports = mongoose.model('ContactQuery', contactQuerySchema);