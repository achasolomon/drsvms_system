// types/violation.ts
export interface ViolationWithAssociations {
  id: number;
  ticketNumber: string;
  plateNumber: string;
  fineAmount: number;
  status: 'pending' | 'paid' | 'partially_paid';
  paidDate?: Date;
  vehicleOwnerId: number;
  violationTypeId: number;
  
  // Association properties (populated by includes)
  vehicleOwner?: {
    id: number;
    fullName: string;
    plateNumber: string;
    phone?: string;
  };
  
  violationType?: {
    id: number;
    title: string;
    code: string;
  };
  
  payments?: any[];
}

export interface PaymentWithAssociations {
  id: number;
  violationId: number;
  amount: number;
  paymentMethod: string;
  paymentReference: string;
  gatewayReference?: string;
  gatewayProvider: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate: Date;
  gatewayResponse?: any;
  refundReason?: string;
  refundedAmount: number;
  refundDate?: Date;
  
  // Association properties
  violation?: ViolationWithAssociations;
}