import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import {
    authenticateToken,
    adminOnly,
    supervisorOnly,
} from '../middleware/auth';
import {
    validateNotification,
    validateSMS,
    validateEmail,
    validateBulkSMS,
    validateBulkEmail,
    validateOfficerBroadcast,
} from '../middleware/notificationValidator';
import { sanitizeInput, auditTrail } from '../middleware/security';

const router = Router();

// Apply input sanitization and authentication to all routes
router.use(sanitizeInput);
router.use(authenticateToken);

// General notification routes
router.post('/send',
    supervisorOnly,
    validateNotification,
    auditTrail('NOTIFICATION_SEND'),
    NotificationController.sendNotification
);

// SMS routes
router.post('/sms/send',
    supervisorOnly,
    validateSMS,
    auditTrail('SMS_SEND'),
    NotificationController.sendSMS
);

router.post('/bulk/sms',
    adminOnly,
    validateBulkSMS,
    auditTrail('BULK_SMS_SEND'),
    NotificationController.sendBulkSMS
);

router.get('/sms/balance',
    supervisorOnly,
    NotificationController.getSMSBalance
);

// Email routes
router.post('/email/send',
    supervisorOnly,
    validateEmail,
    auditTrail('EMAIL_SEND'),
    NotificationController.sendEmail
);

router.post('/bulk/email',
    adminOnly,
    validateBulkEmail,
    auditTrail('BULK_EMAIL_SEND'),
    NotificationController.sendBulkEmail
);

export default router;