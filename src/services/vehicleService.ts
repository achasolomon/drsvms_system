import { Op, WhereOptions } from 'sequelize';
import { VehicleOwner } from '../models';
import { PlateValidator } from '../utils/plateValidation';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface VehicleSearchQuery {
  plateNumber?: string;
  licenseNumber?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  state?: string;
  status?: 'active' | 'suspended' | 'expired' | 'revoked';
  page?: number;
  limit?: number;
}

export interface VehicleCreateData {
  plateNumber: string;
  licenseNumber?: string;
  fullName: string;
  address?: string;
  phone?: string;
  email?: string;
  stateOfResidence?: string;
  lga?: string;
  licenseClass?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  engineNumber?: string;
  chassisNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
}

export interface VehicleSearchResult {
  vehicles: VehicleOwner[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class VehicleService {
  // Search vehicles with advanced filtering and pagination
  static async searchVehicles(query: VehicleSearchQuery): Promise<VehicleSearchResult> {
    const {
      plateNumber,
      licenseNumber,
      fullName,
      phone,
      email,
      state,
      status,
      page = 1,
      limit = 20
    } = query;

    // Build WHERE conditions
    const whereConditions: WhereOptions = {};

    // Plate number search with normalization and fuzzy matching
    if (plateNumber) {
      const normalized = PlateValidator.normalizePlateNumber(plateNumber);
      const validation = PlateValidator.validatePlateNumber(normalized);
      
      if (validation.isValid) {
        whereConditions.plateNumber = normalized;
      } else {
        // Fuzzy search for similar plate numbers
        const allVehicles = await VehicleOwner.findAll({
          attributes: ['plateNumber'],
          raw: true
        });

        const fuzzyMatches = allVehicles
          .map(v => ({
            plateNumber: v.plateNumber,
            match: PlateValidator.fuzzyMatchPlate(normalized, v.plateNumber as string)
          }))
          .filter(v => v.match.isMatch)
          .map(v => v.plateNumber);

        if (fuzzyMatches.length > 0) {
          whereConditions.plateNumber = { [Op.in]: fuzzyMatches };
        } else {
          whereConditions.plateNumber = normalized; // Still search for exact match
        }
      }
    }

    // License number search
    if (licenseNumber) {
      whereConditions.licenseNumber = {
        [Op.like]: `%${licenseNumber.toUpperCase()}%`
      };
    }

    // Full name search (case insensitive, partial match)
    if (fullName) {
      whereConditions.fullName = {
        [Op.like]: `%${fullName}%`
      };
    }

    // Phone number search
    if (phone) {
      whereConditions.phone = {
        [Op.like]: `%${phone}%`
      };
    }

    // Email search
    if (email) {
      whereConditions.email = {
        [Op.like]: `%${email.toLowerCase()}%`
      };
    }

    // State search
    if (state) {
      whereConditions.stateOfResidence = state;
    }

    // Status filter
    if (status) {
      whereConditions.status = status;
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    try {
      // Execute search with pagination
      const { count, rows } = await VehicleOwner.findAndCountAll({
        where: whereConditions,
        limit,
        offset,
        order: [['updatedAt', 'DESC']],
      });

      const totalPages = Math.ceil(count / limit);

      return {
        vehicles: rows,
        totalCount: count,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      logger.error('Vehicle search error:', error);
      throw createError('Failed to search vehicles', 500);
    }
  }

  // Lookup vehicle by plate number (primary method for officers)
  static async lookupByPlateNumber(plateNumber: string): Promise<{
    vehicle: VehicleOwner | null;
    plateValidation: any;
    suggestions?: string[];
  }> {
    try {
      // Validate and normalize plate number
      const validation = PlateValidator.validatePlateNumber(plateNumber);
      
      if (!validation.isValid) {
        logger.warn(`Invalid plate number format: ${plateNumber}`);
        // Still try to search in case it's in database with different format
      }

      const normalizedPlate = validation.normalized;

      // Direct search first
      let vehicle = await VehicleOwner.findOne({
        where: { plateNumber: normalizedPlate }
      });

      const suggestions: string[] = [];

      // If not found, try fuzzy matching
      if (!vehicle && !validation.isValid) {
        const allVehicles = await VehicleOwner.findAll({
          attributes: ['id', 'plateNumber', 'fullName'],
          raw: true
        });

        const fuzzyMatches = allVehicles
          .map(v => ({
            ...v,
            match: PlateValidator.fuzzyMatchPlate(normalizedPlate, v.plateNumber as string, 0.6)
          }))
          .filter(v => v.match.isMatch)
          .sort((a, b) => b.match.similarity - a.match.similarity)
          .slice(0, 5);

        if (fuzzyMatches.length > 0) {
          // Get the best match
          const bestMatch = fuzzyMatches[0];
          vehicle = await VehicleOwner.findByPk(bestMatch.id);
          
          // Add suggestions
          suggestions.push(...fuzzyMatches.map(m => m.plateNumber as string));
        }
      }

      logger.info(`Plate lookup: ${plateNumber} -> ${vehicle ? 'Found' : 'Not found'}`);

      return {
        vehicle,
        plateValidation: validation,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };
    } catch (error) {
      logger.error('Plate lookup error:', error);
      throw createError('Failed to lookup vehicle', 500);
    }
  }

  // Get vehicle by ID
  static async getVehicleById(id: number): Promise<VehicleOwner> {
    const vehicle = await VehicleOwner.findByPk(id);
    
    if (!vehicle) {
      throw createError('Vehicle not found', 404);
    }

    return vehicle;
  }

  // Create new vehicle owner record
  static async createVehicle(data: VehicleCreateData): Promise<VehicleOwner> {
    // Validate plate number format
    const plateValidation = PlateValidator.validatePlateNumber(data.plateNumber);
    
    if (!plateValidation.isValid) {
      throw createError(`Invalid plate number: ${plateValidation.errors.join(', ')}`, 400);
    }

    // Check if plate number already exists
    const existingVehicle = await VehicleOwner.findOne({
      where: { plateNumber: plateValidation.normalized }
    });

    if (existingVehicle) {
      throw createError('Plate number already exists', 409);
    }

    // Check if license number already exists (if provided)
    if (data.licenseNumber) {
      const existingLicense = await VehicleOwner.findOne({
        where: { licenseNumber: data.licenseNumber.toUpperCase() }
      });

      if (existingLicense) {
        throw createError('License number already exists', 409);
      }
    }

    try {
      const vehicle = await VehicleOwner.create({
        ...data,
        plateNumber: plateValidation.normalized,
        licenseNumber: data.licenseNumber?.toUpperCase(),
        email: data.email?.toLowerCase(),
      });

      logger.info(`New vehicle created: ${vehicle.plateNumber} - ${vehicle.fullName}`);
      return vehicle;
    } catch (error) {
      logger.error('Vehicle creation error:', error);
      throw createError('Failed to create vehicle record', 500);
    }
  }

  // Update vehicle owner record
  static async updateVehicle(id: number, updateData: Partial<VehicleCreateData>): Promise<VehicleOwner> {
    const vehicle = await VehicleOwner.findByPk(id);
    
    if (!vehicle) {
      throw createError('Vehicle not found', 404);
    }

    // If updating plate number, validate it
    if (updateData.plateNumber && updateData.plateNumber !== vehicle.plateNumber) {
      const plateValidation = PlateValidator.validatePlateNumber(updateData.plateNumber);
      
      if (!plateValidation.isValid) {
        throw createError(`Invalid plate number: ${plateValidation.errors.join(', ')}`, 400);
      }

      // Check if new plate number already exists
      const existingPlate = await VehicleOwner.findOne({
        where: { 
          plateNumber: plateValidation.normalized,
          id: { [Op.ne]: id }
        }
      });

      if (existingPlate) {
        throw createError('Plate number already exists', 409);
      }

      updateData.plateNumber = plateValidation.normalized;
    }

    // If updating license number, validate it
    if (updateData.licenseNumber && updateData.licenseNumber !== vehicle.licenseNumber) {
      const existingLicense = await VehicleOwner.findOne({
        where: { 
          licenseNumber: updateData.licenseNumber.toUpperCase(),
          id: { [Op.ne]: id }
        }
      });

      if (existingLicense) {
        throw createError('License number already exists', 409);
      }

      updateData.licenseNumber = updateData.licenseNumber.toUpperCase();
    }

    // Normalize email
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    try {
      await vehicle.update(updateData);
      
      logger.info(`Vehicle updated: ${vehicle.plateNumber} - ${vehicle.fullName}`);
      return vehicle;
    } catch (error) {
      logger.error('Vehicle update error:', error);
      throw createError('Failed to update vehicle record', 500);
    }
  }

  // Get vehicle violation history count
  static async getVehicleViolationStats(plateNumber: string): Promise<{
    totalViolations: number;
    paidViolations: number;
    pendingViolations: number;
    totalFines: number;
    outstandingAmount: number;
  }> {
    try {
      // This will be implemented when we create the violation service
      // For now, return default values
      return {
        totalViolations: 0,
        paidViolations: 0,
        pendingViolations: 0,
        totalFines: 0,
        outstandingAmount: 0
      };
    } catch (error) {
      logger.error('Vehicle stats error:', error);
      throw createError('Failed to get vehicle statistics', 500);
    }
  }

  // Bulk import vehicles (for FRSC integration)
  static async bulkImportVehicles(vehicles: VehicleCreateData[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const vehicleData of vehicles) {
      try {
        await this.createVehicle(vehicleData);
        successful++;
      } catch (error: any) {
        failed++;
        errors.push(`${vehicleData.plateNumber}: ${error.message}`);
      }
    }

    logger.info(`Bulk import completed: ${successful} successful, ${failed} failed`);

    return {
      successful,
      failed,
      errors: errors.slice(0, 50) // Limit error messages
    };
  }

  // Get vehicles with expired licenses
  static async getVehiclesWithExpiredLicenses(limit: number = 100): Promise<VehicleOwner[]> {
    try {
      const vehicles = await VehicleOwner.findAll({
        where: {
          expiryDate: {
            [Op.lt]: new Date()
          },
          status: 'active'
        },
        order: [['expiryDate', 'ASC']],
        limit
      });

      return vehicles;
    } catch (error) {
      logger.error('Expired licenses query error:', error);
      throw createError('Failed to get vehicles with expired licenses', 500);
    }
  }

  // Update vehicle points
  static async updateVehiclePoints(plateNumber: string, pointsToAdd: number): Promise<VehicleOwner> {
    const vehicle = await VehicleOwner.findOne({
      where: { plateNumber: PlateValidator.normalizePlateNumber(plateNumber) }
    });

    if (!vehicle) {
      throw createError('Vehicle not found', 404);
    }

    const newPoints = vehicle.currentPoints + pointsToAdd;
    vehicle.currentPoints = Math.max(0, newPoints); // Don't allow negative points

    // Check for suspension threshold (12 points)
    if (vehicle.currentPoints >= 12 && vehicle.status === 'active') {
      vehicle.status = 'suspended';
      logger.warn(`Vehicle ${vehicle.plateNumber} suspended due to points (${vehicle.currentPoints})`);
    }

    await vehicle.save();
    return vehicle;
  }

  // Search similar plate numbers (for OCR errors)
  static async findSimilarPlateNumbers(plateNumber: string, limit: number = 10): Promise<{
    plateNumber: string;
    fullName: string;
    similarity: number;
  }[]> {
    try {
      const normalizedInput = PlateValidator.normalizePlateNumber(plateNumber);
      
      // Get all plate numbers for fuzzy matching
      const allVehicles = await VehicleOwner.findAll({
        attributes: ['plateNumber', 'fullName'],
        raw: true
      });

      const similarPlates = allVehicles
        .map(v => ({
          plateNumber: v.plateNumber as string,
          fullName: v.fullName as string,
          match: PlateValidator.fuzzyMatchPlate(normalizedInput, v.plateNumber as string, 0.5)
        }))
        .filter(v => v.match.isMatch)
        .sort((a, b) => b.match.similarity - a.match.similarity)
        .slice(0, limit)
        .map(v => ({
          plateNumber: v.plateNumber,
          fullName: v.fullName,
          similarity: Math.round(v.match.similarity * 100) / 100
        }));

      return similarPlates;
    } catch (error) {
      logger.error('Similar plates search error:', error);
      throw createError('Failed to find similar plate numbers', 500);
    }
  }
}