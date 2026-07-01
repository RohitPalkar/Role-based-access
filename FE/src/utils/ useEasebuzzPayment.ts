import { useState } from 'react';


/* ----------------------------- Types ----------------------------- */

type EasebuzzEnv = 'test' | 'prod';

interface InitiateEasebuzzParams {
  orderAccessKey: string;
  easebuzzKey: string;
}

interface EasebuzzResponse {
  [key: string]: any; // Easebuzz response is dynamic
}

/* ---------------------- Script Loader ---------------------- */

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );

    if (existing) {
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

export function useEasebuzzPayment() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResponse, setPaymentResponse] =
    useState<EasebuzzResponse | null>(null);

  const isTestEnv: boolean =
     import.meta.env.VITE_APP_ENV === 'development' ||  import.meta.env.VITE_APP_ENV === 'staging';

  const initiateEasebuzzPayment = async ({
    orderAccessKey,
    easebuzzKey,
  }: InitiateEasebuzzParams): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!easebuzzKey) {
        throw new Error('Merchant key missing');
      }

      if (!orderAccessKey) {
        throw new Error('Missing order access_key');
      }

      const scriptLoaded = await loadScript(
        'https://ebz-static.s3.ap-south-1.amazonaws.com/easecheckout/v2.0.0/easebuzz-checkout-v2.min.js'
      );

      if (!scriptLoaded) {
        throw new Error('Easebuzz checkout script failed to load');
      }

      // Declare window type safely
      const {EasebuzzCheckout} = (window as any);

      if (!EasebuzzCheckout) {
        throw new Error('EasebuzzCheckout not found on window');
      }

      const env: EasebuzzEnv = isTestEnv ? 'test' : 'prod';

      const easebuzzCheckout = new EasebuzzCheckout(easebuzzKey, env);

      const options = {
        layout: 'popup', // safer for localhost
        access_key: orderAccessKey,
        onResponse: (response: EasebuzzResponse) => {
          setPaymentResponse(response);
          setLoading(false);
        },
        modal_close_handler: () => {
          // user closed popup
        },
        theme: '#1A407D',
      };

      // ❗ Do not await
      easebuzzCheckout.initiatePayment(options);

      /* ---------- UI adjustments (kept as-is) ---------- */
      setTimeout(() => {
        const container = document.querySelector<HTMLElement>(
          '[id*="easebuzz-container-v2"]'
        );
        const iframe = document.querySelector<HTMLElement>(
          '[id*="easebuzz-checkout-frame-v2"]'
        );
        const backdrop = document.querySelector<HTMLElement>(
          '[id*="easebuzz-checkout-backdrop-v2"]'
        );

        if (container) {
          if (backdrop) {
            backdrop.style.setProperty(
              'background',
              'rgba(0, 0, 0, 0.7)',
              'important'
            );
          }

          if (iframe) {
            iframe.style.setProperty('transform', 'scale(0.85)', 'important');
            iframe.style.setProperty(
              'transform-origin',
              'center',
              'important'
            );
            iframe.style.setProperty('max-height', '85vh', 'important');
            iframe.style.setProperty('height', '85vh', 'important');
            iframe.style.setProperty('top', '50%', 'important');
            iframe.style.setProperty('left', '50%', 'important');
            iframe.style.setProperty('translate', '-50% -50%', 'important');
            iframe.style.setProperty('position', 'absolute', 'important');
          }
        }
      }, 1000);
    } catch (err: unknown) {
      console.error('Easebuzz Payment Error:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }

      setLoading(false);
    }
  };

  return {
    initiateEasebuzzPayment,
    loading,
    error,
    paymentResponse,
  };
}
