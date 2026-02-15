/**
 * Model Model
 * Mongoose schema for Vehicle Model collection
 * Stores vehicle models with reference to their Make
 */

const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Model name is required'],
    trim: true,
    maxlength: [50, 'Model name cannot exceed 50 characters']
  },
  makeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Make',
    required: [true, 'Make ID is required'],
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

// Compound index to ensure unique model name per make
modelSchema.index({ name: 1, makeId: 1 }, { unique: true });

// Index for faster lookups
modelSchema.index({ makeId: 1, isActive: 1 });

// Static method to get active models by make
modelSchema.statics.getActiveModelsByMake = function(makeId) {
  return this.find({ makeId, isActive: true }).sort({ name: 1 });
};

const Model = mongoose.model('Model', modelSchema);

module.exports = Model;
