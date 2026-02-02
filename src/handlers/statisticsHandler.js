/**
 * Admin Dashboard Handlers
 * Lambda function handlers for admin dashboard endpoint
 */

const { connectDB } = require('../config/database');
const { getAdminDashboardData } = require('../controllers/adminDashboardController');
const { authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');

// Initialize database connection (warm start optimization)
let dbConnected = false;
const initDB = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};

/**
 * Get admin dashboard data (users, inspection requests, inspectors)
 * GET /api/admin/dashboard
 * Admin only
 */
exports.getAdminDashboardData = asyncHandler(async (event) => {
  await initDB();
  
  // Authenticate and authorize (admin only)
  const { user: currentUser } = await authorize(USER_ROLES.ADMIN)(event);
  
  return await getAdminDashboardData();
});
