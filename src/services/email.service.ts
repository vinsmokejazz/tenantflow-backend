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
      this.transporter = nodemailer.createTransporter(emailConfig);
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