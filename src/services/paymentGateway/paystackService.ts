import axios from 'axios';
import crypto from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY!;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackInitializeData {
  email: string;
  amount: number; // In kobo (₦1 = 100 kobo)
  reference?: string;
  callback_url?: string;
  metadata?: {
    violationId: number;
    plateNumber: string;
    payerName?: string;
    payerPhone?: string;
  };
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    fees: number;
    fees_split: any;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: any;
      risk_action: string;
    };
  };
}

export class PaystackService {
  private static headers = {
    'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  // Initialize payment transaction
  static async initializePayment(data: PaystackInitializeData): Promise<PaystackInitializeResponse> {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        throw createError('Paystack secret key not configured', 500);
      }

      // Generate reference if not provided
      if (!data.reference) {
        data.reference = `DRSVMS_${uuidv4().replace(/-/g, '').toUpperCase()}`;
      }

      const payload = {
        email: data.email,
        amount: data.amount,
        reference: data.reference,
        callback_url: data.callback_url || `${process.env.APP_URL}/payment/callback`,
        metadata: {
          ...data.metadata,
          source: 'DRSVMS',
          timestamp: new Date().toISOString()
        }
      };

      logger.info(`Initializing Paystack payment: ${data.reference} - ₦${data.amount / 100}`);

      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        payload,
        { headers: this.headers }
      );

      if (response.data.status) {
        logger.info(`Paystack payment initialized successfully: ${data.reference}`);
        return response.data;
      } else {
        throw createError(`Paystack initialization failed: ${response.data.message}`, 400);
      }

    } catch (error: any) {
      logger.error('Paystack initialization error:', error);
      
      if (error.response?.data) {
        throw createError(`Paystack error: ${error.response.data.message}`, error.response.status);
      }
      
      throw error.isOperational ? error : createError('Payment initialization failed', 500);
    }
  }

  // Verify payment transaction
  static async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        throw createError('Paystack secret key not configured', 500);
      }

      logger.info(`Verifying Paystack payment: ${reference}`);

      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers: this.headers }
      );

      if (response.data.status) {
        logger.info(`Paystack payment verification successful: ${reference} - Status: ${response.data.data.status}`);
        return response.data;
      } else {
        throw createError(`Paystack verification failed: ${response.data.message}`, 400);
      }

    } catch (error: any) {
      logger.error('Paystack verification error:', error);
      
      if (error.response?.data) {
        throw createError(`Paystack error: ${error.response.data.message}`, error.response.status);
      }
      
      throw error.isOperational ? error : createError('Payment verification failed', 500);
    }
  }

  // List transactions
  static async listTransactions(params?: {
    perPage?: number;
    page?: number;
    customer?: string;
    status?: 'failed' | 'success' | 'abandoned';
    from?: string;
    to?: string;
    amount?: number;
  }): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.perPage) queryParams.append('perPage', params.perPage.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.customer) queryParams.append('customer', params.customer);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.from) queryParams.append('from', params.from);
      if (params?.to) queryParams.append('to', params.to);
      if (params?.amount) queryParams.append('amount', params.amount.toString());

      const url = `${PAYSTACK_BASE_URL}/transaction${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

      const response = await axios.get(url, { headers: this.headers });

      return response.data;

    } catch (error: any) {
      logger.error('Paystack list transactions error:', error);
      throw error.response?.data ? createError(`Paystack error: ${error.response.data.message}`, error.response.status) : createError('Failed to list transactions', 500);
    }
  }

  // Refund transaction
  static async refundTransaction(transactionId: string, amount?: number): Promise<any> {
    try {
      const payload: any = {
        transaction: transactionId
      };

      if (amount) {
        payload.amount = amount;
      }

      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/refund`,
        payload,
        { headers: this.headers }
      );

      if (response.data.status) {
        logger.info(`Paystack refund initiated: ${transactionId}`);
        return response.data;
      } else {
        throw createError(`Paystack refund failed: ${response.data.message}`, 400);
      }

    } catch (error: any) {
      logger.error('Paystack refund error:', error);
      throw error.response?.data ? createError(`Paystack error: ${error.response.data.message}`, error.response.status) : createError('Refund failed', 500);
    }
  }

  // Verify webhook signature
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto.HmacSHA512(payload, PAYSTACK_SECRET_KEY).toString();
      return expectedSignature === signature;
    } catch (error) {
      logger.error('Webhook signature verification error:', error);
      return false;
    }
  }

  // Get supported banks
  static async getBanks(country: string = 'nigeria'): Promise<any> {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank?country=${country}`,
        { headers: this.headers }
      );

      return response.data;

    } catch (error: any) {
      logger.error('Get banks error:', error);
      throw error.response?.data ? createError(`Paystack error: ${error.response.data.message}`, error.response.status) : createError('Failed to get banks', 500);
    }
  }

  // Resolve bank account
  static async resolveAccountNumber(accountNumber: string, bankCode: string): Promise<any> {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: this.headers }
      );

      return response.data;

    } catch (error: any) {
      logger.error('Resolve account error:', error);
      throw error.response?.data ? createError(`Paystack error: ${error.response.data.message}`, error.response.status) : createError('Failed to resolve account', 500);
    }
  }
}