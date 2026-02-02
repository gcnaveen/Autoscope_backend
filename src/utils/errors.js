/**
 * Custom Error Classes for Application
 * Provides structured error handling with proper status codes and messages
 */

const { HTTP_STATUS } = require('../config/constants');

/**
 * Base Application Error
 * @extends Error
 */
class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 * Used for validation errors and invalid input
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errors = null) {
    super(message, HTTP_STATUS.BAD_REQUEST);
    this.errors = errors;
  }
}

/**
 * Unauthorized Error (401)
 * Used when authentication is required or failed
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

/**
 * Forbidden Error (403)
 * Used when user doesn't have permission
 */
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden - Insufficient permissions') {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

/**
 * Not Found Error (404)
 * Used when resource is not found
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}

/**
 * Conflict Error (409)
 * Used when resource already exists
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, HTTP_STATUS.CONFLICT);
  }
}

/**
 * Database Error
 * Used for database-related errors
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
    this.originalError = originalError;
  }
}

/**
 * Validation Error
 * Used for input validation failures
 */
class ValidationError extends BadRequestError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, errors);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ValidationError
};
