import { Request, Response, NextFunction } from 'express';
import { VehicleService } from '../services/vehicleService';
import { PlateValidator } from '../utils/plateValidation';
import { logger } from '../utils/logger';

export class VehicleController {
  // GET /api/v1/vehicles/search
  static async searchVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query;
      const page = parseInt(query.page as string) || 1;
      const limit = parseInt(query.limit as string) || 20;

      // Limit maximum results per page
      const maxLimit = Math.min(limit, 100);

      const searchQuery = {
        plateNumber: query.plateNumber as string,
        licenseNumber: query.licenseNumber as string,
        fullName: query.fullName as string,
        phone: query.phone as string,
        email: query.email as string,
        state: query.state as string,
        status: query.status as 'active' | 'suspended' | 'expired' | 'revoked',
        page,
        limit: maxLimit
      };

      const result = await VehicleService.searchVehicles(searchQuery);

      res.status(200).json({
        status: 'success',
        message: `Found ${result.totalCount} vehicle(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/vehicles/lookup/:plateNumber
  static async lookupByPlateNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const { plateNumber } = req.params;
      
      if (!plateNumber) {
        return res.status(400).json({
          status: 'error',
          message: 'Plate number is required',
        });
      }

      const result = await VehicleService.lookupByPlateNumber(plateNumber);
      
      // Log the lookup attempt
      logger.info(`Plate lookup by ${req.user?.employeeId}: ${plateNumber} -> ${result.vehicle ? 'Found' : 'Not found'}`);

      res.status(200).json({
        status: 'success',
        message: result.vehicle ? 'Vehicle found' : 'Vehicle not found',
        data: {
          vehicle: result.vehicle,
          plateValidation: result.plateValidation,
          suggestions: result.suggestions,
          searchedPlate: plateNumber,
          normalizedPlate: result.plateValidation.normalized
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/vehicles/validate-plate
  static async validatePlateNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const { plateNumber } = req.body;
      
      if (!plateNumber) {
        return res.status(400).json({
          status: 'error',
          message: 'Plate number is required',
        });
      }

      const validation = PlateValidator.validatePlateNumber(plateNumber);
      
      res.status(200).json({
        status: 'success',
        message: validation.isValid ? 'Valid Nigerian plate number' : 'Invalid plate number format',
        data: {
          isValid: validation.isValid,
          normalized: validation.normalized,
          originalInput: plateNumber,
          format: validation.format,
          errors: validation.errors,
          category: validation.isValid ? PlateValidator.getPlateCategory(validation.normalized) : null,
          isCommercial: validation.isValid ? PlateValidator.isCommercialVehicle(validation.normalized) : null,
          isGovernment: validation.isValid ? PlateValidator.isGovernmentVehicle(validation.normalized) : null
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/vehicles/:id
  static async getVehicleById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const vehicleId = parseInt(id);

      if (isNaN(vehicleId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid vehicle ID',
        });
      }

      const vehicle = await VehicleService.getVehicleById(vehicleId);
      
      res.status(200).json({
        status: 'success',
        data: { vehicle },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/vehicles (Admin/Supervisor only)
  static async createVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const vehicleData = req.body;
      const vehicle = await VehicleService.createVehicle(vehicleData);
      
      logger.info(`Vehicle created by ${req.user?.employeeId}: ${vehicle.plateNumber}`);
      
      res.status(201).json({
        status: 'success',
        message: 'Vehicle record created successfully',
        data: { vehicle },
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/v1/vehicles/:id (Admin/Supervisor only)
  static async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const vehicleId = parseInt(id);
      const updateData = req.body;

      if (isNaN(vehicleId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid vehicle ID',
        });
      }

      const vehicle = await VehicleService.updateVehicle(vehicleId, updateData);
      
      logger.info(`Vehicle updated by ${req.user?.employeeId}: ${vehicle.plateNumber}`);
      
      res.status(200).json({
        status: 'success',
        message: 'Vehicle record updated successfully',
        data: { vehicle },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/vehicles/:plateNumber/stats
  static async getVehicleStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { plateNumber } = req.params;
      
      if (!plateNumber) {
        return res.status(400).json({
          status: 'error',
          message: 'Plate number is required',
        });
      }

      const stats = await VehicleService.getVehicleViolationStats(plateNumber);
      
      res.status(200).json({
        status: 'success',
        data: { 
          plateNumber,
          stats 
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/vehicles/similar/:plateNumber
  static async findSimilarPlates(req: Request, res: Response, next: NextFunction) {
    try {
      const { plateNumber } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!plateNumber) {
        return res.status(400).json({
          status: 'error',
          message: 'Plate number is required',
        });
      }

      const similarPlates = await VehicleService.findSimilarPlateNumbers(plateNumber, Math.min(limit, 20));
      
      res.status(200).json({
        status: 'success',
        message: `Found ${similarPlates.length} similar plate numbers`,
        data: {
          searchedPlate: plateNumber,
          similarPlates
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/vehicles/bulk-import (Admin only)
  static async bulkImportVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const { vehicles } = req.body;
      
      if (!Array.isArray(vehicles) || vehicles.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Vehicles array is required and must not be empty',
        });
      }

      // Limit bulk import size
      if (vehicles.length > 1000) {
        return res.status(400).json({
          status: 'error',
          message: 'Maximum 1000 vehicles per bulk import',
        });
      }

      const result = await VehicleService.bulkImportVehicles(vehicles);
      
      logger.info(`Bulk import by ${req.user?.employeeId}: ${result.successful} successful, ${result.failed} failed`);
      
      res.status(200).json({
        status: 'success',
        message: `Bulk import completed: ${result.successful} successful, ${result.failed} failed`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/vehicles/expired-licenses
  static async getExpiredLicenses(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const vehicles = await VehicleService.getVehiclesWithExpiredLicenses(Math.min(limit, 500));
      
      res.status(200).json({
        status: 'success',
        message: `Found ${vehicles.length} vehicles with expired licenses`,
        data: { vehicles },
      });
    } catch (error) {
      next(error);
    }
  }
}