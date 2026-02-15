/**
 * Make Model
 * Mongoose schema for Vehicle Make collection
 * Stores vehicle makes (brands) independently
 */

const mongoose = require('mongoose');

const makeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Make name is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Make name cannot exceed 50 characters'],
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for faster lookups
makeSchema.index({ name: 1, isActive: 1 });

// Static method to get active makes
makeSchema.statics.getActiveMakes = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

const Make = mongoose.model('Make', makeSchema);

module.exports = Make;
