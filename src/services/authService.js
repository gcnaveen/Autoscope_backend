/**
 * Authentication Service
 * Admin/Inspector: email + password login. User: OTP-only login.
 */

const User = require('../models/User');
const userService = require('./userService');
const { generateToken } = require('../middleware/auth');
const otpService = require('./otpService');
const { USER_ROLES } = require('../config/constants');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');

class AuthService {
  /**
   * Register new user
   * Admin/Inspector: password required → create as ACTIVE, return user + token
   * User: no password → create as INACTIVE, send OTP, return otpRequired
   */
  async register(userData) {
    const user = await userService.register(userData);
    const isPasswordRole = user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.INSPECTOR;

    if (isPasswordRole) {
      const token = generateToken(user.id);
      return { user, token, otpRequired: false, message: 'Registration successful' };
    }

    await otpService.issueOtp(user.email);
    return {
      user,
      token: null,
      otpRequired: true,
      message: 'OTP sent to email; verify to complete registration'
    };
  }

  /**
   * Login
   * Admin/Inspector: email + password → return token
   * User: email only → send OTP, return otpRequired
   */
  async login(email, password) {
    const userBasic = await User.findOne({ email: email.toLowerCase() });
    if (!userBasic) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordRole = userBasic.role === USER_ROLES.ADMIN || userBasic.role === USER_ROLES.INSPECTOR;

    if (isPasswordRole) {
      if (!password || typeof password !== 'string' || !password.trim()) {
        throw new BadRequestError('Password is required for this account');
      }
      const user = await userService.loginWithPassword(email, password);
      const token = generateToken(user.id);
      return { user, token, otpRequired: false, message: 'Login successful' };
    }

    // User role: OTP flow
    await otpService.issueOtp(email);
    const user = await userService.getByEmail(email);
    return {
      user,
      token: null,
      otpRequired: true,
      message: 'OTP sent to email; verify to complete login'
    };
  }

  /**
   * Send OTP - allowed only for user role (OTP-based accounts)
   */
  async sendOtp(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedError('Invalid email');
    }
    if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.INSPECTOR) {
      throw new BadRequestError('This account uses password login. Use email and password to sign in.');
    }
    return otpService.issueOtp(email);
  }

  /**
   * Verify OTP and return token - allowed only for user role
   */
  async verifyOtp(email, otp) {
    const userBasic = await User.findOne({ email: email.toLowerCase() });
    if (!userBasic) {
      throw new UnauthorizedError('Invalid email');
    }
    if (userBasic.role === USER_ROLES.ADMIN || userBasic.role === USER_ROLES.INSPECTOR) {
      throw new BadRequestError('OTP login is not available for this account. Use email and password to sign in.');
    }

    const user = await otpService.verifyOtp(email, otp);

    if (user.status !== 'active') {
      user.status = 'active';
      await user.save();
    }

    const token = generateToken(user.id);
    return { user, token };
  }
}

module.exports = new AuthService();