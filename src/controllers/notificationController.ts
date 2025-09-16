import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';
import { SMSService } from '../services/notification/smsService';
import { EmailService } from '../services/notification/emailService';
import { logger } from '../utils/logger';

export class NotificationController {
  // POST /api/v1/notifications/send
  static async sendNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { recipient, type, data, channels } = req.body;

      const result = await NotificationService.sendNotification({
        recipient,
        type,
        data,
        channels
      });

      logger.info(`Notification sent by ${req.user!.employeeId}: ${type} to ${recipient.name}`);

      res.status(200).json({
        status: 'success',
        message: 'Notification sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/notifications/sms/send
  static async sendSMS(req: Request, res: Response, next: NextFunction) {
    try {
      const { to, message, type, channel } = req.body;

      const result = await SMSService.sendSMS({
        to,
        message,
        type,
        channel
      });

      logger.info(`SMS sent by ${req.user!.employeeId} to ${to}`);

      res.status(200).json({
        status: 'success',
        message: 'SMS sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/notifications/email/send
  static async sendEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { to, subject, html, text, attachments } = req.body;

      const result = await EmailService.sendEmail({
        to,
        subject,
        html,
        text,
        attachments
      });

      logger.info(`Email sent by ${req.user!.employeeId} to ${to}: ${subject}`);

      res.status(200).json({
        status: 'success',
        message: 'Email sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/notifications/bulk/sms
  static async sendBulkSMS(req: Request, res: Response, next: NextFunction) {
    try {
      const { to, message, type, channel } = req.body;

      if (!Array.isArray(to) || to.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Recipients array is required and must not be empty',
        });
      }

      if (to.length > 1000) {
        return res.status(400).json({
          status: 'error',
          message: 'Maximum 1000 recipients per bulk SMS',
        });
      }

      const result = await SMSService.sendBulkSMS({
        to,
        message,
        type,
        channel
      });

      logger.info(`Bulk SMS sent by ${req.user!.employeeId}: ${result.successful} successful, ${result.failed} failed`);

      res.status(200).json({
        status: 'success',
        message: `Bulk SMS completed: ${result.successful} successful, ${result.failed} failed`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/notifications/bulk/email
  static async sendBulkEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { emails } = req.body;

      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Emails array is required and must not be empty',
        });
      }

      if (emails.length > 500) {
        return res.status(400).json({
          status: 'error',
          message: 'Maximum 500 emails per bulk send',
        });
      }

      const result = await EmailService.sendBulkEmails(emails);

      logger.info(`Bulk email sent by ${req.user!.employeeId}: ${result.successful} successful, ${result.failed} failed`);

      res.status(200).json({
        status: 'success',
        message: `Bulk email completed: ${result.successful} successful, ${result.failed} failed`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/notifications/sms/balance
  static async getSMSBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const balance = await SMSService.checkBalance();

      res.status(200).json({
        status: 'success',
        data: { balance },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/notifications/health
  static async checkHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const health = await NotificationService.checkServiceHealth();

      res.status(200).json({
        status: 'success',
        message: 'Notification services health check completed',
        data: { health },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/notifications/officers/broadcast
  static async broadcastToOfficers(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, targetStates, targetZones, targetRoles } = req.body;

      const targetCriteria = {
        states: targetStates,
        zones: targetZones,
        roles: targetRoles
      };

      await NotificationService.notifyOfficers(message, targetCriteria);

      logger.info(`Officer broadcast sent by ${req.user!.employeeId}: ${message.substring(0, 50)}...`);

      res.status(200).json({
        status: 'success',
        message: 'Broadcast sent to officers successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/notifications/reminders/send
  static async sendPaymentReminders(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationService.sendPaymentReminders();

      logger.info(`Payment reminders triggered by ${req.user!.employeeId}`);

      res.status(200).json({
        status: 'success',
        message: 'Payment reminders sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}