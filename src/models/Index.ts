import sequelize from '../config/database';
import User from './User';
import VehicleOwner from './VehicleOwner';
import ViolationType from './ViolationType';
import Violation from './Violation';
import Payment from './Payment';

// Define associations

// User associations (Officers)
User.hasMany(Violation, {
  foreignKey: 'officerId',
  as: 'violations',
});

Violation.belongsTo(User, {
  foreignKey: 'officerId',
  as: 'officer',
});

// VehicleOwner associations
VehicleOwner.hasMany(Violation, {
  foreignKey: 'vehicleOwnerId',
  as: 'violations',
});

Violation.belongsTo(VehicleOwner, {
  foreignKey: 'vehicleOwnerId',
  as: 'vehicleOwner',
});

// ViolationType associations
ViolationType.hasMany(Violation, {
  foreignKey: 'violationTypeId',
  as: 'violations',
});

Violation.belongsTo(ViolationType, {
  foreignKey: 'violationTypeId',
  as: 'violationType',
});

// Violation-Payment associations
Violation.hasMany(Payment, {
  foreignKey: 'violationId',
  as: 'payments',
});

Payment.belongsTo(Violation, {
  foreignKey: 'violationId',
  as: 'violation',
});

// Export all models
export {
  sequelize,
  User,
  VehicleOwner,
  ViolationType,
  Violation,
  Payment,
};

// Export a function to sync all models
export const syncDatabase = async (options: { force?: boolean; alter?: boolean } = {}) => {
  try {
    const { force = false, alter = false } = options;
    await sequelize.sync({ force, alter });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Database sync error:', error);
    throw error;
  }
};