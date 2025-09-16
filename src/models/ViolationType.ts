import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ViolationTypeAttributes {
  id: number;
  code: string;
  title: string;
  description: string;
  fineAmount: number;
  points: number;
  category: 'equipment' | 'documentation' | 'traffic' | 'parking' | 'vehicle_condition' | 'dangerous_driving';
  suspensionEligible: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ViolationTypeCreationAttributes extends Optional<ViolationTypeAttributes, 'id' | 'points' | 'suspensionEligible' | 'isActive' | 'createdAt' | 'updatedAt'> {}

class ViolationType extends Model<ViolationTypeAttributes, ViolationTypeCreationAttributes> implements ViolationTypeAttributes {
  public id!: number;
  public code!: string;
  public title!: string;
  public description!: string;
  public fineAmount!: number;
  public points!: number;
  public category!: 'equipment' | 'documentation' | 'traffic' | 'parking' | 'vehicle_condition' | 'dangerous_driving';
  public suspensionEligible!: boolean;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ViolationType.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    fineAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'fine_amount',
      validate: {
        min: 0,
      },
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 12,
      },
    },
    category: {
      type: DataTypes.ENUM('equipment', 'documentation', 'traffic', 'parking', 'vehicle_condition', 'dangerous_driving'),
      allowNull: false,
    },
    suspensionEligible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'suspension_eligible',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    tableName: 'violation_types',
    underscored: true,
    timestamps: true,
  }
);

export default ViolationType;