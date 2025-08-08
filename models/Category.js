const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true, // Add index for faster queries
  },
}, { timestamps: true });

// Add indexes for better performance
categorySchema.index({ name: 1 }); // For sorting by name
categorySchema.index({ createdAt: -1 }); // For recent categories

module.exports = mongoose.model('Category', categorySchema);
