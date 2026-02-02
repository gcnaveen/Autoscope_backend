/**
 * User Controller
 * Handles HTTP request/response logic for user endpoints
 * Delegates business logic to service layer
 */

const userService = require('../services/userService');
const { success } = require('../utils/response');
const authService = require('../services/authService');

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Success response with user and token
 */
const register = async (userData) => {
  const result = await authService.register(userData);
  
  return success({
    statusCode: 201,
    message: result.otpRequired
      ? 'User registered. OTP sent to email for verification'
      : 'User registered successfully',
    data: result
  });
};

/**
 * Login user
 * @param {string} email - User email
 * @returns {Promise<Object>} Success response with user and token
 */
const login = async (email) => {
  const result = await authService.login(email);
  
  return success({
    message: result.otpRequired
      ? 'OTP sent to email; verify to complete login'
      : 'Login successful',
    data: result
  });
};

/**
 * Create user (admin only)
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Success response with created user
 */
const createUser = async (userData) => {
  const user = await userService.createUser(userData);
  
  return success({
    statusCode: 201,
    message: 'User created successfully',
    data: { user }
  });
};

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @param {Object} currentUser - Current authenticated user (for authorization)
 * @returns {Promise<Object>} Success response with user data
 */
const getUserById = async (userId, currentUser) => {
  const user = await userService.getUserById(userId, currentUser);
  
  return success({
    message: 'User retrieved successfully',
    data: { user }
  });
};

/**
 * Update user
 * @param {number} userId - User ID
 * @param {Object} updateData - Data to update
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<Object>} Success response with updated user
 */
const updateUser = async (userId, updateData, currentUser) => {
  const user = await userService.updateUser(userId, updateData, currentUser);
  
  return success({
    message: 'User updated successfully',
    data: { user }
  });
};

/**
 * Toggle user status (admin only): active ↔ inactive
 * @param {number} userId - User ID to toggle
 * @returns {Promise<Object>} Success response with updated user
 */
const blockUser = async (userId) => {
  const user = await userService.blockUser(userId);
  
  return success({
    message: user.status === 'active' ? 'User activated successfully' : 'User deactivated successfully',
    data: { user }
  });
};

/**
 * Delete user (admin only)
 * @param {number} userId - User ID to delete
 * @returns {Promise<Object>} Success response
 */
const deleteUser = async (userId) => {
  await userService.deleteUser(userId);
  
  return success({
    message: 'User deleted successfully'
  });
};

/**
 * Get all users with pagination and search (admin only)
 * @param {Object} queryParams - Query parameters for pagination, search, and filtering
 * @returns {Promise<Object>} Success response with paginated users list
 */
const getAllUsers = async (queryParams) => {
  const result = await userService.getAllUsers(queryParams);
  
  return success({
    message: 'Users retrieved successfully',
    data: result
  });
};

/**
 * Get available inspectors for assignment (admin only)
 * @param {Object} queryParams - Optional { availableStatus, page, limit }
 * @returns {Promise<Object>} Success response with inspectors list
 */
const getAvailableInspectors = async (queryParams) => {
  const result = await userService.getAvailableInspectors(queryParams);
  
  return success({
    message: 'Available inspectors retrieved successfully',
    data: result
  });
};

/**
 * Update current inspector's available status (inspector only)
 * @param {Object} body - { availableStatus?: string }
 * @param {Object} currentUser - Authenticated inspector
 * @returns {Promise<Object>} Success response with updated user
 */
const updateMyAvailableStatus = async (body, currentUser) => {
  const user = await userService.updateMyAvailableStatus(body, currentUser);
  
  return success({
    message: 'Available status updated successfully',
    data: { user }
  });
};

module.exports = {
  register,
  login,
  createUser,
  getUserById,
  updateUser,
  blockUser,
  deleteUser,
  getAllUsers,
  getAvailableInspectors,
  updateMyAvailableStatus
};