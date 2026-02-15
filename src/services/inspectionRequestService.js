/**
 * Inspection Request Service
 * Business logic layer for inspection request operations
 */

const InspectionRequest = require('../models/InspectionRequest');
const User = require('../models/User');
const Inspection = require('../models/Inspection');
const Counter = require('../models/Counter');
const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  DatabaseError
} = require('../utils/errors');
const { USER_ROLES, USER_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Inspection Request Service Class
 */
class InspectionRequestService {
  /**
   * Generate formatted request ID (e.g., CAM_TOY_001)
   * Format: first 3 letters of model + "_" + first 3 letters of make + "_" + serial number
   * @param {number} sequence - Sequence number from counter
   * @param {Object} vehicleInfo - Vehicle information with make and model
   * @returns {string} Formatted request ID
   */
  _generateRequestId(sequence, vehicleInfo = {}) {
    // Get complete model name (uppercase, remove spaces/special chars, default to UNK)
    const model = (vehicleInfo.model || 'UNK').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 20) || 'UNK';
    // Get first 3 letters of make (uppercase, pad if needed)
    const make = (vehicleInfo.make || 'UNK').toString().toUpperCase().substring(0, 3).padEnd(3, 'X');
    // Format: MODEL_MAKE_001 (model is full name, make is 3 letters)
    return `${model}_${make}_${String(sequence).padStart(3, '0')}`;
  }

  /**
   * Normalize inspectionId on request(s): ensure inspectionId is the string ID (or null).
   * When inspectionId was populated, keep status/overallRating in inspectionSummary.
   * @param {Array<Object>} requests - Request documents (lean, possibly with populated inspectionId)
   * @returns {Array<Object>} Same array with inspectionId as string and optional inspectionSummary
   */
  _normalizeInspectionIdOnRequests(requests) {
    return requests.map((r) => {
      const ref = r.inspectionId;
      const idStr =
        ref == null ? null : ref._id != null ? String(ref._id) : String(ref);
      const inspectionSummary =
        ref && typeof ref === 'object' && (ref._id != null || 'status' in ref)
          ? { status: ref.status, overallRating: ref.overallRating }
          : undefined;
      return {
        ...r,
        inspectionId: idStr,
        ...(inspectionSummary && { inspectionSummary })
      };
    });
  }

  /**
   * Get next request ID atomically
   * @param {Object} vehicleInfo - Vehicle information with make and model
   * @returns {Promise<string>} Formatted request ID
   */
  async _getNextRequestId(vehicleInfo = {}) {
    try {
      const sequence = await Counter.getNextSequence('inspectionRequest');
      return this._generateRequestId(sequence, vehicleInfo);
    } catch (error) {
      logger.error('Error generating request ID', error);
      throw new DatabaseError('Failed to generate request ID', error);
    }
  }

  /**
   * Create a new inspection request (public endpoint - no auth required)
   * Automatically creates user if email doesn't exist
   * @param {Object} requestData - Request data (must include email)
   * @returns {Promise<Object>} Created request with user info
   */
  async createRequest(requestData) {
    try {
      const email = requestData.email?.toLowerCase().trim();
      
      if (!email) {
        throw new BadRequestError('Email is required');
      }

      // Find or create user
      let user = await User.findOne({ email });

      if (!user) {
        // User doesn't exist - create new user with role: user, status: inactive
        // This allows them to create requests without full registration
        user = await User.create({
          email,
          firstName: requestData.firstName || 'Guest',
          lastName: requestData.lastName || 'User',
          phone: requestData.phone || null,
          role: USER_ROLES.USER,
          status: USER_STATUS.INACTIVE,
          otpVerified: false
        });

        logger.info('New user auto-created from inspection request', {
          userId: user.id,
          email: user.email
        });
      } else {
        // User exists - update optional fields if provided (only if they're empty/null)
        const updates = {};
        if (requestData.firstName && !user.firstName) {
          updates.firstName = requestData.firstName;
        }
        if (requestData.lastName && !user.lastName) {
          updates.lastName = requestData.lastName;
        }
        if (requestData.phone && !user.phone) {
          updates.phone = requestData.phone;
        }

        if (Object.keys(updates).length > 0) {
          Object.assign(user, updates);
          await user.save();
          logger.info('User profile updated from inspection request', {
            userId: user.id,
            updates
          });
        }
      }

      // Validate that user is not blocked
      if (user.status === USER_STATUS.BLOCKED) {
        throw new ForbiddenError('Your account has been blocked. Please contact administrator.');
      }

      // Generate sequential request ID atomically (format: MODEL_MAKE_001)
      const requestId = await this._getNextRequestId(requestData.vehicleInfo || {});

      // Create inspection request with formatted ID
      let request;
      let retries = 3; // Retry on duplicate key error (race condition)
      
      while (retries > 0) {
        try {
          request = await InspectionRequest.create({
            requestId,
            userId: user.id,
            requestType: requestData.requestType || 'car inspection',
            vehicleInfo: requestData.vehicleInfo,
            reason: requestData.reason ?? '',
            preferredDate: requestData.preferredDate || null,
            preferredTime: requestData.preferredTime || '',
            location: requestData.location || {},
            notes: requestData.notes || '',
            status: 'pending'
          });
          break; // Success
        } catch (createError) {
          // Handle duplicate requestId (shouldn't happen with atomic counter, but handle gracefully)
          if (createError.code === 11000 && createError.keyPattern?.requestId) {
            retries--;
            if (retries === 0) {
              // Last retry - get a new ID
              const newRequestId = await this._getNextRequestId(requestData.vehicleInfo || {});
              request = await InspectionRequest.create({
                requestId: newRequestId,
                userId: user.id,
                requestType: requestData.requestType || 'car inspection',
                vehicleInfo: requestData.vehicleInfo,
                reason: requestData.reason ?? '',
                preferredDate: requestData.preferredDate || null,
                preferredTime: requestData.preferredTime || '',
                location: requestData.location || {},
                notes: requestData.notes || '',
                status: 'pending'
              });
            } else {
              // Retry with new ID
              const newRequestId = await this._getNextRequestId(requestData.vehicleInfo || {});
              requestId = newRequestId;
              continue;
            }
          } else {
            throw createError; // Re-throw if not a duplicate key error
          }
        }
      }

      await request.populate('userId', 'firstName lastName email phone role status');

      logger.info('Inspection request created successfully', {
        requestId: request.requestId || request.id,
        mongoId: request.id,
        userId: user.id,
        email: user.email,
        userCreated: !user.createdAt || (Date.now() - new Date(user.createdAt).getTime()) < 5000
      });

      return request;
    } catch (error) {
      if (error instanceof ForbiddenError || error instanceof BadRequestError) {
        throw error;
      }
      
      // Handle MongoDB duplicate key error (race condition)
      if (error.code === 11000) {
        // User was created by another request - retry lookup
        const email = requestData.email?.toLowerCase().trim();
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
          // Retry request creation with existing user and new request ID
          const retryRequestId = await this._getNextRequestId(requestData.vehicleInfo || {});
          const request = await InspectionRequest.create({
            requestId: retryRequestId,
            userId: existingUser.id,
            requestType: requestData.requestType || 'car inspection',
            vehicleInfo: requestData.vehicleInfo,
            reason: requestData.reason ?? '',
            preferredDate: requestData.preferredDate || null,
            preferredTime: requestData.preferredTime || '',
            location: requestData.location || {},
            notes: requestData.notes || '',
            status: 'pending'
          });

          await request.populate('userId', 'firstName lastName email phone role status');
          return request;
        }
      }
      
      logger.error('Error creating inspection request', error, {
        email: requestData.email
      });
      throw new DatabaseError('Failed to create inspection request', error);
    }
  }

  /**
   * Get inspection requests for a user
   * @param {Object} queryParams - Query parameters
   * @param {Object} currentUser - Current authenticated user
   * @param {Object} [options] - Options: { meOnly } - when true, always return only current user's requests (even for admin)
   * @returns {Promise<Object>} Paginated requests list
   */
  async getUserRequests(queryParams = {}, currentUser, options = {}) {
    try {
      if (!currentUser) {
        throw new BadRequestError('User authentication required');
      }

      const {
        page = 1,
        limit = 10,
        status = null,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = queryParams;

      // Validate pagination parameters
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));

      // Build filter
      const filter = {};
      
      // "My requests" (meOnly) or non-admin: only current user's requests; admin (non-meOnly): all requests
      const onlyMyRequests = options.meOnly === true || currentUser.role !== USER_ROLES.ADMIN;
      if (onlyMyRequests) {
        // Use _id (ObjectId) for query, fallback to id (string) if _id not available
        // Mongoose will handle string to ObjectId conversion automatically
        const userId = currentUser._id || currentUser.id;
        if (!userId) {
          throw new BadRequestError('Invalid user ID');
        }
        filter.userId = userId;
      }

      if (status) {
        filter.status = status;
      }

      // Build sort
      const sort = {};
      const sortField = sortBy === 'id' ? '_id' : sortBy;
      sort[sortField] = sortOrder === 'ASC' ? 1 : -1;

      // Execute queries in parallel
      const skip = (pageNum - 1) * limitNum;
      const [rawRequests, totalCount] = await Promise.all([
        InspectionRequest.find(filter)
          .populate('userId', 'firstName lastName email phone')
          .populate('assignedInspectorId', 'firstName lastName email')
          .populate('inspectionId', 'status overallRating')
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean()
          .exec(),
        InspectionRequest.countDocuments(filter)
      ]);

      const requests = this._normalizeInspectionIdOnRequests(rawRequests);
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPreviousPage = pageNum > 1;

      logger.info('Inspection requests retrieved successfully', {
        page: pageNum,
        limit: limitNum,
        totalCount,
        userId: currentUser._id || currentUser.id,
        role: currentUser.role
      });

      return {
        requests,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPreviousPage
        },
        filters: {
          status: status || null,
          sortBy,
          sortOrder
        }
      };
    } catch (error) {
      logger.error('Error fetching inspection requests', error, { queryParams });
      throw new DatabaseError('Failed to fetch inspection requests', error);
    }
  }

  /**
   * Get inspection requests assigned to the current inspector (inspector only)
   * @param {Object} queryParams - Query parameters (page, limit, status, sortBy, sortOrder)
   * @param {Object} currentUser - Current authenticated user (must be inspector)
   * @returns {Promise<Object>} Paginated requests list
   */
  async getAssignedRequestsForInspector(queryParams = {}, currentUser) {
    try {
      if (!currentUser) {
        throw new BadRequestError('User authentication required');
      }
      if (currentUser.role !== USER_ROLES.INSPECTOR) {
        throw new ForbiddenError('Only inspectors can view their assigned requests');
      }

      const inspectorId = currentUser._id || currentUser.id;
      if (!inspectorId) {
        throw new BadRequestError('Invalid user ID');
      }

      const {
        page = 1,
        limit = 10,
        status = null,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = queryParams;

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));

      const filter = { assignedInspectorId: inspectorId };
      if (status) {
        filter.status = status;
      }

      const sort = {};
      const sortField = sortBy === 'id' ? '_id' : sortBy;
      sort[sortField] = sortOrder === 'ASC' ? 1 : -1;

      const skip = (pageNum - 1) * limitNum;
      const [rawRequests, totalCount] = await Promise.all([
        InspectionRequest.find(filter)
          .populate('userId', 'firstName lastName email phone')
          .populate('assignedInspectorId', 'firstName lastName email')
          .populate('inspectionId', 'status overallRating')
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean()
          .exec(),
        InspectionRequest.countDocuments(filter)
      ]);

      const requests = this._normalizeInspectionIdOnRequests(rawRequests);
      const totalPages = Math.ceil(totalCount / limitNum);

      logger.info('Assigned requests retrieved for inspector', {
        inspectorId,
        page: pageNum,
        limit: limitNum,
        totalCount
      });

      return {
        requests,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1
        },
        filters: {
          status: status || null,
          sortBy,
          sortOrder
        }
      };
    } catch (error) {
      if (error instanceof ForbiddenError || error instanceof BadRequestError) throw error;
      logger.error('Error fetching assigned requests for inspector', error, { queryParams });
      throw new DatabaseError('Failed to fetch assigned requests', error);
    }
  }

  /**
   * Get request by ID
   * @param {string} requestId - Request ID
   * @param {Object} currentUser - Current authenticated user
   * @returns {Promise<Object>} Request object
   */
  async getRequestById(requestId, currentUser) {
    try {
      const request = await InspectionRequest.findById(requestId)
        .populate('userId', 'firstName lastName email phone')
        .populate('assignedInspectorId', 'firstName lastName email')
        .populate('inspectionId', 'status overallRating');

      if (!request) {
        throw new NotFoundError('Inspection request not found');
      }

      // Authorization: Admin can view all; owner (userId) or assigned inspector can view
      const currentUserId = currentUser._id?.toString() || currentUser.id?.toString();
      const requestUserId = request.userId._id?.toString() || request.userId.id?.toString();
      const assignedInspectorIdStr = request.assignedInspectorId?._id?.toString() || request.assignedInspectorId?.id?.toString() || request.assignedInspectorId?.toString();

      const canView =
        currentUser.role === USER_ROLES.ADMIN ||
        currentUserId === requestUserId ||
        currentUserId === assignedInspectorIdStr;
      if (!canView) {
        throw new ForbiddenError('You do not have permission to view this inspection request');
      }

      const ref = request.inspectionId;
      request.inspectionId =
        ref == null ? null : ref._id != null ? String(ref._id) : String(ref);
      if (ref && typeof ref === 'object' && (ref._id != null || 'status' in ref)) {
        request.inspectionSummary = { status: ref.status, overallRating: ref.overallRating };
      }
      return request;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      
      logger.error('Error fetching inspection request', error, { requestId });
      throw new DatabaseError('Failed to fetch inspection request', error);
    }
  }

  /**
   * Update inspection request (user edits own request; only when status is pending)
   * @param {string} requestId - Request ID (MongoDB _id)
   * @param {Object} updateData - Allowed fields: requestType, vehicleInfo, preferredDate, preferredTime, location, notes
   * @param {Object} currentUser - Authenticated user
   * @returns {Promise<Object>} Updated request
   */
  async updateRequest(requestId, updateData, currentUser) {
    try {
      const request = await InspectionRequest.findById(requestId);
      if (!request) {
        throw new NotFoundError('Inspection request not found');
      }

      const currentUserId = (currentUser._id || currentUser.id)?.toString();
      const requestUserId = request.userId?.toString();
      const isOwner = currentUserId === requestUserId;
      const isAdmin = currentUser.role === USER_ROLES.ADMIN;

      if (!isAdmin && !isOwner) {
        throw new ForbiddenError('You can only edit your own inspection requests');
      }

      if (request.status !== 'pending') {
        throw new BadRequestError(
          'Request can only be edited when status is pending. Current status: ' + request.status
        );
      }

      const allowedFields = ['requestType', 'preferredDate', 'preferredTime', 'notes', 'reason'];
      for (const key of allowedFields) {
        if (updateData[key] !== undefined) {
          request[key] = updateData[key];
        }
      }

      if (updateData.vehicleInfo && typeof updateData.vehicleInfo === 'object') {
        const v = updateData.vehicleInfo;
        const vInfo = request.vehicleInfo || {};
        if (v.make !== undefined) vInfo.make = v.make;
        if (v.model !== undefined) vInfo.model = v.model;
        if (v.year !== undefined) vInfo.year = v.year;
        if (v.vin !== undefined) vInfo.vin = v.vin;
        if (v.licensePlate !== undefined) vInfo.licensePlate = v.licensePlate;
        if (v.mileage !== undefined) vInfo.mileage = v.mileage;
        if (v.color !== undefined) vInfo.color = v.color;
        request.vehicleInfo = vInfo;
      }

      if (updateData.location && typeof updateData.location === 'object') {
        const loc = updateData.location;
        const locObj = request.location || {};
        if (loc.address !== undefined) locObj.address = loc.address;
        if (loc.city !== undefined) locObj.city = loc.city;
        if (loc.state !== undefined) locObj.state = loc.state;
        if (loc.zipCode !== undefined) locObj.zipCode = loc.zipCode;
        request.location = locObj;
      }

      await request.save();

      await request.populate('userId', 'firstName lastName email phone');
      await request.populate('assignedInspectorId', 'firstName lastName email');
      await request.populate('inspectionId', 'status overallRating');

      logger.info('Inspection request updated', {
        requestId: request.id,
        requestRequestId: request.requestId,
        userId: currentUser._id || currentUser.id,
        role: currentUser.role
      });

      return request;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Error updating inspection request', error, { requestId });
      throw new DatabaseError('Failed to update inspection request', error);
    }
  }

  /**
   * Assign or reassign an inspector to an inspection request (admin only)
   * Allowed for any status (admin can reassign at any time). When reassigning, previous inspector's is_assigned is cleared.
   * @param {string} requestId - Inspection request ID (MongoDB _id)
   * @param {Object} body - { inspectorId }
   * @param {Object} currentUser - Authenticated user (must be admin)
   * @returns {Promise<Object>} Updated request with populated assignedInspectorId
   */
  async assignInspector(requestId, body, currentUser) {
    try {
      if (currentUser.role !== USER_ROLES.ADMIN) {
        throw new ForbiddenError('Only admins can assign inspectors to requests');
      }

      const request = await InspectionRequest.findById(requestId);
      if (!request) {
        throw new NotFoundError('Inspection request not found');
      }

      const inspectorId = body.inspectorId?.trim();
      if (!inspectorId) {
        throw new BadRequestError('Inspector ID is required');
      }

      const inspector = await User.findById(inspectorId).select('role status is_assigned').exec();
      if (!inspector) {
        throw new NotFoundError('Inspector not found');
      }
      if (inspector.role !== USER_ROLES.INSPECTOR) {
        throw new BadRequestError('Selected user is not an inspector');
      }
      if (inspector.status !== USER_STATUS.ACTIVE) {
        throw new BadRequestError('Inspector is not active and cannot be assigned');
      }

      const previousInspectorId = request.assignedInspectorId?.toString?.() || request.assignedInspectorId;
      if (previousInspectorId && previousInspectorId !== inspectorId) {
        await User.findByIdAndUpdate(previousInspectorId, { is_assigned: false });
      }

      request.assignedInspectorId = inspectorId;
      request.assignedAt = new Date();
      if (request.status === 'pending') {
        request.status = 'assigned';
      }
      await request.save();

      await User.findByIdAndUpdate(inspectorId, { is_assigned: true });

      await request.populate('userId', 'firstName lastName email phone');
      await request.populate('assignedInspectorId', 'firstName lastName email phone');
      await request.populate('inspectionId', 'status overallRating');

      logger.info('Inspector assigned to inspection request', {
        requestId: request.id,
        requestRequestId: request.requestId,
        inspectorId,
        adminId: currentUser._id || currentUser.id
      });

      return request;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ForbiddenError ||
        error instanceof BadRequestError
      ) {
        throw error;
      }
      logger.error('Error assigning inspector to request', error, { requestId, inspectorId: body?.inspectorId });
      throw new DatabaseError('Failed to assign inspector', error);
    }
  }

  /**
   * Approve an inspection request (admin only). Request must be pending.
   * @param {string} requestId - Inspection request ID (MongoDB _id)
   * @param {Object} currentUser - Authenticated user (must be admin)
   * @returns {Promise<Object>} Updated request
   */
  async approveRequest(requestId, currentUser) {
    try {
      if (currentUser.role !== USER_ROLES.ADMIN) {
        throw new ForbiddenError('Only admins can approve inspection requests');
      }

      const request = await InspectionRequest.findById(requestId);
      if (!request) {
        throw new NotFoundError('Inspection request not found');
      }

      if (request.status !== 'pending') {
        throw new BadRequestError(
          `Request can only be approved when status is pending. Current status: ${request.status}`
        );
      }

      request.adminApprovedAt = new Date();
      await request.save();

      await request.populate('userId', 'firstName lastName email phone');
      await request.populate('assignedInspectorId', 'firstName lastName email');
      await request.populate('inspectionId', 'status overallRating');

      logger.info('Inspection request approved by admin', {
        requestId: request.id,
        requestRequestId: request.requestId,
        adminId: currentUser._id || currentUser.id
      });

      return request;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ForbiddenError ||
        error instanceof BadRequestError
      ) {
        throw error;
      }
      logger.error('Error approving inspection request', error, { requestId });
      throw new DatabaseError('Failed to approve inspection request', error);
    }
  }

  /**
   * Reject an inspection request (admin only). Sets status to cancelled.
   * @param {string} requestId - Inspection request ID (MongoDB _id)
   * @param {Object} body - { reason?: string }
   * @param {Object} currentUser - Authenticated user (must be admin)
   * @returns {Promise<Object>} Updated request
   */
  async rejectRequest(requestId, body, currentUser) {
    try {
      if (currentUser.role !== USER_ROLES.ADMIN) {
        throw new ForbiddenError('Only admins can reject inspection requests');
      }

      const request = await InspectionRequest.findById(requestId);
      if (!request) {
        throw new NotFoundError('Inspection request not found');
      }

      if (request.status === 'cancelled') {
        throw new BadRequestError('Request is already cancelled');
      }

      const reason = (body.reason || '').trim().slice(0, 500);

      request.status = 'cancelled';
      request.cancelledAt = new Date();
      request.cancelledReason = reason || undefined;

      // If an inspector was assigned, unassign them so they become available again
      if (request.assignedInspectorId) {
        await User.findByIdAndUpdate(request.assignedInspectorId, { is_assigned: false });
      }

      await request.save();

      await request.populate('userId', 'firstName lastName email phone');
      await request.populate('assignedInspectorId', 'firstName lastName email');
      await request.populate('inspectionId', 'status overallRating');

      logger.info('Inspection request rejected by admin', {
        requestId: request.id,
        requestRequestId: request.requestId,
        adminId: currentUser._id || currentUser.id
      });

      return request;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ForbiddenError ||
        error instanceof BadRequestError
      ) {
        throw error;
      }
      logger.error('Error rejecting inspection request', error, { requestId });
      throw new DatabaseError('Failed to reject inspection request', error);
    }
  }

  /**
   * Get all requests for admin dashboard
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} All requests with statistics
   */
  async getAllRequestsForAdmin(queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status = null,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = queryParams;

      const filter = {};
      if (status) {
        filter.status = status;
      }

      const sort = {};
      const sortField = sortBy === 'id' ? '_id' : sortBy;
      sort[sortField] = sortOrder === 'ASC' ? 1 : -1;

      const skip = (page - 1) * limit;
      const [requests, totalCount] = await Promise.all([
        InspectionRequest.find(filter)
          .populate('userId', 'firstName lastName email phone')
          .populate('assignedInspectorId', 'firstName lastName email')
          .populate('inspectionId', 'status overallRating')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean()
          .exec(),
        InspectionRequest.countDocuments(filter)
      ]);

      // Get statistics
      const [
        pendingCount,
        assignedCount,
        inProgressCount,
        completedCount,
        cancelledCount
      ] = await Promise.all([
        InspectionRequest.countDocuments({ status: 'pending' }),
        InspectionRequest.countDocuments({ status: 'assigned' }),
        InspectionRequest.countDocuments({ status: 'in_progress' }),
        InspectionRequest.countDocuments({ status: 'completed' }),
        InspectionRequest.countDocuments({ status: 'cancelled' })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        requests,
        statistics: {
          total: totalCount,
          pending: pendingCount,
          assigned: assignedCount,
          inProgress: inProgressCount,
          completed: completedCount,
          cancelled: cancelledCount
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          status: status || null,
          sortBy,
          sortOrder
        }
      };
    } catch (error) {
      logger.error('Error fetching all inspection requests for admin', error);
      throw new DatabaseError('Failed to fetch inspection requests', error);
    }
  }
}

module.exports = new InspectionRequestService();
