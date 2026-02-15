/**
 * Make API Router (Single Lambda)
 * Routes make management HTTP API events to the correct handler.
 */

const { BadRequestError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');
const makeHandler = require('./makeHandler');

/**
 * Single entrypoint for make management endpoints.
 *
 * Serverless HTTP API provides `event.routeKey` like:
 * - "POST /api/admin/makes"
 * - "GET /api/admin/makes"
 * - "GET /api/admin/makes/{id}"
 * - "PUT /api/admin/makes/{id}"
 * - "DELETE /api/admin/makes/{id}"
 */
exports.handler = asyncHandler(async (event) => {
  const routeKey =
    event.routeKey ||
    `${event.requestContext?.http?.method || ''} ${event.requestContext?.http?.path || ''}`.trim();

  switch (routeKey) {
    case 'POST /api/admin/makes':
      return makeHandler.createMake(event);
    case 'GET /api/admin/makes':
      return makeHandler.getAllMakes(event);
    case 'GET /api/admin/makes/{id}':
      return makeHandler.getMakeById(event);
    case 'PUT /api/admin/makes/{id}':
      return makeHandler.updateMake(event);
    case 'DELETE /api/admin/makes/{id}':
      return makeHandler.deleteMake(event);
    default:
      throw new BadRequestError(`Unsupported route: ${routeKey}`);
  }
});
