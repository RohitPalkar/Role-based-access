import type { FormikProps } from 'formik';

import { useEffect, type RefObject } from 'react';

import PaymentFailedModal from 'src/sections/common-module/expression-of-interest/PaymentFailedModal';
import PaymentDetailsForm from 'src/sections/common-module/expression-of-interest/components/payment-details-form';

import {
  useGatewayPayment,
  type GatewayOrderNotes,
} from './use-gateway-payment';

type Props = Readonly<{
  formikRef: RefObject<FormikProps<any> | null>;
  /** Current Formik instance (same ref target) for `PaymentDetailsForm`. */
  moreDetailsFormik: FormikProps<any>;
  isCreate?: boolean;
  showAddTransaction?: boolean;
  totalAmountPayable?: number;
  resolveVoucherAmount: (formValues: any) => number;
  getOrderNotes: (formValues: any) => GatewayOrderNotes;
  availableGatewaysFromCampaign?: unknown;
  /** True while Proceed / gateway SDK / verify API is in progress (for disabling parent submit). */
  onGatewayBusyChange?: (busy: boolean) => void;
}>;

/**
 * Pay online (Razorpay / Easebuzz) + pay offline UI and gateway verification,
 * shared across EOI more-details and other flows that use `transactions[]` on Formik.
 */
export function PaymentSection({
  formikRef,
  moreDetailsFormik,
  isCreate = true,
  showAddTransaction = true,
  totalAmountPayable,
  resolveVoucherAmount,
  getOrderNotes,
  availableGatewaysFromCampaign,
  onGatewayBusyChange,
}: Props) {
  const {
    availableGateways,
    payButtonLoading,
    isVerifyingPayment,
    openPaymentFailedModal,
    failedGatewayForRetry,
    handleRazorPay,
    handleEasebuzzPay,
    handleProceedGateway,
    handleClosePaymentFailedModal,
  } = useGatewayPayment({
    formikRef,
    resolveVoucherAmount,
    getOrderNotes,
    availableGatewaysFromCampaign,
  });

  const gatewayBusy = payButtonLoading || isVerifyingPayment;
  useEffect(() => {
    onGatewayBusyChange?.(gatewayBusy);
  }, [gatewayBusy, onGatewayBusyChange]);

  return (
    <>
      <PaymentDetailsForm
        moreDetailsFormik={moreDetailsFormik}
        isCreate={isCreate}
        handleRazorPay={handleRazorPay}
        handleEasebuzzPay={handleEasebuzzPay}
        payButtonLoading={payButtonLoading}
        verifyingPayment={isVerifyingPayment}
        totalAmountPayable={totalAmountPayable}
        availableGateways={availableGateways}
        showAddTransaction={showAddTransaction}
      />
      <PaymentFailedModal
        open={openPaymentFailedModal}
        onClose={handleClosePaymentFailedModal}
        onProceed={handleProceedGateway}
        allowedGateways={availableGateways}
        singleGatewayMode={failedGatewayForRetry != null}
        retryGateway={failedGatewayForRetry}
      />
    </>
  );
}
