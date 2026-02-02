/**
 * Counter Initialization Utility
 * Ensures the inspection request counter exists and is initialized
 * This is automatically called on first use via Counter.getNextSequence upsert,
 * but can be called manually to initialize or reset counters
 */

const Counter = require('../models/Counter');
const logger = require('./logger');

/**
 * Initialize inspection request counter
 * @param {number} [startingValue=0] - Starting sequence number (default: 0, so first ID is Req-001)
 * @returns {Promise<Object>} Counter document
 */
const initializeInspectionRequestCounter = async (startingValue = 0) => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { name: 'inspectionRequest' },
      { 
        $setOnInsert: { sequence: startingValue }
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    logger.info('Inspection request counter initialized', {
      counterName: 'inspectionRequest',
      sequence: counter.sequence
    });

    return counter;
  } catch (error) {
    logger.error('Error initializing counter', error);
    throw error;
  }
};

/**
 * Get current counter value
 * @param {string} counterName - Name of the counter
 * @returns {Promise<number>} Current sequence
 */
const getCurrentCounterValue = async (counterName) => {
  try {
    return await Counter.getCurrentSequence(counterName);
  } catch (error) {
    logger.error(`Error getting counter value for ${counterName}`, error);
    throw error;
  }
};

/**
 * Reset counter to a specific value
 * @param {string} counterName - Name of the counter
 * @param {number} value - Value to reset to
 * @returns {Promise<Object>} Updated counter
 */
const resetCounter = async (counterName, value = 0) => {
  try {
    const counter = await Counter.resetCounter(counterName, value);
    logger.info(`Counter ${counterName} reset`, { value });
    return counter;
  } catch (error) {
    logger.error(`Error resetting counter ${counterName}`, error);
    throw error;
  }
};

module.exports = {
  initializeInspectionRequestCounter,
  getCurrentCounterValue,
  resetCounter
};
