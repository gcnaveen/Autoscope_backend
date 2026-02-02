/**
 * Authentication Middleware
 * Handles JWT token verification and authorization
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { USER_STATUS } = require('../config/constants');
const { UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * Extract JWT token from request headers
 * @param {Object} event - Lambda event object
 * @returns {string|null} Extracted token or null
 */
const extractToken = (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Verify JWT token and authenticate user
 * @param {Object} event - Lambda event object
 * @returns {Promise<Object>} Authentication result with user object
 * @throws {UnauthorizedError} If authentication fails
 */
const authenticate = async (event) => {
  try {
    const token = extractToken(event);
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired');
      }
      throw new UnauthorizedError('Invalid token');
    }

    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new UnauthorizedError('User account is not active');
    }

    return { user };
  } catch (error) {
    logger.debug('Authentication failed', { error: error.message });
    throw error;
  }
};

/**
 * Authorize user based on roles
 * @param {...string} allowedRoles - Allowed user roles
 * @returns {Function} Authorization middleware function
 */
const authorize = (...allowedRoles) => {
  return async (event) => {
    const { user } = await authenticate(event);
    
    if (!allowedRoles.includes(user.role)) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    return { user };
  };
};

/**
 * Generate JWT token
 * @param {number} userId - User ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

module.exports = {
  authenticate,
  authorize,
  generateToken
};