import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface VehicleOwnerAttributes {
  id: number;
  licenseNumber?: string;
  plateNumber: string;
  fullName: string;
  address?: string;
  phone?: string;
  email?: string;
  stateOfResidence?: string;
  lga?: string;
  licenseClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  engineNumber?: string;
  chassisNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  status: 'active' | 'suspended' | 'expired' | 'revoked';
  currentPoints: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface VehicleOwnerCreationAttributes extends Optional<VehicleOwnerAttributes, 'id' | 'licenseClass' | 'status' | 'currentPoints' | 'createdAt' | 'updatedAt'> {}

class VehicleOwner extends Model<VehicleOwnerAttributes, VehicleOwnerCreationAttributes> implements VehicleOwnerAttributes {
  public id!: number;
  public licenseNumber?: string;
  public plateNumber!: string;
  public fullName!: string;
  public address?: string;
  public phone?: string;
  public email?: string;
  public stateOfResidence?: string;
  public lga?: string;
  public licenseClass!: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  public vehicleMake?: string;
  public vehicleModel?: string;
  public vehicleYear?: number;
  public vehicleColor?: string;
  public engineNumber?: string;
  public chassisNumber?: string;
  public issueDate?: Date;
  public expiryDate?: Date;
  public status!: 'active' | 'suspended' | 'expired' | 'revoked';
  public currentPoints!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance method to check if license is expired
  public isLicenseExpired(): boolean {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
  }

  // Instance method to check if suspension is warranted
  public shouldBeSuspended(pointThreshold: number = 12): boolean {
    return this.currentPoints >= pointThreshold;
  }
}

VehicleOwner.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    licenseNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      field: 'license_number',
    },
    plateNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'plate_number',
      validate: {
        notEmpty: true,
      },
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'full_name',
      validate: {
        notEmpty: true,
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    stateOfResidence: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'state_of_residence',
    },
    lga: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    licenseClass: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D', 'E', 'F'),
      defaultValue: 'C',
      field: 'license_class',
    },
    vehicleMake: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'vehicle_make',
    },
    vehicleModel: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'vehicle_model',
    },
    vehicleYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'vehicle_year',
      validate: {
        min: 1900,
        max: new Date().getFullYear() + 1,
      },
    },
    vehicleColor: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'vehicle_color',
    },
    engineNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'engine_number',
    },
    chassisNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'chassis_number',
    },
    issueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'issue_date',
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expiry_date',
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'expired', 'revoked'),
      defaultValue: 'active',
    },
    currentPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_points',
      validate: {
        min: 0,
      },
    },
  },
  {
    sequelize,
    tableName: 'vehicle_owners',
    underscored: true,
    timestamps: true,
  }
);

export default VehicleOwner;