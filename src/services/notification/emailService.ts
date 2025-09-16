import nodemailer from 'nodemailer';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER!;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD!;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@drsvms.gov.ng';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'DRSVMS - Road Safety';

export interface EmailData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;

  // Initialize email transporter
  static async initialize(): Promise<void> {
    try {
      this.transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT === 465,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service initialized successfully');

    } catch (error) {
      logger.error('Email service initialization failed:', error);
      throw createError('Email service initialization failed', 500);
    }
  }

  // Send single email
  static async sendEmail(data: EmailData): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      if (!this.transporter) {
        await this.initialize();
      }

      const mailOptions = {
        from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
        to: Array.isArray(data.to) ? data.to.join(', ') : data.to,
        cc: data.cc ? (Array.isArray(data.cc) ? data.cc.join(', ') : data.cc) : undefined,
        bcc: data.bcc ? (Array.isArray(data.bcc) ? data.bcc.join(', ') : data.bcc) : undefined,
        subject: data.subject,
        text: data.text,
        html: data.html,
        attachments: data.attachments,
      };

      logger.info(`Sending email to ${mailOptions.to}: ${data.subject}`);

      const result = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent successfully, Message ID: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
      };

    } catch (error: any) {
      logger.error('Email sending error:', error);
      
      return {
        success: false,
        error: error.message || 'Email sending failed',
      };
    }
  }

  // Send bulk emails
  static async sendBulkEmails(emails: EmailData[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{ success: boolean; messageId?: string; error?: string }>;
  }> {
    let successful = 0;
    let failed = 0;
    const results: Array<{ success: boolean; messageId?: string; error?: string }> = [];

    for (const emailData of emails) {
      try {
        const result = await this.sendEmail(emailData);
        results.push(result);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        // Add small delay to avoid overwhelming the SMTP server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        results.push({
          success: false,
          error: error.message || 'Unknown error'
        });
        failed++;
      }
    }

    logger.info(`Bulk email completed: ${successful} successful, ${failed} failed`);

    return {
      successful,
      failed,
      results
    };
  }

  // Email template generators
  static generateViolationNotificationEmail(data: {
    recipientName: string;
    plateNumber: string;
    violationType: string;
    fineAmount: number;
    ticketNumber: string;
    dueDate: string;
    paymentUrl: string;
  }): EmailTemplate {
    const subject = `Traffic Violation Notice - ${data.plateNumber}`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Traffic Violation Notice</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .violation-details { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #d32f2f; }
            .btn { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚨 Traffic Violation Notice</h1>
            <p>Federal Road Safety Corps (FRSC)</p>
        </div>
        
        <div class="content">
            <p>Dear ${data.recipientName},</p>
            
            <p>This is to notify you that a traffic violation has been recorded for vehicle with plate number <strong>${data.plateNumber}</strong>.</p>
            
            <div class="violation-details">
                <h3>Violation Details:</h3>
                <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
                <p><strong>Violation Type:</strong> ${data.violationType}</p>
                <p><strong>Plate Number:</strong> ${data.plateNumber}</p>
                <p><strong>Fine Amount:</strong> <span class="amount">₦${data.fineAmount.toLocaleString()}</span></p>
                <p><strong>Due Date:</strong> ${data.dueDate}</p>
            </div>
            
            <p>To avoid additional penalties, please pay your fine before the due date.</p>
            
            <div style="text-align: center;">
                <a href="${data.paymentUrl}" class="btn">Pay Fine Now</a>
            </div>
            
            <p><strong>Important Notes:</strong></p>
            <ul>
                <li>Late payment may attract additional charges</li>
                <li>Failure to pay may result in license suspension</li>
                <li>You have the right to contest this violation within 30 days</li>
            </ul>
            
            <p>For inquiries, contact FRSC Customer Service or visit any FRSC office.</p>
            
            <p>Best regards,<br>
            Federal Road Safety Corps<br>
            Digital Violation Management System</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from DRSVMS. Please do not reply to this email.</p>
            <p>© 2024 Federal Road Safety Corps. All rights reserved.</p>
        </div>
    </body>
    </html>
    `;

    const text = `
Traffic Violation Notice - ${data.plateNumber}

Dear ${data.recipientName},

This is to notify you that a traffic violation has been recorded for vehicle with plate number ${data.plateNumber}.

Violation Details:
- Ticket Number: ${data.ticketNumber}
- Violation Type: ${data.violationType}
- Fine Amount: ₦${data.fineAmount.toLocaleString()}
- Due Date: ${data.dueDate}

To pay your fine, visit: ${data.paymentUrl}

Important: Late payment may attract additional charges and may result in license suspension.

For inquiries, contact FRSC Customer Service.

Federal Road Safety Corps
Digital Violation Management System
    `;

    return { subject, html, text };
  }

  static generatePaymentConfirmationEmail(data: {
    recipientName: string;
    paymentReference: string;
    totalAmount: number;
    paymentDate: string;
    violations: Array<{
      ticketNumber: string;
      plateNumber: string;
      violationType: string;
      amount: number;
    }>;
    receiptUrl: string;
  }): EmailTemplate {
    const subject = `Payment Confirmation - ${data.paymentReference}`;
    
    const violationsList = data.violations.map(v => `
      <tr>
        <td>${v.ticketNumber}</td>
        <td>${v.plateNumber}</td>
        <td>${v.violationType}</td>
        <td>₦${v.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .payment-details { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #4CAF50; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .btn { display: inline-block; background-color: #2196F3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>✅ Payment Successful</h1>
            <p>Federal Road Safety Corps (FRSC)</p>
        </div>
        
        <div class="content">
            <p>Dear ${data.recipientName},</p>
            
            <p>Thank you for your payment. Your traffic violation fine(s) have been successfully paid.</p>
            
            <div class="payment-details">
                <h3>Payment Details:</h3>
                <p><strong>Payment Reference:</strong> ${data.paymentReference}</p>
                <p><strong>Payment Date:</strong> ${data.paymentDate}</p>
                <p><strong>Total Amount Paid:</strong> <span class="amount">₦${data.totalAmount.toLocaleString()}</span></p>
                <p><strong>Payment Status:</strong> <span style="color: #4CAF50; font-weight: bold;">SUCCESSFUL</span></p>
            </div>
            
            <h3>Violations Paid:</h3>
            <table>
                <thead>
                    <tr>
                        <th>Ticket Number</th>
                        <th>Plate Number</th>
                        <th>Violation Type</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${violationsList}
                </tbody>
            </table>
            
            <div style="text-align: center;">
                <a href="${data.receiptUrl}" class="btn">Download Receipt</a>
            </div>
            
            <p><strong>Important Notes:</strong></p>
            <ul>
                <li>Keep this confirmation for your records</li>
                <li>Your payment has been processed and the violation(s) are now cleared</li>
                <li>Drive safely and obey traffic rules</li>
            </ul>
            
            <p>Thank you for your compliance with traffic regulations.</p>
            
            <p>Best regards,<br>
            Federal Road Safety Corps<br>
            Digital Violation Management System</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from DRSVMS. Please do not reply to this email.</p>
            <p>© 2024 Federal Road Safety Corps. All rights reserved.</p>
        </div>
    </body>
    </html>
    `;

    const text = `
Payment Confirmation - ${data.paymentReference}

Dear ${data.recipientName},

Thank you for your payment. Your traffic violation fine(s) have been successfully paid.

Payment Details:
- Payment Reference: ${data.paymentReference}
- Payment Date: ${data.paymentDate}
- Total Amount: ₦${data.totalAmount.toLocaleString()}
- Status: SUCCESSFUL

Violations Paid:
${data.violations.map(v => 
  `- ${v.ticketNumber}: ${v.violationType} (₦${v.amount.toLocaleString()})`
).join('\n')}

Download your receipt: ${data.receiptUrl}

Keep this confirmation for your records.

Federal Road Safety Corps
Digital Violation Management System
    `;

    return { subject, html, text };
  }

  static generatePasswordResetEmail(data: {
    recipientName: string;
    resetToken: string;
    resetUrl: string;
    expiresIn: string;
  }): EmailTemplate {
    const subject = 'Password Reset - DRSVMS Account';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .reset-details { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .btn { display: inline-block; background-color: #2196F3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .token { font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 3px; font-size: 18px; letter-spacing: 2px; }
            .warning { color: #d32f2f; font-weight: bold; }
            .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔐 Password Reset Request</h1>
            <p>DRSVMS - Digital Road Safety System</p>
        </div>
        
        <div class="content">
            <p>Dear ${data.recipientName},</p>
            
            <p>You have requested to reset your password for your DRSVMS account.</p>
            
            <div class="reset-details">
                <h3>Reset Instructions:</h3>
                <p>Click the button below to reset your password:</p>
                
                <div style="text-align: center;">
                    <a href="${data.resetUrl}" class="btn">Reset Password</a>
                </div>
                
                <p>Or use this reset token manually:</p>
                <div class="token">${data.resetToken}</div>
                
                <p class="warning">⚠️ This link will expire in ${data.expiresIn}</p>
            </div>
            
            <p><strong>Security Notes:</strong></p>
            <ul>
                <li>This reset link can only be used once</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share your reset token with anyone</li>
                <li>Contact IT support if you have concerns</li>
            </ul>
            
            <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.resetUrl}</p>
            
            <p>Best regards,<br>
            DRSVMS System Administrator</p>
        </div>
        
        <div class="footer">
            <p>This is an automated security message. Please do not reply to this email.</p>
            <p>© 2024 Federal Road Safety Corps. All rights reserved.</p>
        </div>
    </body>
    </html>
    `;

    const text = `
Password Reset Request - DRSVMS

Dear ${data.recipientName},

You have requested to reset your password for your DRSVMS account.

Reset Token: ${data.resetToken}
Reset URL: ${data.resetUrl}

This link will expire in ${data.expiresIn}.

If you didn't request this reset, please ignore this email.

DRSVMS System Administrator
    `;

    return { subject, html, text };
  }
}