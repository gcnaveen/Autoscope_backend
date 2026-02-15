/**
 * Mailer Utility using Nodemailer
 * Gmail: use port 587 (STARTTLS) or 465 (SSL). Use an App Password, not account password.
 * Set SMTP_USER, SMTP_PASSWORD (and optionally SMTP_HOST, SMTP_PORT) in .env or Lambda env.
 */
const nodemailer = require('nodemailer');
const logger = require('./logger');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Math.max(0, parseInt(process.env.SMTP_PORT, 10)) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const secure = SMTP_PORT === 465;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure,
  auth: SMTP_USER && SMTP_PASSWORD ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
  tls: { rejectUnauthorized: false }
});

const sendOtpEmail = async ({ to, otp }) => {
  if (!SMTP_USER || !SMTP_PASSWORD) {
    const err = new Error('SMTP not configured: set SMTP_USER and SMTP_PASSWORD (use Gmail App Password with port 587)');
    logger.error(err.message, { to });
    throw err;
  }
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
    const errDetail = {
      to,
      smtpMessage: error.message,
      smtpCode: error.code,
      smtpResponse: error.response,
      smtpCommand: error.command
    };
    logger.error('Failed to send OTP email', error, errDetail);
    throw error;
  }
};

module.exports = {
  sendOtpEmail
};

