/**
 * Inspection Request Handlers
 * Lambda function handlers for inspection request endpoints
 */

const { connectDB } = require('../config/database');
const {
  createRequest,
  getUserRequests,
  getRequestById,
  updateRequest,
  getAllRequestsForAdmin,
  assignInspector: assignInspectorController,
  getAssignedRequestsForInspector: getAssignedRequestsForInspectorController,
  approveRequest: approveRequestController,
  rejectRequest: rejectRequestController
} = require('../controllers/inspectionRequestController');
const { startInspection: startInspectionController } = require('../controllers/checklistController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');
const { parseQueryParams } = require('../utils/queryParams');
const { validateQuery } = require('../utils/validateQuery');
const { BadRequestError } = require('../utils/errors');
const { USER_ROLES } = require('../config/constants');
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
 * Create inspection request handler (public - no auth required)
 * POST /api/inspection-requests
 * 
 * This endpoint allows unauthenticated users to create inspection requests.
 * If the email exists in the database, the request is mapped to that user.
 * If the email doesn't exist, a new user is automatically created.
 */
exports.createRequest = asyncHandler(async (event) => {
  await initDB();
  
  // No authentication required - this is a public endpoint
  // Validate request
  const requestData = validate(schemas.createInspectionRequest)(event);
  
  // Create request (service will handle user lookup/creation)
  return await createRequest(requestData);
});

/**
 * Get user's inspection requests handler
 * GET /api/inspection-requests or GET /api/inspection-requests/me (meOnly = only logged-in user's requests)
 */
exports.getUserRequests = asyncHandler(async (event, options = {}) => {
  await initDB();
  
  // Authenticate
  const { user: currentUser } = await authenticate(event);
  
  // Parse and validate query parameters
  const queryParams = parseQueryParams(event);
  const validatedParams = validateQuery(schemas.listInspectionRequests, queryParams);
  
  // Get requests (options.meOnly true when path is /me)
  return await getUserRequests(validatedParams, currentUser, options);
});

/**
 * Get request by ID handler
 * GET /api/inspection-requests/{id}
 */
exports.getRequestById = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate
  const { user: currentUser } = await authenticate(event);
  
  // Get request ID from path parameters
  const requestId = event.pathParameters?.id;
  if (!requestId) {
    throw new BadRequestError('Request ID is required');
  }
  
  // Get request
  return await getRequestById(requestId, currentUser);
});

/**
 * Update inspection request handler (user edits own request; only when status is pending)
 * PUT /api/inspection-requests/{id}
 */
exports.updateRequest = asyncHandler(async (event) => {
  await initDB();

  const { user: currentUser } = await authenticate(event);

  const requestId = event.pathParameters?.id;
  if (!requestId) {
    throw new BadRequestError('Request ID is required');
  }

  const updateData = validate(schemas.updateInspectionRequest)(event);
  return await updateRequest(requestId, updateData, currentUser);
});

/**
 * Get all requests for admin handler
 * GET /api/inspection-requests/admin/all
 */
exports.getAllRequestsForAdmin = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize (admin only)
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  // Parse and validate query parameters
  const queryParams = parseQueryParams(event);
  const validatedParams = validateQuery(schemas.listInspectionRequests, queryParams);
  
  // Get all requests
  return await getAllRequestsForAdmin(validatedParams);
});

/**
 * Assign inspector to inspection request handler (admin only)
 * PUT /api/inspection-requests/{id}/assign
 * Body: { inspectorId: "..." }
 */
exports.assignInspector = asyncHandler(async (event) => {
  await initDB();

  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);

  const requestId = event.pathParameters?.id;
  if (!requestId) {
    throw new BadRequestError('Request ID is required');
  }

  const body = validate(schemas.assignInspector)(event);
  return await assignInspectorController(requestId, body, currentUser);
});

/**
 * Get assigned requests for current inspector (inspector only)
 * GET /api/inspection-requests/inspector/assigned
 */
exports.getAssignedRequestsForInspector = asyncHandler(async (event) => {
  await initDB();

  const { user: currentUser } = await authorize(USER_ROLES.INSPECTOR)(event);

  const queryParams = parseQueryParams(event);
  const validatedParams = validateQuery(schemas.listInspectionRequests, queryParams);

  return await getAssignedRequestsForInspectorController(validatedParams, currentUser);
});

/**
 * Approve inspection request handler (admin only)
 * PUT /api/inspection-requests/{id}/approve
 */
exports.approveRequest = asyncHandler(async (event) => {
  await initDB();

  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);

  const requestId = event.pathParameters?.id;
  if (!requestId) {
    throw new BadRequestError('Request ID is required');
  }

  return await approveRequestController(requestId, currentUser);
});

/**
 * Reject inspection request handler (admin only)
 * PUT /api/inspection-requests/{id}/reject
 * Body: { reason?: string }
 */
exports.rejectRequest = asyncHandler(async (event) => {
  await initDB();

  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);

  const requestId = event.pathParameters?.id;
  if (!requestId) {
    throw new BadRequestError('Request ID is required');
  }

  const body = validate(schemas.rejectInspectionRequest)(event);
  return await rejectRequestController(requestId, body, currentUser);
});
