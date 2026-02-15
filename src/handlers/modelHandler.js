/**
 * Model Handlers
 * Lambda function handlers for model endpoints
 */

const { connectDB } = require('../config/database');
const {
  createModel,
  getAllModels,
  getModelById,
  updateModel,
  deleteModel
} = require('../controllers/modelController');
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
 * Create a new model
 * POST /api/admin/models
 * Admin, Inspector, User
 */
exports.createModel = asyncHandler(async (event) => {
  await initDB();
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN, USER_ROLES.INSPECTOR, USER_ROLES.USER)(event);
  const modelData = validate(schemas.createModel)(event);
  return await createModel(modelData);
});

/**
 * Get all models
 * GET /api/admin/models
 * Public – no authentication required (works with or without token).
 */
exports.getAllModels = asyncHandler(async (event) => {
  await initDB();
  const queryParams = event.queryStringParameters || {};
  return await getAllModels(queryParams);
});

/**
 * Get model by ID
 * GET /api/admin/models/{id}
 * Public – no authentication required (works with or without token).
 */
exports.getModelById = asyncHandler(async (event) => {
  await initDB();
  const modelId = event.pathParameters?.id;
  if (!modelId) {
    throw new BadRequestError('Model ID is required');
  }
  return await getModelById(modelId);
});

/**
 * Update model
 * PUT /api/admin/models/{id}
 * Admin only
 */
exports.updateModel = asyncHandler(async (event) => {
  await initDB();
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  const modelId = event.pathParameters?.id;
  if (!modelId) {
    throw new BadRequestError('Model ID is required');
  }
  const updateData = validate(schemas.updateModel)(event);
  return await updateModel(modelId, updateData);
});

/**
 * Delete a model
 * DELETE /api/admin/models/{id}
 * Admin only
 */
exports.deleteModel = asyncHandler(async (event) => {
  await initDB();
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  const modelId = event.pathParameters?.id;
  if (!modelId) {
    throw new BadRequestError('Model ID is required');
  }
  return await deleteModel(modelId);
});
