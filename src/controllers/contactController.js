/**
 * Contact Controller
 * Handles HTTP request/response for contact us endpoint
 */

const contactService = require('../services/contactService');
const { success } = require('../utils/response');

/**
 * Submit contact us form
 * @param {Object} data - Validated body (name, email?, number?, message?)
 * @returns {Promise<Object>} Success response with submission
 */
const submitContact = async (data) => {
  const submission = await contactService.submitContact(data);

  return success({
    statusCode: 201,
    message: 'Thank you for contacting us. We will get back to you soon.',
    data: {
      submission: {
        id: submission.id,
        name: submission.name,
        email: submission.email || null,
        number: submission.number || null,
        message: submission.message || null
      }
    }
  });
};

/**
 * Get all contact submissions (admin only)
 * @param {Object} queryParams - Validated query params (page, limit, search, sortBy, sortOrder)
 * @returns {Promise<Object>} Success response with paginated submissions
 */
const getAllContactSubmissions = async (queryParams) => {
  const result = await contactService.getAllContactSubmissions(queryParams);

  return success({
    message: 'Contact submissions retrieved successfully',
    data: result
  });
};

module.exports = {
  submitContact,
  getAllContactSubmissions
};
