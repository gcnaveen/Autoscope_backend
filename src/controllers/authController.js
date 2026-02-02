/**
 * Authentication Controller
 * Handles HTTP request/response logic for authentication endpoints
 */

const authService = require('../services/authService');
const { success } = require('../utils/response');

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
      : 'Registration successful. You can sign in with email and password.',
    data: result
  });
};

/**
 * Login user
 * Admin/Inspector: email + password → token. User: email only → OTP sent.
 * @param {string} email - User email
 * @param {string} [password] - Required for admin/inspector
 * @returns {Promise<Object>} Success response (token or otpRequired)
 */
const login = async (email, password) => {
  const result = await authService.login(email, password);
  
  return success({
    message: result.otpRequired
      ? 'OTP sent to email; verify to complete login'
      : 'Login successful',
    data: result
  });
};

/**
 * Send OTP for login/verification
 */
const sendOtp = async (email) => {
  const result = await authService.sendOtp(email);
  return success({
    message: 'OTP sent to email',
    data: result
  });
};

/**
 * Verify OTP and return token
 */
const verifyOtp = async (email, otp) => {
  const { user, token } = await authService.verifyOtp(email, otp);
  return success({
    message: 'OTP verified successfully',
    data: { user, token }
  });
};

module.exports = {
  register,
  login,
  sendOtp,
  verifyOtp
};
