export enum RazorpayTxStatusEnum {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}

export enum RazorpayEventType {
  CAPTURED = 'payment.captured',
  FAILED = 'payment.failed',
  REFUNDED = 'refund.processed',
  DISPUTE = 'payment.dispute.created',
}

export enum EasebuzzEventEnum {
  SUCCESS = 'success',
  FAILURE = 'failure',
  REFUNDED = 'refund',
  USER_CANCELLED = 'userCancelled',
  INITIATED = 'initiated',
}

export enum RazorpayEntityEnum {
  BOOKING = 'bookings',
  VOUCHER = 'voucher',
}

export enum PaymentTxStatusEnum {
  UNVERIFIED = 'Pending Reco',
  VERIFIED = 'Realized',
  REJECTED = 'Rejected',
  REFUNDED = 'Refunded',
  REVERSED = 'Not Realized',
}

export enum PaymentModeEnum {
  GATEWAY = 'Gateway',
  OFFLINE = 'Offline',
}

export enum PaymentMethodEnum {
  CHEQUE_DD = 'CHEQUE',
  ONLINE_TRANSFER = 'ONLINE TRANSFER',
  UPI_CARD = 'UPI CARD',
  EDC_MACHINE = 'EDC MACHINE',
}

export enum PaymentGatewayEnum {
  RAZORPAY = 'Razorpay',
  EASEBUZZ = 'Easebuzz',
}
