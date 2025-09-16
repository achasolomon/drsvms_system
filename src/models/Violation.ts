import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import VehicleOwner from './VehicleOwner';

interface ViolationAttributes {
  id: number;
  ticketNumber: string;
  plateNumber: string;
  vehicleOwnerId?: number;
  officerId: number;
  violationTypeId: number;
  fineAmount: number;
  points: number;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  locationState: string;
  locationLga?: string;
  evidencePhoto?: string;
  additionalEvidence?: string;
  officerNotes?: string;
  weatherCondition?: string;
  roadCondition?: string;
  trafficCondition?: string;
  status: 'pending' | 'paid' | 'partially_paid' | 'contested' | 'dismissed' | 'court_pending';
  violationDate: Date;
  dueDate?: Date | null;
  paidDate?: Date | null;
  contestDate?: Date | null;
  contestReason?: string;
  isOverturned: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ViolationCreationAttributes extends Optional<ViolationAttributes, 'id' | 'vehicleOwnerId' | 'points' | 'status' | 'violationDate' | 'isOverturned' | 'createdAt' | 'updatedAt'> { }

class Violation extends Model<ViolationAttributes, ViolationCreationAttributes> implements ViolationAttributes {
  public id!: number;
  public ticketNumber!: string;
  public plateNumber!: string;
  public vehicleOwnerId?: number;
  public officerId!: number;
  public violationTypeId!: number;
  public vehicleOwner?: VehicleOwner;
  public fineAmount!: number;
  public points!: number;
  public locationLat?: number;
  public locationLng?: number;
  public locationAddress?: string;
  public locationState!: string;
  public locationLga?: string;
  public evidencePhoto?: string;
  public additionalEvidence?: string;
  public officerNotes?: string;
  public weatherCondition?: string;
  public roadCondition?: string;
  public trafficCondition?: string;
  public status!: 'pending' | 'paid' | 'partially_paid' | 'contested' | 'dismissed' | 'court_pending';
  public violationDate!: Date;
  public dueDate?: Date;
  public paidDate?: Date;
  public contestDate?: Date;
  public contestReason?: string;
  public isOverturned!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance method to generate ticket number
  public static generateTicketNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TK${year}${month}${day}${random}`;
  }

  // Instance method to check if violation is overdue
  public isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && this.status === 'pending';
  }

  // Instance method to calculate days until due
  public daysUntilDue(): number {
    if (!this.dueDate) return 0;
    const today = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

Violation.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    ticketNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'ticket_number',
    },
    plateNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'plate_number',
      validate: {
        notEmpty: true,
      },
    },
    vehicleOwnerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'vehicle_owner_id',
    },
    officerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'officer_id',
    },
    violationTypeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'violation_type_id',
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
      },
    },
    locationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      field: 'location_lat',
      validate: {
        min: -90,
        max: 90,
      },
    },
    locationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      field: 'location_lng',
      validate: {
        min: -180,
        max: 180,
      },
    },
    locationAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'location_address',
    },
    locationState: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'location_state',
    },
    locationLga: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'location_lga',
    },
    evidencePhoto: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'evidence_photo',
    },
    additionalEvidence: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'additional_evidence',
    },
    officerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'officer_notes',
    },
    weatherCondition: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'weather_condition',
    },
    roadCondition: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'road_condition',
    },
    trafficCondition: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'traffic_condition',
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'partially_paid', 'contested', 'dismissed', 'court_pending'),
      defaultValue: 'pending',
    },
    violationDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'violation_date',
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'due_date',
    },
    paidDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'paid_date',
    },
    contestDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'contest_date',
    },
    contestReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'contest_reason',
    },
    isOverturned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_overturned',
    },
  },
  {
    sequelize,
    tableName: 'violations',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeCreate: (violation: Violation) => {
        if (!violation.ticketNumber) {
          violation.ticketNumber = Violation.generateTicketNumber();
        }
        if (!violation.dueDate) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30); // 30 days to pay
          violation.dueDate = dueDate;
        }
      },
    },
  }
);

export default Violation;