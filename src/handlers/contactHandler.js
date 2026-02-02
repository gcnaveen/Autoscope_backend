/**
 * Contact Us Handler
 * POST /api/contact - public
 * GET /api/contact/admin - admin only
 */

const { connectDB } = require('../config/database');
const { submitContact, getAllContactSubmissions } = require('../controllers/contactController');
const { validate, schemas } = require('../middleware/validator');
const { parseQueryParams } = require('../utils/queryParams');
const { validateQuery } = require('../utils/validateQuery');
const { authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');

let dbConnected = false;
const initDB = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};

/**
 * Submit contact us form
 * POST /api/contact
 * Body: { name, email?, number?, message? } - either email or number required
 */
exports.submitContact = asyncHandler(async (event) => {
  await initDB();

  const data = validate(schemas.contactUs)(event);
  return await submitContact(data);
});

/**
 * Get all contact submissions (admin only)
 * GET /api/contact/admin?page=1&limit=10&search=&sortBy=createdAt&sortOrder=DESC
 */
exports.getContactSubmissionsAdmin = asyncHandler(async (event) => {
  await initDB();

  await authorize(USER_ROLES.ADMIN)(event);

  const queryParams = parseQueryParams(event);
  const validatedParams = validateQuery(schemas.listContactSubmissions, queryParams);
  return await getAllContactSubmissions(validatedParams);
});
