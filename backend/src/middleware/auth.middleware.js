const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const asyncHandler = require('express-async-handler');

const authMiddleware = asyncHandler(async (req, res, next) => {
  // Skip authentication in production environment
  if (process.env.NODE_ENV === 'production') {
    // Create a default admin user for the request
    req.user = {
      _id: '000000000000000000000000',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    };
    return next();
  }

  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user from token's id and exclude the password
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Admin access middleware
const adminMiddleware = asyncHandler(async (req, res, next) => {
  // Skip admin check in production environment
  if (process.env.NODE_ENV === 'production') {
    return next();
  }

  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized, admin access required');
  }
});

module.exports = { authMiddleware, adminMiddleware };
