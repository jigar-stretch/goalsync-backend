import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
    this.from = process.env.EMAIL_FROM || 'noreply@goalsync.com';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  createTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.resend.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'resend',
        pass: process.env.SMTP_PASS || process.env.RESEND_API_KEY
      }
    });
  }

  /**
   * Send email with error handling
   */
  async sendEmail(options) {
    try {
      const mailOptions = {
        from: options.from || this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${options.to}: ${options.subject}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email to ${options.to}:`, error.message);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(user, verificationToken = null) {
    const verificationLink = verificationToken 
      ? `${this.frontendUrl}/verify-email?token=${verificationToken}`
      : null;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <h1>🎯 Welcome to GoalSync!</h1>
          <p>Achieve more, together.</p>
        </div>
        
        <div style="padding: 30px;">
          <h2>Hi ${user.name}! 👋</h2>
          
          <p>Welcome to GoalSync! We're excited to help you achieve your goals.</p>
          
          ${verificationLink ? `
            <p>Please verify your email address:</p>
            <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a>
          ` : `
            <a href="${this.frontendUrl}/dashboard" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
          `}
          
          <p>Best regards,<br>The GoalSync Team</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: '🎯 Welcome to GoalSync!',
      html
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="text-align: center; padding: 20px; background: #f8f9fa;">
          <h1>🔐 Password Reset</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2>Hi ${user.name},</h2>
          
          <p>We received a request to reset your password.</p>
          
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
          
          <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          
          <p>Best regards,<br>The GoalSync Team</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: '🔐 Password Reset - GoalSync',
      html
    });
  }

  /**
   * Send new device login alert
   */
  async sendNewDeviceAlert(user, deviceInfo) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Device Login - GoalSync</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px; background: #e3f2fd; border-radius: 8px; }
            .content { padding: 30px 0; }
            .device-info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 New Device Login</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${user.name},</h2>
              
              <p>We detected a new login to your GoalSync account from a device we haven't seen before.</p>
              
              <div class="device-info">
                <h3>Login Details:</h3>
                <ul>
                  <li><strong>Device:</strong> ${deviceInfo.deviceName}</li>
                  <li><strong>Browser:</strong> ${deviceInfo.browser || 'Unknown'}</li>
                  <li><strong>Operating System:</strong> ${deviceInfo.os || 'Unknown'}</li>
                  <li><strong>Location:</strong> ${deviceInfo.location?.city || 'Unknown'}, ${deviceInfo.location?.country || 'Unknown'}</li>
                  <li><strong>IP Address:</strong> ${deviceInfo.ipAddress}</li>
                  <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>
              </div>
              
              <p><strong>Was this you?</strong></p>
              <p>If you recognize this login, you can safely ignore this email. If you don't recognize this activity, please secure your account immediately.</p>
              
              <a href="${this.frontendUrl}/security" class="button">Review Security Settings</a>
              
              <p>For your security, consider:</p>
              <ul>
                <li>Changing your password if this wasn't you</li>
                <li>Enabling two-factor authentication</li>
                <li>Reviewing your active sessions</li>
                <li>Checking your recent account activity</li>
              </ul>
              
              <p>If you need help, please contact our support team immediately.</p>
              
              <p>Stay secure,<br>The GoalSync Team</p>
            </div>
            
            <div class="footer">
              <p>GoalSync - Achieve More Together</p>
              <p>This security alert was sent to ${user.email}</p>
              <p><a href="mailto:security@goalsync.com">Report Security Issue</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: '🔒 New Device Login Alert - GoalSync',
      html
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(user, verificationToken) {
    const verificationLink = `${this.frontendUrl}/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - GoalSync</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px; background: #e8f5e8; border-radius: 8px; }
            .content { padding: 30px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Verify Your Email</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${user.name},</h2>
              
              <p>Thanks for signing up for GoalSync! To complete your registration and start achieving your goals, please verify your email address.</p>
              
              <a href="${verificationLink}" class="button">Verify Email Address</a>
              
              <p>This verification link will expire in 24 hours. If you didn't create an account with GoalSync, you can safely ignore this email.</p>
              
              <p>If you can't click the button above, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${verificationLink}
              </p>
              
              <p>Once verified, you'll have full access to all GoalSync features!</p>
              
              <p>Best regards,<br>The GoalSync Team</p>
            </div>
            
            <div class="footer">
              <p>GoalSync - Achieve More Together</p>
              <p>This email was sent to ${user.email}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: '📧 Please verify your email - GoalSync',
      html
    });
  }

  /**
   * Send goal milestone notification
   */
  async sendMilestoneEmail(user, goal, milestone) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Goal Milestone Achieved! - GoalSync</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; }
            .content { padding: 30px 0; }
            .milestone { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Milestone Achieved!</h1>
              <p>Congratulations on your progress!</p>
            </div>
            
            <div class="content">
              <h2>Amazing work, ${user.name}! 🚀</h2>
              
              <p>You've just reached an important milestone in your goal journey!</p>
              
              <div class="milestone">
                <h3>🎯 Goal: ${goal.title}</h3>
                <p><strong>Milestone:</strong> ${milestone.title}</p>
                <p><strong>Progress:</strong> ${milestone.progress}% complete</p>
              </div>
              
              <p>Every step forward is a victory worth celebrating. You're proving that with dedication and the right tools, any goal is achievable!</p>
              
              <a href="${this.frontendUrl}/goals/${goal._id}" class="button">View Goal Details</a>
              
              <p>Keep up the fantastic work. Your future self will thank you for the effort you're putting in today!</p>
              
              <p>Cheering you on,<br>The GoalSync Team 🎯</p>
            </div>
            
            <div class="footer">
              <p>GoalSync - Achieve More Together</p>
              <p>This email was sent to ${user.email}</p>
              <p><a href="${this.frontendUrl}/settings/notifications">Manage notifications</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `🎉 Milestone Achieved: ${milestone.title} - GoalSync`,
      html
    });
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service configured correctly');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration error:', error.message);
      return false;
    }
  }
}

// Export singleton instance
const emailService = new EmailService();

export default emailService; 