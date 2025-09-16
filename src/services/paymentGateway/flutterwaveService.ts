import axios from 'axios';
import crypto from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

// Flutterwave configuration
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY!;
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY!;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

export interface FlutterwaveInitializeData {
  email: string;
  phone_number?: string;
  name: string;
  amount: number;
  currency: string;
  tx_ref: string;
  redirect_url?: string;
  meta?: {
    violationId: number;
    plateNumber: string;
  };
}

export class FlutterwaveService {
  private static headers = {
    'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  // Initialize payment
  static async initializePayment(data: FlutterwaveInitializeData): Promise<any> {
    try {
      if (!FLUTTERWAVE_SECRET_KEY) {
        throw createError('Flutterwave secret key not configured', 500);
      }

      const payload = {
        ...data,
        tx_ref: data.tx_ref || `DRSVMS_${uuidv4().replace(/-/g, '').toUpperCase()}`,
        redirect_url: data.redirect_url || `${process.env.APP_URL}/payment/callback`,
        customizations: {
          title: 'DRSVMS Payment',
          description: 'Traffic Violation Fine Payment',
          logo: `${process.env.APP_URL}/logo.png`
        }
      };

      logger.info(`Initializing Flutterwave payment: ${payload.tx_ref} - ₦${data.amount}`);

      const response = await axios.post(
        `${FLUTTERWAVE_BASE_URL}/payments`,
        payload,
        { headers: this.headers }
      );

      if (response.data.status === 'success') {
        logger.info(`Flutterwave payment initialized successfully: ${payload.tx_ref}`);
        return response.data;
      } else {
        throw createError(`Flutterwave initialization failed: ${response.data.message}`, 400);
      }

    } catch (error: any) {
      logger.error('Flutterwave initialization error:', error);
      throw error.response?.data ? createError(`Flutterwave error: ${error.response.data.message}`, error.response.status) : createError('Payment initialization failed', 500);
    }
  }

  // Verify payment
  static async verifyPayment(transactionId: string): Promise<any> {
    try {
      logger.info(`Verifying Flutterwave payment: ${transactionId}`);

      const response = await axios.get(
        `${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`,
        { headers: this.headers }
      );

      if (response.data.status === 'success') {
        logger.info(`Flutterwave payment verification successful: ${transactionId}`);
        return response.data;
      } else {
        throw createError(`Flutterwave verification failed: ${response.data.message}`, 400);
      }

    } catch (error: any) {
      logger.error('Flutterwave verification error:', error);
      throw error.response?.data ? createError(`Flutterwave error: ${error.response.data.message}`, error.response.status) : createError('Payment verification failed', 500);
    }
  }

  // Verify webhook signature
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto.HmacSHA256(payload, FLUTTERWAVE_SECRET_KEY).toString();
      return expectedSignature === signature;
    } catch (error) {
      logger.error('Flutterwave webhook signature verification error:', error);
      return false;
    }
  }
}