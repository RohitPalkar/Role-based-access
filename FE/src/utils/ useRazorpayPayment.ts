import { useState } from 'react';

/* ----------------------------- Types ----------------------------- */

interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

interface RazorpayOptions {
  razorpayKey: string;
  amount: number; // in paise
  currency?: string;
  orderId: string;
  name?: string;
  description?: string;
  callbackUrl?: string;
  prefill?: RazorpayPrefill;
  notes?: Record<string, any>;
  themeColor?: string;
  /** Called when user payment fails (e.g. to show retry modal) */
  onPaymentFailed?: (error: RazorpayFailureResponse) => void;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: Record<string, any>;
  };
}

/* ---------------------- Script Loader ---------------------- */

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );

    if (existingScript) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

/* ------------------------- Hook ------------------------- */

const restoreScroll = () => {
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
};

export function useRazorpayPayment() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResponse, setPaymentResponse] =
    useState<RazorpaySuccessResponse | null>(null);

  const initiatePayment = async (
    options: RazorpayOptions
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const scriptLoaded = await loadScript(
        'https://checkout.razorpay.com/v1/checkout.js'
      );

      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }

      const RazorpayConstructor = (window as any).Razorpay;

      if (!RazorpayConstructor) {
        throw new Error('Razorpay not available on window');
      }

      const rzp = new RazorpayConstructor({
        key: options.razorpayKey,
        amount: options.amount,
        currency: options.currency || 'INR',
        callback_url: options.callbackUrl,
        order_id: options.orderId,
        name: options.name || 'Puravankara',
        description: options.description || 'Payment',
        prefill: options.prefill,
        notes: options.notes,
        theme: { color: options.themeColor || '#3399cc' },

        handler: (response: RazorpaySuccessResponse) => {
          restoreScroll();
          setPaymentResponse(response);
        },

        modal: {
          ondismiss: () => {
            restoreScroll();
            // Treat dismiss without paying as failure so retry modal can show
            options.onPaymentFailed?.({
              error: { code: 'MODAL_CLOSED', description: 'Payment cancelled or modal closed' },
            });
          },
        },
      });

      rzp.on('payment.failed', (response: RazorpayFailureResponse) => {
        console.error('Payment failed:', response.error);
        restoreScroll();
        setError(response.error?.description || 'Payment failed');
        options.onPaymentFailed?.(response);
      });

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      rzp.open();
    } catch (err: unknown) {
      restoreScroll();
      console.error('Razorpay Payment Error:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    initiatePayment,
    loading,
    error,
    paymentResponse,
  };
}
