import { Transaction, Op } from 'sequelize';
import { Payment, Violation, VehicleOwner, ViolationType, sequelize } from '../models';
import { PaystackService } from './paymentGateway/paystackService';
import { FlutterwaveService } from './paymentGateway/flutterwaveService';
import { ViolationService } from './violationService';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface PaymentInitiationData {
    violationIds: number[];
    payerName: string;
    payerEmail: string;
    payerPhone?: string;
    paymentMethod: 'card' | 'bank_transfer' | 'ussd';
    gateway: 'paystack' | 'flutterwave';
    callbackUrl?: string;
}

export interface PaymentVerificationData {
    paymentReference: string;
    gateway: 'paystack' | 'flutterwave';
    gatewayReference?: string;
}

export interface PaymentSearchQuery {
    violationId?: number;
    paymentReference?: string;
    gatewayReference?: string;
    payerEmail?: string;
    status?: 'pending' | 'completed' | 'failed' | 'refunded';
    gateway?: 'paystack' | 'flutterwave' | 'interswitch';
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
}

export interface PaymentStatisticsQuery {
    startDate?: Date;
    endDate?: Date;
    gateway?: 'paystack' | 'flutterwave';
    status?: 'pending' | 'completed' | 'failed' | 'refunded';
}

export class PaymentService {
    // Initiate payment for violations
    static async initiatePayment(data: PaymentInitiationData): Promise<{
        paymentUrl: string;
        paymentReference: string;
        totalAmount: number;
        violations: any[];
    }> {
        const transaction = await sequelize.transaction();

        try {
            const { violationIds, payerName, payerEmail, payerPhone, paymentMethod, gateway, callbackUrl } = data;

            // Get violations and validate they can be paid
            const violations = await Violation.findAll({
                where: {
                    id: violationIds,
                    status: ['pending', 'partially_paid']
                },
                include: [{
                    model: VehicleOwner,
                    as: 'vehicleOwner',
                    attributes: ['plateNumber', 'fullName']
                }],
                transaction
            });

            if (violations.length !== violationIds.length) {
                throw createError('One or more violations cannot be paid or do not exist', 400);
            }

            // Calculate total amount
            const totalAmount = violations.reduce((sum: number, violation: any) => {
                return sum + Number(violation.fineAmount);
            }, 0);

            // Generate payment reference
            const paymentReference = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            // Create payment records
            const paymentPromises = violations.map((violation: any) =>
                Payment.create({
                    violationId: violation.id,
                    amount: violation.fineAmount,
                    paymentMethod,
                    paymentReference,
                    gatewayProvider: gateway,
                    payerName,
                    payerEmail,
                    payerPhone,
                    status: 'pending'
                }, { transaction })
            );

            await Promise.all(paymentPromises);

            let paymentUrl: string;

            // Initialize payment with selected gateway
            if (gateway === 'paystack') {
                const paystackResponse = await PaystackService.initializePayment({
                    email: payerEmail,
                    amount: totalAmount * 100, // Convert to kobo
                    reference: paymentReference,
                    callback_url: callbackUrl,
                    metadata: {
                        violationId: violations[0].id,
                        plateNumber: violations[0].vehicleOwnerId ? (await VehicleOwner.findByPk(violations[0].vehicleOwnerId))?.plateNumber || '' : '',
                        payerName,
                        payerPhone
                    }
                });

                paymentUrl = paystackResponse.data.authorization_url;

            } else if (gateway === 'flutterwave') {
                const flutterwaveResponse = await FlutterwaveService.initializePayment({
                    email: payerEmail,
                    phone_number: payerPhone,
                    name: payerName,
                    amount: totalAmount,
                    currency: 'NGN',
                    tx_ref: paymentReference,
                    redirect_url: callbackUrl,
                    meta: {
                        violationId: violations[0].id,
                        plateNumber: violations[0].vehicleOwnerId ? (await VehicleOwner.findByPk(violations[0].vehicleOwnerId))?.plateNumber || '' : '',
                    }
                });

                paymentUrl = flutterwaveResponse.data.link;

            } else {
                throw createError('Unsupported payment gateway', 400);
            }

            await transaction.commit();

            logger.info(`Payment initiated: ${paymentReference} - ₦${totalAmount} via ${gateway}`);

            return {
                paymentUrl,
                paymentReference,
                totalAmount,
                violations: violations.map((v: any) => ({
                    id: v.id,
                    ticketNumber: v.ticketNumber,
                    plateNumber: v.plateNumber,
                    fineAmount: v.fineAmount,
                    violationTypeId: v.violationTypeId
                }))
            };

        } catch (error) {
            await transaction.rollback();
            logger.error('Payment initiation failed:', error);
            throw error;
        }
    }

    // Verify and complete payment
    static async verifyPayment(data: PaymentVerificationData): Promise<{
        success: boolean;
        payments: Payment[];
        totalAmount: number;
    }> {
        const transaction = await sequelize.transaction();

        try {
            const { paymentReference, gateway, gatewayReference } = data;

            // Get pending payments with this reference
            const payments = await Payment.findAll({
                where: {
                    paymentReference,
                    status: 'pending'
                },
                include: [{
                    model: Violation,
                    as: 'violation',
                    include: [{
                        model: VehicleOwner,
                        as: 'vehicleOwner'
                    }]
                }],
                transaction
            });

            if (payments.length === 0) {
                throw createError('No pending payments found for this reference', 404);
            }

            let verificationResponse: any;
            let paymentSuccessful = false;
            let resolvedGatewayReference = '';

            // Verify with appropriate gateway
            if (gateway === 'paystack') {
                verificationResponse = await PaystackService.verifyPayment(paymentReference);
                paymentSuccessful = verificationResponse.data.status === 'success';
                resolvedGatewayReference = gatewayReference || verificationResponse.data.id?.toString() || '';

            } else if (gateway === 'flutterwave') {
                const transactionId = gatewayReference || paymentReference;
                verificationResponse = await FlutterwaveService.verifyPayment(transactionId);
                paymentSuccessful = verificationResponse.data.status === 'successful';
                resolvedGatewayReference = gatewayReference || verificationResponse.data.id?.toString() || '';

            } else {
                throw createError('Unsupported payment gateway', 400);
            }

            if (paymentSuccessful) {
                // Update payment records
                const updatePromises = payments.map(async (payment: any) => {
                    payment.status = 'completed';
                    payment.gatewayReference = resolvedGatewayReference;
                    payment.gatewayResponse = verificationResponse.data;
                    payment.paymentDate = new Date();

                    await payment.save({ transaction });

                    // Update violation status
                    if (payment.violation) {
                        payment.violation.status = 'paid';
                        payment.violation.paidDate = new Date();
                        await payment.violation.save({ transaction });
                    }

                    return payment;
                });

                const updatedPayments = await Promise.all(updatePromises);

                await transaction.commit();

                const totalAmount = updatedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

                logger.info(`Payment verified successfully: ${paymentReference} - ₦${totalAmount}`);

                return {
                    success: true,
                    payments: updatedPayments,
                    totalAmount
                };

            } else {
                // Payment failed
                const updatePromises = payments.map(async (payment: any) => {
                    payment.status = 'failed';
                    payment.gatewayResponse = verificationResponse.data;
                    await payment.save({ transaction });
                    return payment;
                });

                await Promise.all(updatePromises);
                await transaction.commit();

                logger.warn(`Payment verification failed: ${paymentReference}`);

                return {
                    success: false,
                    payments,
                    totalAmount: 0
                };
            }

        } catch (error) {
            await transaction.rollback();
            logger.error('Payment verification failed:', error);
            throw error;
        }
    }

    // Handle webhook notifications
    static async handleWebhook(
        gateway: 'paystack' | 'flutterwave',
        signature: string,
        payload: any
    ): Promise<void> {
        try {
            let isValidSignature = false;
            let paymentReference = '';
            let gatewayReference = '';

            if (gateway === 'paystack') {
                isValidSignature = PaystackService.verifyWebhookSignature(JSON.stringify(payload), signature);
                paymentReference = payload.data?.reference || '';
                gatewayReference = payload.data?.id?.toString() || '';

            } else if (gateway === 'flutterwave') {
                isValidSignature = FlutterwaveService.verifyWebhookSignature(JSON.stringify(payload), signature);
                paymentReference = payload.data?.tx_ref || '';
                gatewayReference = payload.data?.id?.toString() || '';
            }

            if (!isValidSignature) {
                throw createError('Invalid webhook signature', 400);
            }

            if (!paymentReference) {
                logger.warn('Webhook received without payment reference');
                return;
            }

            // Process the payment verification
            await this.verifyPayment({
                paymentReference,
                gateway,
                gatewayReference
            });

            logger.info(`Webhook processed successfully: ${gateway} - ${paymentReference}`);

        } catch (error) {
            logger.error('Webhook processing failed:', error);
            throw error;
        }
    }

    // Search payments
    static async searchPayments(query: PaymentSearchQuery): Promise<{
        payments: Payment[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
        summary: {
            totalAmount: number;
            completedAmount: number;
            pendingAmount: number;
            failedAmount: number;
        };
    }> {
        try {
            const {
                violationId,
                paymentReference,
                gatewayReference,
                payerEmail,
                status,
                gateway,
                startDate,
                endDate,
                page = 1,
                limit = 20
            } = query;

            const whereConditions: any = {};

            if (violationId) whereConditions.violationId = violationId;
            if (paymentReference) whereConditions.paymentReference = { [Op.like]: `%${paymentReference}%` };
            if (gatewayReference) whereConditions.gatewayReference = { [Op.like]: `%${gatewayReference}%` };
            if (payerEmail) whereConditions.payerEmail = { [Op.like]: `%${payerEmail}%` };
            if (status) whereConditions.status = status;
            if (gateway) whereConditions.gatewayProvider = gateway;

            if (startDate && endDate) {
                whereConditions.paymentDate = { [Op.between]: [startDate, endDate] };
            }

            const offset = (page - 1) * limit;

            const { count, rows } = await Payment.findAndCountAll({
                where: whereConditions,
                include: [{
                    model: Violation,
                    as: 'violation',
                    attributes: ['ticketNumber', 'plateNumber', 'fineAmount'],
                    include: [{
                        model: VehicleOwner,
                        as: 'vehicleOwner',
                        attributes: ['fullName', 'phone']
                    }]
                }],
                limit,
                offset,
                order: [['paymentDate', 'DESC']]
            });

            // Calculate summary
            const allPayments = await Payment.findAll({
                where: whereConditions,
                attributes: ['amount', 'status']
            });

            const summary = allPayments.reduce((acc: any, payment: any) => {
                acc.totalAmount += Number(payment.amount);
                switch (payment.status) {
                    case 'completed':
                        acc.completedAmount += Number(payment.amount);
                        break;
                    case 'pending':
                        acc.pendingAmount += Number(payment.amount);
                        break;
                    case 'failed':
                        acc.failedAmount += Number(payment.amount);
                        break;
                }
                return acc;
            }, {
                totalAmount: 0,
                completedAmount: 0,
                pendingAmount: 0,
                failedAmount: 0
            });

            const totalPages = Math.ceil(count / limit);

            return {
                payments: rows,
                totalCount: count,
                currentPage: page,
                totalPages,
                summary
            };

        } catch (error) {
            logger.error('Payment search failed:', error);
            throw createError('Failed to search payments', 500);
        }
    }

    // Process refund
    static async processRefund(
        paymentId: number,
        refundAmount: number,
        refundReason: string,
        processedBy: number
    ): Promise<Payment> {
        const transaction = await sequelize.transaction();

        try {
            const payment = await Payment.findByPk(paymentId, { transaction });

            if (!payment) {
                throw createError('Payment not found', 404);
            }

            if (payment.status !== 'completed') {
                throw createError('Only completed payments can be refunded', 400);
            }

            if (refundAmount > Number(payment.amount)) {
                throw createError('Refund amount cannot exceed payment amount', 400);
            }

            // Process refund with gateway
            let refundResponse: any;

            if (payment.gatewayProvider === 'paystack') {
                if (!payment.gatewayReference) {
                    throw createError('Gateway reference not found for this payment', 400);
                }
                refundResponse = await PaystackService.refundTransaction(
                    payment.gatewayReference,
                    refundAmount * 100 // Convert to kobo
                );
            } else {
                throw createError('Refunds not supported for this gateway yet', 400);
            }

            // Update payment record
            payment.status = 'refunded';
            payment.refundedAmount = refundAmount;
            payment.refundReason = refundReason;
            payment.refundDate = new Date();
            payment.gatewayResponse = {
                ...payment.gatewayResponse,
                refund: refundResponse.data
            };

            await payment.save({ transaction });

            // Update violation status if fully refunded
            if (refundAmount === Number(payment.amount)) {
                const violation = await Violation.findByPk(payment.violationId, { transaction });
                if (violation) {
                    violation.status = 'pending';
                    violation.paidDate = null as any;
                    await violation.save({ transaction });
                }
            }

            await transaction.commit();

            logger.info(`Refund processed: Payment ${payment.id} - ₦${refundAmount} by user ${processedBy}`);

            return payment;

        } catch (error) {
            await transaction.rollback();
            logger.error('Refund processing failed:', error);
            throw error;
        }
    }

    // Get payment statistics
    static async getPaymentStatistics(query: PaymentStatisticsQuery = {}): Promise<{
        totalTransactions: number;
        totalAmount: number;
        successfulTransactions: number;
        successfulAmount: number;
        failedTransactions: number;
        pendingTransactions: number;
        refundedAmount: number;
        averageTransactionAmount: number;
        gatewayBreakdown: { [key: string]: { count: number; amount: number } };
        dailyTrends: { date: string; transactions: number; amount: number }[];
    }> {
        try {
            const { startDate, endDate, gateway, status } = query;

            const whereConditions: any = {};

            if (startDate && endDate) {
                whereConditions.paymentDate = { [Op.between]: [startDate, endDate] };
            }
            if (gateway) {
                whereConditions.gatewayProvider = gateway;
            }
            if (status) {
                whereConditions.status = status;
            }

            const payments = await Payment.findAll({
                where: whereConditions,
                attributes: ['amount', 'status', 'gatewayProvider', 'paymentDate', 'refundedAmount']
            });

            const stats = payments.reduce((acc: any, payment: any) => {
                acc.totalTransactions++;
                acc.totalAmount += Number(payment.amount);
                acc.refundedAmount += Number(payment.refundedAmount || 0);

                switch (payment.status) {
                    case 'completed':
                        acc.successfulTransactions++;
                        acc.successfulAmount += Number(payment.amount);
                        break;
                    case 'failed':
                        acc.failedTransactions++;
                        break;
                    case 'pending':
                        acc.pendingTransactions++;
                        break;
                }

                // Gateway breakdown
                const gateway = payment.gatewayProvider;
                if (!acc.gatewayBreakdown[gateway]) {
                    acc.gatewayBreakdown[gateway] = { count: 0, amount: 0 };
                }
                acc.gatewayBreakdown[gateway].count++;
                acc.gatewayBreakdown[gateway].amount += Number(payment.amount);

                // Daily trends
                const date = payment.paymentDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
                if (!acc.dailyTrendsMap[date]) {
                    acc.dailyTrendsMap[date] = { transactions: 0, amount: 0 };
                }
                acc.dailyTrendsMap[date].transactions++;
                acc.dailyTrendsMap[date].amount += Number(payment.amount);

                return acc;
            }, {
                totalTransactions: 0,
                totalAmount: 0,
                successfulTransactions: 0,
                successfulAmount: 0,
                failedTransactions: 0,
                pendingTransactions: 0,
                refundedAmount: 0,
                gatewayBreakdown: {} as { [key: string]: { count: number; amount: number } },
                dailyTrendsMap: {} as { [key: string]: { transactions: number; amount: number } }
            });

            const averageTransactionAmount = stats.totalTransactions > 0
                ? stats.totalAmount / stats.totalTransactions
                : 0;

            const dailyTrends = Object.entries(stats.dailyTrendsMap)
                .map(([date, data]: [string, any]) => ({ date, ...data }))
                .sort((a, b) => a.date.localeCompare(b.date));

            // Remove dailyTrendsMap from return object
            const { dailyTrendsMap, ...finalStats } = stats;

            return {
                ...finalStats,
                averageTransactionAmount,
                dailyTrends
            };

        } catch (error) {
            logger.error('Payment statistics error:', error);
            throw createError('Failed to get payment statistics', 500);
        }
    }

    // Generate payment receipt
    static async generateReceipt(paymentId: number): Promise<{
        payment: Payment;
        violations: any[];
        receiptNumber: string;
        generatedAt: Date;
    }> {
        try {
            const payment = await Payment.findByPk(paymentId, {
                include: [{
                    model: Violation,
                    as: 'violation',
                    include: [
                        {
                            model: VehicleOwner,
                            as: 'vehicleOwner',
                            attributes: ['fullName', 'plateNumber']
                        },
                        {
                            model: ViolationType,
                            as: 'violationType',
                            attributes: ['title', 'code']
                        }
                    ]
                }]
            });

            if (!payment) {
                throw createError('Payment not found', 404);
            }

            if (payment.status !== 'completed') {
                throw createError('Receipt can only be generated for completed payments', 400);
            }

            // Get all payments with same reference (for multiple violations)
            const relatedPayments = await Payment.findAll({
                where: { paymentReference: payment.paymentReference },
                include: [{
                    model: Violation,
                    as: 'violation',
                    include: [
                        {
                            model: VehicleOwner,
                            as: 'vehicleOwner',
                            attributes: ['fullName', 'plateNumber']
                        },
                        {
                            model: ViolationType,
                            as: 'violationType',
                            attributes: ['title', 'code']
                        }
                    ]
                }]
            });

            const receiptNumber = `RCP_${payment.paymentReference}_${Date.now()}`;

            const violations = relatedPayments.map((p: any) => ({
                ticketNumber: p.violation?.ticketNumber,
                violationType: p.violation?.violationType?.title,
                plateNumber: p.violation?.plateNumber,
                amount: p.amount,
                paidDate: p.paymentDate
            }));

            return {
                payment,
                violations,
                receiptNumber,
                generatedAt: new Date()
            };

        } catch (error) {
            logger.error('Receipt generation error:', error);
            throw error;
        }
    }
}