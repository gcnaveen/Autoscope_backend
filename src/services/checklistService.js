/**
 * Checklist Service
 * Business logic layer for checklist template and inspection operations
 * Separates business logic from controllers and data access
 */

const ChecklistTemplate = require('../models/ChecklistTemplate');
const Inspection = require('../models/Inspection');
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
  DatabaseError
} = require('../utils/errors');
const { INSPECTION_TYPES, VIDEO_ALLOWED_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Checklist Service Class
 */
class ChecklistService {
  /**
   * Create a new checklist template (admin only)
   * @param {Object} templateData - Template data
   * @param {Object} currentUser - Current authenticated user
   * @returns {Promise<Object>} Created template
   */
  async createTemplate(templateData, currentUser) {
    try {
      // Validate types
      if (!templateData.types || templateData.types.length === 0) {
        throw new BadRequestError('At least one type is required');
      }

      // Validate video settings
      templateData.types.forEach(typeConfig => {
        if (typeConfig.allowVideos && !VIDEO_ALLOWED_TYPES.includes(typeConfig.typeName)) {
          throw new BadRequestError(`Videos are only allowed for ${VIDEO_ALLOWED_TYPES.join(' and ')} types`);
        }
      });

      // Ensure positions are unique within each type
      templateData.types.forEach(typeConfig => {
        const positions = typeConfig.checklistItems.map(item => item.position);
        const uniquePositions = new Set(positions);
        if (positions.length !== uniquePositions.size) {
          throw new BadRequestError(`Duplicate positions found in type: ${typeConfig.typeName}`);
        }
      });

      const template = await ChecklistTemplate.create({
        name: templateData.name,
        description: templateData.description || '',
        types: templateData.types,
        createdBy: currentUser.id,
        isActive: true,
        version: 1
      });

      logger.info('Checklist template created successfully', {
        templateId: template.id,
        createdBy: currentUser.id
      });

      return template;
    } catch (error) {
      logger.error('Error creating checklist template', error, { createdBy: currentUser.id });
      
      if (error instanceof BadRequestError) {
        throw error;
      }
      
      if (error.name === 'ValidationError') {
        throw new BadRequestError(error.message);
      }
      
      throw new DatabaseError('Failed to create checklist template', error);
    }
  }

  /**
   * Get all checklist templates with pagination (admin only)
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Paginated templates list
   */
  async getAllTemplates(queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        isActive = null,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = queryParams;

      // Build filter
      const filter = {};
      
      if (isActive !== null) {
        filter.isActive = isActive === 'true' || isActive === true;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort = {};
      const sortField = sortBy === 'id' ? '_id' : sortBy;
      sort[sortField] = sortOrder === 'ASC' ? 1 : -1;

      // Execute queries in parallel
      const skip = (page - 1) * limit;
      const [templates, totalCount] = await Promise.all([
        ChecklistTemplate.find(filter)
          .populate('createdBy', 'firstName lastName email')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean()
          .exec(),
        ChecklistTemplate.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      logger.info('Templates retrieved successfully', {
        page,
        limit,
        totalCount
      });

      return {
        templates,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNextPage,
          hasPreviousPage
        },
        filters: {
          search: search || null,
          isActive: isActive !== null ? (isActive === 'true' || isActive === true) : null,
          sortBy,
          sortOrder
        }
      };
    } catch (error) {
      logger.error('Error fetching templates list', error, { queryParams });
      throw new DatabaseError('Failed to fetch templates list', error);
    }
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @param {boolean} activeOnly - Only return active templates (for inspectors)
   * @returns {Promise<Object>} Template
   */
  async getTemplateById(templateId, activeOnly = false) {
    try {
      const filter = { _id: templateId };
      if (activeOnly) {
        filter.isActive = true;
      }

      const template = await ChecklistTemplate.findOne(filter)
        .populate('createdBy', 'firstName lastName email')
        .lean();

      if (!template) {
        throw new NotFoundError('Checklist template not found');
      }

      return template;
    } catch (error) {
      logger.error('Error fetching template', error, { templateId });
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to fetch template', error);
    }
  }

  /**
   * Update checklist template (admin only)
   * @param {string} templateId - Template ID
   * @param {Object} updateData - Update data
   * @param {Object} currentUser - Current authenticated user
   * @returns {Promise<Object>} Updated template
   */
  async updateTemplate(templateId, updateData, currentUser) {
    try {
      const template = await ChecklistTemplate.findById(templateId);
      
      if (!template) {
        throw new NotFoundError('Checklist template not found');
      }

      // Validate types if provided
      if (updateData.types) {
        if (updateData.types.length === 0) {
          throw new BadRequestError('At least one type is required');
        }

        // Validate video settings
        updateData.types.forEach(typeConfig => {
          if (typeConfig.allowVideos && !VIDEO_ALLOWED_TYPES.includes(typeConfig.typeName)) {
            throw new BadRequestError(`Videos are only allowed for ${VIDEO_ALLOWED_TYPES.join(' and ')} types`);
          }
        });

        // Ensure positions are unique within each type
        updateData.types.forEach(typeConfig => {
          const positions = typeConfig.checklistItems.map(item => item.position);
          const uniquePositions = new Set(positions);
          if (positions.length !== uniquePositions.size) {
            throw new BadRequestError(`Duplicate positions found in type: ${typeConfig.typeName}`);
          }
        });

        // Increment version if types changed
        template.version += 1;
      }

      // Update fields
      if (updateData.name !== undefined) template.name = updateData.name;
      if (updateData.description !== undefined) template.description = updateData.description;
      if (updateData.types !== undefined) template.types = updateData.types;
      if (updateData.isActive !== undefined) template.isActive = updateData.isActive;

      await template.save();

      logger.info('Template updated successfully', {
        templateId: template.id,
        updatedBy: currentUser.id
      });

      return template;
    } catch (error) {
      logger.error('Error updating template', error, { templateId });
      
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to update template', error);
    }
  }

  /**
   * Delete checklist template (admin only)
   * @param {string} templateId - Template ID
   * @returns {Promise<void>}
   */
  async deleteTemplate(templateId) {
    try {
      const template = await ChecklistTemplate.findById(templateId);
      
      if (!template) {
        throw new NotFoundError('Checklist template not found');
      }

      // Check if template is used in any inspections
      const inspectionCount = await Inspection.countDocuments({ checklistTemplateId: templateId });
      if (inspectionCount > 0) {
        throw new ConflictError('Cannot delete template that has been used in inspections. Deactivate it instead.');
      }

      await ChecklistTemplate.findByIdAndDelete(templateId);

      logger.info('Template deleted successfully', { templateId });
    } catch (error) {
      logger.error('Error deleting template', error, { templateId });
      
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to delete template', error);
    }
  }

  /**
   * Get active templates for inspector
   * @returns {Promise<Array>} Active templates
   */
  async getActiveTemplates() {
    try {
      const templates = await ChecklistTemplate.getActiveTemplates()
        .select('name description types version createdAt')
        .lean();

      return templates;
    } catch (error) {
      logger.error('Error fetching active templates', error);
      throw new DatabaseError('Failed to fetch active templates', error);
    }
  }

  /**
   * Create a new inspection (inspector only)
   * @param {Object} inspectionData - Inspection data
   * @param {Object} currentUser - Current authenticated user (inspector)
   * @returns {Promise<Object>} Created inspection
   */
  async createInspection(inspectionData, currentUser) {
    try {
      // Verify template exists and is active
      const template = await ChecklistTemplate.getActiveTemplate(inspectionData.checklistTemplateId);
      if (!template) {
        throw new NotFoundError('Checklist template not found or is not active');
      }
      if (!template.types || !Array.isArray(template.types) || template.types.length === 0) {
        throw new BadRequestError('Checklist template has no types defined');
      }

      // Validate that all required types are present
      const templateTypeNames = template.types.map(t => t.typeName);
      const inspectionTypeNames = inspectionData.types.map(t => t.typeName);
      
      const missingTypes = templateTypeNames.filter(name => !inspectionTypeNames.includes(name));
      if (missingTypes.length > 0) {
        throw new BadRequestError(`Missing required types: ${missingTypes.join(', ')}`);
      }

      // Validate each type inspection
      inspectionData.types.forEach(typeInspection => {
        const templateType = template.types.find(t => t.typeName === typeInspection.typeName);
        if (!templateType) {
          throw new BadRequestError(`Invalid type: ${typeInspection.typeName}`);
        }

        // Validate checklist items match template
        if (typeInspection.checklistItems.length !== templateType.checklistItems.length) {
          throw new BadRequestError(`Checklist items count mismatch for type: ${typeInspection.typeName}`);
        }

        // Validate videos
        if (typeInspection.videos && typeInspection.videos.length > 0) {
          if (!VIDEO_ALLOWED_TYPES.includes(typeInspection.typeName)) {
            throw new BadRequestError(`Videos are only allowed for ${VIDEO_ALLOWED_TYPES.join(' and ')} types`);
          }
          if (typeInspection.videos.length > templateType.maxVideos) {
            throw new BadRequestError(`Maximum ${templateType.maxVideos} videos allowed for ${typeInspection.typeName}`);
          }
        }

        // Rating is 0–5 (decimal allowed); no strict match to status
      });

      // Normalize nulls so Mongoose accepts payload (setters may not run on nested create)
      const normalizedTypes = (inspectionData.types || []).map(type => ({
        typeName: type.typeName,
        checklistItems: (type.checklistItems || []).map(item => ({
          position: item.position,
          label: item.label,
          status: item.status,
          rating: item.rating != null ? Number(item.rating) : 0,
          remarks: item.remarks != null ? String(item.remarks) : '',
          photos: Array.isArray(item.photos) ? item.photos : []
        })),
        overallRemarks: type.overallRemarks != null ? String(type.overallRemarks) : '',
        overallPhotos: Array.isArray(type.overallPhotos) ? type.overallPhotos : [],
        videos: Array.isArray(type.videos) ? type.videos : [],
        averageRating: type.averageRating != null ? Number(type.averageRating) : 0
      }));

      const inspectorId = currentUser._id || currentUser.id;
      if (!inspectorId) {
        throw new BadRequestError('Invalid user: inspector ID is missing');
      }

      // Create inspection (ratings will be calculated in pre-save hook)
      const inspectionStatus = inspectionData.status || 'draft';
      const inspection = await Inspection.create({
        checklistTemplateId: inspectionData.checklistTemplateId,
        inspectorId,
        vehicleInfo: inspectionData.vehicleInfo || {},
        types: normalizedTypes,
        status: inspectionStatus,
        inspectionDate: inspectionData.inspectionDate || new Date(),
        notes: inspectionData.notes != null ? String(inspectionData.notes) : ''
      });

      // If linked to an inspection request, set inspectionId and update status if submitting
      if (inspectionData.inspectionRequestId) {
        const InspectionRequest = require('../models/InspectionRequest');
        const inspectionRequest = await InspectionRequest.findOne({
          _id: inspectionData.inspectionRequestId,
          assignedInspectorId: inspectorId,
          status: { $in: ['assigned', 'in_progress', 'pending'] }
        });

        if (inspectionRequest) {
          const previousStatus = inspectionRequest.status;
          
          // If inspection is being created with completed/submitted status, mark request as completed
          const isSubmitting = inspectionStatus === 'completed' || inspectionStatus === 'submitted';
          
          inspectionRequest.inspectionId = inspection._id;
          if (isSubmitting) {
            inspectionRequest.status = 'completed';
            
            // Set inspection end time
            inspectionRequest.inspectionEndTime = new Date();
            
            // Calculate time taken if start time exists
            if (inspectionRequest.inspectionStartTime) {
              const timeDiffMs = inspectionRequest.inspectionEndTime.getTime() - inspectionRequest.inspectionStartTime.getTime();
              inspectionRequest.timeTaken = Math.round(timeDiffMs / 1000); // Convert to seconds and round
            }
          }
          await inspectionRequest.save();

          if (isSubmitting) {
            logger.info('Inspection request linked and marked completed', {
              inspectionRequestId: inspectionData.inspectionRequestId,
              inspectionId: inspection.id,
              previousStatus: previousStatus,
              endTime: inspectionRequest.inspectionEndTime,
              timeTaken: inspectionRequest.timeTaken
            });
          } else {
            logger.info('Inspection request linked to inspection', {
              inspectionRequestId: inspectionData.inspectionRequestId,
              inspectionId: inspection.id,
              currentStatus: inspectionRequest.status
            });
          }
        } else {
          logger.warn('Inspection request not updated (not found or not assigned to inspector)', {
            inspectionRequestId: inspectionData.inspectionRequestId
          });
        }
      }

      logger.info('Inspection created successfully', {
        inspectionId: inspection.id,
        inspectorId: currentUser.id,
        templateId: inspectionData.checklistTemplateId
      });

      return inspection;
    } catch (error) {
      logger.error('Error creating inspection', error, {
        inspectorId: currentUser._id || currentUser.id,
        templateId: inspectionData.checklistTemplateId,
        message: error.message,
        name: error.name
      });

      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }

      throw new DatabaseError('Failed to create inspection', error);
    }
  }

  /**
   * Start an inspection request - sets start time and status to in_progress (no linked inspection required)
   * @param {string} inspectionRequestId - Inspection Request ID
   * @param {Object} currentUser - Current authenticated user (inspector)
   * @returns {Promise<Object>} Updated inspection request
   */
  async startInspection(inspectionRequestId, currentUser) {
    try {
      const InspectionRequest = require('../models/InspectionRequest');
      const inspectionRequest = await InspectionRequest.findById(inspectionRequestId);
      
      if (!inspectionRequest) {
        throw new NotFoundError('Inspection request not found');
      }

      // Verify the request is assigned to the current inspector
      if (inspectionRequest.assignedInspectorId.toString() !== currentUser.id) {
        throw new ForbiddenError('You do not have permission to start this inspection request');
      }

      // Only allow starting if status is assigned or pending
      if (!['assigned', 'pending'].includes(inspectionRequest.status)) {
        throw new BadRequestError(`Cannot start. Request status is '${inspectionRequest.status}'. Expected 'assigned' or 'pending'.`);
      }

      // Prevent overwriting if inspection has already been started
      if (inspectionRequest.inspectionStartTime) {
        throw new BadRequestError('Inspection has already been started');
      }

      // Set status to in_progress and record start time
      inspectionRequest.status = 'in_progress';
      inspectionRequest.inspectionStartTime = new Date();
      await inspectionRequest.save();

      logger.info('Inspection request started successfully', {
        inspectionRequestId: inspectionRequest.id,
        startedBy: currentUser.id,
        startTime: inspectionRequest.inspectionStartTime
      });

      return inspectionRequest;
    } catch (error) {
      logger.error('Error starting inspection request', error, { inspectionRequestId });
      
      if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ForbiddenError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to start inspection request', error);
    }
  }

  /**
   * Start an inspection by inspection ID - sets the inspection start time and updates linked request to in_progress
   * @param {string} inspectionId - Inspection ID
   * @param {Object} currentUser - Current authenticated user (inspector)
   * @returns {Promise<Object>} Updated inspection with start time
   */
  // async startInspectionByInspectionId(inspectionId, currentUser) {
  //   try {
  //     const inspection = await Inspection.findById(inspectionId);
      
  //     if (!inspection) {
  //       throw new NotFoundError('Inspection not found');
  //     }

  //     // Only inspector who created it can start
  //     if (inspection.inspectorId.toString() !== currentUser.id) {
  //       throw new ForbiddenError('You do not have permission to start this inspection');
  //     }

  //     // Only draft inspections can be started
  //     if (inspection.status !== 'draft') {
  //       throw new BadRequestError('Only draft inspections can be started');
  //     }

  //     // Check if inspection is already started
  //     if (inspection.inspectionStartTime) {
  //       throw new BadRequestError('Inspection has already been started');
  //     }

  //     // Set start time
  //     inspection.inspectionStartTime = new Date();
  //     await inspection.save();

  //     // Update linked inspection request status to 'in_progress' if it exists
  //     const InspectionRequest = require('../models/InspectionRequest');
  //     const inspectionRequest = await InspectionRequest.findOne({
  //       inspectionId: inspection._id,
  //       assignedInspectorId: currentUser.id,
  //       status: { $in: ['assigned', 'pending'] }
  //     });

  //     if (inspectionRequest) {
  //       const previousStatus = inspectionRequest.status;
  //       inspectionRequest.status = 'in_progress';
        
  //       // Set start time on inspection request if not already set
  //       if (!inspectionRequest.inspectionStartTime) {
  //         inspectionRequest.inspectionStartTime = inspection.inspectionStartTime;
  //       }
        
  //       await inspectionRequest.save();

  //       logger.info('Inspection request status updated to in_progress', {
  //         inspectionRequestId: inspectionRequest.id,
  //         inspectionId: inspection.id,
  //         previousStatus: previousStatus,
  //         startTime: inspectionRequest.inspectionStartTime
  //       });
  //     }

  //     logger.info('Inspection started successfully (by inspection ID)', {
  //       inspectionId: inspection.id,
  //       startedBy: currentUser.id,
  //       startTime: inspection.inspectionStartTime,
  //       inspectionRequestUpdated: !!inspectionRequest
  //     });

  //     return inspection;
  //   } catch (error) {
  //     logger.error('Error starting inspection by inspection ID', error, { inspectionId });
      
  //     if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ForbiddenError) {
  //       throw error;
  //     }
      
  //     throw new DatabaseError('Failed to start inspection', error);
  //   }
  // }

  /**
   * Get inspection by ID
   * @param {string} inspectionId - Inspection ID
   * @param {Object} currentUser - Current authenticated user
   * @returns {Promise<Object>} Inspection
   */
  async getInspectionById(inspectionId, currentUser) {
    try {
      const inspection = await Inspection.findById(inspectionId)
        .populate('checklistTemplateId', 'name description version')
        .populate('inspectorId', 'firstName lastName email')
        .lean();

      if (!inspection) {
        throw new NotFoundError('Inspection not found');
      }

      // Only inspector who created it or admin can view
      if (currentUser.role !== 'admin' && inspection.inspectorId._id.toString() !== currentUser.id) {
        throw new ForbiddenError('You do not have permission to view this inspection');
      }

      return inspection;
    } catch (error) {
      logger.error('Error fetching inspection', error, { inspectionId });
      
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to fetch inspection', error);
    }
  }

  /**
   * Get all inspections with pagination
   * @param {Object} queryParams - Query parameters
   * @param {Object} currentUser - Current authenticated user
   * @returns {Promise<Object>} Paginated inspections list
   */
  async getAllInspections(queryParams = {}, currentUser) {
    try {
      const {
        page = 1,
        limit = 10,
        status = null,
        templateId = null,
        sortBy = 'inspectionDate',
        sortOrder = 'DESC'
      } = queryParams;

      // Build filter
      const filter = {};
      
      // Inspectors can only see their own inspections
      if (currentUser.role !== 'admin') {
        filter.inspectorId = currentUser.id;
      }

      if (status) {
        filter.status = status;
      }

      if (templateId) {
        filter.checklistTemplateId = templateId;
      }

      // Build sort
      const sort = {};
      const sortField = sortBy === 'id' ? '_id' : sortBy;
      sort[sortField] = sortOrder === 'ASC' ? 1 : -1;

      // Execute queries in parallel
      const skip = (page - 1) * limit;
      const [inspections, totalCount] = await Promise.all([
        Inspection.find(filter)
          .populate('checklistTemplateId', 'name version')
          .populate('inspectorId', 'firstName lastName email')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean()
          .exec(),
        Inspection.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      logger.info('Inspections retrieved successfully', {
        page,
        limit,
        totalCount,
        userId: currentUser.id,
        role: currentUser.role
      });

      return {
        inspections,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNextPage,
          hasPreviousPage
        },
        filters: {
          status: status || null,
          templateId: templateId || null,
          sortBy,
          sortOrder
        }
      };
    } catch (error) {
      logger.error('Error fetching inspections list', error, { queryParams });
      throw new DatabaseError('Failed to fetch inspections list', error);
    }
  }

  /**
   * Update inspection (inspector only, only if draft)
   * @param {string} inspectionId - Inspection ID
   * @param {Object} updateData - Update data
   * @param {Object} currentUser - Current authenticated user
   * @returns {Promise<Object>} Updated inspection
   */
  async updateInspection(inspectionId, updateData, currentUser) {
    try {
      const inspection = await Inspection.findById(inspectionId);
      
      if (!inspection) {
        throw new NotFoundError('Inspection not found');
      }

      // Only inspector who created it can update
      if (inspection.inspectorId.toString() !== currentUser.id) {
        throw new ForbiddenError('You do not have permission to update this inspection');
      }

      // Only draft inspections can be updated
      if (inspection.status !== 'draft') {
        throw new BadRequestError('Only draft inspections can be updated');
      }

      // If updating types, validate against template
      if (updateData.types) {
        const template = await ChecklistTemplate.findById(inspection.checklistTemplateId);
        if (!template) {
          throw new NotFoundError('Checklist template not found');
        }

        // Validate types (similar to create)
        updateData.types.forEach(typeInspection => {
          const templateType = template.types.find(t => t.typeName === typeInspection.typeName);
          if (!templateType) {
            throw new BadRequestError(`Invalid type: ${typeInspection.typeName}`);
          }

          // Validate videos
          if (typeInspection.videos && typeInspection.videos.length > 0) {
            if (!VIDEO_ALLOWED_TYPES.includes(typeInspection.typeName)) {
              throw new BadRequestError(`Videos are only allowed for ${VIDEO_ALLOWED_TYPES.join(' and ')} types`);
            }
            if (typeInspection.videos.length > templateType.maxVideos) {
              throw new BadRequestError(`Maximum ${templateType.maxVideos} videos allowed for ${typeInspection.typeName}`);
            }
          }

          // Rating is 0–5 (decimal allowed); no strict match to status
        });
      }

      // Track if status is changing to completed/submitted
      const previousStatus = inspection.status;
      const isSubmitting = updateData.status && 
        (updateData.status === 'completed' || updateData.status === 'submitted') &&
        previousStatus !== updateData.status;

      // Update fields
      if (updateData.vehicleInfo !== undefined) {
        inspection.vehicleInfo = { ...inspection.vehicleInfo, ...updateData.vehicleInfo };
      }
      if (updateData.types !== undefined) {
        inspection.types = updateData.types;
      }
      if (updateData.status !== undefined) {
        inspection.status = updateData.status;
      }
      if (updateData.notes !== undefined) {
        inspection.notes = updateData.notes;
      }

      await inspection.save(); // Pre-save hook will recalculate ratings

      // If inspection is being submitted, update linked inspection request status to 'completed'
      if (isSubmitting) {
        const InspectionRequest = require('../models/InspectionRequest');
        const inspectionRequest = await InspectionRequest.findOne({
          inspectionId: inspection._id,
          assignedInspectorId: currentUser.id,
          status: { $in: ['assigned', 'in_progress', 'pending'] }
        });

        if (inspectionRequest) {
          const previousRequestStatus = inspectionRequest.status;
          inspectionRequest.status = 'completed';
          await inspectionRequest.save();

          logger.info('Inspection request status updated to completed', {
            inspectionRequestId: inspectionRequest.id,
            inspectionId: inspection.id,
            previousStatus: previousRequestStatus,
            inspectionStatus: inspection.status
          });
        }
      }

      logger.info('Inspection updated successfully', {
        inspectionId: inspection.id,
        updatedBy: currentUser.id,
        statusChanged: isSubmitting ? `${previousStatus} -> ${inspection.status}` : 'no change'
      });

      return inspection;
    } catch (error) {
      logger.error('Error updating inspection', error, { inspectionId });
      
      if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ForbiddenError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to update inspection', error);
    }
  }

  /**
   * Delete inspection (inspector only, only if draft)
   * @param {string} inspectionId - Inspection ID
   * @param {Object} currentUser - Current authenticated user
   * @returns {Promise<void>}
   */
  async deleteInspection(inspectionId, currentUser) {
    try {
      const inspection = await Inspection.findById(inspectionId);
      
      if (!inspection) {
        throw new NotFoundError('Inspection not found');
      }

      // Only inspector who created it can delete
      if (inspection.inspectorId.toString() !== currentUser.id) {
        throw new ForbiddenError('You do not have permission to delete this inspection');
      }

      // Only draft inspections can be deleted
      if (inspection.status !== 'draft') {
        throw new BadRequestError('Only draft inspections can be deleted');
      }

      await Inspection.findByIdAndDelete(inspectionId);

      logger.info('Inspection deleted successfully', {
        inspectionId,
        deletedBy: currentUser.id
      });
    } catch (error) {
      logger.error('Error deleting inspection', error, { inspectionId });
      
      if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ForbiddenError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to delete inspection', error);
    }
  }
}

module.exports = new ChecklistService();
