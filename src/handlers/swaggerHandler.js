/**
 * Swagger Documentation Handler
 * Serves Swagger UI and OpenAPI specification
 */

const fs = require('fs');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get Swagger YAML specification
 * GET /api/docs/swagger.yaml
 */
exports.getSwaggerYaml = asyncHandler(async (event) => {
  const swaggerPath = path.join(__dirname, '../../swagger.yaml');
  const swaggerContent = fs.readFileSync(swaggerPath, 'utf8');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/x-yaml',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    },
    body: swaggerContent
  };
});

/**
 * Get Swagger UI HTML
 * GET /api/docs
 */
exports.getSwaggerUI = asyncHandler(async (event) => {
  const htmlPath = path.join(__dirname, '../../swagger.html');
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Get the API Gateway URL from the request
  const requestContext = event.requestContext || {};
  const http = requestContext.http || {};
  const domainName = requestContext.domainName || event.headers?.host || 'localhost:3000';
  const protocol = event.headers?.['x-forwarded-proto'] || 
                   event.headers?.['X-Forwarded-Proto'] || 
                   (domainName.includes('localhost') ? 'http' : 'https');
  
  // Construct the base URL
  let baseUrl = `${protocol}://${domainName}`;
  
  // If we have the stage info, include it in the path
  const stage = requestContext.stage || 'dev';
  if (!domainName.includes('localhost') && !domainName.includes('amazonaws.com')) {
    baseUrl = `${baseUrl}/${stage}`;
  }

  // Replace the local swagger.yaml path with the API Gateway URL
  htmlContent = htmlContent.replace(
    'url: "./swagger.yaml"',
    `url: "${baseUrl}/api/docs/swagger.yaml"`
  );

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    },
    body: htmlContent
  };
});
