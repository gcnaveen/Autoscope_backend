/**
 * Model Service
 * Handles business logic for vehicle models
 */

const Model = require('../models/Model');
const Make = require('../models/Make');
const { NotFoundError, BadRequestError, ConflictError, DatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

class ModelService {
  /**
   * Create a new model
   * @param {Object} modelData - { name, makeId }
   * @returns {Promise<Object>} Created model
   */
  async createModel(modelData) {
    try {
      const { name, makeId } = modelData;

      if (!name || !name.trim()) {
        throw new BadRequestError('Model name is required');
      }

      if (!makeId) {
        throw new BadRequestError('Make ID is required');
      }

      // Verify make exists
      const make = await Make.findById(makeId);
      if (!make) {
        throw new NotFoundError('Make not found');
      }

      const normalizedName = name.trim();

      // Check if model already exists for this make
      const existingModel = await Model.findOne({ name: normalizedName, makeId });
      if (existingModel) {
        throw new ConflictError(`Model "${normalizedName}" already exists for this make`);
      }

      const model = await Model.create({
        name: normalizedName,
        makeId,
        isActive: true
      });

      // Populate make reference for response
      await model.populate('makeId', 'name');

      logger.info('Model created successfully', {
        modelId: model.id,
        name: model.name,
        makeId: makeId
      });

      return model;
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof ConflictError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error creating model', error, { modelData });
      throw new DatabaseError('Failed to create model', error);
    }
  }

  /**
   * Get all models (optionally filter by make and active status)
   * @param {Object} options - { makeId?: string, isActive?: boolean }
   * @returns {Promise<Array>} List of models
   */
  async getAllModels(options = {}) {
    try {
      const query = {};
      
      if (options.makeId) {
        query.makeId = options.makeId;
      }
      
      if (options.isActive !== undefined) {
        query.isActive = options.isActive;
      }

      const models = await Model.find(query)
        .populate('makeId', 'name')
        .sort({ name: 1 })
        .lean();

      logger.info('Models retrieved', { 
        count: models.length, 
        makeId: options.makeId,
        isActive: options.isActive 
      });

      return models.map(model => ({
        id: model._id.toString(),
        name: model.name,
        makeId: model.makeId._id.toString(),
        makeName: model.makeId.name,
        isActive: model.isActive,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt
      }));
    } catch (error) {
      logger.error('Error fetching models', error);
      throw new DatabaseError('Failed to fetch models', error);
    }
  }

  /**
   * Get model by ID
   * @param {string} modelId - Model ID
   * @returns {Promise<Object>} Model document
   */
  async getModelById(modelId) {
    try {
      const model = await Model.findById(modelId).populate('makeId', 'name');
      if (!model) {
        throw new NotFoundError('Model not found');
      }
      return model;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error fetching model', error, { modelId });
      throw new DatabaseError('Failed to fetch model', error);
    }
  }

  /**
   * Update model
   * @param {string} modelId - Model ID
   * @param {Object} updateData - { name?, makeId?, isActive? }
   * @returns {Promise<Object>} Updated model
   */
  async updateModel(modelId, updateData) {
    try {
      const model = await Model.findById(modelId);
      if (!model) {
        throw new NotFoundError('Model not found');
      }

      if (updateData.name !== undefined) {
        const normalizedName = updateData.name.trim();
        // Check if another model with this name exists for the same make
        const makeIdToCheck = updateData.makeId || model.makeId;
        const existingModel = await Model.findOne({ 
          name: normalizedName, 
          makeId: makeIdToCheck,
          _id: { $ne: modelId }
        });
        if (existingModel) {
          throw new ConflictError(`Model "${normalizedName}" already exists for this make`);
        }
        model.name = normalizedName;
      }

      if (updateData.makeId !== undefined) {
        // Verify new make exists
        const make = await Make.findById(updateData.makeId);
        if (!make) {
          throw new NotFoundError('Make not found');
        }
        // Check if model name already exists for the new make
        const existingModel = await Model.findOne({ 
          name: model.name, 
          makeId: updateData.makeId,
          _id: { $ne: modelId }
        });
        if (existingModel) {
          throw new ConflictError(`Model "${model.name}" already exists for the target make`);
        }
        model.makeId = updateData.makeId;
      }

      if (updateData.isActive !== undefined) {
        model.isActive = updateData.isActive;
      }

      await model.save();
      await model.populate('makeId', 'name');

      logger.info('Model updated successfully', {
        modelId: model.id,
        name: model.name,
        makeId: model.makeId._id.toString()
      });

      return model;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ConflictError) {
        throw error;
      }
      logger.error('Error updating model', error, { modelId });
      throw new DatabaseError('Failed to update model', error);
    }
  }

  /**
   * Delete a model
   * @param {string} modelId - Model ID
   * @returns {Promise<void>}
   */
  async deleteModel(modelId) {
    try {
      const model = await Model.findById(modelId);
      if (!model) {
        throw new NotFoundError('Model not found');
      }

      await Model.findByIdAndDelete(modelId);

      logger.info('Model deleted successfully', {
        modelId,
        name: model.name
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error deleting model', error, { modelId });
      throw new DatabaseError('Failed to delete model', error);
    }
  }
}

module.exports = new ModelService();
