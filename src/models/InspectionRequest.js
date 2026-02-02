/**
 * InspectionRequest Model
 * Mongoose schema for Inspection Request collection
 * Users create requests for car inspections, which can be assigned to inspectors
 */

const mongoose = require('mongoose');
const { USER_ROLES } = require('../config/constants');

const inspectionRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
    maxlength: [20, 'Request ID cannot exceed 20 characters']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  requestType: {
    type: String,
    enum: ['car inspection', 'car valuation'],
    default: 'car inspection',
    required: true,
    index: true
  },
  vehicleInfo: {
    make: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true,
      maxlength: [50, 'Make cannot exceed 50 characters']
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
      maxlength: [50, 'Model cannot exceed 50 characters']
    },
    year: {
      type: Number,
      required: [true, 'Vehicle year is required'],
      min: [1900, 'Year must be at least 1900'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
    },
    vin: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [17, 'VIN cannot exceed 17 characters'],
      default: ''
    },
    licensePlate: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'License plate cannot exceed 20 characters'],
      default: ''
    },
    mileage: {
      type: Number,
      min: [0, 'Mileage cannot be negative'],
      default: 0
    },
    color: {
      type: String,
      trim: true,
      maxlength: [30, 'Color cannot exceed 30 characters'],
      default: ''
    }
  },
  preferredDate: {
    type: Date,
    default: null
  },
  preferredTime: {
    type: String,
    trim: true,
    maxlength: [20, 'Preferred time cannot exceed 20 characters'],
    default: ''
  },
  location: {
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
      default: ''
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters'],
      default: ''
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters'],
      default: ''
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [10, 'Zip code cannot exceed 10 characters'],
      default: ''
    }
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  assignedInspectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  assignedAt: {
    type: Date,
    default: null
  },
  adminApprovedAt: {
    type: Date,
    default: null
  },
  inspectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inspection',
    default: null,
    index: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    default: ''
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
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
inspectionRequestSchema.index({ requestId: 1 }, { unique: true, sparse: true });
inspectionRequestSchema.index({ userId: 1, createdAt: -1 });
inspectionRequestSchema.index({ status: 1, createdAt: -1 });
inspectionRequestSchema.index({ assignedInspectorId: 1 });
inspectionRequestSchema.index({ 'vehicleInfo.licensePlate': 1 });

const InspectionRequest = mongoose.model('InspectionRequest', inspectionRequestSchema);

module.exports = InspectionRequest;
