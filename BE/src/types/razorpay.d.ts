declare module 'razorpay' {
  namespace Razorpay {
    interface OrderCreateRequestBody {
      amount: number;
      currency: string;
      receipt: string;
      payment_capture?: 1 | 0;
      notes?: any;
    }

    interface Order {
      id: string;
      entity: string;
      amount: number;
      amount_paid: number;
      amount_due: number;
      currency: string;
      receipt: string;
      status: string;
      attempts: number;
      created_at: number;
    }

    interface Orders {
      create(params: OrderCreateRequestBody): Promise<Order>;
    }
  }

  class Razorpay {
    constructor(options: { key_id: string; key_secret: string });
    orders: Razorpay.Orders;
  }

  export = Razorpay;
}
