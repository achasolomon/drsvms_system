import { SMSService } from './notification/smsService';
import { EmailService } from './notification/emailService';
import { VehicleOwner, Violation, Payment, User } from '../models';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

export interface NotificationData {
  recipient: {
    name: string;
    email?: string;
    phone?: string;
  };
  type: 'violation_created' | 'payment_reminder' | 'payment_confirmed' | 'license_suspended' | 'password_reset' | 'officer_notification';
  data: any;
  channels: ('sms' | 'email')[];
}

export interface NotificationTemplate {
  sms?: {
    message: string;
  };
  email?: {
    subject: string;
    html: string;
    text?: string;
  };
}

export class NotificationService {
  // Initialize notification services
  static async initialize(): Promise<void> {
    try {
      await EmailService.initialize();
      logger.info('Notification services initialized successfully');
    } catch (error) {
      logger.error('Notification services initialization failed:', error);
    }
  }

  // Send notification through specified channels
  static async sendNotification(notificationData: NotificationData): Promise<{
    sms?: { success: boolean; error?: string };
    email?: { success: boolean; error?: string };
  }> {
    const results: any = {};

    try {
      const template = this.getNotificationTemplate(notificationData);

      // Send SMS if requested and phone number available
      if (notificationData.channels.includes('sms') && notificationData.recipient.phone && template.sms) {
        try {
          const smsResult = await SMSService.sendSMS({
            to: notificationData.recipient.phone,
            message: template.sms.message
          });
          
          results.sms = {
            success: smsResult.success,
            error: smsResult.error
          };

          logger.info(`SMS notification sent: ${notificationData.type} to ${notificationData.recipient.phone}`);
        } catch (error: any) {
          results.sms = {
            success: false,
            error: error.message
          };
          logger.error('SMS notification failed:', error);
        }
      }

      // Send email if requested and email available
      if (notificationData.channels.includes('email') && notificationData.recipient.email && template.email) {
        try {
          const emailResult = await EmailService.sendEmail({
            to: notificationData.recipient.email,
            subject: template.email.subject,
            html: template.email.html,
            text: template.email.text
          });
          
          results.email = {
            success: emailResult.success,
            error: emailResult.error
          };

          logger.info(`Email notification sent: ${notificationData.type} to ${notificationData.recipient.email}`);
        } catch (error: any) {
          results.email = {
            success: false,
            error: error.message
          };
          logger.error('Email notification failed:', error);
        }
      }

      return results;

    } catch (error: any) {
      logger.error('Notification sending failed:', error);
      return {
        sms: { success: false, error: error.message },
        email: { success: false, error: error.message }
      };
    }
  }

  // Get notification template based on type and data
  private static getNotificationTemplate(notificationData: NotificationData): NotificationTemplate {
    const { type, data, recipient } = notificationData;

    switch (type) {
      case 'violation_created':
        return {
          sms: {
            message: `FRSC Alert: Traffic violation recorded for ${data.plateNumber}. Ticket: ${data.ticketNumber}. Fine: ₦${data.fineAmount}. Pay before ${data.dueDate} to avoid penalties. Visit: ${process.env.APP_URL}/pay/${data.ticketNumber}`
          },
          email: EmailService.generateViolationNotificationEmail({
            recipientName: recipient.name,
            plateNumber: data.plateNumber,
            violationType: data.violationType,
            fineAmount: data.fineAmount,
            ticketNumber: data.ticketNumber,
            dueDate: data.dueDate,
            paymentUrl: `${process.env.APP_URL}/pay/${data.ticketNumber}`
          })
        };

      case 'payment_reminder':
        return {
          sms: {
            message: `FRSC Reminder: Your traffic fine for ${data.plateNumber} (₦${data.fineAmount}) is due in ${data.daysRemaining} days. Ticket: ${data.ticketNumber}. Pay now: ${process.env.APP_URL}/pay/${data.ticketNumber}`
          },
          email: {
            subject: `Payment Reminder - Traffic Fine Due Soon`,
            html: this.generatePaymentReminderHTML(data, recipient.name),
            text: `Dear ${recipient.name}, your traffic fine for ${data.plateNumber} (₦${data.fineAmount}) is due in ${data.daysRemaining} days. Pay now to avoid penalties.`
          }
        };

      case 'payment_confirmed':
        return {
          sms: {
            message: `FRSC: Payment confirmed! ₦${data.totalAmount} paid for ${data.violations.length} violation(s). Reference: ${data.paymentReference}. Thank you for your compliance.`
          },
          email: EmailService.generatePaymentConfirmationEmail({
            recipientName: recipient.name,
            paymentReference: data.paymentReference,
            totalAmount: data.totalAmount,
            paymentDate: data.paymentDate,
            violations: data.violations,
            receiptUrl: `${process.env.APP_URL}/receipt/${data.paymentReference}`
          })
        };

      case 'license_suspended':
        return {
          sms: {
            message: `FRSC URGENT: Your driving license has been SUSPENDED due to accumulated violation points. Contact nearest FRSC office immediately for reinstatement process.`
          },
          email: {
            subject: `URGENT: Driving License Suspended - Action Required`,
            html: this.generateLicenseSuspensionHTML(data, recipient.name),
            text: `URGENT: Your driving license has been suspended due to accumulated violation points (${data.totalPoints}). Contact FRSC office for reinstatement.`
          }
        };

      case 'password_reset':
        return {
          email: EmailService.generatePasswordResetEmail({
            recipientName: recipient.name,
            resetToken: data.resetToken,
            resetUrl: data.resetUrl,
            expiresIn: data.expiresIn
          })
        };

      case 'officer_notification':
        return {
          sms: {
            message: `DRSVMS: ${data.message}`
          },
          email: {
            subject: data.subject || 'DRSVMS Notification',
            html: this.generateOfficerNotificationHTML(data, recipient.name),
            text: data.message
          }
        };

      default:
        return {};
    }
  }

  // Helper method to generate payment reminder HTML
  private static generatePaymentReminderHTML(data: any, recipientName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .warning { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ff9800; }
        .btn { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Payment Reminder</h1>
        <p>Federal Road Safety Corps (FRSC)</p>
    </div>
    
    <div class="content">
        <p>Dear ${recipientName},</p>
        
        <p>This is a friendly reminder that your traffic fine is due soon.</p>
        
        <div class="warning">
            <h3>Payment Details:</h3>
            <p><strong>Plate Number:</strong> ${data.plateNumber}</p>
            <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
            <p><strong>Fine Amount:</strong> ₦${data.fineAmount.toLocaleString()}</p>
            <p><strong>Days Remaining:</strong> ${data.daysRemaining} days</p>
        </div>
        
        <div style="text-align: center;">
            <a href="${process.env.APP_URL}/pay/${data.ticketNumber}" class="btn">Pay Now</a>
        </div>
        
        <p>Please pay before the due date to avoid additional penalties.</p>
    </div>
    
    <div class="footer">
        <p>© 2024 Federal Road Safety Corps. All rights reserved.</p>
    </div>
</body>
</html>
`;
  }

  // Helper method to generate license suspension HTML
  private static generateLicenseSuspensionHTML(data: any, recipientName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>License Suspended</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .alert { background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #d32f2f; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>License Suspension Notice</h1>
        <p>Federal Road Safety Corps (FRSC)</p>
    </div>
    
    <div class="content">
        <p>Dear ${recipientName},</p>
        
        <div class="alert">
            <h2>URGENT: Your driving license has been SUSPENDED</h2>
            <p><strong>Reason:</strong> Accumulated violation points (${data.totalPoints} points)</p>
            <p><strong>Effective Date:</strong> ${data.suspensionDate}</p>
        </div>
        
        <p><strong>What this means:</strong></p>
        <ul>
            <li>You are prohibited from driving any motor vehicle</li>
            <li>Driving with a suspended license is a serious offense</li>
            <li>You must complete the reinstatement process before driving again</li>
        </ul>
        
        <p><strong>Reinstatement Requirements:</strong></p>
        <ul>
            <li>Pay all outstanding fines</li>
            <li>Complete mandatory driver education course</li>
            <li>Pass reinstatement assessment</li>
            <li>Pay reinstatement fee</li>
        </ul>
        
        <p>Contact your nearest FRSC office immediately to begin the reinstatement process.</p>
    </div>
    
    <div class="footer">
        <p>© 2024 Federal Road Safety Corps. All rights reserved.</p>
    </div>
</body>
</html>
`;
  }

  // Helper method to generate officer notification HTML
  private static generateOfficerNotificationHTML(data: any, recipientName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DRSVMS Notification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>DRSVMS Notification</h1>
        <p>Digital Road Safety Violation Management System</p>
    </div>
    
    <div class="content">
        <p>Dear ${recipientName},</p>
        <p>${data.message}</p>
        <p>Best regards,<br>DRSVMS System</p>
    </div>
    
    <div class="footer">
        <p>© 2024 Federal Road Safety Corps. All rights reserved.</p>
    </div>
</body>
</html>
`;
  }

  // Send payment confirmation notification
  static async notifyPaymentConfirmed(payments: Payment[]): Promise<void> {
    try {
      // Get the first payment to extract common data
      const firstPayment = payments[0];
      const violations = payments.map(p => ({
        ticketNumber: p.violation?.ticketNumber || 'N/A',
        plateNumber: p.violation?.plateNumber || 'N/A',
        violationType: 'Traffic Violation',
        amount: p.amount
      }));

      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

      await this.sendNotification({
        recipient: {
          name: firstPayment.payerName || 'Valued Customer',
          email: firstPayment.payerEmail || undefined,
          phone: firstPayment.payerPhone || undefined
        },
        type: 'payment_confirmed',
        data: {
          paymentReference: firstPayment.paymentReference,
          totalAmount,
          paymentDate: firstPayment.paymentDate?.toLocaleDateString() || new Date().toLocaleDateString(),
          violations
        },
        channels: ['sms', 'email']
      });
    } catch (error) {
      logger.error('Failed to send payment confirmation:', error);
    }
  }

  // Send payment reminders for due violations
  static async sendPaymentReminders(): Promise<void> {
    try {
      const reminderDays = [7, 3, 1]; // Send reminders 7, 3, and 1 days before due

      for (const days of reminderDays) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        
        const violations = await Violation.findAll({
          where: {
            status: 'pending',
            dueDate: {
              [Op.gte]: new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()),
              [Op.lt]: new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() + 1)
            }
          },
          include: [{
            model: VehicleOwner,
            as: 'vehicleOwner',
            where: {
              [Op.or]: [
                { email: { [Op.ne]: null } },
                { phone: { [Op.ne]: null } }
              ]
            }
          }]
        });

        for (const violation of violations) {
          if (violation.vehicleOwner) {
            await this.sendNotification({
              recipient: {
                name: violation.vehicleOwner.fullName,
                email: violation.vehicleOwner.email || undefined,
                phone: violation.vehicleOwner.phone || undefined
              },
              type: 'payment_reminder',
              data: {
                plateNumber: violation.plateNumber,
                ticketNumber: violation.ticketNumber,
                fineAmount: violation.fineAmount,
                daysRemaining: days
              },
              channels: ['sms', 'email']
            });
          }
        }
      }

      logger.info('Payment reminders sent successfully');
    } catch (error) {
      logger.error('Failed to send payment reminders:', error);
    }
  }

  // Notify officers with broadcast message
  static async notifyOfficers(message: string, targetCriteria?: {
    states?: string[];
    zones?: string[];
    roles?: string[];
  }): Promise<void> {
    try {
      const whereClause: any = { status: 'active' };
      
      if (targetCriteria) {
        if (targetCriteria.states?.length) {
          whereClause.state = { [Op.in]: targetCriteria.states };
        }
        if (targetCriteria.zones?.length) {
          whereClause.zone = { [Op.in]: targetCriteria.zones };
        }
        if (targetCriteria.roles?.length) {
          whereClause.role = { [Op.in]: targetCriteria.roles };
        }
      }

      const officers = await User.findAll({
        where: whereClause,
        attributes: ['fullName', 'email', 'phone']
      });

      for (const officer of officers) {
        await this.sendNotification({
          recipient: {
            name: officer.fullName,
            email: officer.email || undefined,
            phone: officer.phone || undefined
          },
          type: 'officer_notification',
          data: {
            message,
            subject: 'DRSVMS Officer Notification'
          },
          channels: ['sms', 'email']
        });
      }

      logger.info(`Officer notification sent to ${officers.length} officers`);
    } catch (error) {
      logger.error('Failed to send officer notifications:', error);
    }
  }

  // Check health of notification services
  static async checkServiceHealth(): Promise<{
    sms: { available: boolean; balance?: number; error?: string };
    email: { available: boolean; error?: string };
  }> {
    const health = {
      sms: { available: false, error: undefined as string | undefined, balance: undefined as number | undefined },
      email: { available: false, error: undefined as string | undefined }
    };

    // Check SMS service
    try {
      const balance = await SMSService.checkBalance();
      health.sms.available = true;
      health.sms.balance = balance.balance;
    } catch (error: any) {
      health.sms.error = error.message;
    }

    // Check Email service
    try {
      // Try to initialize email service to check if it's working
      await EmailService.initialize();
      health.email.available = true;
    } catch (error: any) {
      health.email.error = error.message;
    }

    return health;
  }
}