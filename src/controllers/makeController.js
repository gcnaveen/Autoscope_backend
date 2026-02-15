/**
 * Make Controller
 * Handles HTTP request/response logic for make endpoints
 */

const makeService = require('../services/makeService');
const { success } = require('../utils/response');

/**
 * Create a new make
 */
const createMake = async (makeData) => {
  const make = await makeService.createMake(makeData);
  return success({
    message: 'Make created successfully',
    data: make
  });
};

/**
 * Get all makes
 */
const getAllMakes = async (queryParams) => {
  const options = {};
  if (queryParams.isActive !== undefined) {
    options.isActive = queryParams.isActive === 'true';
  }
  const makes = await makeService.getAllMakes(options);
  return success({
    message: 'Makes retrieved successfully',
    data: makes
  });
};

/**
 * Get make by ID
 */
const getMakeById = async (makeId, queryParams) => {
  const options = { includeModels: true };
  if (queryParams?.includeModels === 'false') {
    options.includeModels = false;
  }
  if (queryParams?.isActive !== undefined) {
    options.isActive = queryParams.isActive === 'true';
  }
  const make = await makeService.getMakeById(makeId, options);
  return success({
    message: 'Make retrieved successfully',
    data: make
  });
};

/**
 * Update make
 */
const updateMake = async (makeId, updateData) => {
  const make = await makeService.updateMake(makeId, updateData);
  return success({
    message: 'Make updated successfully',
    data: make
  });
};

/**
 * Delete a make
 */
const deleteMake = async (makeId, queryParams) => {
  const options = {};
  if (queryParams?.force === 'true') {
    options.force = true;
  }
  await makeService.deleteMake(makeId, options);
  return success({
    message: 'Make deleted successfully'
  });
};

module.exports = {
  createMake,
  getAllMakes,
  getMakeById,
  updateMake,
  deleteMake
};
