import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;

  private constructor() {
    this.initializeTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initializeTransporter() {
    // Check if email configuration is available
    const emailConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    // If SMTP is configured, use it; otherwise, use a test account
    if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
      logger.info('Email service initialized with SMTP configuration');
    } else {
      // For development, use a test account or log emails
      logger.warn('SMTP not configured, emails will be logged only');
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Log the email details
      logger.info('Email would be sent:', {
        to: options.to,
        subject: options.subject,
        html: options.html.substring(0, 100) + '...', // Log first 100 chars
      });

      // If transporter is available, send actual email
      if (this.transporter) {
        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@tenantflow.com',
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        };

        const info = await this.transporter.sendMail(mailOptions);
        logger.info('Email sent successfully:', {
          messageId: info.messageId,
          to: options.to,
          subject: options.subject,
        });
        return true;
      } else {
        // In development, just log the email
        logger.info('Email service not configured, email would be sent:', {
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        return true; // Return true to not break the flow
      }
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendStaffInvitation(
    to: string,
    name: string,
    role: string,
    tempPassword: string,
    invitedBy: string,
    businessName?: string
  ): Promise<boolean> {
    const subject = `You've been invited to join ${businessName || 'TenantFlow'}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ${businessName || 'TenantFlow'}!</h2>
        
        <p>Hello ${name},</p>
        
        <p>You've been invited by <strong>${invitedBy}</strong> to join ${businessName || 'TenantFlow'} as a <strong>${role}</strong>.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Login Credentials:</h3>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Temporary Password:</strong> <code style="background-color: #e0e0e0; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
        </div>
        
        <p><strong>Important:</strong> Please change your password after your first login for security.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}/signin" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Login to Your Account
          </a>
        </div>
        
        <p>If you have any questions, please contact your administrator.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message from ${businessName || 'TenantFlow'}. 
          Please do not reply to this email.
        </p>
      </div>
    `;

    const text = `
Welcome to ${businessName || 'TenantFlow'}!

Hello ${name},

You've been invited by ${invitedBy} to join ${businessName || 'TenantFlow'} as a ${role}.

Your Login Credentials:
Email: ${to}
Temporary Password: ${tempPassword}

Important: Please change your password after your first login for security.

Login to your account: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}/signin

If you have any questions, please contact your administrator.

---
This is an automated message from ${businessName || 'TenantFlow'}. Please do not reply to this email.
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text
    });
  }

  async sendPasswordReset(
    to: string,
    resetLink: string,
    name?: string
  ): Promise<boolean> {
    const subject = 'Reset Your Password - TenantFlow';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        
        <p>Hello ${name || 'there'},</p>
        
        <p>We received a request to reset your password for your TenantFlow account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
        
        <p>This link will expire in 1 hour for security reasons.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message from TenantFlow. Please do not reply to this email.
        </p>
      </div>
    `;

    const text = `
Reset Your Password - TenantFlow

Hello ${name || 'there'},

We received a request to reset your password for your TenantFlow account.

Reset your password: ${resetLink}

If you didn't request this password reset, you can safely ignore this email.

This link will expire in 1 hour for security reasons.

---
This is an automated message from TenantFlow. Please do not reply to this email.
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text
    });
  }

  async sendEmailVerification(
    to: string,
    verificationLink: string,
    name?: string
  ): Promise<boolean> {
    const subject = 'Verify Your Email - TenantFlow';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        
        <p>Hello ${name || 'there'},</p>
        
        <p>Thank you for signing up for TenantFlow! Please verify your email address to complete your registration.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p>If you didn't create an account with TenantFlow, you can safely ignore this email.</p>
        
        <p>This link will expire in 24 hours for security reasons.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated message from TenantFlow. Please do not reply to this email.
        </p>
      </div>
    `;

    const text = `
Verify Your Email Address - TenantFlow

Hello ${name || 'there'},

Thank you for signing up for TenantFlow! Please verify your email address to complete your registration.

Verify your email: ${verificationLink}

If you didn't create an account with TenantFlow, you can safely ignore this email.

This link will expire in 24 hours for security reasons.

---
This is an automated message from TenantFlow. Please do not reply to this email.
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text
    });
  }
}

export const emailService = EmailService.getInstance();

// Subscription confirmation email
export const sendSubscriptionConfirmation = async (userEmail: string, planName: string, amount: number) => {
  const subject = `Welcome to TenantFlow ${planName}!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to TenantFlow ${planName}!</h2>
      <p>Thank you for subscribing to TenantFlow ${planName}. Your subscription is now active.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Subscription Details:</h3>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Amount:</strong> $${amount}/month</p>
        <p><strong>Next Billing:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
      </div>
      
      <p>You now have access to all ${planName} features. If you have any questions, please don't hesitate to contact our support team.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          The TenantFlow Team
        </p>
      </div>
    </div>
  `;

  return emailService.sendEmail({
    to: userEmail,
    subject,
    html,
  });
};

// Subscription cancellation email
export const sendSubscriptionCancellation = async (userEmail: string, planName: string, endDate: Date) => {
  const subject = `Your TenantFlow ${planName} subscription has been cancelled`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Subscription Cancelled</h2>
      <p>We're sorry to see you go. Your TenantFlow ${planName} subscription has been cancelled.</p>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Cancellation Details:</h3>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Access until:</strong> ${endDate.toLocaleDateString()}</p>
      </div>
      
      <p>You'll continue to have access to ${planName} features until ${endDate.toLocaleDateString()}. After that, your account will be downgraded to the Free plan.</p>
      
      <p>If you change your mind, you can reactivate your subscription anytime from your account dashboard.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          The TenantFlow Team
        </p>
      </div>
    </div>
  `;

  return emailService.sendEmail({
    to: userEmail,
    subject,
    html,
  });
};

// Usage limit warning email
export const sendUsageLimitWarning = async (userEmail: string, resourceType: string, currentUsage: number, limit: number) => {
  const percentage = Math.round((currentUsage / limit) * 100);
  const subject = `Usage Limit Warning - ${percentage}% of ${resourceType} limit reached`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Usage Limit Warning</h2>
      <p>You're approaching your ${resourceType} limit on your current plan.</p>
      
      <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Current Usage:</h3>
        <p><strong>${resourceType}:</strong> ${currentUsage} / ${limit} (${percentage}%)</p>
        <p><strong>Remaining:</strong> ${limit - currentUsage}</p>
      </div>
      
      <p>To continue adding more ${resourceType}, consider upgrading your plan to get higher limits and additional features.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/subscription" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Upgrade Plan
        </a>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          The TenantFlow Team
        </p>
      </div>
    </div>
  `;

  return emailService.sendEmail({
    to: userEmail,
    subject,
    html,
  });
};

// Payment failed email
export const sendPaymentFailed = async (userEmail: string, planName: string, retryDate: Date) => {
  const subject = `Payment Failed - Action Required`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Payment Failed</h2>
      <p>We were unable to process your payment for your TenantFlow ${planName} subscription.</p>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Next Steps:</h3>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Next retry:</strong> ${retryDate.toLocaleDateString()}</p>
      </div>
      
      <p>To avoid any interruption to your service, please update your payment method in your account settings.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/subscription" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Update Payment Method
        </a>
      </div>
      
      <p>If you continue to experience issues, please contact our support team for assistance.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          The TenantFlow Team
        </p>
      </div>
    </div>
  `;

  return emailService.sendEmail({
    to: userEmail,
    subject,
    html,
  });
}; 