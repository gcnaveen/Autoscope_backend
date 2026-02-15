/**
 * OTP Service
 * Handles OTP generation, storage, verification, and email delivery
 */
const crypto = require('crypto');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');
const { UnauthorizedError, BadRequestError, DatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

const OTP_EXPIRY_MINUTES = 10;

const generateOtp = () => {
  return String(100000 + Math.floor(Math.random() * 900000));
};

class OtpService {
  async issueOtp(email) {
    const normalizedEmail = (email && typeof email === 'string') ? email.toLowerCase().trim() : '';
    if (!normalizedEmail) {
      throw new UnauthorizedError('Invalid email');
    }
    try {
      const user = await User.findOne({ email: normalizedEmail }).select('+otpCode +otpExpires');
      if (!user) {
        throw new UnauthorizedError('Invalid email');
      }

      const otp = generateOtp();
      const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      user.otpCode = otp;
      user.otpExpires = expires;
      user.otpVerified = false;
      await user.save();

      await sendOtpEmail({ to: normalizedEmail, otp });

      logger.info('OTP issued', { userId: user.id, email: normalizedEmail });
      return { message: 'OTP sent to email', expiresAt: expires };
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError || error instanceof DatabaseError) {
        throw error;
      }
      logger.error('Error issuing OTP', { email: normalizedEmail, errMessage: error.message, errCode: error.code, errResponse: error.response });
      throw new DatabaseError('Failed to send OTP email', error);
    }
  }

  async verifyOtp(email, otp) {
    const normalizedEmail = (email && typeof email === 'string') ? email.toLowerCase().trim() : '';
    if (!normalizedEmail) {
      throw new UnauthorizedError('Invalid email');
    }
    try {
      const user = await User.findOne({ email: normalizedEmail }).select('+otpCode +otpExpires');
      if (!user) {
        throw new UnauthorizedError('Invalid email');
      }

      if (!user.otpCode || !user.otpExpires) {
        throw new UnauthorizedError('OTP not requested');
      }

      if (new Date() > user.otpExpires) {
        throw new UnauthorizedError('OTP expired');
      }

      if (user.otpCode !== otp) {
        throw new UnauthorizedError('Invalid OTP');
      }

      user.otpVerified = true;
      user.otpCode = null;
      user.otpExpires = null;
      await user.save();

      logger.info('OTP verified', { userId: user.id, email: normalizedEmail });
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Error verifying OTP', error, { email: normalizedEmail });
      throw new DatabaseError('Failed to verify OTP', error);
    }
  }
}

module.exports = new OtpService();

