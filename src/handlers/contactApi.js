/**
 * Contact API Router
 * POST /api/contact - Contact us form (public)
 */

const { BadRequestError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');
const contactHandler = require('./contactHandler');

exports.handler = asyncHandler(async (event) => {
  const routeKey =
    event.routeKey ||
    `${event.requestContext?.http?.method || ''} ${event.requestContext?.http?.path || ''}`.trim();

  switch (routeKey) {
    case 'POST /api/contact':
      return contactHandler.submitContact(event);
    case 'GET /api/contact/admin':
      return contactHandler.getContactSubmissionsAdmin(event);
    default:
      throw new BadRequestError(`Unsupported route: ${routeKey}`);
  }
});
