/**
 * Input Sanitization Utility
 * Provides functions to sanitize and normalize user input
 */

/**
 * Sanitize string input
 * @param {string} input - Input string
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
const sanitizeString = (input, options = {}) => {
  if (typeof input !== 'string') {
    return input;
  }

  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Normalize whitespace
  if (options.normalizeWhitespace !== false) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  // Remove HTML tags (basic)
  if (options.stripHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  return sanitized;
};

/**
 * Sanitize email
 * @param {string} email - Email address
 * @returns {string} Sanitized email
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') {
    return email;
  }
  return email.toLowerCase().trim();
};

/**
 * Sanitize phone number
 * @param {string} phone - Phone number
 * @returns {string} Sanitized phone number
 */
const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }
  // Remove all non-numeric characters except + at the start
  return phone.trim().replace(/(?!^\+)[^\d]/g, '');
};

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj, options = {}) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      if (key === 'email') {
        sanitized[key] = sanitizeEmail(value);
      } else if (key === 'phone') {
        sanitized[key] = sanitizePhone(value);
      } else {
        sanitized[key] = sanitizeString(value, options);
      }
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

module.exports = {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeObject
};
