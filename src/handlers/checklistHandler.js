/**
 * Checklist Management Handlers
 * Lambda function handlers for checklist template and inspection endpoints
 */

const { connectDB } = require('../config/database');
const {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  getActiveTemplates,
  createInspection,
  getInspectionById,
  getAllInspections,
  updateInspection,
  deleteInspection
} = require('../controllers/checklistController');
const { authenticate, authorize } = require('../middleware/auth');
const { schemas, validate } = require('../middleware/validator');
const { USER_ROLES } = require('../config/constants');
const { BadRequestError } = require('../utils/errors');
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
 * Create template handler (admin only)
 * POST /api/checklists/templates
 */
exports.createTemplate = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  // Validate request
  const templateData = validate(schemas.createTemplate)(event);
  
  // Create template
  return await createTemplate(templateData, currentUser);
});

/**
 * Get all templates handler (admin only)
 * GET /api/checklists/templates
 */
exports.getAllTemplates = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  // Parse and validate query parameters
  const queryParams = parseQueryParams(event);
  const validatedParams = validateQuery(schemas.listTemplates, queryParams);
  
  // Get all templates
  return await getAllTemplates(validatedParams);
});

/**
 * Get template by ID handler
 * GET /api/checklists/templates/{id}
 */
exports.getTemplateById = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate
  const { user: currentUser } = await authenticate(event);
  
  // Get template ID from path parameters
  const templateId = event.pathParameters?.id;
  if (!templateId) {
    throw new BadRequestError('Template ID is required');
  }
  
  // For inspectors, only return active templates
  const activeOnly = currentUser.role === USER_ROLES.INSPECTOR;
  
  // Get template
  return await getTemplateById(templateId, activeOnly);
});

/**
 * Update template handler (admin only)
 * PUT /api/checklists/templates/{id}
 */
exports.updateTemplate = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  // Get template ID from path parameters
  const templateId = event.pathParameters?.id;
  if (!templateId) {
    throw new BadRequestError('Template ID is required');
  }
  
  // Validate request
  const updateData = validate(schemas.updateTemplate)(event);
  
  // Update template
  return await updateTemplate(templateId, updateData, currentUser);
});

/**
 * Delete template handler (admin only)
 * DELETE /api/checklists/templates/{id}
 */
exports.deleteTemplate = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  // Get template ID from path parameters
  const templateId = event.pathParameters?.id;
  if (!templateId) {
    throw new BadRequestError('Template ID is required');
  }
  
  // Delete template
  return await deleteTemplate(templateId);
});

/**
 * Get active templates handler (inspector only)
 * GET /api/checklists/templates/active
 */
exports.getActiveTemplates = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize
  const { user: currentUser } = await authorize(USER_ROLES.INSPECTOR)(event);
  
  // Get active templates
  return await getActiveTemplates();
});

/**
 * Create inspection handler (inspector only)
 * POST /api/checklists/inspections
 */
exports.createInspection = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize
  const { user: currentUser } = await authorize(USER_ROLES.INSPECTOR)(event);
  
  // Validate request
  const inspectionData = validate(schemas.createInspection)(event);
  
  // Create inspection
  return await createInspection(inspectionData, currentUser);
});

/**
 * Get inspection by ID handler
 * GET /api/checklists/inspections/{id}
 */
exports.getInspectionById = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate
  const { user: currentUser } = await authenticate(event);
  
  // Get inspection ID from path parameters
  const inspectionId = event.pathParameters?.id;
  if (!inspectionId) {
    throw new BadRequestError('Inspection ID is required');
  }
  
  // Get inspection
  return await getInspectionById(inspectionId, currentUser);
});

/**
 * Get all inspections handler
 * GET /api/checklists/inspections
 */
exports.getAllInspections = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate
  const { user: currentUser } = await authenticate(event);
  
  // Parse and validate query parameters
  const queryParams = parseQueryParams(event);
  const validatedParams = validateQuery(schemas.listInspections, queryParams);
  
  // Get all inspections
  return await getAllInspections(validatedParams, currentUser);
});

/**
 * Update inspection handler (inspector only, only if draft)
 * PUT /api/checklists/inspections/{id}
 */
exports.updateInspection = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate
  const { user: currentUser } = await authenticate(event);
  
  // Get inspection ID from path parameters
  const inspectionId = event.pathParameters?.id;
  if (!inspectionId) {
    throw new BadRequestError('Inspection ID is required');
  }
  
  // Validate request
  const updateData = validate(schemas.updateInspection)(event);
  
  // Update inspection
  return await updateInspection(inspectionId, updateData, currentUser);
});

/**
 * Delete inspection handler (inspector only, only if draft)
 * DELETE /api/checklists/inspections/{id}
 */
exports.deleteInspection = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate
  const { user: currentUser } = await authenticate(event);
  
  // Get inspection ID from path parameters
  const inspectionId = event.pathParameters?.id;
  if (!inspectionId) {
    throw new BadRequestError('Inspection ID is required');
  }
  
  // Delete inspection
  return await deleteInspection(inspectionId, currentUser);
});
