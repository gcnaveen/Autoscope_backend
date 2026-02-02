/**
 * Checklist API Router (Single Lambda)
 * Routes checklist-related HTTP API events to the correct handler.
 */

const { BadRequestError } = require('../utils/errors');
const asyncHandler = require('../utils/asyncHandler');

const checklistHandler = require('./checklistHandler');

/**
 * Single entrypoint for all checklist endpoints.
 *
 * Serverless HTTP API provides `event.routeKey` like:
 * - "POST /api/checklists/templates"
 * - "GET /api/checklists/templates"
 * - "GET /api/checklists/templates/{id}"
 * - "PUT /api/checklists/templates/{id}"
 * - "DELETE /api/checklists/templates/{id}"
 * - "GET /api/checklists/templates/active"
 * - "POST /api/checklists/inspections"
 * - "GET /api/checklists/inspections"
 * - "GET /api/checklists/inspections/{id}"
 * - "PUT /api/checklists/inspections/{id}"
 * - "DELETE /api/checklists/inspections/{id}"
 */
exports.handler = asyncHandler(async (event) => {
  const routeKey =
    event.routeKey ||
    `${event.requestContext?.http?.method || ''} ${event.requestContext?.http?.path || ''}`.trim();

  switch (routeKey) {
    // Template routes
    case 'POST /api/checklists/templates':
      return checklistHandler.createTemplate(event);
    case 'GET /api/checklists/templates':
      return checklistHandler.getAllTemplates(event);
    case 'GET /api/checklists/templates/{id}':
      return checklistHandler.getTemplateById(event);
    case 'PUT /api/checklists/templates/{id}':
      return checklistHandler.updateTemplate(event);
    case 'DELETE /api/checklists/templates/{id}':
      return checklistHandler.deleteTemplate(event);
    case 'GET /api/checklists/templates/active':
      return checklistHandler.getActiveTemplates(event);
    
    // Inspection routes
    case 'POST /api/checklists/inspections':
      return checklistHandler.createInspection(event);
    case 'GET /api/checklists/inspections':
      return checklistHandler.getAllInspections(event);
    case 'GET /api/checklists/inspections/{id}':
      return checklistHandler.getInspectionById(event);
    case 'PUT /api/checklists/inspections/{id}':
      return checklistHandler.updateInspection(event);
    case 'DELETE /api/checklists/inspections/{id}':
      return checklistHandler.deleteInspection(event);
    
    default:
      throw new BadRequestError(`Unsupported route: ${routeKey}`);
  }
});
