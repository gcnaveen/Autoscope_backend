/**
 * Mailer Utility using Nodemailer
 */
const nodemailer = require('nodemailer');
const logger = require('./logger');

const {
  SMTP_HOST = process.env.SMTP_HOST,
  SMTP_PORT = process.env.SMTP_PORT,
  SMTP_USER = process.env.SMTP_USER,
  SMTP_PASSWORD = process.env.SMTP_PASSWORD
} = process.env;
console.log("SMTP HOST:", process.env.SMTP_HOST);
console.log("SMTP PORT:", process.env.SMTP_PORT);
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

const sendOtpEmail = async ({ to, otp }) => {
  try {
    await transporter.sendMail({
      to,
      from: SMTP_USER,
      subject: 'Your Login OTP',
      html: `
        <div>
          <h3>Hello,</h3>
          <p>Your one-time password (OTP) is <b>${otp}</b>. It will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore.</p>
        </div>
      `
    });
    logger.info('OTP email sent', { to });
    return true;
  } catch (error) {
    logger.error('Failed to send OTP email', error, { to });
    return false;
  }
};

module.exports = {
  sendOtpEmail
};

