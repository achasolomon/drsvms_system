import { Request, Response, NextFunction } from 'express';
import { ViolationService } from '../services/violationService';
import { logger } from '../utils/logger';

export class ViolationController {
  // POST /api/v1/violations
  static async createViolation(req: Request, res: Response, next: NextFunction) {
    try {
      const violationData = {
        ...req.body,
        officerId: req.user!.userId
      };

      const result = await ViolationService.createViolation(violationData);

      logger.info(`Violation created by ${req.user!.employeeId}: ${result.violations.length} violations, Total: ₦${result.totalAmount}`);

      res.status(201).json({
        status: 'success',
        message: `${result.violations.length} violation(s) created successfully`,
        data: {
          violations: result.violations,
          summary: {
            totalAmount: result.totalAmount,
            totalPoints: result.totalPoints,
            suspensionTriggered: result.suspensionTriggered
          },
          vehicleOwner: result.vehicleOwner
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/violations/search
  static async searchViolations(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query;
      const page = parseInt(query.page as string) || 1;
      const limit = Math.min(parseInt(query.limit as string) || 20, 100);

      const searchQuery = {
        plateNumber: query.plateNumber as string,
        ticketNumber: query.ticketNumber as string,
        officerId: query.officerId ? parseInt(query.officerId as string) : undefined,
        violationTypeId: query.violationTypeId ? parseInt(query.violationTypeId as string) : undefined,
        status: query.status as any,
        locationState: query.locationState as string,
        locationLga: query.locationLga as string,
        startDate: query.startDate ? new Date(query.startDate as string) : undefined,
        endDate: query.endDate ? new Date(query.endDate as string) : undefined,
        minAmount: query.minAmount ? parseFloat(query.minAmount as string) : undefined,
        maxAmount: query.maxAmount ? parseFloat(query.maxAmount as string) : undefined,
        page,
        limit,
        sortBy: query.sortBy as any || 'violationDate',
        sortOrder: query.sortOrder as any || 'DESC'
      };

      const result = await ViolationService.searchViolations(searchQuery);

      res.status(200).json({
        status: 'success',
        message: `Found ${result.totalCount} violation(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/violations/:id
  static async getViolationById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const violationId = parseInt(id);

      if (isNaN(violationId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid violation ID',
        });
      }

      const violation = await ViolationService.getViolationById(violationId);
      
      res.status(200).json({
        status: 'success',
        data: { violation },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/violations/ticket/:ticketNumber
  static async getViolationByTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketNumber } = req.params;
      
      const violation = await ViolationService.getViolationByTicketNumber(ticketNumber);
      
      res.status(200).json({
        status: 'success',
        data: { violation },
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/v1/violations/:id/status
  static async updateViolationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const violationId = parseInt(id);

      if (isNaN(violationId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid violation ID',
        });
      }

      const violation = await ViolationService.updateViolationStatus(
        violationId, 
        status, 
        req.user!.userId,
        notes
      );

      logger.info(`Violation ${violation.ticketNumber} status updated to ${status} by ${req.user!.employeeId}`);
      
      res.status(200).json({
        status: 'success',
        message: 'Violation status updated successfully',
        data: { violation },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/violations/:id/contest
  static async contestViolation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { contestReason } = req.body;
      const violationId = parseInt(id);

      if (isNaN(violationId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid violation ID',
        });
      }

      const violation = await ViolationService.contestViolation(
        violationId,
        contestReason,
        req.user?.userId
      );
      
      res.status(200).json({
        status: 'success',
        message: 'Violation contested successfully',
        data: { violation },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/violations/plate/:plateNumber
  static async getViolationsByPlate(req: Request, res: Response, next: NextFunction) {
    try {
      const { plateNumber } = req.params;
      
      const result = await ViolationService.getViolationsByPlateNumber(plateNumber);
      
      res.status(200).json({
        status: 'success',
        message: `Found ${result.violations.length} violation(s) for ${plateNumber}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/violations/officer/:officerId/stats
  static async getOfficerStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { officerId } = req.params;
      const { startDate, endDate } = req.query;

      // Officers can only view their own stats unless admin/supervisor
      const requestedOfficerId = parseInt(officerId);
      if (req.user!.role === 'officer' && req.user!.userId !== requestedOfficerId) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only view your own statistics',
        });
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const stats = await ViolationService.getOfficerStats(requestedOfficerId, start, end);
      
      res.status(200).json({
        status: 'success',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/violations/stats/system
  static async getSystemStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const stats = await ViolationService.getSystemStatistics(start, end);
      
      res.status(200).json({
        status: 'success',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/violations/reports/generate
  static async generateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { reportType, startDate, endDate, filters } = req.body;

      if (!reportType || !startDate || !endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Report type, start date, and end date are required',
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      const report = await ViolationService.generateReport(reportType, start, end, filters);

      logger.info(`Report generated by ${req.user!.employeeId}: ${reportType} from ${startDate} to ${endDate}`);
      
      res.status(200).json({
        status: 'success',
        message: 'Report generated successfully',
        data: { report },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/violations/my-stats (for current officer)
  static async getMyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      const end = endDate ? new Date(endDate as string) : new Date();

      const stats = await ViolationService.getOfficerStats(req.user!.userId, start, end);
      
      res.status(200).json({
        status: 'success',
        message: 'Your statistics retrieved successfully',
        data: { 
          officer: {
            id: req.user!.userId,
            employeeId: req.user!.employeeId,
            name: req.fullUser!.fullName
          },
          stats,
          period: {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
          }
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/violations/dashboard/summary
  static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get different time periods
      const [todayStats, weekStats, monthStats] = await Promise.all([
        ViolationService.getSystemStatistics(
          new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          today
        ),
        ViolationService.getSystemStatistics(
          new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          today
        ),
        ViolationService.getSystemStatistics(thirtyDaysAgo, today)
      ]);

      const dashboardData = {
        today: {
          violations: todayStats.totalViolations,
          amount: todayStats.totalAmount,
          collectionRate: todayStats.totalAmount > 0 ? 
            (todayStats.paidAmount / todayStats.totalAmount) * 100 : 0
        },
        week: {
          violations: weekStats.totalViolations,
          amount: weekStats.totalAmount,
          collectionRate: weekStats.totalAmount > 0 ? 
            (weekStats.paidAmount / weekStats.totalAmount) * 100 : 0
        },
        month: {
          violations: monthStats.totalViolations,
          amount: monthStats.totalAmount,
          collectionRate: monthStats.totalAmount > 0 ? 
            (monthStats.paidAmount / monthStats.totalAmount) * 100 : 0,
          topViolationTypes: monthStats.topViolationTypes.slice(0, 5),
          monthlyTrends: monthStats.monthlyTrends
        }
      };

      res.status(200).json({
        status: 'success',
        message: 'Dashboard summary retrieved successfully',
        data: { dashboard: dashboardData },
      });
    } catch (error) {
      next(error);
    }
  }
}