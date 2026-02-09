/**
 * Request Validation Middleware
 * Validates request bodies using Joi schemas
 */

const Joi = require('joi');
const { ValidationError } = require('../utils/errors');
const { sanitizeObject } = require('../utils/sanitize');
const { INSPECTION_TYPES, CHECKLIST_STATUS } = require('../config/constants');

/**
 * Validation schemas
 */
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
    firstName: Joi.string().min(2).max(50).trim().required().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 50 characters',
      'any.required': 'First name is required'
    }),
    lastName: Joi.string().min(2).max(50).trim().required().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 50 characters',
      'any.required': 'Last name is required'
    }),
    phone: Joi.string().max(20).trim().optional().allow('', null),
    role: Joi.string().valid('admin', 'inspector', 'user').default('user').messages({
      'any.only': 'Role must be one of: admin, inspector, user'
    }),
    password: Joi.string().min(8).max(128).trim().optional().allow('').messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters'
    })
  }).custom((value, helpers) => {
    const role = value.role || 'user';
    const password = (value.password || '').toString().trim();
    if ((role === 'admin' || role === 'inspector') && !password) {
      return helpers.error('object.passwordRequired');
    }
    return value;
  }).messages({
    'object.passwordRequired': 'Password is required for admin and inspector roles (min 8 characters)'
  }),

  // Login: admin/inspector require password; user uses email only (then OTP)
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(1).max(128).trim().optional().allow('').messages({
      'string.max': 'Password cannot exceed 128 characters'
    })
  }),

  sendOtp: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    })
  }),

  verifyOtp: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
    otp: Joi.string().length(6).required().messages({
      'string.length': 'OTP must be 6 digits',
      'any.required': 'OTP is required'
    })
  }),

  createUser: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
    firstName: Joi.string().min(2).max(50).trim().required().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 50 characters',
      'any.required': 'First name is required'
    }),
    lastName: Joi.string().min(2).max(50).trim().required().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 50 characters',
      'any.required': 'Last name is required'
    }),
    phone: Joi.string().max(20).trim().optional().allow('', null),
    role: Joi.string().valid('admin', 'inspector', 'user').required().messages({
      'any.only': 'Role must be one of: admin, inspector, user',
      'any.required': 'Role is required'
    }),
    password: Joi.string().min(8).max(128).trim().optional().allow('').messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters'
    })
  }).custom((value, helpers) => {
    const role = value.role;
    const password = (value.password || '').toString().trim();
    if ((role === 'admin' || role === 'inspector') && !password) {
      return helpers.error('object.passwordRequired');
    }
    return value;
  }).messages({
    'object.passwordRequired': 'Password is required when creating admin or inspector (min 8 characters)'
  }),

  updateUser: Joi.object({
    email: Joi.string().email().optional().messages({
      'string.email': 'Email must be a valid email address'
    }),
    firstName: Joi.string().min(2).max(50).trim().optional().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 50 characters'
    }),
    lastName: Joi.string().min(2).max(50).trim().optional().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 50 characters'
    }),
    phone: Joi.string().max(20).trim().optional().allow('', null),
    role: Joi.string().valid('admin', 'inspector', 'user').optional().messages({
      'any.only': 'Role must be one of: admin, inspector, user'
    }),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  listUsers: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    search: Joi.string().max(100).trim().allow('').optional().messages({
      'string.max': 'Search query must not exceed 100 characters'
    }),
    role: Joi.string().valid('admin', 'inspector', 'user').optional().messages({
      'any.only': 'Role must be one of: admin, inspector, user'
    }),
    status: Joi.string().valid('active', 'blocked', 'inactive').optional().messages({
      'any.only': 'Status must be one of: active, blocked, inactive'
    }),
    sortBy: Joi.string().valid('id', 'email', 'firstName', 'lastName', 'role', 'status', 'createdAt').default('id').messages({
      'any.only': 'Sort field must be one of: id, email, firstName, lastName, role, status, createdAt'
    }),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC').messages({
      'any.only': 'Sort order must be ASC or DESC'
    })
  }),

  // Checklist Template Schemas
  createTemplate: Joi.object({
    name: Joi.string().min(3).max(100).trim().required().messages({
      'string.min': 'Template name must be at least 3 characters long',
      'string.max': 'Template name cannot exceed 100 characters',
      'any.required': 'Template name is required'
    }),
    description: Joi.string().max(500).trim().allow('').optional().messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
    types: Joi.array().items(
      Joi.object({
        typeName: Joi.string().valid(...Object.values(INSPECTION_TYPES)).required().messages({
          'any.only': `Type must be one of: ${Object.values(INSPECTION_TYPES).join(', ')}`,
          'any.required': 'Type name is required'
        }),
        checklistItems: Joi.array().items(
          Joi.object({
            position: Joi.number().integer().min(1).required().messages({
              'number.base': 'Position must be a number',
              'number.min': 'Position must be at least 1',
              'any.required': 'Position is required'
            }),
            label: Joi.string().min(1).max(200).trim().required().messages({
              'string.min': 'Label is required',
              'string.max': 'Label cannot exceed 200 characters',
              'any.required': 'Label is required'
            }),
            description: Joi.string().max(500).trim().allow('').optional().messages({
              'string.max': 'Description cannot exceed 500 characters'
            }),
            isRequired: Joi.boolean().default(true)
          })
        ).min(1).required().messages({
          'array.min': 'At least one checklist item is required per type',
          'any.required': 'Checklist items are required'
        }),
        allowOverallRemarks: Joi.boolean().default(true),
        allowOverallPhotos: Joi.boolean().default(true),
        allowVideos: Joi.boolean().default(false),
        maxVideos: Joi.number().integer().min(0).max(10).default(2).messages({
          'number.base': 'Max videos must be a number',
          'number.min': 'Max videos cannot be negative',
          'number.max': 'Max videos cannot exceed 10'
        })
      })
    ).min(1).required().messages({
      'array.min': 'At least one type is required',
      'any.required': 'Types are required'
    })
  }),

  updateTemplate: Joi.object({
    name: Joi.string().min(3).max(100).trim().optional().messages({
      'string.min': 'Template name must be at least 3 characters long',
      'string.max': 'Template name cannot exceed 100 characters'
    }),
    description: Joi.string().max(500).trim().allow('').optional().messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
    types: Joi.array().items(
      Joi.object({
        typeName: Joi.string().valid(...Object.values(INSPECTION_TYPES)).required().messages({
          'any.only': `Type must be one of: ${Object.values(INSPECTION_TYPES).join(', ')}`,
          'any.required': 'Type name is required'
        }),
        checklistItems: Joi.array().items(
          Joi.object({
            position: Joi.number().integer().min(1).required().messages({
              'number.base': 'Position must be a number',
              'number.min': 'Position must be at least 1',
              'any.required': 'Position is required'
            }),
            label: Joi.string().min(1).max(200).trim().required().messages({
              'string.min': 'Label is required',
              'string.max': 'Label cannot exceed 200 characters',
              'any.required': 'Label is required'
            }),
            description: Joi.string().max(500).trim().allow('').optional().messages({
              'string.max': 'Description cannot exceed 500 characters'
            }),
            isRequired: Joi.boolean().default(true)
          })
        ).min(1).required().messages({
          'array.min': 'At least one checklist item is required per type',
          'any.required': 'Checklist items are required'
        }),
        allowOverallRemarks: Joi.boolean().default(true),
        allowOverallPhotos: Joi.boolean().default(true),
        allowVideos: Joi.boolean().default(false),
        maxVideos: Joi.number().integer().min(0).max(10).default(2)
      })
    ).min(1).optional().messages({
      'array.min': 'At least one type is required'
    }),
    isActive: Joi.boolean().optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  listTemplates: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    search: Joi.string().max(100).trim().allow('').optional().messages({
      'string.max': 'Search query must not exceed 100 characters'
    }),
    isActive: Joi.string().valid('true', 'false').optional().messages({
      'any.only': 'isActive must be true or false'
    }),
    sortBy: Joi.string().valid('id', 'name', 'createdAt', 'updatedAt').default('createdAt').messages({
      'any.only': 'Sort field must be one of: id, name, createdAt, updatedAt'
    }),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC').messages({
      'any.only': 'Sort order must be ASC or DESC'
    })
  }),

  // Inspection Schemas
  createInspection: Joi.object({
    checklistTemplateId: Joi.string().required().messages({
      'any.required': 'Checklist template ID is required'
    }),
    inspectionRequestId: Joi.string().optional().messages({
      'string.base': 'Inspection request ID must be a string'
    }),
    vehicleInfo: Joi.object({
      make: Joi.string().max(50).trim().allow('').optional().messages({
        'string.max': 'Make cannot exceed 50 characters'
      }),
      model: Joi.string().max(50).trim().allow('').optional().messages({
        'string.max': 'Model cannot exceed 50 characters'
      }),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional().messages({
        'number.base': 'Year must be a number',
        'number.min': 'Year must be at least 1900',
        'number.max': 'Year cannot be in the future'
      }),
      vin: Joi.string().max(17).trim().uppercase().allow('').optional().messages({
        'string.max': 'VIN cannot exceed 17 characters'
      }),
      licensePlate: Joi.string().max(20).trim().uppercase().allow('').optional().messages({
        'string.max': 'License plate cannot exceed 20 characters'
      }),
      mileage: Joi.number().min(0).optional().messages({
        'number.base': 'Mileage must be a number',
        'number.min': 'Mileage cannot be negative'
      }),
      color: Joi.string().max(30).trim().allow('').optional().messages({
        'string.max': 'Color cannot exceed 30 characters'
      })
    }).optional(),
    types: Joi.array().items(
      Joi.object({
        typeName: Joi.string().valid(...Object.values(INSPECTION_TYPES)).required().messages({
          'any.only': `Type must be one of: ${Object.values(INSPECTION_TYPES).join(', ')}`,
          'any.required': 'Type name is required'
        }),
        checklistItems: Joi.array().items(
          Joi.object({
            position: Joi.number().integer().min(1).required().messages({
              'number.base': 'Position must be a number',
              'number.min': 'Position must be at least 1',
              'any.required': 'Position is required'
            }),
            label: Joi.string().required().messages({
              'any.required': 'Label is required'
            }),
            status: Joi.string().valid(...Object.values(CHECKLIST_STATUS)).required().messages({
              'any.only': `Status must be one of: ${Object.values(CHECKLIST_STATUS).join(', ')}`,
              'any.required': 'Status is required'
            }),
            rating: Joi.number().min(0).max(5).required().messages({
              'number.base': 'Rating must be a number',
              'number.min': 'Rating must be at least 0',
              'number.max': 'Rating must be at most 5',
              'any.required': 'Rating is required'
            }),
            remarks: Joi.string().max(1000).trim().allow('', null).optional().messages({
              'string.max': 'Remarks cannot exceed 1000 characters'
            }),
            photos: Joi.array().items(Joi.string()).max(20).optional().messages({
              'array.max': 'Maximum 20 photos allowed per checklist item'
            })
          })
        ).min(1).required().messages({
          'array.min': 'At least one checklist item is required per type',
          'any.required': 'Checklist items are required'
        }),
        overallRemarks: Joi.string().max(2000).trim().allow('', null).optional().messages({
          'string.max': 'Overall remarks cannot exceed 2000 characters'
        }),
        overallPhotos: Joi.array().items(Joi.string()).max(30).optional().messages({
          'array.max': 'Maximum 30 photos allowed per type'
        }),
        videos: Joi.array().items(Joi.string()).max(2).optional().messages({
          'array.max': 'Maximum 2 videos allowed for Interior and Exterior types'
        })
      })
    ).min(1).required().messages({
      'array.min': 'At least one type inspection is required',
      'any.required': 'Types are required'
    }),
    status: Joi.string().valid('draft', 'completed', 'submitted').default('draft').messages({
      'any.only': 'Status must be one of: draft, completed, submitted'
    }),
    inspectionDate: Joi.date().optional(),
    notes: Joi.string().max(5000).trim().allow('', null).optional().messages({
      'string.max': 'Notes cannot exceed 5000 characters'
    })
  }),

  updateInspection: Joi.object({
    vehicleInfo: Joi.object({
      make: Joi.string().max(50).trim().allow('').optional(),
      model: Joi.string().max(50).trim().allow('').optional(),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional(),
      vin: Joi.string().max(17).trim().uppercase().allow('').optional(),
      licensePlate: Joi.string().max(20).trim().uppercase().allow('').optional(),
      mileage: Joi.number().min(0).optional(),
      color: Joi.string().max(30).trim().allow('').optional()
    }).optional(),
    types: Joi.array().items(
      Joi.object({
        typeName: Joi.string().valid(...Object.values(INSPECTION_TYPES)).required(),
        checklistItems: Joi.array().items(
          Joi.object({
            position: Joi.number().integer().min(1).required(),
            label: Joi.string().required(),
            status: Joi.string().valid(...Object.values(CHECKLIST_STATUS)).required(),
            rating: Joi.number().min(0).max(5).required(),
            remarks: Joi.string().max(1000).trim().allow('', null).optional(),
            photos: Joi.array().items(Joi.string()).max(20).optional()
          })
        ).min(1).required(),
        overallRemarks: Joi.string().max(2000).trim().allow('', null).optional(),
        overallPhotos: Joi.array().items(Joi.string()).max(30).optional(),
        videos: Joi.array().items(Joi.string()).max(2).optional()
      })
    ).min(1).optional(),
    status: Joi.string().valid('draft', 'completed', 'submitted').optional(),
    notes: Joi.string().max(5000).trim().allow('', null).optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  listInspections: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    status: Joi.string().valid('draft', 'completed', 'submitted').optional().messages({
      'any.only': 'Status must be one of: draft, completed, submitted'
    }),
    templateId: Joi.string().optional(),
    sortBy: Joi.string().valid('id', 'inspectionDate', 'createdAt', 'overallRating').default('inspectionDate').messages({
      'any.only': 'Sort field must be one of: id, inspectionDate, createdAt, overallRating'
    }),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC').messages({
      'any.only': 'Sort order must be ASC or DESC'
    })
  }),

  // Inspection Request Schemas
  createInspectionRequest: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
    firstName: Joi.string().min(2).max(50).trim().optional().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
    lastName: Joi.string().min(2).max(50).trim().optional().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
    phone: Joi.string().max(20).trim().allow('', null).optional(),
    requestType: Joi.string().valid('car inspection', 'car valuation').default('car inspection').messages({
      'any.only': 'Request type must be either "car inspection" or "car valuation"'
    }),
    vehicleInfo: Joi.object({
      make: Joi.string().required().trim().max(50).messages({
        'any.required': 'Vehicle make is required',
        'string.max': 'Make cannot exceed 50 characters'
      }),
      model: Joi.string().required().trim().max(50).messages({
        'any.required': 'Vehicle model is required',
        'string.max': 'Model cannot exceed 50 characters'
      }),
      year: Joi.number().integer().required().min(1900).max(new Date().getFullYear() + 1).messages({
        'any.required': 'Vehicle year is required',
        'number.base': 'Year must be a number',
        'number.min': 'Year must be at least 1900',
        'number.max': 'Year cannot be in the future'
      }),
      vin: Joi.string().max(17).trim().uppercase().allow('').optional(),
      licensePlate: Joi.string().max(20).trim().uppercase().allow('').optional(),
      mileage: Joi.number().min(0).optional().default(0),
      color: Joi.string().max(30).trim().allow('').optional()
    }).required(),
    preferredDate: Joi.date().optional().allow(null),
    preferredTime: Joi.string().max(20).trim().allow('').optional(),
    location: Joi.object({
      address: Joi.string().max(200).trim().allow('').optional(),
      city: Joi.string().max(50).trim().allow('').optional(),
      state: Joi.string().max(50).trim().allow('').optional(),
      zipCode: Joi.string().max(10).trim().allow('').optional()
    }).optional(),
    notes: Joi.string().max(1000).trim().allow('').optional()
  }),

  listInspectionRequests: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('pending', 'assigned', 'in_progress', 'completed', 'cancelled').optional(),
    sortBy: Joi.string().valid('id', 'createdAt', 'preferredDate', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
  }),

  // Get available inspectors (admin): role=inspector, status=active, is_assigned=false; optional availableStatus filter
  listAvailableInspectors: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(50).messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    availableStatus: Joi.string().max(50).trim().allow('').optional().messages({
      'string.max': 'Available status must not exceed 50 characters'
    })
  }),

  // Update inspection request (user edits own request; only when status is pending)
  updateInspectionRequest: Joi.object({
    requestType: Joi.string().valid('car inspection', 'car valuation').optional().messages({
      'any.only': 'Request type must be either "car inspection" or "car valuation"'
    }),
    vehicleInfo: Joi.object({
      make: Joi.string().trim().max(50).optional().messages({
        'string.max': 'Make cannot exceed 50 characters'
      }),
      model: Joi.string().trim().max(50).optional().messages({
        'string.max': 'Model cannot exceed 50 characters'
      }),
      year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).optional().messages({
        'number.base': 'Year must be a number',
        'number.min': 'Year must be at least 1900',
        'number.max': 'Year cannot be in the future'
      }),
      vin: Joi.string().max(17).trim().uppercase().allow('').optional(),
      licensePlate: Joi.string().max(20).trim().uppercase().allow('').optional(),
      mileage: Joi.number().min(0).optional(),
      color: Joi.string().max(30).trim().allow('').optional()
    }).optional(),
    preferredDate: Joi.date().optional().allow(null),
    preferredTime: Joi.string().max(20).trim().allow('').optional(),
    location: Joi.object({
      address: Joi.string().max(200).trim().allow('').optional(),
      city: Joi.string().max(50).trim().allow('').optional(),
      state: Joi.string().max(50).trim().allow('').optional(),
      zipCode: Joi.string().max(10).trim().allow('').optional()
    }).optional(),
    notes: Joi.string().max(1000).trim().allow('').optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  // Assign inspector to inspection request (admin only). Body: { inspectorId }
  assignInspector: Joi.object({
    inspectorId: Joi.string().trim().required().messages({
      'any.required': 'Inspector ID is required'
    })
  }),

  // Inspector updates own available status. Body: { availableStatus }
  updateAvailableStatus: Joi.object({
    availableStatus: Joi.string().max(50).trim().allow('', null).optional().messages({
      'string.max': 'Available status cannot exceed 50 characters'
    })
  }),

  // Admin rejects inspection request. Body: { reason? }
  rejectInspectionRequest: Joi.object({
    reason: Joi.string().max(500).trim().allow('', null).optional().messages({
      'string.max': 'Reason cannot exceed 500 characters'
    })
  }),

  // Presigned S3 upload URL – folder by inspection type (Interior, Exterior, Engine, etc.)
  // Allow either inspectionId or inspectionRequestId to support both flows
  presignedUploadUrl: Joi.object({
    inspectionId: Joi.string().min(1).max(50).trim().optional().messages({
      'string.max': 'inspectionId cannot exceed 50 characters'
    }),
    inspectionRequestId: Joi.string().min(1).max(50).trim().optional().messages({
      'string.max': 'inspectionRequestId cannot exceed 50 characters'
    }),
    typeName: Joi.string().valid(...Object.values(INSPECTION_TYPES)).required().messages({
      'any.required': 'typeName is required (e.g. Interior, Exterior, Engine)',
      'any.only': `typeName must be one of: ${Object.values(INSPECTION_TYPES).join(', ')}`
    }),
    fileName: Joi.string().min(1).max(255).trim().required().messages({
      'any.required': 'fileName is required',
      'string.max': 'fileName cannot exceed 255 characters'
    }),
    contentType: Joi.string().min(1).max(100).trim().required().messages({
      'any.required': 'contentType is required'
    }),
    mediaType: Joi.string().valid('photos', 'videos').optional().messages({
      'any.only': 'mediaType must be photos or videos (default: derived from contentType)'
    }),
    expiresIn: Joi.number().integer().min(60).max(14400).optional().messages({
      'number.min': 'expiresIn must be at least 60 seconds',
      'number.max': 'expiresIn cannot exceed 14400 seconds (4h for video)'
    })
  }).or('inspectionId', 'inspectionRequestId'),

  // Multipart upload init (large videos – 10+ min). Bucket folders by type.
  multipartUploadInit: Joi.object({
    inspectionId: Joi.string().min(1).max(50).trim().required().messages({
      'any.required': 'inspectionId is required'
    }),
    typeName: Joi.string().valid(...Object.values(INSPECTION_TYPES)).required().messages({
      'any.required': 'typeName is required',
      'any.only': `typeName must be one of: ${Object.values(INSPECTION_TYPES).join(', ')}`
    }),
    fileName: Joi.string().min(1).max(255).trim().required().messages({
      'any.required': 'fileName is required'
    }),
    contentType: Joi.string().valid('video/mp4', 'video/quicktime', 'video/webm').required().messages({
      'any.required': 'contentType is required for video'
    })
  }),

  // Presigned URL(s) for multipart part(s)
  multipartPartUrls: Joi.object({
    key: Joi.string().min(1).max(600).trim().required().messages({
      'any.required': 'key from init response is required'
    }),
    uploadId: Joi.string().min(1).max(200).trim().required().messages({
      'any.required': 'uploadId from init response is required'
    }),
    partNumbers: Joi.array().items(Joi.number().integer().min(1).max(10000)).min(1).max(10000).required().messages({
      'any.required': 'partNumbers array is required (e.g. [1,2,3])'
    }),
    expiresIn: Joi.number().integer().min(300).max(3600).optional()
  }),

  // Complete multipart upload
  multipartComplete: Joi.object({
    key: Joi.string().min(1).max(600).trim().required(),
    uploadId: Joi.string().min(1).max(200).trim().required(),
    parts: Joi.array().items(
      Joi.object({
        partNumber: Joi.number().integer().min(1).max(10000).required(),
        etag: Joi.string().min(1).trim().required()
      })
    ).min(1).max(10000).required()
  }),

  // Abort multipart upload
  multipartAbort: Joi.object({
    key: Joi.string().min(1).max(600).trim().required(),
    uploadId: Joi.string().min(1).max(200).trim().required()
  }),

  // Delete image/video from S3 (inspector/admin). Provide key or fileUrl (one required).
  deleteMedia: Joi.object({
    key: Joi.string().min(1).max(700).trim().optional().messages({
      'string.max': 'key cannot exceed 700 characters'
    }),
    fileUrl: Joi.string().uri().max(2000).trim().optional().messages({
      'string.uri': 'fileUrl must be a valid URL'
    })
  }).custom((value, helpers) => {
    const key = (value.key || '').toString().trim();
    const fileUrl = (value.fileUrl || '').toString().trim();
    if (!key && !fileUrl) {
      return helpers.error('object.deleteMediaRequired');
    }
    return value;
  }).messages({
    'object.deleteMediaRequired': 'Either key or fileUrl is required'
  }),

  // Contact Us form: name required, either email or number required, message optional
  contactUs: Joi.object({
    name: Joi.string().min(2).max(100).trim().required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required'
    }),
    email: Joi.string().email().trim().lowercase().allow('').optional().messages({
      'string.email': 'Email must be a valid email address'
    }),
    number: Joi.string().trim().max(20).allow('').optional().messages({
      'string.max': 'Number must not exceed 20 characters'
    }),
    message: Joi.string().trim().max(2000).allow('').optional().messages({
      'string.max': 'Message must not exceed 2000 characters'
    })
  }).custom((value, helpers) => {
    const email = (value.email || '').toString().trim();
    const number = (value.number || '').toString().trim();
    if (!email && !number) {
      return helpers.error('object.either');
    }
    return value;
  }).messages({
    'object.either': 'Either email or number is required'
  }),

  listContactSubmissions: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    search: Joi.string().max(100).trim().allow('').optional().messages({
      'string.max': 'Search query must not exceed 100 characters'
    }),
    sortBy: Joi.string().valid('createdAt', 'name', 'email').default('createdAt').messages({
      'any.only': 'sortBy must be one of: createdAt, name, email'
    }),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC').messages({
      'any.only': 'sortOrder must be ASC or DESC'
    })
  })
};

/**
 * Validate request body against schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Validation middleware function
 */
const validate = (schema) => {
  return (event) => {
    try {
      // Parse body if string
      const body = typeof event.body === 'string' 
        ? JSON.parse(event.body) 
        : event.body || {};

      // Sanitize input
      const sanitizedBody = sanitizeObject(body);

      // Validate
      const { error, value } = schema.validate(sanitizedBody, { 
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        throw new ValidationError('Validation failed', errors);
      }

      return value;
    } catch (error) {
      // Re-throw validation errors
      if (error instanceof ValidationError) {
        throw error;
      }

      // Handle JSON parse errors
      if (error instanceof SyntaxError) {
        throw new ValidationError('Invalid JSON in request body');
      }

      throw error;
    }
  };
};

module.exports = {
  schemas,
  validate
};