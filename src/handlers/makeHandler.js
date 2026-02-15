/**
 * Make Handlers
 * Lambda function handlers for make endpoints
 */

const { connectDB } = require('../config/database');
const {
  createMake,
  getAllMakes,
  getMakeById,
  updateMake,
  deleteMake
} = require('../controllers/makeController');
const { authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../config/constants');
const { schemas, validate } = require('../middleware/validator');
const { BadRequestError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

// Initialize database connection (warm start optimization)
let dbConnected = false;
const initDB = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};

/**
 * Create a new make
 * POST /api/admin/makes
 * Admin, Inspector, User
 */
exports.createMake = asyncHandler(async (event) => {
  await initDB();
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN, USER_ROLES.INSPECTOR, USER_ROLES.USER)(event);
  const makeData = validate(schemas.createMake)(event);
  return await createMake(makeData);
});

/**
 * Get all makes
 * GET /api/admin/makes
 * Public – no authentication required (works with or without token).
 */
exports.getAllMakes = asyncHandler(async (event) => {
  await initDB();
  const queryParams = event.queryStringParameters || {};
  return await getAllMakes(queryParams);
});

/**
 * Get make by ID
 * GET /api/admin/makes/{id}
 * Public – no authentication required (works with or without token).
 */
exports.getMakeById = asyncHandler(async (event) => {
  await initDB();
  const makeId = event.pathParameters?.id;
  if (!makeId) {
    throw new BadRequestError('Make ID is required');
  }
  const queryParams = event.queryStringParameters || {};
  return await getMakeById(makeId, queryParams);
});

/**
 * Update make
 * PUT /api/admin/makes/{id}
 * Admin only
 */
exports.updateMake = asyncHandler(async (event) => {
  await initDB();
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  const makeId = event.pathParameters?.id;
  if (!makeId) {
    throw new BadRequestError('Make ID is required');
  }
  const updateData = validate(schemas.updateMake)(event);
  return await updateMake(makeId, updateData);
});

/**
 * Delete a make
 * DELETE /api/admin/makes/{id}
 * Admin only
 */
exports.deleteMake = asyncHandler(async (event) => {
  await initDB();
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  const makeId = event.pathParameters?.id;
  if (!makeId) {
    throw new BadRequestError('Make ID is required');
  }
  const queryParams = event.queryStringParameters || {};
  return await deleteMake(makeId, queryParams);
});
