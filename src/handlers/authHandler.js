/**
 * Authentication Handlers
 * Lambda function handlers for authentication endpoints
 */

const { connectDB } = require('../config/database');
const { register, login, sendOtp, verifyOtp } = require('../controllers/authController');
const { validate, schemas } = require('../middleware/validator');
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
 * Register handler
 * POST /api/auth/register
 */
exports.register = asyncHandler(async (event) => {
  await initDB();
  
  // Validate request
  const userData = validate(schemas.register)(event);
  
  // Register user
  return await register(userData);
});

/**
 * Login handler
 * POST /api/auth/login
 * Admin/Inspector: body { email, password }. User: body { email } → OTP sent.
 */
exports.login = asyncHandler(async (event) => {
  await initDB();
  
  const validated = validate(schemas.login)(event);
  const { email, password } = validated;
  
  return await login(email, password);
});

/**
 * Send OTP handler
 * POST /api/auth/send-otp
 */
exports.sendOtp = asyncHandler(async (event) => {
  await initDB();

  const { email } = validate(schemas.sendOtp)(event);
  return await sendOtp(email);
});

/**
 * Verify OTP handler
 * POST /api/auth/verify-otp
 */
exports.verifyOtp = asyncHandler(async (event) => {
  await initDB();

  const { email, otp } = validate(schemas.verifyOtp)(event);
  return await verifyOtp(email, otp);
});