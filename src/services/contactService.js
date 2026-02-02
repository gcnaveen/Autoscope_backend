/**
 * Contact Service
 * Handles contact us form submissions
 */

const ContactSubmission = require('../models/ContactSubmission');
const { NotFoundError, BadRequestError, DatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

class ContactService {
  /**
   * Submit contact us form
   * @param {Object} data - { name, email?, number?, message? } - at least one of email or number required
   * @returns {Promise<Object>} Created submission
   */
  async submitContact(data) {
    try {
      const email = (data.email || '').toString().trim() || null;
      const number = (data.number || '').toString().trim() || null;

      if (!email && !number) {
        throw new BadRequestError('Either email or number is required');
      }

      const submission = await ContactSubmission.create({
        name: (data.name || '').toString().trim(),
        email: email || undefined,
        number: number || undefined,
        message: (data.message || '').toString().trim() || ''
      });

      logger.info('Contact form submitted', {
        id: submission.id,
        name: submission.name,
        hasEmail: !!submission.email,
        hasNumber: !!submission.number
      });

      return submission;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      logger.error('Error submitting contact form', error, { data });
      throw new DatabaseError('Failed to submit contact form', error);
    }
  }

  /**
   * Get all contact submissions (admin only) with pagination
   * @param {Object} queryParams - { page, limit, search, sortBy, sortOrder }
   * @returns {Promise<Object>} Paginated submissions with metadata
   */
  async getAllContactSubmissions(queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = queryParams;

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));

      const filter = {};
      if (search && search.trim()) {
        filter.$or = [
          { name: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
          { number: { $regex: search.trim(), $options: 'i' } },
          { message: { $regex: search.trim(), $options: 'i' } }
        ];
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'ASC' ? 1 : -1;

      const skip = (pageNum - 1) * limitNum;
      const [submissions, totalCount] = await Promise.all([
        ContactSubmission.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean()
          .exec(),
        ContactSubmission.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      logger.info('Contact submissions retrieved by admin', {
        page: pageNum,
        limit: limitNum,
        totalCount
      });

      return {
        submissions,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1
        },
        filters: {
          search: search?.trim() || null,
          sortBy,
          sortOrder
        }
      };
    } catch (error) {
      logger.error('Error fetching contact submissions', error, { queryParams });
      throw new DatabaseError('Failed to fetch contact submissions', error);
    }
  }
}

module.exports = new ContactService();
