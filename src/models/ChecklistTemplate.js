/**
 * ChecklistTemplate Model
 * Mongoose schema for Checklist Template collection
 * Admin creates templates that define the structure of inspection checklists
 */

const mongoose = require('mongoose');
const { INSPECTION_TYPES, CHECKLIST_STATUS, VIDEO_ALLOWED_TYPES } = require('../config/constants');

// Sub-schema for checklist item within a type
const checklistItemSchema = new mongoose.Schema({
  position: {
    type: Number,
    required: [true, 'Position is required'],
    min: [1, 'Position must be at least 1']
  },
  label: {
    type: String,
    required: [true, 'Checklist item label is required'],
    trim: true,
    maxlength: [200, 'Label cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  isRequired: {
    type: Boolean,
    default: true
  }
}, { _id: false }); // No separate _id for subdocuments

// Sub-schema for type configuration
const typeConfigSchema = new mongoose.Schema({
  typeName: {
    type: String,
    required: [true, 'Type name is required'],
    enum: {
      values: Object.values(INSPECTION_TYPES),
      message: 'Invalid inspection type'
    }
  },
  checklistItems: {
    type: [checklistItemSchema],
    required: true,
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'At least one checklist item is required per type'
    }
  },
  allowOverallRemarks: {
    type: Boolean,
    default: true
  },
  allowOverallPhotos: {
    type: Boolean,
    default: true
  },
  allowVideos: {
    type: Boolean,
    default: false,
    validate: {
      validator: function(allow) {
        // Videos only allowed for Interior and Exterior
        if (allow) {
          return VIDEO_ALLOWED_TYPES.includes(this.typeName);
        }
        return true;
      },
      message: 'Videos are only allowed for Interior and Exterior types'
    }
  },
  maxVideos: {
    type: Number,
    default: 2,
    min: [0, 'Max videos cannot be negative'],
    max: [10, 'Max videos cannot exceed 10']
  }
}, { _id: false });

// Main ChecklistTemplate schema
const checklistTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters'],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  types: {
    type: [typeConfigSchema],
    required: [true, 'At least one type is required'],
    validate: {
      validator: function(types) {
        // Ensure unique type names
        const typeNames = types.map(t => t.typeName);
        return new Set(typeNames).size === typeNames.length;
      },
      message: 'Duplicate type names are not allowed'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
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
checklistTemplateSchema.index({ isActive: 1, createdAt: -1 });
checklistTemplateSchema.index({ createdBy: 1 });
checklistTemplateSchema.index({ name: 'text', description: 'text' }); // Text search

// Pre-save hook to validate video settings
checklistTemplateSchema.pre('save', function(next) {
  this.types.forEach(typeConfig => {
    if (typeConfig.allowVideos && !VIDEO_ALLOWED_TYPES.includes(typeConfig.typeName)) {
      return next(new Error(`Videos are only allowed for ${VIDEO_ALLOWED_TYPES.join(' and ')} types`));
    }
  });
  next();
});

// Method to get template for inspector (only active templates)
checklistTemplateSchema.statics.getActiveTemplate = function(templateId) {
  return this.findOne({ _id: templateId, isActive: true });
};

// Method to get all active templates
checklistTemplateSchema.statics.getActiveTemplates = function() {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

const ChecklistTemplate = mongoose.model('ChecklistTemplate', checklistTemplateSchema);

module.exports = ChecklistTemplate;
