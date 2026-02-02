/**
 * Response Utility
 * Provides standardized API response formatting
 */

const { HTTP_STATUS } = require('../config/constants');
const logger = require('./logger');

/**
 * Standard API Response Structure
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} message - Human-readable message
 * @property {*} data - Response data (optional)
 * @property {*} errors - Error details (optional)
 * @property {number} statusCode - HTTP status code
 */

/**
 * Create success response
 * @param {Object} params
 * @param {number} params.statusCode - HTTP status code
 * @param {string} params.message - Response message
 * @param {*} params.data - Response data
 * @param {Object} params.headers - Additional headers
 * @returns {Object} Lambda response object
 */
const success = ({ statusCode = HTTP_STATUS.OK, message = 'Success', data = null, headers = {} }) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data })
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      ...headers
    },
    body: JSON.stringify(response)
  };
};

/**
 * Create error response
 * @param {Object} params
 * @param {number} params.statusCode - HTTP status code
 * @param {string} params.message - Error message
 * @param {*} params.errors - Error details (optional)
 * @param {Error} params.error - Error object for logging (optional)
 * @param {Object} params.headers - Additional headers
 * @returns {Object} Lambda response object
 */
const error = ({ statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message = 'Internal Server Error', errors = null, error: errorObj = null, headers = {} }) => {
  // Log error if provided
  if (errorObj) {
    logger.error(message, errorObj, { statusCode });
  }

  const response = {
    success: false,
    message,
    ...(errors && { errors })
  };

  // Include error details only in development
  if (process.env.NODE_ENV === 'development' && errorObj) {
    response.error = {
      name: errorObj.name,
      message: errorObj.message,
      ...(errorObj.stack && { stack: errorObj.stack })
    };
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      ...headers
    },
    body: JSON.stringify(response)
  };
};

/**
 * Create validation error response
 * @param {Array} validationErrors - Array of validation error objects
 * @param {string} message - Error message
 * @returns {Object} Lambda response object
 */
const validationError = (validationErrors, message = 'Validation failed') => {
  return error({
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message,
    errors: validationErrors
  });
};

module.exports = {
  success,
  error,
  validationError
};
