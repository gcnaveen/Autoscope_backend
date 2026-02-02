/**
 * Counter Model
 * Tracks sequential counters for generating formatted IDs (e.g., Req-001, Req-002)
 * Production-level atomic counter implementation
 */

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Counter name is required'],
    unique: true,
    index: true,
    trim: true
  },
  sequence: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Sequence must be non-negative']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for fast lookups
counterSchema.index({ name: 1 }, { unique: true });

/**
 * Get next sequence number atomically (thread-safe)
 * @param {string} counterName - Name of the counter (e.g., 'inspectionRequest')
 * @returns {Promise<number>} Next sequence number
 */
counterSchema.statics.getNextSequence = async function (counterName) {
  try {
    const counter = await this.findOneAndUpdate(
      { name: counterName },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    
    return counter.sequence;
  } catch (error) {
    // Handle race conditions - retry once
    if (error.code === 11000 || error.name === 'MongoServerError') {
      const counter = await this.findOneAndUpdate(
        { name: counterName },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return counter.sequence;
    }
    throw error;
  }
};

/**
 * Get current sequence without incrementing
 * @param {string} counterName - Name of the counter
 * @returns {Promise<number>} Current sequence number
 */
counterSchema.statics.getCurrentSequence = async function (counterName) {
  const counter = await this.findOne({ name: counterName });
  return counter ? counter.sequence : 0;
};

/**
 * Reset counter (admin use only)
 * @param {string} counterName - Name of the counter
 * @param {number} [value=0] - Value to reset to
 * @returns {Promise<Object>} Updated counter
 */
counterSchema.statics.resetCounter = async function (counterName, value = 0) {
  return await this.findOneAndUpdate(
    { name: counterName },
    { sequence: value },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
