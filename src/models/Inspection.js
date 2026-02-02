/**
 * Inspection Model
 * Mongoose schema for Inspection collection
 * Stores actual inspection data filled by inspectors based on templates
 */

const mongoose = require('mongoose');
const { CHECKLIST_STATUS, STATUS_RATING_MAP, VIDEO_ALLOWED_TYPES } = require('../config/constants');

// Sub-schema for checklist item response
const checklistItemResponseSchema = new mongoose.Schema({
  position: {
    type: Number,
    required: [true, 'Position is required']
  },
  label: {
    type: String,
    required: [true, 'Label is required'],
    trim: true
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: Object.values(CHECKLIST_STATUS),
      message: 'Invalid status. Must be one of: Excellent, Good, Average, Poor'
    }
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [4, 'Rating must be at most 4'],
    validate: {
      validator: function(rating) {
        // Rating should match status
        const expectedRating = STATUS_RATING_MAP[this.status];
        return rating === expectedRating;
      },
      message: 'Rating does not match the selected status'
    }
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [1000, 'Remarks cannot exceed 1000 characters'],
    default: ''
  },
  photos: {
    type: [String], // Array of photo URLs/paths
    default: [],
    validate: {
      validator: function(photos) {
        return photos.length <= 20; // Max 20 photos per checklist item
      },
      message: 'Maximum 20 photos allowed per checklist item'
    }
  }
}, { _id: false });

// Sub-schema for type inspection data
const typeInspectionSchema = new mongoose.Schema({
  typeName: {
    type: String,
    required: [true, 'Type name is required'],
    trim: true
  },
  checklistItems: {
    type: [checklistItemResponseSchema],
    required: [true, 'Checklist items are required'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'At least one checklist item is required per type'
    }
  },
  overallRemarks: {
    type: String,
    trim: true,
    maxlength: [2000, 'Overall remarks cannot exceed 2000 characters'],
    default: ''
  },
  overallPhotos: {
    type: [String], // Array of photo URLs/paths
    default: [],
    validate: {
      validator: function(photos) {
        return photos.length <= 30; // Max 30 photos per type
      },
      message: 'Maximum 30 photos allowed per type'
    }
  },
  videos: {
    type: [String], // Array of video URLs/paths
    default: [],
    validate: {
      validator: function(videos) {
        // Videos only allowed for Interior and Exterior
        if (videos.length > 0 && !VIDEO_ALLOWED_TYPES.includes(this.typeName)) {
          return false;
        }
        // Max 2 videos for allowed types
        if (VIDEO_ALLOWED_TYPES.includes(this.typeName)) {
          return videos.length <= 2;
        }
        return videos.length === 0;
      },
      message: 'Videos are only allowed for Interior and Exterior types (max 2 videos)'
    }
  },
  averageRating: {
    type: Number,
    required: true,
    min: [1, 'Average rating must be at least 1'],
    max: [4, 'Average rating must be at most 4'],
    set: function(value) {
      // Round to 2 decimal places
      return Math.round(value * 100) / 100;
    }
  }
}, { _id: false });

// Main Inspection schema
const inspectionSchema = new mongoose.Schema({
  checklistTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChecklistTemplate',
    required: [true, 'Checklist template ID is required'],
    index: true
  },
  inspectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Inspector ID is required'],
    index: true
  },
  vehicleInfo: {
    make: {
      type: String,
      trim: true,
      maxlength: [50, 'Make cannot exceed 50 characters']
    },
    model: {
      type: String,
      trim: true,
      maxlength: [50, 'Model cannot exceed 50 characters']
    },
    year: {
      type: Number,
      min: [1900, 'Year must be at least 1900'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
    },
    vin: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [17, 'VIN cannot exceed 17 characters']
    },
    licensePlate: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'License plate cannot exceed 20 characters']
    },
    mileage: {
      type: Number,
      min: [0, 'Mileage cannot be negative']
    },
    color: {
      type: String,
      trim: true,
      maxlength: [30, 'Color cannot exceed 30 characters']
    }
  },
  types: {
    type: [typeInspectionSchema],
    required: [true, 'At least one type inspection is required'],
    validate: {
      validator: function(types) {
        return types && types.length > 0;
      },
      message: 'At least one type inspection is required'
    }
  },
  overallRating: {
    type: Number,
    required: true,
    min: [1, 'Overall rating must be at least 1'],
    max: [4, 'Overall rating must be at most 4'],
    set: function(value) {
      // Round to 2 decimal places
      return Math.round(value * 100) / 100;
    }
  },
  status: {
    type: String,
    enum: ['draft', 'completed', 'submitted'],
    default: 'draft',
    index: true
  },
  inspectionDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    default: ''
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

// Indexes for performance
inspectionSchema.index({ inspectorId: 1, inspectionDate: -1 });
inspectionSchema.index({ checklistTemplateId: 1 });
inspectionSchema.index({ status: 1, createdAt: -1 });
inspectionSchema.index({ 'vehicleInfo.vin': 1 });
inspectionSchema.index({ 'vehicleInfo.licensePlate': 1 });

// Pre-save hook to calculate average ratings
inspectionSchema.pre('save', function(next) {
  // Calculate average rating for each type
  this.types.forEach(typeInspection => {
    if (typeInspection.checklistItems && typeInspection.checklistItems.length > 0) {
      const totalRating = typeInspection.checklistItems.reduce((sum, item) => sum + item.rating, 0);
      typeInspection.averageRating = totalRating / typeInspection.checklistItems.length;
    }
  });

  // Calculate overall rating (average of all type ratings)
  if (this.types && this.types.length > 0) {
    const totalTypeRating = this.types.reduce((sum, type) => sum + type.averageRating, 0);
    this.overallRating = totalTypeRating / this.types.length;
  }

  // Set completedAt if status is completed or submitted
  if ((this.status === 'completed' || this.status === 'submitted') && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

// Method to calculate and update ratings (can be called manually if needed)
inspectionSchema.methods.calculateRatings = function() {
  // Calculate average rating for each type
  this.types.forEach(typeInspection => {
    if (typeInspection.checklistItems && typeInspection.checklistItems.length > 0) {
      const totalRating = typeInspection.checklistItems.reduce((sum, item) => sum + item.rating, 0);
      typeInspection.averageRating = totalRating / typeInspection.checklistItems.length;
    }
  });

  // Calculate overall rating
  if (this.types && this.types.length > 0) {
    const totalTypeRating = this.types.reduce((sum, type) => sum + type.averageRating, 0);
    this.overallRating = totalTypeRating / this.types.length;
  }
};

// Static method to get inspections by inspector
inspectionSchema.statics.getByInspector = function(inspectorId, options = {}) {
  const query = { inspectorId };
  if (options.status) {
    query.status = options.status;
  }
  return this.find(query).sort({ inspectionDate: -1 });
};

// Static method to get inspections by template
inspectionSchema.statics.getByTemplate = function(templateId) {
  return this.find({ checklistTemplateId: templateId }).sort({ inspectionDate: -1 });
};

const Inspection = mongoose.model('Inspection', inspectionSchema);

module.exports = Inspection;
