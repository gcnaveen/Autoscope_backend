/**
 * Query Parameters Utility
 * Handles parsing and validation of query parameters
 */

const { BadRequestError } = require('./errors');

/**
 * Parse query parameters from Lambda event
 * @param {Object} event - Lambda event object
 * @returns {Object} Parsed query parameters
 */
const parseQueryParams = (event) => {
  const queryStringParameters = event.queryStringParameters || {};
  
  // Convert string values to appropriate types
  const parsed = {};
  
  for (const [key, value] of Object.entries(queryStringParameters)) {
    if (value === '') {
      continue; // Skip empty strings
    }
    
    // Try to parse as number
    if (!isNaN(value) && value !== '') {
      parsed[key] = Number(value);
    } else {
      parsed[key] = value;
    }
  }
  
  return parsed;
};

module.exports = {
  parseQueryParams
};
