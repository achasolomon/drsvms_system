import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { 
  authenticateToken, 
  adminOnly,
  supervisorOnly,
  optionalAuth,
} from '../middleware/auth';
import {
  validatePaymentInitiation,
  validatePaymentVerification,
  validateRefundProcessing,
  validatePaymentSearch,
  validatePaymentId,
  validatePaymentReference,
  validateViolationIdParam,
  validateStatsDateRange,
} from '../middleware/paymentValidation';
import { sanitizeInput, auditTrail } from '../middleware/security';

const router = Router();

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Public routes (no authentication required for webhooks)
router.post('/webhook/paystack', PaymentController.paystackWebhook);
router.post('/webhook/flutterwave', PaymentController.flutterwaveWebhook);

// Public routes with optional authentication (for web portal)
router.post('/initiate',
  optionalAuth,
  validatePaymentInitiation,
  auditTrail('PAYMENT_INITIATE'),
  PaymentController.initiatePayment
);

router.post('/verify',
  optionalAuth,
  validatePaymentVerification,
  auditTrail('PAYMENT_VERIFY'),
  PaymentController.verifyPayment
);

router.get('/reference/:reference',
  optionalAuth,
  validatePaymentReference,
  PaymentController.getPaymentByReference
);

// Protected routes (authentication required)
router.use(authenticateToken);

router.get('/search',
  validatePaymentSearch,
  auditTrail('PAYMENT_SEARCH'),
  PaymentController.searchPayments
);

router.get('/:id',
  validatePaymentId,
  PaymentController.getPaymentById
);

router.get('/:id/receipt',
  validatePaymentId,
  auditTrail('PAYMENT_RECEIPT'),
  PaymentController.generateReceipt
);

router.get('/violation/:violationId',
  validateViolationIdParam,
  PaymentController.getPaymentsByViolation
);

// Supervisor and Admin routes
router.post('/:id/refund',
  supervisorOnly,
  validatePaymentId,
  validateRefundProcessing,
  auditTrail('PAYMENT_REFUND'),
  PaymentController.processRefund
);

router.get('/stats',
  supervisorOnly,
  validateStatsDateRange,
  PaymentController.getPaymentStatistics
);

export default router;