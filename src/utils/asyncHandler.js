/**
 * Async Handler Wrapper
 * Wraps async route handlers to automatically catch errors
 */

const logger = require('./logger');
const { error } = require('./response');
const { AppError, DatabaseError } = require('./errors');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Wraps async function to catch errors and return appropriate response
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => {
  return async (event, context) => {
    try {
      return await fn(event, context);
    } catch (err) {
      // Log the error
      logger.error('Unhandled error in async handler', err, {
        path: event.path,
        method: event.httpMethod || event.requestContext?.http?.method,
        requestId: context?.requestId || event.requestContext?.requestId
      });

      // Handle known application errors
      if (err instanceof AppError) {
        return error({
          statusCode: err.statusCode,
          message: err.message,
          errors: err.errors || null,
          error: err
        });
      }

      // Handle database errors
      if (err.name === 'ValidationError') {
        const validationErrors = Object.values(err.errors || {}).map(e => ({
          field: e.path,
          message: e.message
        }));
        
        return error({
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: 'Validation failed',
          errors: validationErrors,
          error: err
        });
      }

      if (err.name === 'MongoServerError' || err.name === 'MongooseError' || err.name === 'MongoError') {
        return error({
          statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          message: 'Database error occurred',
          error: new DatabaseError('Database operation failed', err)
        });
      }

      // Handle JWT errors
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return error({
          statusCode: HTTP_STATUS.UNAUTHORIZED,
          message: 'Invalid or expired token',
          error: err
        });
      }

      // Handle unknown errors
      return error({
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        error: err
      });
    }
  };
};

module.exports = asyncHandler;
