import { body, validationResult, Result, ValidationError } from 'express-validator';
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


// General notification validation
export const validateNotification = [
  body('recipient')
    .isObject()
    .withMessage('Recipient must be an object'),
    
  body('recipient.name')
    .notEmpty()
    .withMessage('Recipient name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Recipient name must be 2-255 characters'),
    
  body('recipient.email')
    .optional()
    .isEmail()
    .withMessage('Recipient email must be valid'),
    
  body('recipient.phone')
    .optional()
    .matches(/^\+234[0-9]{10}$/)
    .withMessage('Phone must be in format +234xxxxxxxxxx'),
    
  body('type')
    .isIn(['violation_created', 'payment_reminder', 'payment_confirmed', 'license_suspended', 'password_reset', 'officer_notification'])
    .withMessage('Invalid notification type'),
    
  body('channels')
    .isArray({ min: 1 })
    .withMessage('At least one notification channel is required')
    .custom((channels) => {
      const validChannels = ['sms', 'email'];
      return channels.every((channel: string) => validChannels.includes(channel));
    })
    .withMessage('Invalid notification channel'),
    
  body('data')
    .isObject()
    .withMessage('Data must be an object'),
    
  handleValidationErrors,
];

// SMS validation
export const validateSMS = [
  body('to')
    .notEmpty()
    .withMessage('Recipient phone number is required')
    .matches(/^\+234[0-9]{10}$/)
    .withMessage('Phone must be in format +234xxxxxxxxxx'),
    
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 918 })
    .withMessage('Message must be 1-918 characters (SMS limit)'),
    
  body('type')
    .optional()
    .isIn(['plain', 'unicode'])
    .withMessage('SMS type must be plain or unicode'),
    
  body('channel')
    .optional()
    .isIn(['dnd', 'WhatsApp', 'generic'])
    .withMessage('SMS channel must be dnd, WhatsApp, or generic'),
    
  handleValidationErrors,
];

// Email validation
export const validateEmail = [
  body('to')
    .custom((to) => {
      if (typeof to === 'string') {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
      } else if (Array.isArray(to)) {
        return to.every((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      }
      return false;
    })
    .withMessage('Valid email address(es) required'),
    
  body('subject')
    .notEmpty()
    .withMessage('Email subject is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Subject must be 1-255 characters'),
    
  body('html')
    .optional()
    .isLength({ min: 1 })
    .withMessage('HTML content cannot be empty if provided'),
    
  body('text')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Text content cannot be empty if provided'),
    
  body()
    .custom((body) => {
      return body.html || body.text;
    })
    .withMessage('Either HTML or text content is required'),
    
  handleValidationErrors,
];

// Bulk SMS validation
export const validateBulkSMS = [
  body('to')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Recipients must be an array with 1-1000 phone numbers')
    .custom((phoneNumbers) => {
      return phoneNumbers.every((phone: string) => 
        /^\+234[0-9]{10}$/.test(phone)
      );
    })
    .withMessage('All phone numbers must be in format +234xxxxxxxxxx'),
    
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 918 })
    .withMessage('Message must be 1-918 characters'),
    
  body('type')
    .optional()
    .isIn(['plain', 'unicode'])
    .withMessage('SMS type must be plain or unicode'),
    
  handleValidationErrors,
];

// Bulk email validation
export const validateBulkEmail = [
  body('emails')
    .isArray({ min: 1, max: 500 })
    .withMessage('Emails must be an array with 1-500 email objects'),
    
  body('emails.*.to')
    .isEmail()
    .withMessage('Each email must have a valid to address'),
    
  body('emails.*.subject')
    .notEmpty()
    .withMessage('Each email must have a subject')
    .isLength({ min: 1, max: 255 })
    .withMessage('Subject must be 1-255 characters'),
    
  body('emails.*')
    .custom((email) => {
      return email.html || email.text;
    })
    .withMessage('Each email must have either HTML or text content'),
    
  handleValidationErrors,
];

// Officer broadcast validation
export const validateOfficerBroadcast = [
  body('message')
    .notEmpty()
    .withMessage('Broadcast message is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Message must be 10-500 characters'),
    
  body('targetStates')
    .optional()
    .isArray()
    .withMessage('Target states must be an array'),
    
  body('targetZones')
    .optional()
    .isArray()
    .withMessage('Target zones must be an array'),
    
  body('targetRoles')
    .optional()
    .isArray()
    .custom((roles) => {
      const validRoles = ['officer', 'supervisor', 'admin'];
      return roles.every((role: string) => validRoles.includes(role));
    })
    .withMessage('Invalid target roles'),
    
  handleValidationErrors,
];