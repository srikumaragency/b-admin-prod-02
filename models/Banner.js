const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['landscape', 'portrait'],
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
