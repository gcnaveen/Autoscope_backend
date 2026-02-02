/**
 * Admin Dashboard Controller
 * Handles HTTP request/response logic for admin dashboard endpoints
 */

const adminDashboardService = require('../services/adminDashboardService');
const { success } = require('../utils/response');

/**
 * Get admin dashboard data (users, inspection requests, inspectors)
 * @returns {Promise<Object>} Success response with dashboard data
 */
const getAdminDashboardData = async () => {
  const data = await adminDashboardService.getAdminDashboardData();
  
  return success({
    message: 'Admin dashboard data retrieved successfully',
    data
  });
};

module.exports = {
  getAdminDashboardData
};
