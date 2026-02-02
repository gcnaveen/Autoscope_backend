/**
 * Structured Logging Utility
 * Provides consistent logging across the application
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * Create structured log entry
 */
const createLogEntry = (level, message, metadata = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...metadata
  };

  // In production, output as JSON for log aggregation tools
  if (isProduction) {
    return JSON.stringify(logEntry);
  }

  // In development, format for readability
  return `[${timestamp}] ${level.toUpperCase()}: ${message} ${Object.keys(metadata).length > 0 ? JSON.stringify(metadata, null, 2) : ''}`;
};

/**
 * Logger object with different log levels
 */
const logger = {
  error: (message, error = null, metadata = {}) => {
    const logData = {
      ...metadata,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: isDevelopment ? error.stack : undefined
        }
      })
    };
    console.error(createLogEntry(LOG_LEVELS.ERROR, message, logData));
  },

  warn: (message, metadata = {}) => {
    console.warn(createLogEntry(LOG_LEVELS.WARN, message, metadata));
  },

  info: (message, metadata = {}) => {
    console.log(createLogEntry(LOG_LEVELS.INFO, message, metadata));
  },

  debug: (message, metadata = {}) => {
    if (isDevelopment) {
      console.log(createLogEntry(LOG_LEVELS.DEBUG, message, metadata));
    }
  }
};

module.exports = logger;
