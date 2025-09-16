import { Request, Response, NextFunction } from 'express';
import { body, validationResult, Result, ValidationError } from 'express-validator';
import { createError } from './errorHandler';

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

// Login validation
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  handleValidationErrors,
];

// User registration validation
export const validateUserRegistration = [
  body('employeeId')
    .isLength({ min: 3, max: 20 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Employee ID must be 3-20 characters, letters and numbers only'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 6 characters with uppercase, lowercase, and number'),

  body('role')
    .isIn(['officer', 'admin', 'supervisor'])
    .withMessage('Role must be officer, admin, or supervisor'),

  body('fullName')
    .isLength({ min: 2, max: 255 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name must be 2-255 characters, letters only'),

  body('phone')
    .matches(/^\+234[0-9]{10}$/)
    .withMessage('Phone must be in format +234xxxxxxxxxx'),

  body('state')
    .isLength({ min: 2, max: 50 })
    .withMessage('State is required'),

  body('zone')
    .isLength({ min: 2, max: 50 })
    .withMessage('Zone is required'),

  body('unit')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Unit must be less than 100 characters'),

  body('rank')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Rank must be less than 50 characters'),

  handleValidationErrors,
];

// Change password validation
export const validateChangePassword = [
  body('oldPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must be at least 6 characters with uppercase, lowercase, and number'),

  handleValidationErrors,
];

// Profile update validation
export const validateProfileUpdate = [
  body('fullName')
    .optional()
    .isLength({ min: 2, max: 255 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name must be 2-255 characters, letters only'),

  body('phone')
    .optional()
    .matches(/^\+234[0-9]{10}$/)
    .withMessage('Phone must be in format +234xxxxxxxxxx'),

  body('unit')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Unit must be less than 100 characters'),

  handleValidationErrors,
];

// Refresh token validation
export const validateRefreshToken = [
  body('refreshToken')
    .isLength({ min: 1 })
    .withMessage('Refresh token is required'),

  handleValidationErrors,
];