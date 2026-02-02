/**
 * Inspection Request Controller
 * Handles HTTP request/response logic for inspection request endpoints
 */

const inspectionRequestService = require('../services/inspectionRequestService');
const { success } = require('../utils/response');

/**
 * Create inspection request (public - no auth required)
 * Automatically creates user if email doesn't exist
 * @param {Object} requestData - Request data (must include email)
 * @returns {Promise<Object>} Success response with created request
 */
const createRequest = async (requestData) => {
  const request = await inspectionRequestService.createRequest(requestData);
  
  return success({
    statusCode: 201,
    message: 'Inspection request created successfully',
    data: { request }
  });
};

/**
 * Get user's inspection requests (user sees own, admin sees all unless meOnly)
 * @param {Object} queryParams - Query parameters
 * @param {Object} currentUser - Current authenticated user
 * @param {Object} [options] - { meOnly: true } to return only current user's requests
 * @returns {Promise<Object>} Success response with requests list
 */
const getUserRequests = async (queryParams, currentUser, options = {}) => {
  const result = await inspectionRequestService.getUserRequests(queryParams, currentUser, options);
  
  return success({
    message: 'Inspection requests retrieved successfully',
    data: result
  });
};

/**
 * Get request by ID
 * @param {string} requestId - Request ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with request
 */
const getRequestById = async (requestId, currentUser) => {
  const request = await inspectionRequestService.getRequestById(requestId, currentUser);
  
  return success({
    message: 'Inspection request retrieved successfully',
    data: { request }
  });
};

/**
 * Update inspection request (user edits own request when status is pending)
 * @param {string} requestId - Request ID
 * @param {Object} updateData - Validated update body
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with updated request
 */
const updateRequest = async (requestId, updateData, currentUser) => {
  const request = await inspectionRequestService.updateRequest(requestId, updateData, currentUser);
  
  return success({
    message: 'Inspection request updated successfully',
    data: { request }
  });
};

/**
 * Get all requests for admin
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} Success response with all requests and statistics
 */
const getAllRequestsForAdmin = async (queryParams) => {
  const result = await inspectionRequestService.getAllRequestsForAdmin(queryParams);
  
  return success({
    message: 'Inspection requests retrieved successfully',
    data: result
  });
};

/**
 * Assign inspector to inspection request (admin only)
 * @param {string} requestId - Request ID (MongoDB _id)
 * @param {Object} body - { inspectorId }
 * @param {Object} currentUser - Authenticated admin user
 * @returns {Promise<Object>} Success response with updated request
 */
const assignInspector = async (requestId, body, currentUser) => {
  const request = await inspectionRequestService.assignInspector(requestId, body, currentUser);
  
  return success({
    message: 'Inspector assigned successfully',
    data: { request }
  });
};

/**
 * Get assigned requests for current inspector (inspector only)
 * @param {Object} queryParams - Query parameters
 * @param {Object} currentUser - Authenticated inspector
 * @returns {Promise<Object>} Success response with requests list
 */
const getAssignedRequestsForInspector = async (queryParams, currentUser) => {
  const result = await inspectionRequestService.getAssignedRequestsForInspector(queryParams, currentUser);
  
  return success({
    message: 'Assigned requests retrieved successfully',
    data: result
  });
};

/**
 * Approve inspection request (admin only)
 * @param {string} requestId - Request ID (MongoDB _id)
 * @param {Object} currentUser - Authenticated admin user
 * @returns {Promise<Object>} Success response with updated request
 */
const approveRequest = async (requestId, currentUser) => {
  const request = await inspectionRequestService.approveRequest(requestId, currentUser);
  
  return success({
    message: 'Inspection request approved successfully',
    data: { request }
  });
};

/**
 * Reject inspection request (admin only)
 * @param {string} requestId - Request ID (MongoDB _id)
 * @param {Object} body - { reason?: string }
 * @param {Object} currentUser - Authenticated admin user
 * @returns {Promise<Object>} Success response with updated request
 */
const rejectRequest = async (requestId, body, currentUser) => {
  const request = await inspectionRequestService.rejectRequest(requestId, body, currentUser);
  
  return success({
    message: 'Inspection request rejected successfully',
    data: { request }
  });
};

module.exports = {
  createRequest,
  getUserRequests,
  getRequestById,
  updateRequest,
  getAllRequestsForAdmin,
  assignInspector,
  getAssignedRequestsForInspector,
  approveRequest,
  rejectRequest
};
