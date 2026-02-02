/**
 * Query Parameters Validation Utility
 * Validates query parameters using Joi schemas
 */

const { ValidationError } = require('./errors');

/**
 * Validate query parameters against schema
 * @param {Object} schema - Joi validation schema
 * @param {Object} queryParams - Query parameters to validate
 * @returns {Object} Validated query parameters
 * @throws {ValidationError} If validation fails
 */
const validateQuery = (schema, queryParams) => {
  const { error, value } = schema.validate(queryParams, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    throw new ValidationError('Query parameter validation failed', errors);
  }

  return value;
};

module.exports = {
  validateQuery
};
