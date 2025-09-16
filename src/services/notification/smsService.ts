import axios from 'axios';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

// Nigerian SMS service configuration
const TERMII_API_KEY = process.env.TERMII_API_KEY!;
const TERMII_BASE_URL = 'https://api.ng.termii.com/api';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'DRSVMS';

export interface SMSData {
  to: string;
  message: string;
  type?: 'plain' | 'unicode';
  channel?: 'dnd' | 'WhatsApp' | 'generic';
}

export interface BulkSMSData {
  to: string[];
  message: string;
  type?: 'plain' | 'unicode';
  channel?: 'dnd' | 'WhatsApp' | 'generic';
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  balance?: number;
  error?: string;
  details?: any;
}

export class SMSService {
  // Send single SMS
  static async sendSMS(data: SMSData): Promise<SMSResponse> {
    try {
      if (!TERMII_API_KEY) {
        throw createError('SMS API key not configured', 500);
      }

      // Normalize phone number to Nigerian format
      const phoneNumber = this.normalizePhoneNumber(data.to);
      
      if (!this.isValidNigerianNumber(phoneNumber)) {
        throw createError('Invalid Nigerian phone number format', 400);
      }

      const payload = {
        to: phoneNumber,
        from: SMS_SENDER_ID,
        sms: data.message,
        type: data.type || 'plain',
        channel: data.channel || 'dnd',
        api_key: TERMII_API_KEY,
      };

      logger.info(`Sending SMS to ${phoneNumber}: ${data.message.substring(0, 50)}...`);

      const response = await axios.post(`${TERMII_BASE_URL}/sms/send`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.data.code === 'ok') {
        logger.info(`SMS sent successfully to ${phoneNumber}, Message ID: ${response.data.message_id}`);
        
        return {
          success: true,
          messageId: response.data.message_id,
          balance: response.data.balance,
          details: response.data
        };
      } else {
        throw createError(`SMS sending failed: ${response.data.message}`, 400);
      }

    } catch (error: any) {
      logger.error('SMS sending error:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.message || 'SMS sending failed',
          details: error.response.data
        };
      }
      
      return {
        success: false,
        error: error.message || 'SMS sending failed'
      };
    }
  }

  // Send bulk SMS
  static async sendBulkSMS(data: BulkSMSData): Promise<{
    successful: number;
    failed: number;
    results: SMSResponse[];
  }> {
    let successful = 0;
    let failed = 0;
    const results: SMSResponse[] = [];

    // Process in batches to avoid overwhelming the API
    const batchSize = 100;
    for (let i = 0; i < data.to.length; i += batchSize) {
      const batch = data.to.slice(i, i + batchSize);
      
      const batchPromises = batch.map(phoneNumber => 
        this.sendSMS({
          to: phoneNumber,
          message: data.message,
          type: data.type,
          channel: data.channel
        })
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) {
            successful++;
          } else {
            failed++;
          }
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error'
          });
          failed++;
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < data.to.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info(`Bulk SMS completed: ${successful} successful, ${failed} failed`);

    return {
      successful,
      failed,
      results
    };
  }

  // Send OTP SMS
  static async sendOTP(phoneNumber: string, otp: string): Promise<SMSResponse> {
    const message = `Your DRSVMS verification code is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;
    
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: 'plain',
      channel: 'dnd'
    });
  }

  // Check SMS balance
  static async checkBalance(): Promise<{ balance: number; currency: string }> {
    try {
      if (!TERMII_API_KEY) {
        throw createError('SMS API key not configured', 500);
      }

      const response = await axios.get(`${TERMII_BASE_URL}/get-balance`, {
        params: { api_key: TERMII_API_KEY },
        timeout: 10000,
      });

      return {
        balance: parseFloat(response.data.balance),
        currency: response.data.currency || 'NGN'
      };

    } catch (error: any) {
      logger.error('Balance check error:', error);
      throw error.response?.data ? 
        createError(`Balance check failed: ${error.response.data.message}`, 400) : 
        createError('Balance check failed', 500);
    }
  }

  // Normalize Nigerian phone number
  private static normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different Nigerian number formats
    if (cleaned.startsWith('234')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+234${cleaned.substring(1)}`;
    } else if (cleaned.length === 10) {
      return `+234${cleaned}`;
    } else {
      return `+234${cleaned}`;
    }
  }

  // Validate Nigerian phone number
  private static isValidNigerianNumber(phoneNumber: string): boolean {
    // Nigerian phone numbers: +234XXXXXXXXXX (14 characters total)
    const nigerianRegex = /^\+234[0-9]{10}$/;
    return nigerianRegex.test(phoneNumber);
  }

  // Get SMS delivery report
  static async getDeliveryReport(messageId: string): Promise<any> {
    try {
      const response = await axios.get(`${TERMII_BASE_URL}/sms/inbox`, {
        params: {
          api_key: TERMII_API_KEY,
          message_id: messageId
        }
      });

      return response.data;

    } catch (error: any) {
      logger.error('Delivery report error:', error);
      throw createError('Failed to get delivery report', 500);
    }
  }
}