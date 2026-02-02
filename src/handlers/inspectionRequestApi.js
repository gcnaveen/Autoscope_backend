/**
 * Inspection Request API Router (Single Lambda)
 * Routes inspection request-related HTTP API events to the correct handler.
 */

const { BadRequestError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');
const inspectionRequestHandler = require('./inspectionRequestHandler');

/**
 * Single entrypoint for all inspection request endpoints.
 */
exports.handler = asyncHandler(async (event) => {
  const routeKey =
    event.routeKey ||
    `${event.requestContext?.http?.method || ''} ${event.requestContext?.http?.path || ''}`.trim();

  switch (routeKey) {
    case 'POST /api/inspection-requests':
      return inspectionRequestHandler.createRequest(event);
    case 'GET /api/inspection-requests':
      return inspectionRequestHandler.getUserRequests(event);
    case 'GET /api/inspection-requests/me':
      return inspectionRequestHandler.getUserRequests(event, { meOnly: true });
    case 'GET /api/inspection-requests/inspector/assigned':
      return inspectionRequestHandler.getAssignedRequestsForInspector(event);
    case 'GET /api/inspection-requests/{id}':
      return inspectionRequestHandler.getRequestById(event);
    case 'PUT /api/inspection-requests/{id}':
      return inspectionRequestHandler.updateRequest(event);
    case 'PUT /api/inspection-requests/{id}/assign':
      return inspectionRequestHandler.assignInspector(event);
    case 'PUT /api/inspection-requests/{id}/approve':
      return inspectionRequestHandler.approveRequest(event);
    case 'PUT /api/inspection-requests/{id}/reject':
      return inspectionRequestHandler.rejectRequest(event);
    case 'GET /api/inspection-requests/admin/all':
      return inspectionRequestHandler.getAllRequestsForAdmin(event);
    default:
      throw new BadRequestError(`Unsupported route: ${routeKey}`);
  }
});
