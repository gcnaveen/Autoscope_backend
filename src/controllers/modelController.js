/**
 * Model Controller
 * Handles HTTP request/response logic for model endpoints
 */

const modelService = require('../services/modelService');
const { success } = require('../utils/response');

/**
 * Create a new model
 */
const createModel = async (modelData) => {
  const model = await modelService.createModel(modelData);
  return success({
    message: 'Model created successfully',
    data: model
  });
};

/**
 * Get all models
 */
const getAllModels = async (queryParams) => {
  const options = {};
  if (queryParams.makeId) {
    options.makeId = queryParams.makeId;
  }
  if (queryParams.isActive !== undefined) {
    options.isActive = queryParams.isActive === 'true';
  }
  const models = await modelService.getAllModels(options);
  return success({
    message: 'Models retrieved successfully',
    data: models
  });
};

/**
 * Get model by ID
 */
const getModelById = async (modelId) => {
  const model = await modelService.getModelById(modelId);
  return success({
    message: 'Model retrieved successfully',
    data: model
  });
};

/**
 * Update model
 */
const updateModel = async (modelId, updateData) => {
  const model = await modelService.updateModel(modelId, updateData);
  return success({
    message: 'Model updated successfully',
    data: model
  });
};

/**
 * Delete a model
 */
const deleteModel = async (modelId) => {
  await modelService.deleteModel(modelId);
  return success({
    message: 'Model deleted successfully'
  });
};

module.exports = {
  createModel,
  getAllModels,
  getModelById,
  updateModel,
  deleteModel
};
