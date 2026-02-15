/**
 * User Service
 * Business logic layer for user operations
 * Separates business logic from controllers and data access
 */

const User = require('../models/User');
const { USER_STATUS, USER_ROLES } = require('../config/constants');
const {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  DatabaseError
} = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * User Service Class
 */
class UserService {
  /**
   * Register a new user
   * Admin/Inspector: require password, create as ACTIVE, no OTP
   * User: no password, create as INACTIVE, OTP on first login
   * @param {Object} userData - User registration data (password required for admin/inspector)
   * @returns {Promise<Object>} Created user
   */
  async register(userData) {
    try {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      const role = userData.role || USER_ROLES.USER;
      const isPasswordRole = role === USER_ROLES.ADMIN || role === USER_ROLES.INSPECTOR;

      const createPayload = {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role,
        otpVerified: false
      };

      if (isPasswordRole) {
        createPayload.password = userData.password;
        createPayload.status = USER_STATUS.ACTIVE;
      } else {
        createPayload.status = USER_STATUS.INACTIVE;
      }

      const user = await User.create(createPayload);

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        role,
        authType: isPasswordRole ? 'password' : 'otp'
      });
      return user;
    } catch (error) {
      logger.error('Error in user registration', error, { email: userData.email });
      if (error instanceof ConflictError) throw error;
      if (error.code === 11000) {
        throw new ConflictError('User with this email already exists');
      }
      throw new DatabaseError('Failed to register user', error);
    }
  }

  /**
   * Email + password login for admin/inspector
   * @param {string} email - User email
   * @param {string} password - Plain password
   * @returns {Promise<Object>} User (with password selected for compare)
   */
  async loginWithPassword(email, password) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }
      if (user.status === USER_STATUS.BLOCKED) {
        throw new ForbiddenError('Account is blocked. Please contact administrator.');
      }
      if (!user.password) {
        throw new UnauthorizedError('This account uses OTP login. Use email to receive OTP.');
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }
      logger.info('Password login successful', { userId: user.id, email: user.email, role: user.role });
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) throw error;
      logger.error('Error in password login', error, { email });
      throw new DatabaseError('Failed to authenticate user', error);
    }
  }

  /**
   * Get user by email (for OTP flow - user role only)
   * @param {string} email - User email
   * @returns {Promise<Object>} User
   */
  async getByEmail(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      console.log('user', user);
      if (!user) {
        throw new UnauthorizedError('Invalid email');
      }
      if (user.status === USER_STATUS.BLOCKED) {
        throw new ForbiddenError('Account is blocked. Please contact administrator.');
      }
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) throw error;
      logger.error('Error getting user by email', error, { email });
      throw new DatabaseError('Failed to get user', error);
    }
  }

  /**
   * Create a new user (admin only)
   * Admin/Inspector: require password, create as ACTIVE
   * User: no password, create as INACTIVE (OTP on first login)
   * @param {Object} userData - User data (password required for admin/inspector)
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    try {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      const role = userData.role;
      const isPasswordRole = role === USER_ROLES.ADMIN || role === USER_ROLES.INSPECTOR;

      const createPayload = {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role,
        otpVerified: false
      };

      if (isPasswordRole) {
        createPayload.password = userData.password;
        createPayload.status = USER_STATUS.ACTIVE;
      } else {
        createPayload.status = USER_STATUS.INACTIVE;
      }

      const user = await User.create(createPayload);

      logger.info('User created by admin', {
        userId: user.id,
        email: user.email,
        role,
        authType: isPasswordRole ? 'password' : 'otp'
      });
      return user;
    } catch (error) {
      logger.error('Error creating user', error, { email: userData.email });
      if (error instanceof ConflictError) {
        throw error;
      }
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        throw new ConflictError('User with this email already exists');
      }
      
      throw new DatabaseError('Failed to create user', error);
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @param {Object} currentUser - Current authenticated user (for authorization)
   * @returns {Promise<Object>} User object
   */
  async getUserById(userId, currentUser) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Authorization: Non-admin users can only view their own profile
      const currentUserId = currentUser._id?.toString() || currentUser.id?.toString();
      const targetUserId = user._id?.toString() || user.id?.toString();
      
      if (currentUser.role !== USER_ROLES.ADMIN && currentUserId !== targetUserId) {
        throw new ForbiddenError('You can only view your own profile');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      
      logger.error('Error fetching user', error, { userId });
      throw new DatabaseError('Failed to fetch user', error);
    }
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @param {Object} currentUser - Current authenticated user
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, updateData, currentUser) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Authorization check: Non-admin users can only update themselves
      const currentUserId = currentUser._id?.toString() || currentUser.id?.toString();
      const targetUserId = user._id?.toString() || user.id?.toString();
      
      if (currentUser.role !== USER_ROLES.ADMIN && currentUserId !== targetUserId) {
        throw new ForbiddenError('You can only update your own profile');
      }

      // Admin can change roles, regular users cannot
      if (currentUser.role !== USER_ROLES.ADMIN && updateData.role) {
        delete updateData.role;
      }

      // Update user fields
      Object.keys(updateData).forEach(key => {
        user[key] = updateData[key];
      });

      await user.save();

      logger.info('User updated successfully', { userId: user.id, updatedBy: currentUser.id });
      return user;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) {
        throw error;
      }
      
      logger.error('Error updating user', error, { userId });
      throw new DatabaseError('Failed to update user', error);
    }
  }

  /**
   * Toggle user status (admin only): active ↔ inactive.
   * - If active → set to inactive
   * - If inactive or blocked → set to active
   * @param {string} userId - User ID to toggle
   * @returns {Promise<Object>} User with updated status
   */
  async blockUser(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const previousStatus = user.status;
      const newStatus = previousStatus === USER_STATUS.ACTIVE
        ? USER_STATUS.INACTIVE
        : USER_STATUS.ACTIVE;

      user.status = newStatus;
      await user.save();

      logger.info('User status toggled', { userId: user.id, previousStatus, newStatus });
      return user;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Error toggling user status', error, { userId });
      throw new DatabaseError('Failed to update user status', error);
    }
  }

  /**
   * Delete user (admin only)
   * @param {string} userId - User ID to delete
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      logger.info('User deleted successfully', { userId });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Error deleting user', error, { userId });
      throw new DatabaseError('Failed to delete user', error);
    }
  }

  /**
   * Get available inspectors for assignment (admin only)
   * Criteria: role=inspector, status=active, is_assigned=false. Optionally filter by availableStatus.
   * @param {Object} queryParams - Optional { availableStatus, page, limit }
   * @returns {Promise<Object>} List of available inspectors (id, firstName, lastName, email, phone, availableStatus)
   */
  async getAvailableInspectors(queryParams = {}) {
    try {
      const {
        availableStatus = null,
        page = 1,
        limit = 50
      } = queryParams;

      const filter = {
        role: USER_ROLES.INSPECTOR,
        status: USER_STATUS.ACTIVE,
        is_assigned: false
      };
      if (availableStatus != null && String(availableStatus).trim() !== '') {
        filter.availableStatus = String(availableStatus).trim();
      }

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [inspectors, totalCount] = await Promise.all([
        User.find(filter)
          .select('firstName lastName email phone availableStatus is_assigned createdAt')
          .sort({ firstName: 1, lastName: 1 })
          .skip(skip)
          .limit(limitNum)
          .lean()
          .exec(),
        User.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      logger.info('Available inspectors listed', {
        totalCount,
        page: pageNum,
        limit: limitNum,
        filters: { availableStatus: availableStatus || null }
      });

      return {
        inspectors,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1
        }
      };
    } catch (error) {
      logger.error('Error fetching available inspectors', error);
      throw new DatabaseError('Failed to fetch available inspectors', error);
    }
  }

  /**
   * Update current inspector's available status (inspector only)
   * @param {Object} body - { availableStatus: string } (max 50 chars, optional empty string to clear)
   * @param {Object} currentUser - Authenticated user (must be inspector)
   * @returns {Promise<Object>} Updated user (selected fields)
   */
  async updateMyAvailableStatus(body, currentUser) {
    try {
      if (!currentUser || currentUser.role !== USER_ROLES.INSPECTOR) {
        throw new ForbiddenError('Only inspectors can update their available status');
      }

      const userId = currentUser._id || currentUser.id;
      if (!userId) {
        throw new BadRequestError('Invalid user ID');
      }

      const availableStatus =
        body.availableStatus === null || body.availableStatus === undefined
          ? null
          : String(body.availableStatus).trim().slice(0, 50) || null;

      const user = await User.findByIdAndUpdate(
        userId,
        { availableStatus },
        { new: true, runValidators: true }
      )
        .select('id email firstName lastName role status phone availableStatus is_assigned createdAt updatedAt')
        .lean()
        .exec();

      if (!user) {
        throw new NotFoundError('User not found');
      }

      logger.info('Inspector available status updated', {
        userId: user.id,
        availableStatus: user.availableStatus
      });

      return user;
    } catch (error) {
      if (error instanceof ForbiddenError || error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Error updating inspector available status', error, { userId: currentUser?.id });
      throw new DatabaseError('Failed to update available status', error);
    }
  }

  /**
   * Get all users with pagination, search, and filtering (admin only)
   * @param {Object} queryParams - Query parameters (page, limit, search, role, status, sortBy, sortOrder)
   * @returns {Promise<Object>} Paginated users list with metadata
   */
  async getAllUsers(queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        role = null,
        status = null,
        sortBy = 'id',
        sortOrder = 'DESC'
      } = queryParams;

      // Build filter conditions
      const filter = {};
      
      // Exclude admin users from the list by default
      // Only show admin users if explicitly filtering by admin role
      if (role) {
        filter.role = role;
      } else {
        // Default: exclude admin users
        filter.role = { $ne: USER_ROLES.ADMIN };
      }
      
      if (status) {
        filter.status = status;
      }

      // Build search condition
      if (search) {
        filter.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      // Calculate offset
      const skip = (page - 1) * limit;

      // Build sort
      const sort = {};
      const sortField = sortBy === 'id' ? '_id' : sortBy;
      sort[sortField] = sortOrder === 'ASC' ? 1 : -1;

      // Execute queries in parallel
      const [users, totalCount] = await Promise.all([
        User.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean()
          .exec(),
        User.countDocuments(filter)
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      logger.info('Users retrieved successfully', {
        page,
        limit,
        totalCount,
        search: search || null
      });

      return {
        users,
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
          role: role || null,
          status: status || null,
          sortBy,
          sortOrder
        }
      };
    } catch (error) {
      logger.error('Error fetching users list', error, { queryParams });
      throw new DatabaseError('Failed to fetch users list', error);
    }
  }
}

module.exports = new UserService();