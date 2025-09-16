import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PaymentAttributes {
  id: number;
  violationId: number;
  amount: number;
  paymentMethod: 'card' | 'bank_transfer' | 'ussd' | 'cash' | 'pos';
  paymentReference: string;
  gatewayReference?: string;
  gatewayProvider: 'paystack' | 'flutterwave' | 'interswitch';
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate: Date;
  gatewayResponse?: any;
  refundReason?: string;
  refundedAmount: number;
  refundDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PaymentCreationAttributes extends Optional<PaymentAttributes, 
  'id' | 'status' | 'paymentDate' | 'refundedAmount' | 'gatewayReference' | 'payerName' | 'payerEmail' | 'payerPhone' | 'gatewayResponse' | 'refundReason' | 'refundDate' | 'createdAt' | 'updatedAt'
> {}

class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  public id!: number;
  public violationId!: number;
  public amount!: number;
  public paymentMethod!: 'card' | 'bank_transfer' | 'ussd' | 'cash' | 'pos';
  public paymentReference!: string;
  public gatewayReference?: string;
  public gatewayProvider!: 'paystack' | 'flutterwave' | 'interswitch';
  public payerName?: string;
  public payerEmail?: string;
  public payerPhone?: string;
  public status!: 'pending' | 'completed' | 'failed' | 'refunded';
  public paymentDate!: Date;
  public gatewayResponse?: any;
  public refundReason?: string;
  public refundedAmount!: number;
  public refundDate?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association properties
  public violation?: any; // Will be populated by include
  public readonly violations?: any[]; // For hasMany relation

  // Static method to generate payment reference
  public static generatePaymentReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PAY_${timestamp}${random}`;
  }

  // Instance method to check if payment is successful
  public isSuccessful(): boolean {
    return this.status === 'completed';
  }

  // Instance method to check if refund is possible
  public canBeRefunded(): boolean {
    return this.status === 'completed' && this.refundedAmount === 0;
  }
}

Payment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    violationId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'violation_id',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    paymentMethod: {
      type: DataTypes.ENUM('card', 'bank_transfer', 'ussd', 'cash', 'pos'),
      allowNull: false,
      field: 'payment_method',
    },
    paymentReference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'payment_reference',
    },
    gatewayReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'gateway_reference',
    },
    gatewayProvider: {
      type: DataTypes.ENUM('paystack', 'flutterwave', 'interswitch'),
      allowNull: false,
      field: 'gateway_provider',
    },
    payerName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payer_name',
    },
    payerEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payer_email',
      validate: {
        isEmail: true,
      },
    },
    payerPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'payer_phone',
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending',
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'payment_date',
    },
    gatewayResponse: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'gateway_response',
    },
    refundReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refund_reason',
    },
    refundedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'refunded_amount',
    },
    refundDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'refund_date',
    },
  },
  {
    sequelize,
    tableName: 'payments',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeCreate: (payment: Payment) => {
        if (!payment.paymentReference) {
          payment.paymentReference = Payment.generatePaymentReference();
        }
      },
    },
  }
);

export default Payment;