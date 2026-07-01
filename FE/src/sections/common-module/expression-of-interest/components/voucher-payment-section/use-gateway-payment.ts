import type { RefObject } from 'react';
import type { FormikProps } from 'formik';
import type { AppDispatch } from 'src/redux/store';

import { useDispatch } from 'react-redux';
import { useMemo, useState, useCallback, useLayoutEffect } from 'react';

import { GATEWAY } from 'src/utils/payment';
import { EOIFinanceStatus } from 'src/utils/constant';
import { useRazorpayPayment } from 'src/utils/ useRazorpayPayment';
import { useEasebuzzPayment } from 'src/utils/ useEasebuzzPayment';

import { createRazorpayOrder, verifyVoucherPayment } from 'src/redux/actions/rm-panel/eoi-actions';

/** Notes passed to `createRazorpayOrder` (guest, ids, product info). */
export type GatewayOrderNotes = {
  entityId: string;
  projectId?: number | string;
  voucherId?: string | number;
  productInfo?: string;
  guest: { name: string; email?: string; phone?: string };
};

function normalizeGateways(raw: unknown): GATEWAY[] {
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    return [GATEWAY.RAZORPAY, GATEWAY.EASEBUZZ];
  }
  return raw
    .map((g: string) => {
      if (g === 'Razorpay') return GATEWAY.RAZORPAY;
      if (g === 'Easebuzz') return GATEWAY.EASEBUZZ;
      return null;
    })
    .filter(Boolean) as GATEWAY[];
}

/**
 * Razorpay + Easebuzz order creation, client SDK launch, verify API retries,
 * and failure modal state — shared by EOI “more details” and inventory map flows.
 */
export function useGatewayPayment(options: {
  formikRef: RefObject<FormikProps<any> | null>;
  /** `notes.voucherAmount` for create order (e.g. payable from campaign rules or sum of txn amounts). */
  resolveVoucherAmount: (formValues: any) => number;
  /** Build entity/guest/ids for payment order; called with current Formik values when user pays. */
  getOrderNotes: (formValues: any) => GatewayOrderNotes;
  /** e.g. `campaignDetails?.availableGateways ?? voucherData?.availableGateways` */
  availableGatewaysFromCampaign?: unknown;
}) {
  const { formikRef, resolveVoucherAmount, getOrderNotes, availableGatewaysFromCampaign } = options;

  const dispatch: AppDispatch = useDispatch();
  const { initiatePayment, paymentResponse } = useRazorpayPayment();
  const { initiateEasebuzzPayment, paymentResponse: easebuzzPaymentResponse } = useEasebuzzPayment();

  const [paymentIndex, setPaymentIndex] = useState<number | null>(null);
  const [payButtonLoading, setPayButtonLoading] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [openPaymentFailedModal, setOpenPaymentFailedModal] = useState(false);
  const [failedAmount, setFailedAmount] = useState<number | null>(null);
  const [failedGatewayForRetry, setFailedGatewayForRetry] = useState<GATEWAY | null>(null);

  const availableGateways = useMemo(
    () => normalizeGateways(availableGatewaysFromCampaign),
    [availableGatewaysFromCampaign]
  );

  const hasOnlyRazorpay =
    availableGateways.length === 1 && availableGateways.includes(GATEWAY.RAZORPAY);
  const hasOnlyEasebuzz =
    availableGateways.length === 1 && availableGateways.includes(GATEWAY.EASEBUZZ);

  const applyVerifiedGatewayPayment = useCallback(
    (index: number, method: string, date: string, gatewayPaymentId: string) => {
      formikRef.current?.setFieldValue(`transactions[${index}].isPaid`, true);
      formikRef.current?.setFieldValue(`transactions[${index}].status`, EOIFinanceStatus.UNVERIFIED);
      formikRef.current?.setFieldValue(`transactions[${index}].date`, date);
      formikRef.current?.setFieldValue(`transactions[${index}].onlineMethod`, method);
      formikRef.current?.setFieldValue(`transactions[${index}].gatewayPaymentId`, gatewayPaymentId);
    },
    [formikRef]
  );

  const handleRazorPay = useCallback(
    async (amount: number, index: number, formik: FormikProps<any>) => {
      try {
        setPayButtonLoading(true);
        const notes = getOrderNotes(formik?.values || {});
        const orderRes = await dispatch(
          createRazorpayOrder({
            amount,
            entityType: 'voucher',
            projectId: notes.projectId,
            entityId: notes.entityId,
            gateway: GATEWAY?.RAZORPAY,
            notes: {
              voucherId: notes.voucherId,
              voucherAmount: resolveVoucherAmount(formik?.values || {}),
              productInfo: notes.productInfo,
              guest: notes.guest,
            },
          })
        ).unwrap();

        setPaymentIndex(index);
        initiatePayment({
          amount: orderRes?.razorpayOrder?.amount,
          currency: orderRes?.razorpayOrder?.currency,
          orderId: orderRes?.razorpayOrder?.id,
          razorpayKey: orderRes?.razorpayKey?.key ?? orderRes?.razorpayKey,
          name: 'Puravankara',
          description: 'Payment',
          prefill: {
            name: orderRes?.razorpayOrder?.notes?.guest?.name,
            email: orderRes?.razorpayOrder?.notes?.guest?.email,
            contact: orderRes?.razorpayOrder?.notes?.guest?.phone,
          },
          onPaymentFailed: () => {
            setPaymentIndex(index);
            setFailedAmount(amount);
            setFailedGatewayForRetry(hasOnlyRazorpay ? GATEWAY.RAZORPAY : null);
            setOpenPaymentFailedModal(true);
          },
        });
      } catch (err) {
        console.error('Payment failed:', err);
        setPaymentIndex(index);
        setFailedAmount(amount);
        setFailedGatewayForRetry(hasOnlyRazorpay ? GATEWAY.RAZORPAY : null);
        setOpenPaymentFailedModal(true);
      } finally {
        setPayButtonLoading(false);
      }
    },
    [
      dispatch,
      getOrderNotes,
      initiatePayment,
      hasOnlyRazorpay,
      resolveVoucherAmount,
    ]
  );

  const handleEasebuzzPay = useCallback(
    async (amount: number, index: number, formik: FormikProps<any>) => {
      try {
        setPayButtonLoading(true);
        const notes = getOrderNotes(formik?.values || {});
        const orderRes = await dispatch(
          createRazorpayOrder({
            amount,
            entityType: 'voucher',
            entityId: notes.entityId,
            projectId: notes.projectId,
            gateway: GATEWAY.EASEBUZZ,
            redirectUrl: globalThis.location.href,
            notes: {
              voucherId: notes.voucherId,
              voucherAmount: resolveVoucherAmount(formik?.values || {}),
              productInfo: notes.productInfo,
              guest: notes.guest,
            },
          })
        ).unwrap();

        const orderAccessKey = orderRes.accessKey;
        if (!orderAccessKey) {
          throw new Error('Backend did not return access_key');
        }

        setPaymentIndex(index);
        await initiateEasebuzzPayment({
          orderAccessKey,
          easebuzzKey: orderRes?.easebuzzKey,
        });
      } catch (err) {
        console.error(err);
        setPaymentIndex(index);
        setFailedAmount(amount);
        setFailedGatewayForRetry(hasOnlyEasebuzz ? GATEWAY.EASEBUZZ : null);
        setOpenPaymentFailedModal(true);
      } finally {
        setPayButtonLoading(false);
      }
    },
    [
      dispatch,
      getOrderNotes,
      hasOnlyEasebuzz,
      initiateEasebuzzPayment,
      resolveVoucherAmount,
    ]
  );

  const handleProceedGateway = useCallback(
    (selectedGateway: string) => {
      if (paymentIndex === null) return;

      const amount =
        failedAmount != null && Number.isFinite(Number(failedAmount))
          ? Number(failedAmount)
          : Number(formikRef.current?.values?.transactions?.[paymentIndex]?.amount) || 0;

      if (amount <= 0) return;

      setFailedAmount(null);
      setFailedGatewayForRetry(null);

      if (selectedGateway === GATEWAY.RAZORPAY && formikRef.current) {
        handleRazorPay(amount, paymentIndex, formikRef.current);
      } else if (selectedGateway === GATEWAY.EASEBUZZ && formikRef.current) {
        handleEasebuzzPay(amount, paymentIndex, formikRef.current);
      }

      setOpenPaymentFailedModal(false);
    },
    [failedAmount, formikRef, handleEasebuzzPay, handleRazorPay, paymentIndex]
  );

  const handleClosePaymentFailedModal = useCallback(() => {
    setOpenPaymentFailedModal(false);
    setFailedGatewayForRetry(null);
  }, []);

  useLayoutEffect(() => {
    let cleanup: (() => void) | undefined;

    if (!paymentResponse || paymentIndex === null) {
      return cleanup;
    }

    let attempts = 0;
    let isVerified = false;
    setFailedAmount(null);
    setIsVerifyingPayment(true);

    const openVerifyFailureModalRazorpay = () => {
      setIsVerifyingPayment(false);
      formikRef.current?.setFieldValue(
        `transactions[${paymentIndex}].status`,
        EOIFinanceStatus.UNVERIFIED
      );
      const amt =
        Number(formikRef.current?.values?.transactions?.[paymentIndex]?.amount) || 0;
      setFailedAmount(amt);
      setFailedGatewayForRetry(hasOnlyRazorpay ? GATEWAY.RAZORPAY : null);
      setOpenPaymentFailedModal(true);
    };

    const verifyPayment = async () => {
      attempts += 1;

      try {
        const res = await dispatch(
          verifyVoucherPayment({
            orderId: paymentResponse?.razorpay_order_id,
            paymentId: paymentResponse?.razorpay_payment_id,
            signature: paymentResponse?.razorpay_signature,
            gateway: GATEWAY.RAZORPAY,
            clientResponse: JSON.stringify(paymentResponse),
          })
        ).unwrap();

        if (res?.status === 'success') {
          isVerified = true;
          setIsVerifyingPayment(false);
          applyVerifiedGatewayPayment(
            paymentIndex,
            res?.method,
            res?.date,
            res?.gatewayPaymentId
          );
          return;
        }
        if (attempts < 3 && !isVerified) {
          setTimeout(verifyPayment, 2000);
        } else {
          openVerifyFailureModalRazorpay();
        }
      } catch (error) {
        console.error(error);
        if (attempts < 3) {
          setTimeout(verifyPayment, 2000);
        } else {
          openVerifyFailureModalRazorpay();
        }
      }
    };

    verifyPayment();

    cleanup = () => {
      setIsVerifyingPayment(false);
    };
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentResponse]);

  useLayoutEffect(() => {
    let cleanup: (() => void) | undefined;

    if (!easebuzzPaymentResponse) {
      return cleanup;
    }

    const isFailure =
      easebuzzPaymentResponse?.status === 'failure' ||
      easebuzzPaymentResponse?.status === 'failed' ||
      easebuzzPaymentResponse?.result === 'failed' ||
      easebuzzPaymentResponse?.result === 'failure' ||
      easebuzzPaymentResponse?.success === false;

    if (isFailure) {
      setIsVerifyingPayment(false);
      const amountFromResponse = Number(easebuzzPaymentResponse?.amount);
      const amountFromForm =
        paymentIndex !== null
          ? Number(formikRef.current?.values?.transactions?.[paymentIndex]?.amount)
          : Number.NaN;
      setFailedAmount(
        Number.isFinite(amountFromResponse) ? amountFromResponse : amountFromForm
      );
      setFailedGatewayForRetry(hasOnlyEasebuzz ? GATEWAY.EASEBUZZ : null);
      setOpenPaymentFailedModal(true);
      return cleanup;
    }

    if (paymentIndex === null) {
      return cleanup;
    }

    let attempts = 0;
    let isVerified = false;
    setFailedAmount(null);

    const openVerifyFailureModalEasebuzz = () => {
      setIsVerifyingPayment(false);
      formikRef.current?.setFieldValue(
        `transactions[${paymentIndex}].status`,
        EOIFinanceStatus.UNVERIFIED
      );
      const amt =
        Number(formikRef.current?.values?.transactions?.[paymentIndex]?.amount) || 0;
      setFailedAmount(amt);
      setFailedGatewayForRetry(hasOnlyEasebuzz ? GATEWAY.EASEBUZZ : null);
      setOpenPaymentFailedModal(true);
    };

    const verifyPayment = async () => {
      attempts += 1;

      try {
        const res = await dispatch(
          verifyVoucherPayment({
            orderId: easebuzzPaymentResponse?.txnid,
            paymentId: easebuzzPaymentResponse?.easepayid,
            signature: easebuzzPaymentResponse?.hash,
            gateway: GATEWAY.EASEBUZZ,
            clientResponse: JSON.stringify(easebuzzPaymentResponse),
          })
        ).unwrap();

        if (res?.status === 'success') {
          isVerified = true;
          setIsVerifyingPayment(false);
          applyVerifiedGatewayPayment(
            paymentIndex,
            res?.method,
            res?.date,
            res?.gatewayPaymentId
          );
          return;
        }
        if (attempts < 3 && !isVerified) {
          setTimeout(verifyPayment, 2000);
        } else {
          openVerifyFailureModalEasebuzz();
        }
      } catch (error) {
        console.error(error);
        if (attempts < 3) {
          setTimeout(verifyPayment, 2000);
        } else {
          openVerifyFailureModalEasebuzz();
        }
      }
    };

    if (easebuzzPaymentResponse?.status === 'success') {
      setIsVerifyingPayment(true);
      verifyPayment();
    }

    cleanup = () => {
      setIsVerifyingPayment(false);
    };
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [easebuzzPaymentResponse]);

  return {
    availableGateways,
    payButtonLoading,
    isVerifyingPayment,
    openPaymentFailedModal,
    failedGatewayForRetry,
    handleRazorPay,
    handleEasebuzzPay,
    handleProceedGateway,
    handleClosePaymentFailedModal,
  };
}
