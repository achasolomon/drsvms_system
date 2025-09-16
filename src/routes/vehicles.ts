import { Router } from 'express';
import { VehicleController } from '../controllers/vehicleController';
import { 
  authenticateToken, 
  adminOnly,
  supervisorOnly,
} from '../middleware/auth';
import {
  validatePlateNumber,
  validateVehicleCreation,
  validateVehicleUpdate,
  validateVehicleSearch,
  validatePlateParam,
  validateVehicleId,
  validateBulkImport,
} from '../middleware/vehicleValidation';
import { sanitizeInput, auditTrail } from '../middleware/security';

const router = Router();

// Apply input sanitization and authentication to all routes
router.use(sanitizeInput);
router.use(authenticateToken);

// Public vehicle routes (all authenticated users)
router.get('/search', 
  validateVehicleSearch,
  auditTrail('VEHICLE_SEARCH'),
  VehicleController.searchVehicles
);

router.get('/lookup/:plateNumber', 
  validatePlateParam,
  auditTrail('PLATE_LOOKUP'),
  VehicleController.lookupByPlateNumber
);

router.post('/validate-plate', 
  validatePlateNumber,
  VehicleController.validatePlateNumber
);

router.get('/similar/:plateNumber',
  validatePlateParam,
  VehicleController.findSimilarPlates
);

router.get('/:id',
  validateVehicleId,
  VehicleController.getVehicleById
);

router.get('/:plateNumber/stats',
  validatePlateParam,
  VehicleController.getVehicleStats
);

// Supervisor and Admin routes
router.post('/', 
  supervisorOnly,
  validateVehicleCreation,
  auditTrail('VEHICLE_CREATE'),
  VehicleController.createVehicle
);

router.put('/:id',
  supervisorOnly,
  validateVehicleId,
  validateVehicleUpdate,
  auditTrail('VEHICLE_UPDATE'),
  VehicleController.updateVehicle
);

router.get('/reports/expired-licenses',
  supervisorOnly,
  VehicleController.getExpiredLicenses
);

// Admin only routes
router.post('/bulk-import',
  adminOnly,
  validateBulkImport,
  auditTrail('VEHICLE_BULK_IMPORT'),
  VehicleController.bulkImportVehicles
);

export default router;