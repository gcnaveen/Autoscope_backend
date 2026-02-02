/**
 * Admin Dashboard Service
 * Provides comprehensive data for admin dashboard on login
 * Production-level service with optimized queries and proper data formatting
 */

const User = require('../models/User');
const InspectionRequest = require('../models/InspectionRequest');
const Inspection = require('../models/Inspection');
const ChecklistTemplate = require('../models/ChecklistTemplate');
const { USER_ROLES, USER_STATUS } = require('../config/constants');
const { DatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Admin Dashboard Service Class
 */
class AdminDashboardService {
  /**
   * Get all data for admin dashboard in the exact format specified
   * @returns {Promise<Object>} Formatted admin dashboard data
   */
  async getAdminDashboardData() {
    try {
      // Recent activities: last 24 hours only
      const last24HoursCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentFilter = { createdAt: { $gte: last24HoursCutoff } };

      // Execute all queries in parallel for optimal performance
      const [
        totalUsersCount,
        totalInspectorsCount,
        totalTemplatesCount,
        roleCounts,
        allRequests,
        openRequestsCount,
        recentUsers,
        recentRequests,
        recentInspections,
        recentTemplates
      ] = await Promise.all([
        // Count total users (excluding admin)
        User.countDocuments({ role: { $ne: USER_ROLES.ADMIN } }),

        // Count total inspectors
        User.countDocuments({ role: USER_ROLES.INSPECTOR }),

        // Count total checklist templates
        ChecklistTemplate.countDocuments(),

        // User counts by role (single aggregation)
        User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]).exec(),

        // Get all inspection requests for statistics
        InspectionRequest.find().lean(),

        // Count open requests (pending + assigned + in_progress)
        InspectionRequest.countDocuments({
          status: { $in: ['pending', 'assigned', 'in_progress'] }
        }),

        // Recent user registrations (last 24 hours, most recent 10)
        User.find({ role: { $ne: USER_ROLES.ADMIN }, ...recentFilter })
          .select('firstName lastName email role status createdAt')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),

        // Latest inspection requests (last 24 hours, most recent 10)
        InspectionRequest.find(recentFilter)
          .select('_id requestId requestType location status createdAt')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),

        // Recent inspections (last 24 hours, most recent 10)
        Inspection.find(recentFilter)
          .select('status vehicleInfo createdAt inspectorId')
          .populate('inspectorId', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),

        // Recent template creations (last 24 hours, most recent 10)
        ChecklistTemplate.find(recentFilter)
          .select('name isActive createdAt createdBy')
          .populate('createdBy', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
      ]);

      // Format latest requests
      const latestRequests = recentRequests.map(request => {
        // Format location string
        const locationParts = [];
        if (request.location?.address) locationParts.push(request.location.address);
        if (request.location?.city) locationParts.push(request.location.city);
        if (request.location?.state) locationParts.push(request.location.state);
        const requestLocation = locationParts.length > 0 
          ? locationParts.join(', ') 
          : 'Location not specified';

        // Format status (capitalize first letter, replace underscores with spaces)
        const formatStatus = (status) => {
          if (!status) return 'Pending';
          return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        };
        const formattedStatus = formatStatus(request.status);

        return {
          request_id: request.requestId || request._id.toString(),
          request_type: request.requestType || 'car inspection',
          request_location: requestLocation,
          request_status: formattedStatus
        };
      });

      // Build recent activities from multiple sources
      const recentActivities = [];

      // Add recent user registrations
      recentUsers.forEach(user => {
        recentActivities.push({
          action: 'user_registered',
          description: `${user.firstName} ${user.lastName} (${user.email}) registered as ${user.role}`,
          timestamp: user.createdAt
        });
      });

      // Add recent inspection requests
      recentRequests.forEach(request => {
        recentActivities.push({
          action: 'inspection_request_created',
          description: `New ${request.requestType || 'car inspection'} request created`,
          timestamp: request.createdAt
        });
      });

      // Add recent inspections completed
      recentInspections
        .filter(inspection => inspection.status === 'completed' || inspection.status === 'submitted')
        .forEach(inspection => {
          const inspectorName = inspection.inspectorId 
            ? `${inspection.inspectorId.firstName} ${inspection.inspectorId.lastName}`
            : 'Unknown Inspector';
          const vehicleInfo = inspection.vehicleInfo 
            ? `${inspection.vehicleInfo.make || ''} ${inspection.vehicleInfo.model || ''}`.trim()
            : 'Vehicle';
          recentActivities.push({
            action: 'inspection_completed',
            description: `${inspectorName} completed inspection for ${vehicleInfo}`,
            timestamp: inspection.createdAt
          });
        });

      // Add recent template creations
      recentTemplates.forEach(template => {
        const creatorName = template.createdBy 
          ? `${template.createdBy.firstName} ${template.createdBy.lastName}`
          : 'Admin';
        recentActivities.push({
          action: 'template_created',
          description: `${creatorName} created checklist template: ${template.name}`,
          timestamp: template.createdAt
        });
      });

      // Sort activities by timestamp (most recent first), limit to 20 (all are within last 24h)
      recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const formattedActivities = recentActivities
        .slice(0, 20)
        .map(activity => ({
          action: activity.action,
          description: activity.description
        }));

      // Build user role stats (default 0 for roles with no users)
      const roleMap = (roleCounts || []).reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {});
      const user_role_stats = {
        admin: roleMap[USER_ROLES.ADMIN] ?? 0,
        inspector: roleMap[USER_ROLES.INSPECTOR] ?? 0,
        user: roleMap[USER_ROLES.USER] ?? 0
      };

      // Build response in exact format requested
      const response = {
        total_users: totalUsersCount,
        total_inspectors: totalInspectorsCount,
        total_checklist_templates: totalTemplatesCount,
        user_role_stats,
        inspection_requests: {
          total_requests: allRequests.length,
          open_requests: openRequestsCount,
          latest_requests: latestRequests
        },
        recent_activities: formattedActivities
      };

      logger.info('Admin dashboard data retrieved successfully', {
        totalUsers: totalUsersCount,
        totalInspectors: totalInspectorsCount,
        totalTemplates: totalTemplatesCount,
        totalRequests: allRequests.length,
        openRequests: openRequestsCount
      });

      return response;
    } catch (error) {
      logger.error('Error fetching admin dashboard data', error);
      throw new DatabaseError('Failed to fetch admin dashboard data', error);
    }
  }
}

module.exports = new AdminDashboardService();
