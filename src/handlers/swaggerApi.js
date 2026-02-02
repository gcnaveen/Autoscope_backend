/**
 * Swagger API Router (Single Lambda)
 * Routes Swagger documentation endpoints
 */

const { BadRequestError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

const swaggerHandler = require('./swaggerHandler');

/**
 * Single entrypoint for all Swagger documentation endpoints.
 */
exports.handler = asyncHandler(async (event) => {
  const routeKey =
    event.routeKey ||
    `${event.requestContext?.http?.method || ''} ${event.requestContext?.http?.path || ''}`.trim();

  switch (routeKey) {
    case 'GET /api/docs':
      return swaggerHandler.getSwaggerUI(event);
    case 'GET /api/docs/swagger.yaml':
      return swaggerHandler.getSwaggerYaml(event);
    case 'OPTIONS /api/docs':
    case 'OPTIONS /api/docs/swagger.yaml':
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        body: ''
      };
    default:
      throw new BadRequestError(`Unsupported route: ${routeKey}`);
  }
});
