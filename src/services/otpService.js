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
    try {
      const user = await User.findOne({ email }).select('+otpCode +otpExpires');
      if (!user) {
        throw new UnauthorizedError('Invalid email');
      }

      const otp = generateOtp();
      const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      user.otpCode = otp;
      user.otpExpires = expires;
      user.otpVerified = false;
      await user.save();

      const sent = await sendOtpEmail({ to: email, otp });
      if (!sent) {
        throw new DatabaseError('Failed to send OTP email');
      }

      logger.info('OTP issued', { userId: user.id, email });
      return { message: 'OTP sent to email', expiresAt: expires };
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError || error instanceof DatabaseError) {
        throw error;
      }
      logger.error('Error issuing OTP', error, { email });
      throw new DatabaseError('Failed to issue OTP', error);
    }
  }

  async verifyOtp(email, otp) {
    try {
      const user = await User.findOne({ email }).select('+otpCode +otpExpires');
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

      logger.info('OTP verified', { userId: user.id, email });
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }
      logger.error('Error verifying OTP', error, { email });
      throw new DatabaseError('Failed to verify OTP', error);
    }
  }
}

module.exports = new OtpService();

