/**
 * ContactSubmission Model
 * Stores contact us form submissions (name, email or number, optional message)
 */

const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Email cannot exceed 100 characters'],
    default: null
  },
  number: {
    type: String,
    trim: true,
    maxlength: [20, 'Number cannot exceed 20 characters'],
    default: null
  },
  message: {
    type: String,
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
    default: ''
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

// At least one of email or number must be set (enforced in service/validator)
contactSubmissionSchema.index({ createdAt: -1 });

const ContactSubmission = mongoose.model('ContactSubmission', contactSubmissionSchema);

module.exports = ContactSubmission;
