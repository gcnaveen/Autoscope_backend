/**
 * Checklist Controller
 * Handles HTTP request/response logic for checklist endpoints
 * Delegates business logic to service layer
 */

const checklistService = require('../services/checklistService');
const { success } = require('../utils/response');

/**
 * Create checklist template (admin only)
 * @param {Object} templateData - Template data
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with created template
 */
const createTemplate = async (templateData, currentUser) => {
  const template = await checklistService.createTemplate(templateData, currentUser);
  
  return success({
    statusCode: 201,
    message: 'Checklist template created successfully',
    data: { template }
  });
};

/**
 * Get all checklist templates with pagination (admin only)
 * @param {Object} queryParams - Query parameters
 * @returns {Promise<Object>} Success response with paginated templates
 */
const getAllTemplates = async (queryParams) => {
  const result = await checklistService.getAllTemplates(queryParams);
  
  return success({
    message: 'Templates retrieved successfully',
    data: result
  });
};

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @param {boolean} activeOnly - Only return active templates
 * @returns {Promise<Object>} Success response with template
 */
const getTemplateById = async (templateId, activeOnly = false) => {
  const template = await checklistService.getTemplateById(templateId, activeOnly);
  
  return success({
    message: 'Template retrieved successfully',
    data: { template }
  });
};

/**
 * Update checklist template (admin only)
 * @param {string} templateId - Template ID
 * @param {Object} updateData - Update data
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with updated template
 */
const updateTemplate = async (templateId, updateData, currentUser) => {
  const template = await checklistService.updateTemplate(templateId, updateData, currentUser);
  
  return success({
    message: 'Template updated successfully',
    data: { template }
  });
};

/**
 * Delete checklist template (admin only)
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Success response
 */
const deleteTemplate = async (templateId) => {
  await checklistService.deleteTemplate(templateId);
  
  return success({
    message: 'Template deleted successfully'
  });
};

/**
 * Get active templates for inspector
 * @returns {Promise<Object>} Success response with active templates
 */
const getActiveTemplates = async () => {
  const templates = await checklistService.getActiveTemplates();
  
  return success({
    message: 'Active templates retrieved successfully',
    data: { templates }
  });
};

/**
 * Create inspection (inspector only)
 * @param {Object} inspectionData - Inspection data
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with created inspection
 */
const createInspection = async (inspectionData, currentUser) => {
  const inspection = await checklistService.createInspection(inspectionData, currentUser);
  
  return success({
    statusCode: 201,
    message: 'Inspection created successfully',
    data: { inspection }
  });
};

/**
 * Get inspection by ID
 * @param {string} inspectionId - Inspection ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with inspection
 */
const getInspectionById = async (inspectionId, currentUser) => {
  const inspection = await checklistService.getInspectionById(inspectionId, currentUser);
  
  return success({
    message: 'Inspection retrieved successfully',
    data: { inspection }
  });
};

/**
 * Get all inspections with pagination
 * @param {Object} queryParams - Query parameters
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with paginated inspections
 */
const getAllInspections = async (queryParams, currentUser) => {
  const result = await checklistService.getAllInspections(queryParams, currentUser);
  
  return success({
    message: 'Inspections retrieved successfully',
    data: result
  });
};

/**
 * Update inspection (inspector only, only if draft)
 * @param {string} inspectionId - Inspection ID
 * @param {Object} updateData - Update data
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with updated inspection
 */
const updateInspection = async (inspectionId, updateData, currentUser) => {
  const inspection = await checklistService.updateInspection(inspectionId, updateData, currentUser);
  
  return success({
    message: 'Inspection updated successfully',
    data: { inspection }
  });
};

/**
 * Delete inspection (inspector only, only if draft)
 * @param {string} inspectionId - Inspection ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response
 */
const deleteInspection = async (inspectionId, currentUser) => {
  await checklistService.deleteInspection(inspectionId, currentUser);
  
  return success({
    message: 'Inspection deleted successfully'
  });
};

/**
 * Start inspection by inspection request ID (inspector only) - sets start time and status to in_progress
 * @param {string} inspectionRequestId - Inspection Request ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with updated inspection request
 */
const startInspection = async (inspectionRequestId, currentUser) => {
  const request = await checklistService.startInspection(inspectionRequestId, currentUser);
  
  return success({
    message: 'Inspection started successfully',
    data: { request }
  });
};

/**
 * Start inspection by inspection ID (inspector only) - sets start time and updates linked request to in_progress
 * @param {string} inspectionId - Inspection ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with updated inspection
 */
// const startInspectionByInspectionId = async (inspectionId, currentUser) => {
//   const inspection = await checklistService.startInspectionByInspectionId(inspectionId, currentUser);
  
//   return success({
//     message: 'Inspection started successfully',
//     data: { inspection }
//   });
// };

module.exports = {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  getActiveTemplates,
  createInspection,
  getInspectionById,
  getAllInspections,
  updateInspection,
  deleteInspection,
  startInspection,
  // startInspectionByInspectionId
};
