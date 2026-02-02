/**
 * Auth API Router (Single Lambda)
 * Routes auth-related HTTP API events to the correct handler.
 */

const { BadRequestError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

const authHandler = require('./authHandler');

/**
 * Single entrypoint for all auth endpoints.
 *
 * Serverless HTTP API provides `event.routeKey` like:
 * - "POST /api/auth/register"
 * - "POST /api/auth/login"
 */
exports.handler = asyncHandler(async (event) => {
  const routeKey =
    event.routeKey ||
    `${event.requestContext?.http?.method || ''} ${event.requestContext?.http?.path || ''}`.trim();

  switch (routeKey) {
    case 'POST /api/auth/register':
      return authHandler.register(event);
    case 'POST /api/auth/login':
      return authHandler.login(event);
    case 'POST /api/auth/send-otp':
      return authHandler.sendOtp(event);
    case 'POST /api/auth/verify-otp':
      return authHandler.verifyOtp(event);
    default:
      throw new BadRequestError(`Unsupported route: ${routeKey}`);
  }
});


