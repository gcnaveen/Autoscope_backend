/**
 * User Management Handlers
 * Lambda function handlers for user management endpoints
 */

const { connectDB } = require('../config/database');
const {
  createUser,
  getUserById,
  updateUser,
  blockUser,
  deleteUser,
  getAllUsers,
  getAvailableInspectors,
  updateMyAvailableStatus
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');
const { USER_ROLES } = require('../config/constants');
const { BadRequestError, ForbiddenError } = require('../utils/errors');
const { parseQueryParams } = require('../utils/queryParams');
const { validateQuery } = require('../utils/validateQuery');
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
 * Create user handler (admin only)
 * POST /api/users
 */
exports.createUser = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  // Validate request
  const userData = validate(schemas.createUser)(event);
  
  // Create user
  return await createUser(userData);
});

/**
 * Get user by ID handler
 * GET /api/users/{id}
 */
exports.getUserById = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate
  const { user: currentUser } = await authenticate(event);
  
  // Get user ID from path parameters
  const userId = event.pathParameters?.id;
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }
  
  // Get user (authorization handled in service)
  return await getUserById(userId, currentUser);
});

/**
 * Update user handler
 * PUT /api/users/{id}
 */
exports.updateUser = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate
  const { user: currentUser } = await authenticate(event);
  
  // Get user ID from path parameters
  const userId = event.pathParameters?.id;
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }
  
  // Validate request
  const updateData = validate(schemas.updateUser)(event);
  
  // Update user
  return await updateUser(userId, updateData, currentUser);
});

/**
 * Toggle user status handler (admin only): active ↔ inactive
 * PUT /api/users/{id}/block
 */
exports.blockUser = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  // Get user ID from path parameters
  const userId = event.pathParameters?.id;
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }
  
  // Toggle user status (active → inactive, inactive/blocked → active)
  return await blockUser(userId);
});

/**
 * Delete user handler (admin only)
 * DELETE /api/users/{id}
 */
exports.deleteUser = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  // Get user ID from path parameters
  const userId = event.pathParameters?.id;
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }
  
  // Delete user
  return await deleteUser(userId);
});

/**
 * Get all users handler (admin only)
 * GET /api/users
 */
exports.getAllUsers = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  // Parse and validate query parameters
  const queryParams = parseQueryParams(event);
  const validatedParams = validateQuery(schemas.listUsers, queryParams);
  
  // Get all users
  return await getAllUsers(validatedParams);
});

/**
 * Get available inspectors for assignment (admin only)
 * GET /api/inspectors/available
 * Criteria: role=inspector, status=active, is_assigned=false
 */
exports.getAvailableInspectors = asyncHandler(async (event) => {
  await initDB();
  
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  const queryParams = parseQueryParams(event);
  const validatedParams = validateQuery(schemas.listAvailableInspectors, queryParams);
  
  return await getAvailableInspectors(validatedParams);
});

/**
 * Update inspector's own available status (inspector only)
 * PUT /api/inspectors/me/available-status
 * Body: { availableStatus?: string }
 */
exports.updateMyAvailableStatus = asyncHandler(async (event) => {
  await initDB();

  const { user: currentUser } = await authorize(USER_ROLES.INSPECTOR)(event);

  const body = validate(schemas.updateAvailableStatus)(event);
  return await updateMyAvailableStatus(body, currentUser);
});