
export enum GATEWAY {
  RAZORPAY = "Razorpay",
  EASEBUZZ = "Easebuzz",
}

export const PAYMENT_GATEWAY_OPTIONS =[
  { value: GATEWAY.EASEBUZZ, label: 'Easebuzz' },
  { value: GATEWAY.RAZORPAY, label: 'Razorpay' },
];

export const MAX_TRANSACTION_LIMIT = 10;

export interface GuestDetails {
  name: string;
  email?: string;
  phone?: string;
}

export interface PaymentNotes {
  voucherId?: string | number;
  voucherAmount?:string | number;
  productInfo?: string;
  guest?: GuestDetails;
}

export interface CreateGatewayOrderPayload {
  amount: number;
  entityType: 'voucher' | 'eoi';
  entityId: string;
  projectId?: string | number;
  gateway: GATEWAY;
  redirectUrl?: string;
  notes?: PaymentNotes;
}

/* ---------- Razorpay ---------- */
export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface RazorpayKey {
  key: string;
  notes?: PaymentNotes;
}
export interface CreateRazorpayOrderPayload {
  amount: number;          // in paise
  entityType: any;
  entityId: string | number;
  projectId?: string | number;
  gateway?: string;
  notes?: PaymentNotes;
  redirectUrl?: string;
}

export interface RazorpayOrderResponse {
  razorpayOrder: RazorpayOrder;
  razorpayKey: RazorpayKey;
}

/* ---------- Easebuzz ---------- */
export interface EasebuzzOrderResponse {
  accessKey: string;
  easebuzzKey: string;
}
