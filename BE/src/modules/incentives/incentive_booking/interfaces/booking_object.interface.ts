import { ProjectPhase } from 'src/entities';
import {
  UnitStatusEnum,
  ReraStatusEnum,
  PaymentStatusEnum,
} from 'src/enums/booking-list.enums';
import { Users } from 'src/modules/users/entities/user.entity';

export interface FinalBookingData {
  fy: string; // Fiscal Year
  entity: string;
  bookingDate: string | null;
  bookingDeadline: Date | null;
  stmName: string;
  stm: string;
  stm2?: string;
  stm3?: string;
  vendor: string;
  customerCode: string;
  bookingId: string;
  customerName: string;
  propertyNumber: string;
  externalBPNumber: string;
  saleType: string;
  agreementReceivedDate: Date | null;
  grossTotalValue: number;
  totalReceived: number;
  status: string;
  cancellationDate?: Date | null;
  receivedDate?: Date | null;
  paymentStatus: PaymentStatusEnum;
  reraStatus: ReraStatusEnum;
  sba: number;
  carpetArea: number;
  salesOffice: string;
  projectPhase: ProjectPhase | null; // Can store the phase object or just the ID
  user: Users | null; // Can store the user object or just the ID
  receivedPercent: number;

  isDeadlineApproaching: boolean;

  // Regularization & Payable
  regularizationPercentage: number;
  payablePercentage: number;
  regularizedAmount: number;
  payableAmount: number;
  incentivePercentage: number;

  // Incentive & Salary
  incentiveAmount: number;
  userSalary: number;
  maxIncentiveMultiplier: number;
  maxAllowedIncentive: number;
  accruedIncentive: number;

  // Final
  unitStatus: UnitStatusEnum;
}
