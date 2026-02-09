module.exports = {
  USER_ROLES: {
    ADMIN: 'admin',
    INSPECTOR: 'inspector',
    USER: 'user'
  },
  
  USER_STATUS: {
    ACTIVE: 'active',
    BLOCKED: 'blocked',
    INACTIVE: 'inactive'
  },
  
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  },
  
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Inspection Types
  INSPECTION_TYPES: {
    EXTERIOR: 'Exterior',
    LIGHT_CONDITIONS_AND_OPERATIONS: 'Light Conditions and Operations',
    INTERIOR: 'Interior',
    ENGINE: 'Engine',
    TRANSMISSION_AND_DRIVETRAIN: 'Transmission and Drivetrain',
    CHASIS: 'Chasis',
    TYRE_AND_BREAKS: 'Tyre and Breaks',
    OVERALL_SAFETY_FEATURE: 'Overall Safety Feature',
    ENTERTAINMENT: 'Entertainment',
    DRIVE_AND_PASSENGER_EXPERIENCE: 'Drive and Passenger Experience'
  },

  // Checklist Item Status (includes Fair and Not Checked for inspector flexibility)
  CHECKLIST_STATUS: {
    EXCELLENT: 'Excellent',
    GOOD: 'Good',
    AVERAGE: 'Average',
    POOR: 'Poor',
    FAIR: 'Fair',
    NOT_CHECKED: 'Not Checked'
  },

  // Status to Rating Mapping (for average calculation; Fair/Not Checked are flexible)
  STATUS_RATING_MAP: {
    'Excellent': 4,
    'Good': 3,
    'Average': 2,
    'Poor': 1,
    'Fair': 2.5,
    'Not Checked': 0
  },

  // Types that allow video uploads
  VIDEO_ALLOWED_TYPES: ['Interior', 'Exterior'],

  // S3 bucket for inspection images and videos
  S3_BUCKET: process.env.S3_BUCKET || 'autoscopedev',
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1'
};
