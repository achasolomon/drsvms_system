import { User, VehicleOwner, ViolationType, Violation, Payment } from '../models';
import { logger } from './logger';

export const testDatabaseSetup = async () => {
  try {
    logger.info('Testing database setup...');

    // Test 1: Count violation types
    const violationTypesCount = await ViolationType.count();
    logger.info(`✅ Violation types in database: ${violationTypesCount}`);

    // Test 2: Count users
    const usersCount = await User.count();
    logger.info(`✅ Users in database: ${usersCount}`);

    // Test 3: Count vehicle owners
    const vehicleOwnersCount = await VehicleOwner.count();
    logger.info(`✅ Vehicle owners in database: ${vehicleOwnersCount}`);

    // Test 4: Test relationships
    const userWithViolations = await User.findOne({
      include: [{ model: Violation, as: 'violations' }]
    });
    
    if (userWithViolations) {
      logger.info(`✅ User relationships working`);
    }

    // Test 5: Test plate number lookup
    const testVehicle = await VehicleOwner.findOne({
      where: { plateNumber: 'ABC-123-DE' }
    });
    
    if (testVehicle) {
      logger.info(`✅ Plate lookup working: Found ${testVehicle.fullName}`);
    }

    logger.info('🎉 Database setup test completed successfully');
    
  } catch (error) {
    logger.error('❌ Database setup test failed:', error);
    throw error;
  }
};