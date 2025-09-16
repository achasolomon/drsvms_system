import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import {
  authenticateToken,
  adminOnly,
} from '../middleware/auth';
import {
  validateLogin,
  validateUserRegistration,
  validateChangePassword,
  validateProfileUpdate,
  validateRefreshToken,
} from '../middleware/validation';
import {
  loginRateLimit,
  sanitizeInput,
  auditTrail,
} from '../middleware/security';

const router = Router();

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Public routes (no authentication required)
router.post('/login',
  loginRateLimit,
  validateLogin,
  auditTrail('LOGIN_ATTEMPT'),
  AuthController.login
);

router.post('/refresh',
  validateRefreshToken,
  auditTrail('TOKEN_REFRESH'),
  AuthController.refreshToken
);

// Protected routes (authentication required)
router.use(authenticateToken); // Apply authentication to all routes below

// User profile routes
router.get('/profile',
  auditTrail('VIEW_PROFILE'),
  AuthController.getProfile
);

router.put('/profile',
  validateProfileUpdate,
  auditTrail('UPDATE_PROFILE'),
  AuthController.updateProfile
);

router.post('/change-password',
  validateChangePassword,
  auditTrail('CHANGE_PASSWORD'),
  AuthController.changePassword
);

router.post('/logout',
  auditTrail('LOGOUT'),
  AuthController.logout
);

router.get('/verify',
  AuthController.verifyToken
);

// Admin only routes
router.post('/register',
  adminOnly,
  validateUserRegistration,
  auditTrail('CREATE_USER'),
  AuthController.register
);

router.post('/users/:id/deactivate',
  adminOnly,
  auditTrail('DEACTIVATE_USER'),
  AuthController.deactivateUser
);

router.post('/users/:id/reactivate',
  adminOnly,
  auditTrail('REACTIVATE_USER'),
  AuthController.reactivateUser
);

export default router;