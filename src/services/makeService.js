/**
 * Make Service
 * Handles business logic for vehicle makes
 */

const Make = require('../models/Make');
const Model = require('../models/Model');
const { NotFoundError, BadRequestError, ConflictError, DatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

class MakeService {
  /**
   * Create a new make
   * @param {Object} makeData - { name }
   * @returns {Promise<Object>} Created make
   */
  async createMake(makeData) {
    try {
      const { name } = makeData;

      if (!name || !name.trim()) {
        throw new BadRequestError('Make name is required');
      }

      const normalizedName = name.trim().toUpperCase();

      // Check if make already exists
      const existingMake = await Make.findOne({ name: normalizedName });
      if (existingMake) {
        throw new ConflictError(`Make "${normalizedName}" already exists`);
      }

      const make = await Make.create({
        name: normalizedName,
        isActive: true
      });

      logger.info('Make created successfully', {
        makeId: make.id,
        name: make.name
      });

      return make;
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof ConflictError) {
        throw error;
      }
      logger.error('Error creating make', error, { makeData });
      throw new DatabaseError('Failed to create make', error);
    }
  }

  /**
   * Get all makes (optionally filter by active status)
   * @param {Object} options - { isActive?: boolean }
   * @returns {Promise<Array>} List of makes
   */
  async getAllMakes(options = {}) {
    try {
      const query = {};
      if (options.isActive !== undefined) {
        query.isActive = options.isActive;
      }

      const makes = await Make.find(query).sort({ name: 1 }).lean();
      const makeIds = makes.map(m => m._id);

      // Fetch all models for these makes in one query
      const modelQuery = { makeId: { $in: makeIds } };
      if (options.isActive !== undefined) {
        modelQuery.isActive = options.isActive;
      }
      const models = await Model.find(modelQuery).sort({ name: 1 }).lean();

      // Group models by makeId
      const modelsByMakeId = {};
      for (const model of models) {
        const mid = model.makeId.toString();
        if (!modelsByMakeId[mid]) modelsByMakeId[mid] = [];
        modelsByMakeId[mid].push({
          id: model._id.toString(),
          name: model.name,
          isActive: model.isActive,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt
        });
      }

      logger.info('Makes retrieved', { count: makes.length, isActive: options.isActive });

      return makes.map(make => ({
        id: make._id.toString(),
        name: make.name,
        isActive: make.isActive,
        models: modelsByMakeId[make._id.toString()] || [],
        createdAt: make.createdAt,
        updatedAt: make.updatedAt
      }));
    } catch (error) {
      logger.error('Error fetching makes', error);
      throw new DatabaseError('Failed to fetch makes', error);
    }
  }

  /**
   * Get make by ID with models
   * @param {string} makeId - Make ID
   * @param {Object} options - { includeModels?: boolean, isActive?: boolean }
   * @returns {Promise<Object>} Make document with optional models
   */
  async getMakeById(makeId, options = {}) {
    try {
      const make = await Make.findById(makeId);
      if (!make) {
        throw new NotFoundError('Make not found');
      }

      const result = make.toObject();

      // Optionally include models
      if (options.includeModels) {
        const modelQuery = { makeId: make._id };
        if (options.isActive !== undefined) {
          modelQuery.isActive = options.isActive;
        }
        const models = await Model.find(modelQuery).sort({ name: 1 }).lean();
        result.models = models.map(model => ({
          id: model._id.toString(),
          name: model.name,
          isActive: model.isActive,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt
        }));
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error fetching make', error, { makeId });
      throw new DatabaseError('Failed to fetch make', error);
    }
  }

  /**
   * Update make
   * @param {string} makeId - Make ID
   * @param {Object} updateData - { name?, isActive? }
   * @returns {Promise<Object>} Updated make
   */
  async updateMake(makeId, updateData) {
    try {
      const make = await Make.findById(makeId);
      if (!make) {
        throw new NotFoundError('Make not found');
      }

      if (updateData.name !== undefined) {
        const normalizedName = updateData.name.trim().toUpperCase();
        // Check if another make with this name exists
        const existingMake = await Make.findOne({ name: normalizedName, _id: { $ne: makeId } });
        if (existingMake) {
          throw new ConflictError(`Make "${normalizedName}" already exists`);
        }
        make.name = normalizedName;
      }

      if (updateData.isActive !== undefined) {
        make.isActive = updateData.isActive;
      }

      await make.save();

      logger.info('Make updated successfully', {
        makeId: make.id,
        name: make.name
      });

      return make;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ConflictError) {
        throw error;
      }
      logger.error('Error updating make', error, { makeId });
      throw new DatabaseError('Failed to update make', error);
    }
  }

  /**
   * Delete a make
   * @param {string} makeId - Make ID
   * @param {Object} options - { force?: boolean } - If true, also deletes associated models
   * @returns {Promise<void>}
   */
  async deleteMake(makeId, options = {}) {
    try {
      const make = await Make.findById(makeId);
      if (!make) {
        throw new NotFoundError('Make not found');
      }

      // Check if models exist for this make
      const modelCount = await Model.countDocuments({ makeId });
      if (modelCount > 0 && !options.force) {
        throw new BadRequestError(`Cannot delete make. ${modelCount} model(s) are associated with this make. Use force=true to delete anyway.`);
      }

      // Delete associated models if force is true
      if (options.force && modelCount > 0) {
        await Model.deleteMany({ makeId });
        logger.info('Associated models deleted', { makeId, modelCount });
      }

      await Make.findByIdAndDelete(makeId);

      logger.info('Make deleted successfully', {
        makeId,
        name: make.name
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Error deleting make', error, { makeId });
      throw new DatabaseError('Failed to delete make', error);
    }
  }
}

module.exports = new MakeService();
