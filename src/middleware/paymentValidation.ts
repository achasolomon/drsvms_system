import { body, param, query, Result, validationResult, ValidationError } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors: Result<ValidationError> = validationResult(req);
    
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => {
          if ("path" in error && "msg" in error) {
            return {
              field: error.path,
              message: error.msg,
              value: "value" in error ? error.value : undefined,
            };
          }
          return {
            field: "unknown",
            message: "Invalid input",
            value: undefined,
          };
        });
    
        return res.status(400).json({
          status: "error",
          message: "Validation errors",
          errors: errorMessages,
        });
      }
    
      next();
    };
  

// Payment initiation validation
export const validatePaymentInitiation = [
  body('violationIds')
    .isArray({ min: 1, max: 10 })
    .withMessage('At least 1 and maximum 10 violations can be paid together')
    .custom((violationIds) => {
      return violationIds.every((id: any) => Number.isInteger(id) && id > 0);
    })
    .withMessage('All violation IDs must be positive integers'),
    
  body('payerName')
    .notEmpty()
    .withMessage('Payer name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Payer name must be 2-255 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Payer name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
  body('payerEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('payerPhone')
    .optional()
    .matches(/^\+234[0-9]{10}$/)
    .withMessage('Phone must be in format +234xxxxxxxxxx'),
    
  body('paymentMethod')
    .isIn(['card', 'bank_transfer', 'ussd'])
    .withMessage('Payment method must be: card, bank_transfer, or ussd'),
    
  body('gateway')
    .isIn(['paystack', 'flutterwave'])
    .withMessage('Gateway must be: paystack or flutterwave'),
    
  body('callbackUrl')
    .optional()
    .isURL()
    .withMessage('Callback URL must be a valid URL'),
    
  handleValidationErrors,
];

// Payment verification validation
export const validatePaymentVerification = [
  body('paymentReference')
    .notEmpty()
    .withMessage('Payment reference is required')
    .isLength({ min: 8, max: 100 })
    .withMessage('Payment reference must be 8-100 characters'),
    
  body('gateway')
    .isIn(['paystack', 'flutterwave'])
    .withMessage('Gateway must be: paystack or flutterwave'),
    
  body('gatewayReference')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Gateway reference must be 1-100 characters'),
    
  handleValidationErrors,
];

// Refund processing validation
export const validateRefundProcessing = [
  body('refundAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be greater than 0'),
    
  body('refundReason')
    .notEmpty()
    .withMessage('Refund reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Refund reason must be 10-500 characters'),
    
  handleValidationErrors,
];

// Payment search validation
export const validatePaymentSearch = [
  query('violationId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Violation ID must be a positive integer'),
    
  query('paymentReference')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Payment reference must be 3-100 characters'),
    
  query('gatewayReference')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Gateway reference must be 3-100 characters'),
    
  query('payerEmail')
    .optional()
    .isEmail()
    .withMessage('Payer email must be a valid email address'),
    
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Status must be: pending, completed, failed, or refunded'),
    
  query('gateway')
    .optional()
    .isIn(['paystack', 'flutterwave', 'interswitch'])
    .withMessage('Gateway must be: paystack, flutterwave, or interswitch'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query && req.query.startDate) {
        const startDate = new Date(req.query.startDate as string);
        const end = new Date(endDate);
        if (end <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  handleValidationErrors,
];

// Payment ID parameter validation
export const validatePaymentId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Payment ID must be a positive integer'),
    
  handleValidationErrors,
];

// Payment reference parameter validation
export const validatePaymentReference = [
  param('reference')
    .notEmpty()
    .withMessage('Payment reference parameter is required')
    .isLength({ min: 8, max: 100 })
    .withMessage('Payment reference must be 8-100 characters'),
    
  handleValidationErrors,
];

// Violation ID parameter validation
export const validateViolationIdParam = [
  param('violationId')
    .isInt({ min: 1 })
    .withMessage('Violation ID must be a positive integer'),
    
  handleValidationErrors,
];

// Statistics date range validation
export const validateStatsDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query && req.query.startDate) {
        const startDate = new Date(req.query.startDate as string);
        const end = new Date(endDate);
        if (end <= startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
    
  handleValidationErrors,
];