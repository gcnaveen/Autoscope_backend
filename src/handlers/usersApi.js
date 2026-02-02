/**
 * Users API Router (Single Lambda)
 * Routes user-related HTTP API events to the correct handler.
 */

const { BadRequestError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

const userHandler = require('./userHandler');

/**
 * Single entrypoint for all user endpoints.
 *
 * Serverless HTTP API provides `event.routeKey` like:
 * - "GET /api/users"
 * - "POST /api/users"
 * - "GET /api/users/{id}"
 * - "PUT /api/users/{id}"
 * - "DELETE /api/users/{id}"
 * - "PUT /api/users/{id}/block"
 */
exports.handler = asyncHandler(async (event) => {
  const routeKey =
    event.routeKey ||
    `${event.requestContext?.http?.method || ''} ${event.requestContext?.http?.path || ''}`.trim();

  switch (routeKey) {
    case 'GET /api/users':
      return userHandler.getAllUsers(event);
    case 'POST /api/users':
      return userHandler.createUser(event);
    case 'GET /api/users/{id}':
      return userHandler.getUserById(event);
    case 'PUT /api/users/{id}':
      return userHandler.updateUser(event);
    case 'PUT /api/users/{id}/block':
      return userHandler.blockUser(event);
    case 'DELETE /api/users/{id}':
      return userHandler.deleteUser(event);
    case 'GET /api/inspectors/available':
      return userHandler.getAvailableInspectors(event);
    case 'PUT /api/inspectors/me/available-status':
      return userHandler.updateMyAvailableStatus(event);
    default:
      throw new BadRequestError(`Unsupported route: ${routeKey}`);
  }
});


