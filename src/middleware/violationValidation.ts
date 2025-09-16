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

// Violation creation validation
export const validateViolationCreation = [
  body('plateNumber')
    .notEmpty()
    .withMessage('Plate number is required')
    .isLength({ min: 6, max: 15 })
    .withMessage('Plate number must be 6-15 characters')
    .matches(/^[A-Za-z0-9\-\s]+$/)
    .withMessage('Plate number can only contain letters, numbers, hyphens, and spaces'),
    
  body('violationTypeIds')
    .isArray({ min: 1, max: 10 })
    .withMessage('At least 1 and maximum 10 violation types required')
    .custom((violationTypeIds) => {
      return violationTypeIds.every((id: any) => Number.isInteger(id) && id > 0);
    })
    .withMessage('All violation type IDs must be positive integers'),
    
  body('locationState')
    .notEmpty()
    .withMessage('Location state is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Location state must be 2-50 characters'),
    
  body('locationLga')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location LGA must be 2-100 characters'),
    
  body('locationAddress')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Location address must be less than 500 characters'),
    
  body('locationLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
    
  body('locationLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
    
  body('evidencePhotos')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 evidence photos allowed'),
    
  body('evidencePhotos.*')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Each photo filename must be 1-255 characters'),
    
  body('officerNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Officer notes must be less than 1000 characters'),
    
  body('weatherCondition')
    .optional()
    .isIn(['clear', 'rainy', 'foggy', 'sunny', 'cloudy', 'stormy'])
    .withMessage('Weather condition must be: clear, rainy, foggy, sunny, cloudy, or stormy'),
    
  body('roadCondition')
    .optional()
    .isIn(['good', 'fair', 'poor', 'under_construction', 'flooded'])
    .withMessage('Road condition must be: good, fair, poor, under_construction, or flooded'),
    
  body('trafficCondition')
    .optional()
    .isIn(['light', 'moderate', 'heavy', 'congested'])
    .withMessage('Traffic condition must be: light, moderate, heavy, or congested'),
    
  handleValidationErrors,
];

// Violation search validation
export const validateViolationSearch = [
  query('plateNumber')
    .optional()
    .isLength({ min: 3, max: 15 })
    .withMessage('Plate number must be 3-15 characters'),
    
  query('ticketNumber')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Ticket number must be 3-50 characters'),
    
  query('officerId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Officer ID must be a positive integer'),
    
  query('violationTypeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Violation type ID must be a positive integer'),
    
  query('status')
    .optional()
    .isIn(['pending', 'paid', 'partially_paid', 'contested', 'dismissed', 'court_pending'])
    .withMessage('Status must be: pending, paid, partially_paid, contested, dismissed, or court_pending'),
    
  query('locationState')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Location state must be 2-50 characters'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
    
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be a positive number'),
    
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum amount must be a positive number'),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('sortBy')
    .optional()
    .isIn(['violationDate', 'dueDate', 'fineAmount', 'ticketNumber'])
    .withMessage('Sort by must be: violationDate, dueDate, fineAmount, or ticketNumber'),
    
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC'),
    
  handleValidationErrors,
];

// Status update validation
export const validateStatusUpdate = [
  body('status')
    .isIn(['pending', 'paid', 'partially_paid', 'contested', 'dismissed', 'court_pending'])
    .withMessage('Status must be: pending, paid, partially_paid, contested, dismissed, or court_pending'),
    
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
    
  handleValidationErrors,
];

// Contest violation validation
export const validateContestViolation = [
  body('contestReason')
    .notEmpty()
    .withMessage('Contest reason is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Contest reason must be 10-1000 characters'),
    
  handleValidationErrors,
];

// Report generation validation
export const validateReportGeneration = [
  body('reportType')
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Report type must be: daily, weekly, or monthly'),
    
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
    
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      const startDate = new Date(req.body.startDate);
      const end = new Date(endDate);
      if (end <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
    
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
    
  body('filters.state')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('State filter must be 2-50 characters'),
    
  body('filters.officerId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Officer ID filter must be a positive integer'),
    
  body('filters.violationTypeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Violation type ID filter must be a positive integer'),
    
  handleValidationErrors,
];

// Violation ID parameter validation
export const validateViolationId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Violation ID must be a positive integer'),
    
  handleValidationErrors,
];

// Ticket number parameter validation
export const validateTicketParam = [
  param('ticketNumber')
    .notEmpty()
    .withMessage('Ticket number parameter is required')
    .isLength({ min: 8, max: 50 })
    .withMessage('Ticket number must be 8-50 characters'),
    
  handleValidationErrors,
];

// Plate number parameter validation
export const validatePlateParam = [
  param('plateNumber')
    .notEmpty()
    .withMessage('Plate number parameter is required')
    .isLength({ min: 6, max: 15 })
    .withMessage('Plate number must be 6-15 characters'),
    
  handleValidationErrors,
];

// Officer ID parameter validation
export const validateOfficerIdParam = [
  param('officerId')
    .isInt({ min: 1 })
    .withMessage('Officer ID must be a positive integer'),
    
  handleValidationErrors,
];

// Date range validation for stats
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