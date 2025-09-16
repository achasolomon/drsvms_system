import { Router } from 'express';
import authRoutes from './auth';
import vehicleRoutes from './vehicles';
import violationRoutes from './violation';
import paymentRoutes from './payment';
import notificationRoutes from './notification';


const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/violations', violationRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);

// Health check for authenticated routes
router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'API routes are working',
    timestamp: new Date().toISOString(),
    user: req.user ? `${req.user.role} (${req.user.employeeId})` : 'Anonymous',
    endpoints: {
      auth: '/api/v1/auth',
      vehicles: '/api/v1/vehicles',
      violations: '/api/v1/violations'
    }
  });
});

export default router;