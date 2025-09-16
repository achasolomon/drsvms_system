import { Op, WhereOptions, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Violation, ViolationType, VehicleOwner, User, Payment, sequelize } from '../models';
import { VehicleService } from './vehicleService';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface ViolationCreateData {
    plateNumber: string;
    officerId: number;
    violationTypeIds: number[]; // Support multiple violations in one stop
    locationLat?: number;
    locationLng?: number;
    locationAddress?: string;
    locationState: string;
    locationLga?: string;
    evidencePhotos?: string[]; // Array of photo filenames
    additionalEvidence?: string;
    officerNotes?: string;
    weatherCondition?: string;
    roadCondition?: string;
    trafficCondition?: string;
}

export interface ViolationSearchQuery {
    plateNumber?: string;
    ticketNumber?: string;
    officerId?: number;
    violationTypeId?: number;
    status?: 'pending' | 'paid' | 'partially_paid' | 'contested' | 'dismissed' | 'court_pending';
    locationState?: string;
    locationLga?: string;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    page?: number;
    limit?: number;
    sortBy?: 'violationDate' | 'dueDate' | 'fineAmount' | 'ticketNumber';
    sortOrder?: 'ASC' | 'DESC';
}

export interface ViolationSearchResult {
    violations: Violation[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    summary: {
        totalAmount: number;
        paidAmount: number;
        pendingAmount: number;
        violationsByStatus: { [key: string]: number };
    };
}

export interface ViolationStatistics {
    totalViolations: number;
    totalAmount: number;
    paidViolations: number;
    paidAmount: number;
    pendingViolations: number;
    pendingAmount: number;
    contestedViolations: number;
    topViolationTypes: Array<{
        type: string;
        count: number;
        totalAmount: number;
    }>;
    monthlyTrends: Array<{
        month: string;
        violations: number;
        amount: number;
    }>;
}

export class ViolationService {
    // Create new violation record
    static async createViolation(data: ViolationCreateData): Promise<{
        violations: Violation[];
        totalAmount: number;
        totalPoints: number;
        vehicleOwner?: VehicleOwner;
        suspensionTriggered: boolean;
    }> {
        const transaction = await sequelize.transaction();

        try {
            const {
                plateNumber,
                officerId,
                violationTypeIds,
                locationLat,
                locationLng,
                locationAddress,
                locationState,
                locationLga,
                evidencePhotos = [],
                additionalEvidence,
                officerNotes,
                weatherCondition,
                roadCondition,
                trafficCondition,
            } = data;

            // Validate violation types
            const violationTypes = await ViolationType.findAll({
                where: {
                    id: { [Op.in]: violationTypeIds },
                    isActive: true
                }
            });

            if (violationTypes.length !== violationTypeIds.length) {
                throw createError('One or more violation types are invalid or inactive', 400);
            }

            // Lookup or create vehicle owner
            const vehicleLookup = await VehicleService.lookupByPlateNumber(plateNumber);
            let vehicleOwner = vehicleLookup.vehicle;

            // If vehicle owner not found, create a basic record
            if (!vehicleOwner) {
                logger.warn(`Vehicle not found for plate ${plateNumber}, creating basic record`);
                vehicleOwner = await VehicleService.createVehicle({
                    plateNumber,
                    fullName: 'Unknown Owner', // Will be updated when more info is available
                });
            }

            // Create violation records (one for each violation type)
            const violations: Violation[] = [];
            let totalAmount = 0;
            let totalPoints = 0;

            for (const violationType of violationTypes) {
                const violation = await Violation.create({
                    ticketNumber: `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // or uuidv4()
                    plateNumber: vehicleOwner.plateNumber,
                    vehicleOwnerId: vehicleOwner.id,
                    officerId,
                    violationTypeId: violationType.id,
                    fineAmount: violationType.fineAmount,
                    points: violationType.points,
                    locationLat,
                    locationLng,
                    locationAddress,
                    locationState,
                    locationLga,
                    evidencePhoto: evidencePhotos[0] || undefined,
                    additionalEvidence: JSON.stringify({
                        additionalPhotos: evidencePhotos.slice(1),
                        notes: additionalEvidence
                    }),
                    officerNotes,
                    weatherCondition,
                    roadCondition,
                    trafficCondition,
                }, { transaction });

                violations.push(violation);
                totalAmount += violationType.fineAmount;
                totalPoints += violationType.points;
            }

            // Update vehicle owner points
            const newPoints = vehicleOwner.currentPoints + totalPoints;
            let suspensionTriggered = false;

            if (newPoints >= 12 && vehicleOwner.status === 'active') {
                vehicleOwner.status = 'suspended';
                suspensionTriggered = true;
                logger.warn(`Vehicle ${vehicleOwner.plateNumber} suspended due to points (${newPoints})`);
            }

            vehicleOwner.currentPoints = newPoints;
            await vehicleOwner.save({ transaction });

            // Log violation creation
            logger.info(`${violations.length} violation(s) created for ${plateNumber} by officer ${officerId}, Total: ₦${totalAmount}, Points: ${totalPoints}`);

            await transaction.commit();

            return {
                violations,
                totalAmount,
                totalPoints,
                vehicleOwner,
                suspensionTriggered
            };

        } catch (error) {
            await transaction.rollback();
            logger.error('Violation creation failed:', error);
            throw error;
        }
    }

    // Search violations with advanced filtering
    static async searchViolations(query: ViolationSearchQuery): Promise<ViolationSearchResult> {
        const {
            plateNumber,
            ticketNumber,
            officerId,
            violationTypeId,
            status,
            locationState,
            locationLga,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            page = 1,
            limit = 20,
            sortBy = 'violationDate',
            sortOrder = 'DESC'
        } = query;

        // Build WHERE conditions
        const whereConditions: WhereOptions = {};

        if (plateNumber) {
            whereConditions.plateNumber = {
                [Op.like]: `%${plateNumber.toUpperCase()}%`
            };
        }

        if (ticketNumber) {
            whereConditions.ticketNumber = {
                [Op.like]: `%${ticketNumber.toUpperCase()}%`
            };
        }

        if (officerId) {
            whereConditions.officerId = officerId;
        }

        if (violationTypeId) {
            whereConditions.violationTypeId = violationTypeId;
        }

        if (status) {
            whereConditions.status = status;
        }

        if (locationState) {
            whereConditions.locationState = locationState;
        }

        if (locationLga) {
            whereConditions.locationLga = {
                [Op.like]: `%${locationLga}%`
            };
        }

        if (startDate && endDate) {
            whereConditions.violationDate = {
                [Op.between]: [startDate, endDate]
            };
        } else if (startDate) {
            whereConditions.violationDate = {
                [Op.gte]: startDate
            };
        } else if (endDate) {
            whereConditions.violationDate = {
                [Op.lte]: endDate
            };
        }

        if (minAmount && maxAmount) {
            whereConditions.fineAmount = {
                [Op.between]: [minAmount, maxAmount]
            };
        } else if (minAmount) {
            whereConditions.fineAmount = {
                [Op.gte]: minAmount
            };
        } else if (maxAmount) {
            whereConditions.fineAmount = {
                [Op.lte]: maxAmount
            };
        }

        // Calculate pagination
        const offset = (page - 1) * limit;

        try {
            // Execute search with includes
            const { count, rows } = await Violation.findAndCountAll({
                where: whereConditions,
                include: [
                    {
                        model: ViolationType,
                        as: 'violationType',
                        attributes: ['title', 'code', 'category']
                    },
                    {
                        model: User,
                        as: 'officer',
                        attributes: ['fullName', 'employeeId', 'rank']
                    },
                    {
                        model: VehicleOwner,
                        as: 'vehicleOwner',
                        attributes: ['fullName', 'phone', 'email', 'currentPoints']
                    },
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: ['amount', 'status', 'paymentDate']
                    }
                ],
                limit,
                offset,
                order: [[sortBy, sortOrder]],
            });

            // Calculate summary statistics
            const summaryData = await this.calculateSearchSummary(whereConditions);

            const totalPages = Math.ceil(count / limit);

            return {
                violations: rows,
                totalCount: count,
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                summary: summaryData
            };

        } catch (error) {
            logger.error('Violation search error:', error);
            throw createError('Failed to search violations', 500);
        }
    }

    // Calculate summary for search results
    private static async calculateSearchSummary(whereConditions: WhereOptions): Promise<{
        totalAmount: number;
        paidAmount: number;
        pendingAmount: number;
        violationsByStatus: { [key: string]: number };
    }> {
        try {
            const summaryQuery = await Violation.findAll({
                where: whereConditions,
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('fineAmount')), 'totalAmount']
                ],
                group: ['status'],
                raw: true
            });

            let totalAmount = 0;
            let paidAmount = 0;
            let pendingAmount = 0;
            const violationsByStatus: { [key: string]: number } = {};

            for (const item of summaryQuery as any[]) {
                const status = item.status;
                const count = parseInt(item.count);
                const amount = parseFloat(item.totalAmount) || 0;

                violationsByStatus[status] = count;
                totalAmount += amount;

                if (status === 'paid') {
                    paidAmount += amount;
                } else if (status === 'pending' || status === 'partially_paid') {
                    pendingAmount += amount;
                }
            }

            return {
                totalAmount,
                paidAmount,
                pendingAmount,
                violationsByStatus
            };

        } catch (error) {
            logger.error('Summary calculation error:', error);
            return {
                totalAmount: 0,
                paidAmount: 0,
                pendingAmount: 0,
                violationsByStatus: {}
            };
        }
    }

    // Get violation by ID
    static async getViolationById(id: number): Promise<Violation> {
        const violation = await Violation.findByPk(id, {
            include: [
                {
                    model: ViolationType,
                    as: 'violationType'
                },
                {
                    model: User,
                    as: 'officer',
                    attributes: ['fullName', 'employeeId', 'rank', 'phone']
                },
                {
                    model: VehicleOwner,
                    as: 'vehicleOwner'
                },
                {
                    model: Payment,
                    as: 'payments'
                }
            ]
        });

        if (!violation) {
            throw createError('Violation not found', 404);
        }

        return violation;
    }

    // Get violation by ticket number
    static async getViolationByTicketNumber(ticketNumber: string): Promise<Violation> {
        const violation = await Violation.findOne({
            where: { ticketNumber: ticketNumber.toUpperCase() },
            include: [
                {
                    model: ViolationType,
                    as: 'violationType'
                },
                {
                    model: User,
                    as: 'officer',
                    attributes: ['fullName', 'employeeId', 'rank']
                },
                {
                    model: VehicleOwner,
                    as: 'vehicleOwner'
                },
                {
                    model: Payment,
                    as: 'payments'
                }
            ]
        });

        if (!violation) {
            throw createError('Violation not found', 404);
        }

        return violation;
    }

    // Update violation status
    static async updateViolationStatus(
        id: number,
        status: 'pending' | 'paid' | 'partially_paid' | 'contested' | 'dismissed' | 'court_pending',
        updatedBy: number,
        notes?: string
    ): Promise<Violation> {
        const violation = await Violation.findByPk(id);

        if (!violation) {
            throw createError('Violation not found', 404);
        }

        const oldStatus = violation.status;
        violation.status = status;

        if (notes) {
            const existingNotes = violation.officerNotes || '';
            violation.officerNotes = `${existingNotes}\n[${new Date().toISOString()}] Status changed from ${oldStatus} to ${status}: ${notes}`;
        }

        if (status === 'paid') {
            violation.paidDate = new Date();
        }

        await violation.save();

        logger.info(`Violation ${violation.ticketNumber} status updated from ${oldStatus} to ${status} by user ${updatedBy}`);

        return violation;
    }

    // Contest violation
    static async contestViolation(
        id: number,
        contestReason: string,
        contestedBy?: number
    ): Promise<Violation> {
        const violation = await Violation.findByPk(id);

        if (!violation) {
            throw createError('Violation not found', 404);
        }

        if (violation.status !== 'pending') {
            throw createError('Only pending violations can be contested', 400);
        }

        violation.status = 'contested';
        violation.contestDate = new Date();
        violation.contestReason = contestReason;

        await violation.save();

        logger.info(`Violation ${violation.ticketNumber} contested: ${contestReason}`);

        return violation;
    }

    // Get violations for a specific plate number
    static async getViolationsByPlateNumber(plateNumber: string): Promise<{
        violations: Violation[];
        summary: {
            totalViolations: number;
            totalAmount: number;
            paidAmount: number;
            outstandingAmount: number;
            currentPoints: number;
            suspensionStatus: string;
        };
    }> {
        try {
            const violations = await Violation.findAll({
                where: { plateNumber: plateNumber.toUpperCase() },
                include: [
                    {
                        model: ViolationType,
                        as: 'violationType',
                        attributes: ['title', 'code', 'category']
                    },
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: ['amount', 'status', 'paymentDate']
                    }
                ],
                order: [['violationDate', 'DESC']]
            });

            // Get vehicle owner info
            const vehicleOwner = await VehicleOwner.findOne({
                where: { plateNumber: plateNumber.toUpperCase() },
                attributes: ['currentPoints', 'status']
            });

            // Calculate summary
            let totalAmount = 0;
            let paidAmount = 0;

            for (const violation of violations) {
                totalAmount += violation.fineAmount;

                if (violation.status === 'paid') {
                    paidAmount += violation.fineAmount;
                }
            }

            return {
                violations,
                summary: {
                    totalViolations: violations.length,
                    totalAmount,
                    paidAmount,
                    outstandingAmount: totalAmount - paidAmount,
                    currentPoints: vehicleOwner?.currentPoints || 0,
                    suspensionStatus: vehicleOwner?.status || 'unknown'
                }
            };

        } catch (error) {
            logger.error('Get violations by plate error:', error);
            throw createError('Failed to get violations for plate number', 500);
        }
    }

    // Get officer violation statistics
    static async getOfficerStats(officerId: number, startDate?: Date, endDate?: Date): Promise<{
        totalViolations: number;
        totalAmount: number;
        averagePerDay: number;
        topViolationTypes: Array<{
            type: string;
            count: number;
        }>;
        dailyActivity: Array<{
            date: string;
            violations: number;
            amount: number;
        }>;
    }> {
        try {
            const whereConditions: WhereOptions = { officerId };

            if (startDate && endDate) {
                whereConditions.violationDate = {
                    [Op.between]: [startDate, endDate]
                };
            }

            const violations = await Violation.findAll({
                where: whereConditions,
                include: [
                    {
                        model: ViolationType,
                        as: 'violationType',
                        attributes: ['title', 'code']
                    }
                ],
                order: [['violationDate', 'DESC']]
            });

            // Calculate statistics
            const totalViolations = violations.length;
            const totalAmount = violations.reduce((sum, v) => sum + v.fineAmount, 0);

            const daysDiff = startDate && endDate
                ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
                : 30; // Default to 30 days
            const averagePerDay = totalViolations / daysDiff;

            // Top violation types - FIXED: proper type access
            const typeMap: { [key: string]: number } = {};
            violations.forEach(v => {
                // Use type assertion to access the included relation
                const violationWithType = v as any;
                const type = violationWithType.violationType?.title || 'Unknown';
                typeMap[type] = (typeMap[type] || 0) + 1;
            });

            const topViolationTypes = Object.entries(typeMap)
                .map(([type, count]) => ({ type, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            // Daily activity (last 30 days)
            const dailyMap: { [key: string]: { violations: number; amount: number } } = {};
            violations.forEach(v => {
                const date = v.violationDate.toISOString().split('T')[0];
                if (!dailyMap[date]) {
                    dailyMap[date] = { violations: 0, amount: 0 };
                }
                dailyMap[date].violations++;
                dailyMap[date].amount += v.fineAmount;
            });

            const dailyActivity = Object.entries(dailyMap)
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => a.date.localeCompare(b.date));

            return {
                totalViolations,
                totalAmount,
                averagePerDay: Math.round(averagePerDay * 100) / 100,
                topViolationTypes,
                dailyActivity
            };

        } catch (error) {
            logger.error('Officer stats error:', error);
            throw createError('Failed to get officer statistics', 500);
        }
    }

    // Get system-wide violation statistics
    static async getSystemStatistics(startDate?: Date, endDate?: Date): Promise<ViolationStatistics> {
        try {
            const whereConditions: WhereOptions = {};

            if (startDate && endDate) {
                whereConditions.violationDate = {
                    [Op.between]: [startDate, endDate]
                };
            }

            // Get all violations with related data
            const violations = await Violation.findAll({
                where: whereConditions,
                include: [
                    {
                        model: ViolationType,
                        as: 'violationType',
                        attributes: ['title', 'category']
                    }
                ]
            });

            // Calculate basic stats
            const totalViolations = violations.length;
            const totalAmount = violations.reduce((sum, v) => sum + v.fineAmount, 0);

            const paidViolations = violations.filter(v => v.status === 'paid').length;
            const paidAmount = violations
                .filter(v => v.status === 'paid')
                .reduce((sum, v) => sum + v.fineAmount, 0);

            const pendingViolations = violations.filter(v => v.status === 'pending').length;
            const pendingAmount = violations
                .filter(v => v.status === 'pending')
                .reduce((sum, v) => sum + v.fineAmount, 0);

            const contestedViolations = violations.filter(v => v.status === 'contested').length;

            // Top violation types - FIXED: proper type access
            const typeMap: { [key: string]: { count: number; amount: number } } = {};
            violations.forEach(v => {
                // Use type assertion to access the included relation
                const violationWithType = v as any;
                const type = violationWithType.violationType?.title || 'Unknown';
                if (!typeMap[type]) {
                    typeMap[type] = { count: 0, amount: 0 };
                }
                typeMap[type].count++;
                typeMap[type].amount += v.fineAmount;
            });

            const topViolationTypes = Object.entries(typeMap)
                .map(([type, data]) => ({ type, count: data.count, totalAmount: data.amount }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // Monthly trends (last 12 months)
            const monthlyMap: { [key: string]: { violations: number; amount: number } } = {};
            violations.forEach(v => {
                const monthKey = v.violationDate.toISOString().substring(0, 7); // YYYY-MM
                if (!monthlyMap[monthKey]) {
                    monthlyMap[monthKey] = { violations: 0, amount: 0 };
                }
                monthlyMap[monthKey].violations++;
                monthlyMap[monthKey].amount += v.fineAmount;
            });

            const monthlyTrends = Object.entries(monthlyMap)
                .map(([month, data]) => ({ month, ...data }))
                .sort((a, b) => a.month.localeCompare(b.month))
                .slice(-12); // Last 12 months

            return {
                totalViolations,
                totalAmount,
                paidViolations,
                paidAmount,
                pendingViolations,
                pendingAmount,
                contestedViolations,
                topViolationTypes,
                monthlyTrends
            };

        } catch (error) {
            logger.error('System statistics error:', error);
            throw createError('Failed to get system statistics', 500);
        }
    }

    // Generate violation report
    static async generateReport(
        reportType: 'daily' | 'weekly' | 'monthly',
        startDate: Date,
        endDate: Date,
        filters?: {
            state?: string;
            officerId?: number;
            violationTypeId?: number;
        }
    ): Promise<{
        reportMetadata: {
            type: string;
            period: string;
            generatedAt: Date;
            filters: any;
        };
        summary: {
            totalViolations: number;
            totalAmount: number;
            collectionRate: number;
        };
        breakdowns: {
            byState: Array<{ state: string; violations: number; amount: number }>;
            byOfficer: Array<{ officer: string; violations: number; amount: number }>;
            byViolationType: Array<{ type: string; violations: number; amount: number }>;
            byStatus: Array<{ status: string; violations: number; amount: number }>;
        };
    }> {
        try {
            const whereConditions: WhereOptions = {
                violationDate: {
                    [Op.between]: [startDate, endDate]
                }
            };

            if (filters?.state) whereConditions.locationState = filters.state;
            if (filters?.officerId) whereConditions.officerId = filters.officerId;
            if (filters?.violationTypeId) whereConditions.violationTypeId = filters.violationTypeId;

            const violations = await Violation.findAll({
                where: whereConditions,
                include: [
                    {
                        model: ViolationType,
                        as: 'violationType',
                        attributes: ['title', 'code']
                    },
                    {
                        model: User,
                        as: 'officer',
                        attributes: ['fullName', 'employeeId']
                    }
                ]
            });

            // Calculate summary
            const totalViolations = violations.length;
            const totalAmount = violations.reduce((sum, v) => sum + v.fineAmount, 0);
            const paidAmount = violations
                .filter(v => v.status === 'paid')
                .reduce((sum, v) => sum + v.fineAmount, 0);
            const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

            // Generate breakdowns using the fixed helper method
            const byState = this.generateBreakdown(violations, 'locationState') as Array<{ state: string; violations: number; amount: number }>;
            const byOfficer = this.generateBreakdown(violations, 'officer', (v: any) =>
                `${v.officer?.fullName} (${v.officer?.employeeId})`
            ) as Array<{ officer: string; violations: number; amount: number }>;
            const byViolationType = this.generateBreakdown(violations, 'violationType', (v: any) =>
                v.violationType?.title || 'Unknown'
            ) as Array<{ type: string; violations: number; amount: number }>;
            const byStatus = this.generateBreakdown(violations, 'status') as Array<{ status: string; violations: number; amount: number }>;

            return {
                reportMetadata: {
                    type: reportType,
                    period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
                    generatedAt: new Date(),
                    filters: filters || {}
                },
                summary: {
                    totalViolations,
                    totalAmount,
                    collectionRate: Math.round(collectionRate * 100) / 100
                },
                breakdowns: {
                    byState,
                    byOfficer,
                    byViolationType,
                    byStatus
                }
            };

        } catch (error) {
            logger.error('Report generation error:', error);
            throw createError('Failed to generate violation report', 500);
        }
    }

    // Helper method for generating breakdowns - FIXED VERSION
    private static generateBreakdown(
        violations: Violation[],
        field: string,
        valueExtractor?: (violation: any) => string
    ): any[] {
        const map: { [key: string]: { violations: number; amount: number } } = {};

        violations.forEach(v => {
            let key: string;
            if (valueExtractor) {
                key = valueExtractor(v);
            } else {
                key = (v as any)[field] || 'Unknown';
            }

            if (!map[key]) {
                map[key] = { violations: 0, amount: 0 };
            }
            map[key].violations++;
            map[key].amount += v.fineAmount;
        });

        // Return appropriate structure based on field type
        return Object.entries(map)
            .map(([key, data]) => {
                switch (field) {
                    case 'locationState':
                        return { state: key, violations: data.violations, amount: data.amount };
                    case 'officer':
                        return { officer: key, violations: data.violations, amount: data.amount };
                    case 'violationType':
                        return { type: key, violations: data.violations, amount: data.amount };
                    case 'status':
                        return { status: key, violations: data.violations, amount: data.amount };
                    default:
                        return { [field]: key, violations: data.violations, amount: data.amount };
                }
            })
            .sort((a, b) => b.violations - a.violations);
    }
}