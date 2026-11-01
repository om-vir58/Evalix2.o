// server/utils/emailService.js
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MAIL_LOG_FILE = path.join(DATA_DIR, 'mail_log.txt');

/**
 * Configure Nodemailer transport from environment if available
 */
const getTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure: process.env.SMTP_SECURE === 'true' || port === 465,
            auth: {
                user,
                pass
            }
        });
    }

    return null;
};

/**
 * Append simulated email to local log file for auditing / local development
 */
const logEmailLocally = (to, code, subject) => {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const logLine = `[${new Date().toISOString()}] To: ${to} | Subject: ${subject} | Code: ${code}\n`;
        fs.appendFileSync(MAIL_LOG_FILE, logLine, 'utf-8');
    } catch (err) {
        console.error('Failed to write to mail log file:', err.message);
    }
};

/**
 * Send an email verification code
 *
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<{ success: boolean, delivered: boolean, previewCode?: string }>}
 */
const sendVerificationEmail = async (email, name, code) => {
    const recipientName = name || email.split('@')[0];
    const fromAddress = process.env.EMAIL_FROM || '"Evalix 2.0" <no-reply@evalix.com>';
    const subject = `Your Evalix 2.0 Verification Code: ${code}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Evalix Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
        .card { max-width: 520px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 36px 30px; text-align: center; }
        .brand { font-size: 24px; font-weight: 800; color: #6366f1; margin-bottom: 24px; letter-spacing: -0.5px; }
        .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 28px; }
        .otp-box { display: inline-block; background-color: #0f172a; border: 2px dashed #6366f1; border-radius: 12px; padding: 14px 32px; font-size: 32px; font-weight: 800; letter-spacing: 10px; color: #a5b4fc; margin-bottom: 24px; font-family: monospace; }
        .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #334155; padding-top: 18px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">Evalix 2.0</div>
        <div class="title">Verify Your Email Address</div>
        <p class="text">Hello <strong>${recipientName}</strong>,<br>Welcome to Evalix 2.0. Please enter the following 6-digit verification code to activate your account:</p>
        <div class="otp-box">${code}</div>
        <p class="text" style="font-size: 13px;">This code will expire in <strong>15 minutes</strong>. If you did not create an Evalix account, please disregard this email.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Evalix 2.0 • AI-Powered Document Analysis Platform
        </div>
      </div>
    </body>
    </html>
    `.trim();

    const transporter = getTransporter();

    // Console output for immediate visibility & development
    console.log('\n============================================================');
    console.log(`[Evalix 2.0 Email Service] Verification Code for ${email}`);
    console.log(`CODE: ${code} (expires in 15 minutes)`);
    console.log('============================================================\n');

    // Always log locally
    logEmailLocally(email, code, subject);

    if (transporter) {
        try {
            await transporter.sendMail({
                from: fromAddress,
                to: email,
                subject,
                text: `Hello ${recipientName},\n\nYour Evalix 2.0 verification code is: ${code}\n\nThis code will expire in 15 minutes.`,
                html: htmlContent
            });
            return {
                success: true,
                delivered: true
            };
        } catch (err) {
            console.error('Nodemailer send failed, falling back to simulated dispatch:', err.message);
            return {
                success: true,
                delivered: false,
                simulated: true,
                previewCode: code
            };
        }
    }

    // SMTP not configured - simulated dispatch
    return {
        success: true,
        delivered: false,
        simulated: true,
        previewCode: code
    };
};

module.exports = {
    sendVerificationEmail
};

