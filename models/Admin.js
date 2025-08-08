const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    branch: { type: String },  // 👈 Important for knowing which branch this admin controls
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Superadmin' },
  },
  {
    timestamps: true,
    collection: 'users', // Important: connects to pre-seeded 'users' collection
  }
);

module.exports = mongoose.model('Admin', adminSchema);
