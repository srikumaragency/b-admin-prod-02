const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  let token;

  console.log('Auth middleware called for:', req.method, req.path);
  console.log('Authorization header:', req.headers.authorization);

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted:', token ? 'Token present' : 'No token');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully, admin ID:', decoded.id);
      
      const admin = await Admin.findById(decoded.id);
      console.log('Admin found:', admin ? admin.email : 'No admin found');

      if (!admin || !admin.isActive) {
        console.log('Admin not found or inactive');
        return res.status(401).json({ message: 'Unauthorized access' });
      }

      req.admin = admin; // Save current admin to req object
      console.log('Authentication successful, proceeding to next middleware');
      next();
    } catch (err) {
      console.log('Token verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid token' });
    }
  } else {
    console.log('No Bearer token found in authorization header');
    return res.status(401).json({ message: 'Token required' });
  }
};

module.exports = protect;
