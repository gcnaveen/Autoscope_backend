/**
 * Model API Router (Single Lambda)
 * Routes model management HTTP API events to the correct handler.
 */

const { BadRequestError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');
const modelHandler = require('./modelHandler');

/**
 * Single entrypoint for model management endpoints.
 *
 * Serverless HTTP API provides `event.routeKey` like:
 * - "POST /api/admin/models"
 * - "GET /api/admin/models"
 * - "GET /api/admin/models/{id}"
 * - "PUT /api/admin/models/{id}"
 * - "DELETE /api/admin/models/{id}"
 */
exports.handler = asyncHandler(async (event) => {
  const routeKey =
    event.routeKey ||
    `${event.requestContext?.http?.method || ''} ${event.requestContext?.http?.path || ''}`.trim();

  switch (routeKey) {
    case 'POST /api/admin/models':
      return modelHandler.createModel(event);
    case 'GET /api/admin/models':
      return modelHandler.getAllModels(event);
    case 'GET /api/admin/models/{id}':
      return modelHandler.getModelById(event);
    case 'PUT /api/admin/models/{id}':
      return modelHandler.updateModel(event);
    case 'DELETE /api/admin/models/{id}':
      return modelHandler.deleteModel(event);
    default:
      throw new BadRequestError(`Unsupported route: ${routeKey}`);
  }
});
