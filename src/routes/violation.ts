import { Router } from 'express';
import { ViolationController } from '../controllers/violationController';
import { 
  authenticateToken, 
  adminOnly,
  supervisorOnly,
  officerOnly,
} from '../middleware/auth';
import {
  validateViolationCreation,
  validateViolationSearch,
  validateStatusUpdate,
  validateContestViolation,
  validateReportGeneration,
  validateViolationId,
  validateTicketParam,
  validatePlateParam,
  validateOfficerIdParam,
  validateStatsDateRange,
} from '../middleware/violationValidation';
import { sanitizeInput, auditTrail } from '../middleware/security';

const router = Router();

// Apply input sanitization and authentication to all routes
router.use(sanitizeInput);
router.use(authenticateToken);

// Officer routes (create violations)
router.post('/', 
  officerOnly,
  validateViolationCreation,
  auditTrail('VIOLATION_CREATE'),
  ViolationController.createViolation
);

router.get('/my-stats',
  officerOnly,
  validateStatsDateRange,
  ViolationController.getMyStats
);

// Public violation routes (all authenticated users)
router.get('/search', 
  validateViolationSearch,
  auditTrail('VIOLATION_SEARCH'),
  ViolationController.searchViolations
);

router.get('/dashboard/summary',
  ViolationController.getDashboardSummary
);

router.get('/:id',
  validateViolationId,
  ViolationController.getViolationById
);

router.get('/ticket/:ticketNumber',
  validateTicketParam,
  ViolationController.getViolationByTicket
);

router.get('/plate/:plateNumber',
  validatePlateParam,
  auditTrail('PLATE_VIOLATION_LOOKUP'),
  ViolationController.getViolationsByPlate
);

// Contest violation (public access for citizens through web portal)
router.post('/:id/contest',
  validateViolationId,
  validateContestViolation,
  auditTrail('VIOLATION_CONTEST'),
  ViolationController.contestViolation
);

// Supervisor and Admin routes
router.put('/:id/status',
  supervisorOnly,
  validateViolationId,
  validateStatusUpdate,
  auditTrail('VIOLATION_STATUS_UPDATE'),
  ViolationController.updateViolationStatus
);

router.get('/officer/:officerId/stats',
  supervisorOnly,
  validateOfficerIdParam,
  validateStatsDateRange,
  ViolationController.getOfficerStats
);

// Admin only routes
router.get('/stats/system',
  adminOnly,
  validateStatsDateRange,
  ViolationController.getSystemStats
);

router.post('/reports/generate',
  adminOnly,
  validateReportGeneration,
  auditTrail('REPORT_GENERATE'),
  ViolationController.generateReport
);

export default router;