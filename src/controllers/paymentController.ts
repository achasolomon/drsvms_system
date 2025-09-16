import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService';
import { logger } from '../utils/logger';
import Payment from '../models/Payment';
import Violation from '../models/Violation';
import VehicleOwner from '../models/VehicleOwner';
import ViolationType from '../models/ViolationType';

export class PaymentController {
    // POST /api/v1/payments/initiate
    static async initiatePayment(req: Request, res: Response, next: NextFunction) {
        try {
            const paymentData = req.body;

            const result = await PaymentService.initiatePayment(paymentData);

            logger.info(`Payment initiated: ${result.paymentReference} - ₦${result.totalAmount}`);

            res.status(200).json({
                status: 'success',
                message: 'Payment initiated successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/payments/verify
    static async verifyPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { paymentReference, gateway, gatewayReference } = req.body;

            const result = await PaymentService.verifyPayment({
                paymentReference,
                gateway,
                gatewayReference
            });

            res.status(200).json({
                status: 'success',
                message: result.success ? 'Payment verified successfully' : 'Payment verification failed',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/payments/webhook/paystack
    static async paystackWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const signature = req.headers['x-paystack-signature'] as string;
            const payload = req.body;

            await PaymentService.handleWebhook('paystack', signature, payload);

            res.status(200).json({
                status: 'success',
                message: 'Webhook processed successfully'
            });
        } catch (error) {
            logger.error('Paystack webhook error:', error);
            res.status(400).json({
                status: 'error',
                message: 'Webhook processing failed'
            });
        }
    }

    // POST /api/v1/payments/webhook/flutterwave
    static async flutterwaveWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const signature = req.headers['verif-hash'] as string;
            const payload = req.body;

            await PaymentService.handleWebhook('flutterwave', signature, payload);

            res.status(200).json({
                status: 'success',
                message: 'Webhook processed successfully'
            });
        } catch (error) {
            logger.error('Flutterwave webhook error:', error);
            res.status(400).json({
                status: 'error',
                message: 'Webhook processing failed'
            });
        }
    }

    // GET /api/v1/payments/search
    static async searchPayments(req: Request, res: Response, next: NextFunction) {
        try {
            const query = req.query;
            const page = parseInt(query.page as string) || 1;
            const limit = Math.min(parseInt(query.limit as string) || 20, 100);

            const searchQuery = {
                violationId: query.violationId ? parseInt(query.violationId as string) : undefined,
                paymentReference: query.paymentReference as string,
                gatewayReference: query.gatewayReference as string,
                payerEmail: query.payerEmail as string,
                status: query.status as any,
                gateway: query.gateway as any,
                startDate: query.startDate ? new Date(query.startDate as string) : undefined,
                endDate: query.endDate ? new Date(query.endDate as string) : undefined,
                page,
                limit
            };

            const result = await PaymentService.searchPayments(searchQuery);

            res.status(200).json({
                status: 'success',
                message: `Found ${result.totalCount} payment(s)`,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/payments/:id
    static async getPaymentById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const paymentId = parseInt(id);

            if (isNaN(paymentId)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid payment ID',
                });
            }

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
                return res.status(404).json({
                    status: 'error',
                    message: 'Payment not found',
                });
            }

            res.status(200).json({
                status: 'success',
                data: { payment },
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/payments/reference/:reference
    static async getPaymentByReference(req: Request, res: Response, next: NextFunction) {
        try {
            const { reference } = req.params;

            const payments = await Payment.findAll({
                where: { paymentReference: reference },
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

            if (payments.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'No payments found with this reference',
                });
            }

            const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

            res.status(200).json({
                status: 'success',
                data: {
                    payments,
                    totalAmount,
                    paymentReference: reference
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/payments/:id/refund
    static async processRefund(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { refundAmount, refundReason } = req.body;
            const paymentId = parseInt(id);

            if (isNaN(paymentId)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid payment ID',
                });
            }

            const payment = await PaymentService.processRefund(
                paymentId,
                refundAmount,
                refundReason,
                req.user!.userId
            );

            logger.info(`Refund processed by ${req.user!.employeeId}: Payment ${paymentId} - ₦${refundAmount}`);

            res.status(200).json({
                status: 'success',
                message: 'Refund processed successfully',
                data: { payment },
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/payments/stats
    static async getPaymentStatistics(req: Request, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate } = req.query;

            const start = startDate ? new Date(startDate as string) : undefined;
            const end = endDate ? new Date(endDate as string) : undefined;

            const stats = await PaymentService.getPaymentStatistics({
                startDate: start,
                endDate: end,
            });

            res.status(200).json({
                status: 'success',
                data: { stats },
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/payments/:id/receipt
    static async generateReceipt(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const paymentId = parseInt(id);

            if (isNaN(paymentId)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid payment ID',
                });
            }

            const receipt = await PaymentService.generateReceipt(paymentId);

            res.status(200).json({
                status: 'success',
                message: 'Receipt generated successfully',
                data: receipt,
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/payments/violation/:violationId
    static async getPaymentsByViolation(req: Request, res: Response, next: NextFunction) {
        try {
            const { violationId } = req.params;
            const id = parseInt(violationId);

            if (isNaN(id)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid violation ID',
                });
            }

            const payments = await Payment.findAll({
                where: { violationId: id },
                include: [{
                    model: Violation,
                    as: 'violation',
                    attributes: ['ticketNumber', 'plateNumber', 'fineAmount']
                }],
                order: [['paymentDate', 'DESC']]
            });

            const totalPaid = payments
                .filter(p => p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0);

            const totalRefunded = payments
                .reduce((sum, p) => sum + p.refundedAmount, 0);

            res.status(200).json({
                status: 'success',
                message: `Found ${payments.length} payment(s) for violation`,
                data: {
                    payments,
                    summary: {
                        totalPayments: payments.length,
                        totalPaid,
                        totalRefunded,
                        netAmount: totalPaid - totalRefunded
                    }
                },
            });
        } catch (error) {
            next(error);
        }
    }
}