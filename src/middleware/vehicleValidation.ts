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
// Plate number validation
export const validatePlateNumber = [
  body('plateNumber')
    .notEmpty()
    .withMessage('Plate number is required')
    .isLength({ min: 6, max: 15 })
    .withMessage('Plate number must be 6-15 characters')
    .matches(/^[A-Za-z0-9\-\s]+$/)
    .withMessage('Plate number can only contain letters, numbers, hyphens, and spaces'),
    
  handleValidationErrors,
];

// Vehicle creation validation
export const validateVehicleCreation = [
  body('plateNumber')
    .notEmpty()
    .withMessage('Plate number is required')
    .isLength({ min: 6, max: 15 })
    .withMessage('Plate number must be 6-15 characters')
    .matches(/^[A-Za-z0-9\-\s]+$/)
    .withMessage('Plate number can only contain letters, numbers, hyphens, and spaces'),
    
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be 2-255 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Full name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
  body('licenseNumber')
    .optional()
    .isLength({ min: 5, max: 50 })
    .withMessage('License number must be 5-50 characters')
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage('License number can only contain letters and numbers'),
    
  body('phone')
    .optional()
    .matches(/^\+234[0-9]{10}$/)
    .withMessage('Phone must be in format +234xxxxxxxxxx'),
    
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('stateOfResidence')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be 2-50 characters'),
    
  body('lga')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('LGA must be 2-100 characters'),
    
  body('licenseClass')
    .optional()
    .isIn(['A', 'B', 'C', 'D', 'E', 'F'])
    .withMessage('License class must be A, B, C, D, E, or F'),
    
  body('vehicleMake')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Vehicle make must be less than 100 characters'),
    
  body('vehicleModel')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Vehicle model must be less than 100 characters'),
    
  body('vehicleYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage(`Vehicle year must be between 1900 and ${new Date().getFullYear() + 1}`),
    
  body('vehicleColor')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Vehicle color must be less than 50 characters'),
    
  body('engineNumber')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Engine number must be less than 100 characters'),
    
  body('chassisNumber')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Chassis number must be less than 100 characters'),
    
  body('issueDate')
    .optional()
    .isISO8601()
    .withMessage('Issue date must be a valid date'),
    
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),
    
  handleValidationErrors,
];

// Vehicle update validation (same as creation but all fields optional)
export const validateVehicleUpdate = [
  body('plateNumber')
    .optional()
    .isLength({ min: 6, max: 15 })
    .withMessage('Plate number must be 6-15 characters')
    .matches(/^[A-Za-z0-9\-\s]+$/)
    .withMessage('Plate number can only contain letters, numbers, hyphens, and spaces'),
    
  body('fullName')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be 2-255 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Full name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
  body('licenseNumber')
    .optional()
    .isLength({ min: 5, max: 50 })
    .withMessage('License number must be 5-50 characters')
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage('License number can only contain letters and numbers'),
    
  body('phone')
    .optional()
    .matches(/^\+234[0-9]{10}$/)
    .withMessage('Phone must be in format +234xxxxxxxxxx'),
    
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('licenseClass')
    .optional()
    .isIn(['A', 'B', 'C', 'D', 'E', 'F'])
    .withMessage('License class must be A, B, C, D, E, or F'),
    
  body('vehicleYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage(`Vehicle year must be between 1900 and ${new Date().getFullYear() + 1}`),
    
  handleValidationErrors,
];

// Search validation
export const validateVehicleSearch = [
  query('plateNumber')
    .optional()
    .isLength({ min: 3, max: 15 })
    .withMessage('Plate number must be 3-15 characters'),
    
  query('licenseNumber')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('License number must be 3-50 characters'),
    
  query('fullName')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be 2-255 characters'),
    
  query('phone')
    .optional()
    .isLength({ min: 8, max: 20 })
    .withMessage('Phone must be 8-20 characters'),
    
  query('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address'),
    
  query('status')
    .optional()
    .isIn(['active', 'suspended', 'expired', 'revoked'])
    .withMessage('Status must be active, suspended, expired, or revoked'),
    
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

// Plate number parameter validation
export const validatePlateParam = [
  param('plateNumber')
    .notEmpty()
    .withMessage('Plate number parameter is required')
    .isLength({ min: 6, max: 15 })
    .withMessage('Plate number must be 6-15 characters'),
    
  handleValidationErrors,
];

// Vehicle ID parameter validation
export const validateVehicleId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Vehicle ID must be a positive integer'),
    
  handleValidationErrors,
];

// Bulk import validation
export const validateBulkImport = [
  body('vehicles')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Vehicles must be an array with 1-1000 items'),
    
  body('vehicles.*.plateNumber')
    .notEmpty()
    .withMessage('Each vehicle must have a plate number')
    .isLength({ min: 6, max: 15 })
    .withMessage('Each plate number must be 6-15 characters'),
    
  body('vehicles.*.fullName')
    .notEmpty()
    .withMessage('Each vehicle must have a full name')
    .isLength({ min: 2, max: 255 })
    .withMessage('Each full name must be 2-255 characters'),
    
  handleValidationErrors,
];