import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

// Define User attributes
interface UserAttributes {
  id: number;
  employeeId: string;
  email: string;
  passwordHash: string;
  role: 'officer' | 'admin' | 'supervisor';
  fullName: string;
  phone: string;
  state: string;
  zone: string;
  unit?: string;
  rank?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define creation attributes (optional fields for creation)
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isActive' | 'lastLogin' | 'createdAt' | 'updatedAt'> {}

// Define User model class
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public employeeId!: string;
  public email!: string;
  public passwordHash!: string;
  public role!: 'officer' | 'admin' | 'supervisor';
  public fullName!: string;
  public phone!: string;
  public state!: string;
  public zone!: string;
  public unit?: string;
  public rank?: string;
  public isActive!: boolean;
  public lastLogin?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance method to check password
  public async checkPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  // Static method to hash password
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}

// Initialize User model
User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'employee_id',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    role: {
      type: DataTypes.ENUM('officer', 'admin', 'supervisor'),
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'full_name',
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    zone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    rank: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login',
    },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
  }
);

export default User;