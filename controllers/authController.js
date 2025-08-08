const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required',
        errorType: 'MISSING_CREDENTIALS'
      });
    }

    const admin = await Admin.findOne({ email });

    // Specific error for email not found
    if (!admin) {
      return res.status(401).json({ 
        message: 'Email address not found. Please check your email and try again.',
        errorType: 'EMAIL_NOT_FOUND'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({ 
        message: 'Your admin account has been disabled. Please contact the system administrator.',
        errorType: 'ACCOUNT_DISABLED'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ 
        message: 'Incorrect password. Please check your password and try again.',
        errorType: 'INVALID_PASSWORD'
      });
    }

    // Generate token with longer expiry for "remember me" functionality
    const tokenExpiry = req.body.rememberMe ? '30d' : '7d';
    const token = jwt.sign({ id: admin._id, branch: admin.branch }, process.env.JWT_SECRET, {
      expiresIn: tokenExpiry,
    });

    // Successful login
    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      branch: admin.branch,
      token,
      tokenExpiry: tokenExpiry,
      loginTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error occurred during login. Please try again.',
      errorType: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
