/**
 * Admin Dashboard API Router (Single Lambda)
 * Routes admin dashboard HTTP API events to the correct handler.
 */

const { BadRequestError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');
const statisticsHandler = require('./statisticsHandler');

/**
 * Single entrypoint for admin dashboard endpoint.
 *
 * Serverless HTTP API provides `event.routeKey` like:
 * - "GET /api/admin/dashboard"
 */
exports.handler = asyncHandler(async (event) => {
  const routeKey =
    event.routeKey ||
    `${event.requestContext?.http?.method || ''} ${event.requestContext?.http?.path || ''}`.trim();

  switch (routeKey) {
    case 'GET /api/admin/dashboard':
      return statisticsHandler.getAdminDashboardData(event);
    default:
      throw new BadRequestError(`Unsupported route: ${routeKey}`);
  }
});
