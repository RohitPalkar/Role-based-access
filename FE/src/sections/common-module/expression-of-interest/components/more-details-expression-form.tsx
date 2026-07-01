import '../../rm-panel.css';

import type { AppDispatch } from 'src/redux/store';
import type { Payment, UpdateVoucherEOI } from 'src/services/rm-panel/eoi-service';

import * as yup from 'yup';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { Form, Formik, type FormikProps } from 'formik';
import React, { useEffect, useLayoutEffect } from 'react';

import {
  Box,
  Card,
  Grid,
  Radio,
  Button,
  TextField,
  RadioGroup,
  Typography,
  FormControlLabel,
} from '@mui/material';

import { useParams, useRouter } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { GATEWAY } from 'src/utils/payment';
import { interpolate } from 'src/utils/helper';
import { useRazorpayPayment } from 'src/utils/ useRazorpayPayment';
import { useEasebuzzPayment } from 'src/utils/ useEasebuzzPayment';
import {
  EOI_TYPE,
  FORM_PHASE,
  EOI_PREFERENCE,
  EOIPaymentMode,
  EOIFinanceStatus,
  VoucherAmountType,
  generateRoleBasedRoute,
  CAMPAIGN_LIST_STATUS_OPTIONS,
} from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { deleteImage } from 'src/redux/actions/rm-panel/upload-actions';
import {
  updateVoucherEOI,
  createRazorpayOrder,
  verifyVoucherPayment,
  getEOICampaignDetailsById,
} from 'src/redux/actions/rm-panel/eoi-actions';

import NewDropzone from 'src/components/dropzone/NewDropzone';
import FormikAutocomplete from 'src/components/formik-autocomplete/FormikAutocomplete';

import { formatIndianCurrencyShort } from 'src/auth/context/jwt';

import { calculatePayableAmount } from '../utils';
import PaymentFailedModal from '../PaymentFailedModal';
import PaymentDetailsForm from './payment-details-form';
import MissingDocuments, { hasMissingDocumentsToShow } from './missing-documents';
import {
  getPreEoiAmount,
  getStdEoiAmount,
  hasPreEoiAmount,
  hasStdEoiAmount,
  getVoucherAmount,
  hasVoucherAmount,
  resolveTypologyForBhkHint,
} from '../eoi-amount-helpers';

import type { EoiCampaignDetailsWithBHK } from '../eoi-amount-helpers';

interface MoreDetailsExpressionFormProps {
  residentStatus: string;
}

/**
 * BHK-wise amounts need a typology. Until the user picks one, use the first inventory row
 * that has that amount so preference labels match API data (same idea as default first typology).
 */
function typologyForPreferenceAmountHint(
  campaignDetails: EoiCampaignDetailsWithBHK | null | undefined,
  selectedTypology: string | undefined | null,
  kind: 'voucher' | 'standard' | 'preferential'
): string {
  const t = typeof selectedTypology === 'string' ? selectedTypology.trim() : '';
  if (t) return t;

  const inventory = campaignDetails?.inventoryDetails || [];

  if (kind === 'voucher') {
    if (campaignDetails?.voucherAmountType === VoucherAmountType.BHK_WISE) {
      const inv = inventory.find((row) => row?.voucherAmt != null);
      if (inv?.type) return inv.type;
    }
    return inventory[0]?.type ?? '';
  }

  if (kind === 'standard') {
    if (campaignDetails?.stdEoiAmountType === VoucherAmountType.BHK_WISE) {
      const inv = inventory.find((row) => row?.standardEOIAmt != null);
      if (inv?.type) return inv.type;
    }
    return inventory[0]?.type ?? '';
  }

  if (campaignDetails?.preEoiAmountType === VoucherAmountType.BHK_WISE) {
    const inv = inventory.find((row) => row?.preferentialEOIAmt != null);
    if (inv?.type) return inv.type;
  }
  return inventory[0]?.type ?? '';
}

/* Styles */
const borderBottomStyle = {
  borderBottom: '1px dashed #DADADA',
  paddingBottom: '20px',
};

const Section = ({
  title,
  children,
  noBorder,
}: {
  title?: string;
  children: React.ReactNode;
  /** Omit dashed bottom rule (e.g. when a child supplies the only separator). */
  noBorder?: boolean;
}) => (
  <Box mb={3} sx={noBorder ? { pb: 0 } : { ...borderBottomStyle }}>
    {title && <Typography variant="h6">{title}</Typography>}
    <Grid container spacing={3} mt={2}>
      {children}
    </Grid>
  </Box>
);

const CustomTextField = ({
  name,
  label,
  required,
  formik,
  disabled = false,
}: {
  name: string;
  label: string;
  required?: boolean;
  formik: FormikProps<any>;
  disabled?: boolean;
}) => {
  const fieldError = formik.errors[name];
  const isTouched = formik.touched[name];
  return (
    <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
      <TextField
        fullWidth
        label={label}
        name={name}
        value={formik.values[name]}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={Boolean(isTouched && fieldError)}
        helperText={isTouched && typeof fieldError === 'string' ? fieldError : ''}
        InputLabelProps={{ required }}
        className="requiredField"
        disabled={disabled}
      />
    </Grid>
  );
};

/** Keeps eoiType aligned with campaign-visible preference rows (Voucher / Standard / Preferential). */
function EoiPreferenceSync({
  formik,
  visibleKeys,
  savedEoiType,
}: {
  formik: FormikProps<any>;
  visibleKeys: string[];
  savedEoiType?: string;
}) {
  React.useEffect(() => {
    if (!visibleKeys.length) return;
    const current = formik.values.eoiType;
    if (current && visibleKeys.includes(current)) return;
    const next =
      savedEoiType && visibleKeys.includes(savedEoiType) ? savedEoiType : visibleKeys[0];
    if (next) {
      formik.setFieldValue('eoiType', next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when visible options or saved type change
  }, [visibleKeys.join(','), savedEoiType]);

  return null;
}

const MoreDetailsExpressionForm = ({residentStatus}: MoreDetailsExpressionFormProps) => {
  const { id } = useParams();
  const isEditMode = !!id;
  const route = useRouter();
  const jsonValue = uiText.EOIJson.createEOI.form.moreDetails;
  const uploadFileText = uiText.EOIJson.createEOI.form.moreDetails.paymentDetails;
  const dispatch: AppDispatch = useDispatch();
  const { voucherData, campaignDetails } = useAppSelector((state) => state.expressonOfInterest);
  const isEOI = voucherData?.voucherForm?.formPhase === FORM_PHASE.EOI || voucherData?.formPhase === FORM_PHASE.EOI;
  const { initiatePayment, paymentResponse } = useRazorpayPayment();
  const { initiateEasebuzzPayment, paymentResponse: easebuzzPaymentResponse } = useEasebuzzPayment();
  const formikRef = React.useRef<FormikProps<any> | null>(null);
  const { userRole } = useRoleBasedPermissions({ module: 'eoi' });

  const [paymentIndex, setPaymentIndex] = React.useState<number | null>(null);
  const [payButtonLoading, setPayButtonLoading] = React.useState(false);
  /** True until verifyVoucherPayment succeeds, fails after retries, or failure modal opens. */
  const [isVerifyingPayment, setIsVerifyingPayment] = React.useState(false);
  const [openPaymentFailedModal, setOpenPaymentFailedModal] = React.useState(false);
  const [failedAmount, setFailedAmount] = React.useState<number | null>(null);
  const [failedGatewayForRetry, setFailedGatewayForRetry] = React.useState<GATEWAY | null>(null);

  const availableGateways = React.useMemo((): GATEWAY[] => {
    const raw = campaignDetails?.availableGateways ?? voucherData?.availableGateways;
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
  }, [campaignDetails?.availableGateways, voucherData?.availableGateways]);

  const hasOnlyRazorpay =
    availableGateways.length === 1 && availableGateways.includes(GATEWAY.RAZORPAY);
  const hasOnlyEasebuzz =
    availableGateways.length === 1 && availableGateways.includes(GATEWAY.EASEBUZZ);

  const getLivePayableAmount = React.useCallback(
    (values: { typology?: string; eoiType?: string }) =>
      calculatePayableAmount(isEOI, values?.eoiType, campaignDetails, voucherData, {
        typology: resolveTypologyForBhkHint(campaignDetails, values?.typology),
        eoiType: values?.eoiType,
      }),
    [isEOI, campaignDetails, voucherData]
  );

  const applicant1ForDocs = voucherData?.voucherForm?.applicant1 || voucherData?.applicant1;
  const applicant2ForDocs = voucherData?.voucherForm?.applicant2 || voucherData?.applicant2;
  const showMissingDocumentsSection = React.useMemo(
    () => hasMissingDocumentsToShow(applicant1ForDocs, applicant2ForDocs),
    [applicant1ForDocs, applicant2ForDocs]
  );

  const campaignStatus = campaignDetails?.status ?? '';
  const { showVoucherRow, showStandardRow, showPreferentialRow, visiblePreferenceKeys } =
    React.useMemo(() => {
      const showVoucherStatuses = [
        CAMPAIGN_LIST_STATUS_OPTIONS.ACTIVE_VOUCHER,
        CAMPAIGN_LIST_STATUS_OPTIONS.ACTIVE_VOUCHER_AND_EOI,
      ];
      const showEOIStatuses = [
        CAMPAIGN_LIST_STATUS_OPTIONS.ACTIVE_EOI,
        CAMPAIGN_LIST_STATUS_OPTIONS.ACTIVE_VOUCHER_AND_EOI,
      ];
      const shouldShowVoucherOption = showVoucherStatuses.includes(campaignStatus);
      const isCampaignEOIActive = showEOIStatuses.includes(campaignStatus);
      const isVoucherPhase = !isEOI;

      const isVoucherValidWithAmount =
        shouldShowVoucherOption && hasVoucherAmount(campaignDetails) && isVoucherPhase;
      const isEOIValidWithStdAmount = isCampaignEOIActive && hasStdEoiAmount(campaignDetails);
      const isEOIValidWithPreAmount = isCampaignEOIActive && hasPreEoiAmount(campaignDetails);

      const showVoucher = Boolean(isVoucherValidWithAmount);
      let showStandard = Boolean(isEOIValidWithStdAmount);
      let showPreferential = Boolean(isEOIValidWithPreAmount);
      if (isEOI) {
        showStandard = showStandard && Boolean(campaignDetails?.eoiType?.includes(EOI_TYPE.Standard));
        showPreferential =
          showPreferential && Boolean(campaignDetails?.eoiType?.includes(EOI_TYPE.Preferential));
      }

      const keys: string[] = [];
      if (showVoucher) keys.push(EOI_PREFERENCE.Voucher);
      if (showStandard) keys.push(EOI_PREFERENCE.Standard);
      if (showPreferential) keys.push(EOI_PREFERENCE.Preferential);

      return {
        showVoucherRow: showVoucher,
        showStandardRow: showStandard,
        showPreferentialRow: showPreferential,
        visiblePreferenceKeys: keys,
      };
    }, [campaignStatus, campaignDetails, isEOI]);

  const requireEoiPreference = visiblePreferenceKeys.length > 0;

  /** First visible preference (Voucher → Standard → Preferential); prefer saved when valid (edit + create). */
  const savedEoiTypeFromVoucher = voucherData?.eoiDetails?.eoiType;
  const initialEoiType = React.useMemo(() => {
    const saved =
      typeof savedEoiTypeFromVoucher === 'string' ? savedEoiTypeFromVoucher.trim() : '';
    if (saved && visiblePreferenceKeys.includes(saved)) return saved;
    if (visiblePreferenceKeys.length > 0) return visiblePreferenceKeys[0];
    return '';
  }, [savedEoiTypeFromVoucher, visiblePreferenceKeys]);

  const eoiTypeSchema = React.useMemo(
    () =>
      !isEditMode && requireEoiPreference
        ? yup.string().required(
            interpolate(jsonValue.validations.preferenceTypeRequired, {
              entity: isEOI ? 'EOI' : 'Voucher',
            })
          )
        : yup.string().notRequired(),
    [isEditMode, requireEoiPreference, isEOI, jsonValue.validations.preferenceTypeRequired]
  );

  const handleRazorPay = async (amount: number, index: number, formik: any) => {
    try {
      setPayButtonLoading(true);
      const validVoucherData = voucherData?.voucherForm?.applicant1?.personalDetails || voucherData?.applicant1?.personalDetails
      const voucherId = voucherData?.voucherForm?.voucherId || voucherData?.voucherId;
      const entityId = voucherData?.voucherForm?.id || voucherData?.id;
      const orderRes = await dispatch(
        createRazorpayOrder({
          amount,
          entityType: 'voucher',
          projectId: voucherData?.campaignId || voucherData?.voucherForm?.campaignId,
          entityId: entityId?.toString(),
          gateway: GATEWAY?.RAZORPAY,
          notes: {
            voucherId,
            voucherAmount: getLivePayableAmount(formik?.values || {}),
            productInfo: voucherData?.uniqueReferenceId,
            guest: {
              name: `${validVoucherData?.firstName} ${validVoucherData?.lastName}`.trim(),
              email: validVoucherData?.emailAddress,
              phone: validVoucherData?.contactNumber,
            },
          },
        })
      ).unwrap();

      setPaymentIndex(index);
      initiatePayment({
        amount: orderRes?.razorpayOrder?.amount,
        currency: orderRes?.razorpayOrder?.currency,
        orderId: orderRes?.razorpayOrder?.id,
        razorpayKey: orderRes?.razorpayKey?.key ?? orderRes?.razorpayKey,
        name: "Puravankara",
        description: "Payment",
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
  };

  const handleEasebuzzPay = async (amount: number, index: number, formik: any) => {
    try {
      setPayButtonLoading(true);
      const voucherId = voucherData?.voucherForm?.voucherId || voucherData?.voucherId;
      const entityId = voucherData?.voucherForm?.id || voucherData?.id;
      const validVoucherData = voucherData?.voucherForm?.applicant1?.personalDetails || voucherData?.applicant1?.personalDetails
      const orderRes = await dispatch(
        createRazorpayOrder({
          amount,
          entityType: "voucher",
          entityId: entityId?.toString(),
          projectId: voucherData?.campaignId || voucherData?.voucherForm?.campaignId,
          gateway: GATEWAY.EASEBUZZ,
          redirectUrl: window.location.href,
          notes: {
            voucherId,
            voucherAmount: getLivePayableAmount(formik?.values || {}),
            productInfo: voucherData?.uniqueReferenceId,
            guest: {
              name: `${validVoucherData?.firstName} ${validVoucherData?.lastName}`.trim(),
              email: validVoucherData?.emailAddress,
              phone: validVoucherData?.contactNumber,
            },
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
  };
  const handlePaymentResponse = (
    index: number,
    method: string,
    date: string,
    paymentId: string
  ) => {
    formikRef.current?.setFieldValue(`transactions[${index}].isPaid`, true);
    formikRef.current?.setFieldValue(`transactions[${index}].status`, EOIFinanceStatus.UNVERIFIED);
    formikRef.current?.setFieldValue(`transactions[${index}].date`, date);
    formikRef.current?.setFieldValue(`transactions[${index}].onlineMethod`, method);
    formikRef.current?.setFieldValue(`transactions[${index}].gatewayPaymentId`, paymentId);
  };

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
          handlePaymentResponse(
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
          : NaN;
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
          handlePaymentResponse(
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


  useEffect(() => {
    const campaignId = voucherData?.voucherForm?.campaignId || voucherData?.campaignId;
    if (campaignId && !campaignDetails) {
      dispatch(getEOICampaignDetailsById({ id: Number(campaignId) }));
    }
  }, [dispatch, campaignDetails, voucherData?.voucherForm?.campaignId, voucherData?.campaignId]);

  const initialTransactions = React.useMemo(
    () =>
      voucherData?.payments?.map((txn: Payment) => ({
        id: txn?.id,
        paymentMethod: txn?.paymentDetails?.method || '',
        chequeDDNumber: txn?.paymentDetails?.chequeNumber || '',
        transactionNumber: txn?.paymentDetails?.transactionNumber || '',
        bankName: txn?.paymentDetails?.drawnOn || '',
        date: txn?.date || '',
        amount: String(txn?.paidAmount || ''),
        paymentProof: txn?.paymentDetails?.paymentProof?.[0] || null,
        lastFourDigits: txn?.paymentDetails?.lastFourDigits || '',
      })) || [],
    [voucherData?.payments]
  );

  const preferredTypologyOptions =
    campaignDetails?.inventoryDetails?.map((inventory) => ({
      value: inventory?.type,
      label: inventory?.type,
  }));

  const formatRange = (min?: number, max?: number, formatter?: (v: number) => string) => {
    const hasMin = typeof min === 'number' && !Number.isNaN(min);
    const hasMax = typeof max === 'number' && !Number.isNaN(max);

    if (!hasMin && !hasMax) return '';

    const format = (v: number) => (formatter ? formatter(v) : String(v));

    if (hasMin && hasMax) return `${format(min!)} - ${format(max!)}`;
    if (hasMin) return format(min!);
    return format(max!);
  };

  const getInventoryByTypology = (typology: string) =>
    campaignDetails?.inventoryDetails?.find((inv: any) => inv?.type === typology);

  const setSbaRangeValue = (typology: string) => {
    const inv = getInventoryByTypology(typology);
    if (!inv) return '';
    return formatRange(inv.minSBA, inv.maxSBA, (v) => `${v} sqft`);
  };

  const setPriceRangeValue = (typology: string) => {
    const inv = getInventoryByTypology(typology);
    if (!inv) return '';
    return formatRange(inv.minPrice, inv.maxPrice, (v) => formatIndianCurrencyShort(v));
  };

  /** Prefer API typology when it matches campaign inventory; otherwise first row (create and edit). */
  const savedTypologyTrimmed = voucherData?.eoiDetails?.typology?.trim() || '';
  const initialTypology = React.useMemo(() => {
    const inventory = campaignDetails?.inventoryDetails ?? [];
    const types = inventory
      .map((inv: { type?: string }) => inv?.type)
      .filter((t): t is string => Boolean(t && String(t).trim()));
    const first = types[0] ?? '';
    if (savedTypologyTrimmed && types.includes(savedTypologyTrimmed)) {
      return savedTypologyTrimmed;
    }
    return first;
  }, [savedTypologyTrimmed, campaignDetails?.inventoryDetails]);

  const handledelete = async (fieldName: any, index: any, deleteKey?: any) => {
    try {
      await dispatch(deleteImage({ key: deleteKey }));
      toast?.success(uploadFileText.fileDeletedMsg);
    } catch (error) {
      toast.error(uploadFileText.fileErrorMsg);
      console.error('Error deleting file:', error);
    }
  };
  const handleProceedGateway = (selectedGateway: string) => {
    if (paymentIndex == null) return;

    const amount =
      failedAmount != null && Number.isFinite(Number(failedAmount))
        ? Number(failedAmount)
        : Number(formikRef.current?.values?.transactions?.[paymentIndex]?.amount) || 0;

    if (amount <= 0) return;

    setFailedAmount(null);
    setFailedGatewayForRetry(null);

    if (selectedGateway === GATEWAY.RAZORPAY) {
      handleRazorPay(amount, paymentIndex, formikRef.current);
    } else if (selectedGateway === GATEWAY.EASEBUZZ) {
      handleEasebuzzPay(amount, paymentIndex, formikRef.current);
    }

    setOpenPaymentFailedModal(false);
  };

  const handleClosePaymentFailedModal = () => {
    setOpenPaymentFailedModal(false);
    setFailedGatewayForRetry(null);
  };

  const formatPrefAmountHint = (amount: number | string | null) =>
    amount != null ? `${formatIndianCurrencyShort(Number(amount))}` : '₹0';

  const preferenceSectionLabel = !isEOI ? 'Voucher Type:' : jsonValue.eoiType;

  const validateUniqueTransactionNumbers = (values: any) => {
    const errors: any = {};
    const transactions = values.transactions || [];

    const usedChequeNumbers = new Map<string, number>();
    const usedTransactionNumbers = new Map<string, number>();

    transactions.forEach((txn: any, index: number) => {
      const cheque = txn.chequeDDNumber?.trim();
      const transaction = txn.transactionNumber?.trim();
      const gatewayPaymentId = txn.gatewayPaymentId?.trim();

      const register = (
        value: string,
        field: 'chequeDDNumber' | 'transactionNumber' | 'gatewayPaymentId'
      ) => {
        const map =
          field === 'chequeDDNumber'
            ? usedChequeNumbers
            : usedTransactionNumbers;

        if (map.has(value)) {
          errors.transactions = errors.transactions || [];
          errors.transactions[index] = {
            ...(errors.transactions[index]),
            [field]: field === 'chequeDDNumber' ? jsonValue.validations.duplicateCheque : jsonValue.validations.usedTransaction,
          };
        } else {
          map.set(value, index);
        }
      };

      if (cheque) register(cheque, 'chequeDDNumber');
      if (transaction) register(transaction, 'transactionNumber');
      if (gatewayPaymentId) register(gatewayPaymentId, 'gatewayPaymentId');
    });

    return errors;
  };

  return (
    <Card sx={{ padding: '30px', mt: 2 }}>
      <Formik
       innerRef={formikRef} 
        enableReinitialize
        initialValues={{
          eoiType: initialEoiType,
          typology: initialTypology,
          sbaRange: setSbaRangeValue(initialTypology),
          priceRange: setPriceRangeValue(initialTypology),
          transactions: voucherData?.payments?.map((txn: Payment) => ({
            id: txn?.id || null,
            paymentMethod: txn?.paymentDetails?.method || 'CHEQUE',
            chequeDDNumber: txn?.paymentDetails?.chequeNumber || '',
            transactionNumber: txn?.paymentDetails?.transactionNumber || '',
            bankName: txn?.paymentDetails?.drawnOn || '',
            date: txn?.date || '',
            amount: txn?.paidAmount?.toString() || '',
            paymentProof: txn?.paymentDetails?.paymentProof?.[0] || null,
            chequeDepositSlip: txn?.paymentDetails?.chequeDepositSlip?.[0] || null,
            paymentMode: txn?.paymentMode || EOIPaymentMode.OFFLINE, // Keep mode for UI handling
            status: txn?.status || EOIFinanceStatus.UNVERIFIED,
            gatewayPaymentId: txn?.paymentDetails?.gatewayPaymentId || '',
            isPhysicalPaymentProof: txn?.paymentDetails?.isPhysicalPaymentProof || false,
            isPaid: !![EOIFinanceStatus.VERIFIED, EOIFinanceStatus.UNVERIFIED, EOIFinanceStatus.REVERSED]?.includes(txn?.status as any),
            lastFourDigits: txn?.paymentDetails?.lastFourDigits || '',
          })) || [
              {
                id: null,
                paymentMethod: '',
                chequeDDNumber: '',
                transactionNumber: '',
                bankName: '',
                date: '',
                amount: '',
                paymentProof: null,
                status: EOIFinanceStatus.UNVERIFIED,
                paymentMode:'',
                isPaid: false,
                lastFourDigits: '',
              },
            ],
          payeeName: voucherData?.paymentDetails?.recoveryAccountDetails?.payeeName || '',
          payeeBankName: voucherData?.paymentDetails?.recoveryAccountDetails?.bankName || '',
          ifscCode: voucherData?.paymentDetails?.recoveryAccountDetails?.ifscCode || '',
          residentStatus: voucherData?.applicant1?.personalDetails?.residentStatus || '',
          swiftCode: voucherData?.paymentDetails?.recoveryAccountDetails?.swiftCode || '',
          payeeAccountNo: voucherData?.paymentDetails?.recoveryAccountDetails?.accountNumber || '',
          payeeAccountType: voucherData?.paymentDetails?.recoveryAccountDetails?.accountType || '',
          cancelledCheque:
            voucherData?.paymentDetails?.recoveryAccountDetails?.cancelledCheque?.[0] || null,
          kycDetails: [
            {
              aadhaarNumber: voucherData?.applicant1?.contactDetails?.aadhaarNumber || '',
              aadhaarImage: voucherData?.applicant1?.contactDetails?.aadhaarImage?.[0] || null,
              aadhaarBackImage: voucherData?.applicant1?.contactDetails?.aadhaarImage?.[1] || null,
              panNumber: voucherData?.applicant1?.contactDetails?.panNumber || '',
              panImage: voucherData?.applicant1?.contactDetails?.panImage?.[0] || null,
            },
            {
              aadhaarNumber: voucherData?.applicant2?.contactDetails?.aadhaarNumber || '',
              aadhaarImage: voucherData?.applicant2?.contactDetails?.aadhaarImage?.[0] || null,
              aadhaarBackImage: voucherData?.applicant2?.contactDetails?.aadhaarImage?.[1] || null,
              panNumber: voucherData?.applicant2?.contactDetails?.panNumber || '',
              panImage: voucherData?.applicant2?.contactDetails?.panImage?.[0] || null,
            },
          ],
        }}
        validationSchema={yup.object({
          eoiType: eoiTypeSchema,
          typology: yup.string().required(jsonValue.validations.typology),
          transactions: yup.array().of(
            yup.object().shape({
              paymentMode: yup
                .string()
                .required('Payment method is required'),

              // Payment Method is required ONLY for Offline
              paymentMethod: yup.string().when('paymentMode', ([paymentMode], schema) =>
                paymentMode === EOIPaymentMode.OFFLINE
                  ? schema.required(jsonValue.validations.paymentMethod)
                  : schema.notRequired()
              ),
              // Cheque/DD Number → required only when Offline + CHEQUE selected
              chequeDDNumber: yup.string().when(['paymentMode', 'paymentMethod'], ([mode, method], schema) =>
                mode === EOIPaymentMode.OFFLINE && method === 'CHEQUE'
                  ? schema
                      .required(jsonValue.validations.chequeNo)
                      .matches(/^\d{6}$/, jsonValue.validations.matchChequeNo)
                  : schema.notRequired()
              ),
              // Transaction Number → required for certain payment methods (Offline only)
              transactionNumber: yup.string().when(['paymentMode', 'paymentMethod'], ([mode, method], schema) =>
                mode === EOIPaymentMode.OFFLINE &&
                ['ONLINE TRANSFER', 'UPI CARD', 'EDC MACHINE'].includes(method)
                  ? schema.required(jsonValue.validations.transactionId)
                  : schema.notRequired()
              ),
              // Last 4 Digits of Card → required only for Offline + EDC MACHINE
              lastFourDigits: yup.string().when(['paymentMode', 'paymentMethod'], ([mode, method], schema) =>
                mode === EOIPaymentMode.OFFLINE && method === 'EDC MACHINE'
                  ? schema
                      .required(jsonValue.validations.lastFourDigitsRequired)
                      .matches(/^\d{4}$/, jsonValue.validations.lastFourDigitsFormat)
                  : schema.notRequired()
              ),
              // Bank Name → required only for Offline + CHEQUE
              bankName: yup.string().when(['paymentMode', 'paymentMethod'], ([mode, method], schema) =>
                mode === EOIPaymentMode.OFFLINE && method === 'CHEQUE'
                  ? schema
                      .required(jsonValue.validations.bankName)
                      .matches(/^[A-Za-z ]+$/, jsonValue.validations.matchBankName)
                  : schema.notRequired()
              ),
              // Date → required only for Offline
              date: yup.string().when('paymentMode', ([paymentMode], schema) =>
                paymentMode === EOIPaymentMode.OFFLINE
                  ? schema.required(jsonValue.validations.date)
                  : schema.notRequired()
              ),

              // Amount → required only for Offline
              amount: yup
                .number()
                .typeError("Amount must be numeric")
                .required(jsonValue.validations.amount)
                .moreThan(0, "Amount must be greater than 0")
                .test(
                  "gateway-payment-not-paid",
                  jsonValue.validations.onlinePaymentDone,
                  (_value, context) => {
                    const { paymentMode, isPaid, status } = context.parent;
                    // Rejected gateway: show read-only card; do not require completed payment
                    if (
                      paymentMode === EOIPaymentMode.GATEWAY &&
                      status === EOIFinanceStatus.REJECTED
                    ) {
                      return true;
                    }
                    return !(paymentMode === EOIPaymentMode.GATEWAY && isPaid === false);
                  }
                ),                

              // Payment Proof → required only for Offline
              paymentProof: yup.mixed().when('paymentMode', ([paymentMode], schema) =>
                paymentMode === EOIPaymentMode.OFFLINE
                  ? schema.required(jsonValue.validations.paymentProof)
                  : schema.notRequired()
              ),
              chequeDepositSlip: yup.string().notRequired(),
              isPaid: yup.boolean().when(['paymentMode', 'status'], ([paymentMode, status], schema) =>
                paymentMode === EOIPaymentMode.GATEWAY && status !== EOIFinanceStatus.REJECTED
                  ? schema.required(jsonValue.validations.onlinePaymentDone)
                  : schema.notRequired()
              ),
            }),
          ),
          payeeName: !isEditMode
            ? yup.string().notRequired()
            : yup
              .string()
              .matches(/^[A-Za-z ]+$/, jsonValue.validations.matchPayeeName)
              .required(jsonValue.validations.payeeName),

          payeeBankName: !isEditMode
            ? yup.string().notRequired()
            : yup
              .string()
              .matches(/^[A-Za-z ]+$/, jsonValue.validations.matchPayeeBankName)
              .required(jsonValue.validations.bankName),

          ifscCode: !isEditMode
            ? yup.string().notRequired()
            : yup
              .string()
              .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, jsonValue.validations.matchIFSCCode)
              .required(jsonValue.validations.ifscCode),        
          swiftCode: yup.string().notRequired().matches(
            /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
            jsonValue.validations.swiftCodePattern
          ),
          payeeAccountNo: !isEditMode
            ? yup.string().notRequired()
            : yup
              .string()
              .matches(/^\d{9,}$/, jsonValue.validations.matchPayeeAccNo)
              .required(jsonValue.validations.accNo),

          payeeAccountType: !isEditMode
            ? yup.string().notRequired()
            : yup.string().required(jsonValue.validations.payeeAccType),

          cancelledCheque: !isEditMode
            ? yup.mixed().notRequired()
            : yup.mixed().required('Cancelled Cheque or Bank Statement is required'),
          kycDetails: yup.array().of(
            yup.object().shape({
              panNumber: yup
                .string()
                .notRequired()
                .matches(
                  /^[A-Za-z]{5}\d{4}[A-Za-z]$/,
                  {
                    message: jsonValue.validations.panNumber,
                    excludeEmptyString: true,
                  }
                ),
              aadhaarNumber: yup
                .string()
                .notRequired()
                .matches(
                  /^[2-9]\d{11}$/,
                  {
                    message: jsonValue.validations.aadhaarNumber,
                    excludeEmptyString: true,
                  }
                ),
              aadhaarImage: yup.mixed().notRequired(),
              panImage: yup.mixed().notRequired(),
            })
          ),
        })}
        validate={validateUniqueTransactionNumbers}
        onSubmit={async (values, { setSubmitting, resetForm, validateForm }) => {
          const filledTransactions = values?.transactions?.filter(
            (txn: any) =>
              txn.paymentMode ||
              txn.paymentMethod ||
              txn.chequeDDNumber ||
              txn.transactionNumber ||
              txn.bankName ||
              txn.date ||
              txn.amount ||
              txn.paymentProof
          );

          const amountPayable = calculatePayableAmount(
            isEOI,
            values?.eoiType,
            campaignDetails,
            voucherData,
            { typology: values?.typology, eoiType: values?.eoiType }
          );
          const eoiDetails =
            values?.eoiType || values?.typology
              ? {
                ...(values?.eoiType ? { eoiType: values.eoiType } : {}),
                ...(values?.typology ? { typology: values.typology } : {}),
              }
              : undefined;
          const recoveryAccountDetails =
            values?.payeeName ||
              values?.payeeBankName ||
              values?.ifscCode ||
              values?.swiftCode ||
              values?.payeeAccountNo ||
              values?.payeeAccountType ||
              values?.cancelledCheque
              ? {
                ...(values?.payeeName ? { payeeName: values.payeeName } : {}),
                ...(values?.payeeBankName ? { bankName: values.payeeBankName } : {}),
                ...(values?.ifscCode ? { ifscCode: values.ifscCode } : {}),
                ...(values?.swiftCode ? { swiftCode: values.swiftCode } : {}),
                ...(values?.payeeAccountNo ? { accountNumber: values.payeeAccountNo } : {}),
                ...(values?.payeeAccountType ? { accountType: values.payeeAccountType } : {}),
                ...(values?.cancelledCheque
                  ? { cancelledCheque: [values.cancelledCheque] }
                  : {}),
              }
              : undefined;

          // To check if kycData is present
          const hasKycData = (item: any) => item?.panNumber || item?.panImage || item?.aadhaarNumber || item?.aadhaarImage || item?.aadhaarBackImage;

          const kycPayload = values?.kycDetails?.reduce((acc: any, item: any, index: number) => {
            if (!hasKycData(item)) return acc;
            const applicantKey = `applicant${index + 1}`;

            acc[applicantKey] = {
              panNumber: item?.panNumber || '',
              panImage: item?.panImage ? [item?.panImage] : [],
              aadhaarNumber: item?.aadhaarNumber || '',
              aadhaarImage: [
                ...(item?.aadhaarImage ? [item?.aadhaarImage] : []),
                ...(item?.aadhaarBackImage ? [item?.aadhaarBackImage] : []),
              ],
            };

            return acc;
          }, {});

          const payload: UpdateVoucherEOI = {
            isCreateForm: !isEditMode,
                residentStatus,
              
            ...(eoiDetails ? { eoiDetails } : {}),
            paymentDetails: {
              amountPayable,
              payments: filledTransactions
                ?.filter((txn: any) => txn?.paymentMode === EOIPaymentMode.OFFLINE)
                .map((txn: any) => {
                  const paymentDetails: any = {
                    method: txn?.paymentMethod,
                    drawnOn: txn?.bankName || '',
                    paymentProof: [txn?.paymentProof],
                    chequeDepositSlip: txn?.chequeDepositSlip ? [txn?.chequeDepositSlip] : null,
                  };
 
                  if (txn?.chequeDDNumber) paymentDetails.chequeNumber = txn.chequeDDNumber;
                  if (txn?.transactionNumber)
                    paymentDetails.transactionNumber = txn.transactionNumber;
                  if (
                    txn?.paymentMethod === 'EDC MACHINE' &&
                    typeof txn?.lastFourDigits === 'string' &&
                    /^\d{4}$/.test(txn.lastFourDigits)
                  ) {
                    paymentDetails.lastFourDigits = txn.lastFourDigits;
                  }
 
                  // Force status to "Unverified" if previously Rejected but edited
                  const original = initialTransactions?.find((t: any) => t?.id === txn?.id);
                  const hasEdits = original
                    ? txn?.paymentMethod !== original?.paymentMethod ||
                      txn?.chequeDDNumber !== original?.chequeDDNumber ||
                      txn?.transactionNumber !== original?.transactionNumber ||
                      txn?.bankName !== original?.bankName ||
                      txn?.date !== original?.date ||
                      String(txn?.amount) !== original?.amount ||
                      txn?.paymentProof !== original?.paymentProof ||
                      (txn?.lastFourDigits || '') !== (original?.lastFourDigits || '')
                    : true;
 
                  let status = txn?.status || EOIFinanceStatus.UNVERIFIED;
                  if (txn?.status === EOIFinanceStatus.REJECTED && hasEdits) {
                    status = EOIFinanceStatus.UNVERIFIED;
                  }
 
                  return {
                    id: txn?.id || null,
                    paymentMode: txn?.paymentMode || EOIPaymentMode.OFFLINE,
                    paidAmount: Number(txn?.amount) || 0,
                    date: txn?.date || '',
                    status,
                    paymentDetails,
                  };
                }),
              ...(recoveryAccountDetails
                ? { recoveryAccountDetails }
                : {}),
            },
            ...(Object.keys(kycPayload).length > 0 && { kycDetails: kycPayload }),
          };
          const errors = await validateForm();
          if (Object.keys(errors).length === 0) {
            const voucherId = voucherData?.voucherForm?.id || voucherData?.id ;
            dispatch(updateVoucherEOI({ id: voucherId, updatedData: payload }))
              .unwrap()
              .then(() => {
                route.push(generateRoleBasedRoute(userRole, `/eoi-records`));
              })
              .catch((error) => {
                toast.error(`Error updating Voucher/EOI: ${error}`);
              })
              .finally(() => setSubmitting(false));
          } else {
            setSubmitting(false);
          }
        }}
      >
        {(formik) => (
          <Form>
            <EoiPreferenceSync
              formik={formik}
              visibleKeys={visiblePreferenceKeys}
              savedEoiType={savedEoiTypeFromVoucher}
            />
            <Section title={jsonValue.title}>
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <FormikAutocomplete
                  name="typology"
                  label={jsonValue.label.typology}
                  required
                  formik={formik}
                  options={preferredTypologyOptions || []}
                  externalOnChange={(value) => {
                    if (typeof value !== 'string') {
                      formik.setFieldValue('sbaRange', '');
                      formik.setFieldValue('priceRange', '');
                      return;
                    }

                    const inv = getInventoryByTypology(value);

                    if (inv) {
                      const sbaText = formatRange(inv.minSBA, inv.maxSBA, (v) => `${v} sqft`);
                      const priceText = formatRange(inv.minPrice, inv.maxPrice, (v) => formatIndianCurrencyShort(v));

                      formik.setFieldValue('sbaRange', sbaText || '');
                      formik.setFieldValue('priceRange', priceText || '');
                    } else {
                      formik.setFieldValue('sbaRange', '');
                      formik.setFieldValue('priceRange', '');
                    }
                  }}
                />
              </Grid>

              {formik.values.sbaRange && (
                <CustomTextField
                  name="sbaRange"
                  label={jsonValue.label.sbaRange}
                  formik={formik}
                  disabled
                />
              )}
              {formik.values.priceRange && (
                <CustomTextField
                  name="priceRange"
                  label={jsonValue.label.priceRange}
                  formik={formik}
                  disabled
                />
              )}

              {requireEoiPreference && (
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: '16px', fontWeight: '600' }}>
                    {preferenceSectionLabel}
                  </Typography>
                  <RadioGroup
                    row
                    sx={{
                      ml: 1,
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                      columnGap: 2,
                      rowGap: 1,
                    }}
                    name="eoiType"
                    value={formik?.values?.eoiType}
                    onChange={formik.handleChange}
                  >
                    {showVoucherRow && (
                      <FormControlLabel
                        value={EOI_PREFERENCE.Voucher}
                        control={<Radio />}
                        sx={{ m: 0, alignItems: 'center' }}
                        label={
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                            <Box component="span" fontWeight={600} color="text.primary">
                              {jsonValue.label.purvaVoucher}
                            </Box>
                            {' - '}
                            {formatPrefAmountHint(
                              getVoucherAmount(
                                campaignDetails,
                                typologyForPreferenceAmountHint(
                                  campaignDetails,
                                  formik.values.typology,
                                  'voucher'
                                )
                              )
                            )}{' '}
                            <Box component="span" sx={{ fontWeight: 700 }}>
                              (Voucher Value)
                            </Box>
                          </Typography>
                        }
                      />
                    )}
                    {showStandardRow && (
                      <FormControlLabel
                        value={EOI_PREFERENCE.Standard}
                        control={<Radio />}
                        sx={{ m: 0, alignItems: 'center' }}
                        label={
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                            <Box component="span" fontWeight={600} color="text.primary">
                              {jsonValue.label.standardEoiRadio}
                            </Box>
                            {' - '}
                            {formatPrefAmountHint(
                              getStdEoiAmount(
                                campaignDetails,
                                typologyForPreferenceAmountHint(
                                  campaignDetails,
                                  formik.values.typology,
                                  'standard'
                                )
                              )
                            )}{' '}
                            <Box component="span" sx={{ fontWeight: 700 }}>
                              (EOI Value)
                            </Box>
                          </Typography>
                        }
                      />
                    )}
                    {showPreferentialRow && (
                      <FormControlLabel
                        value={EOI_PREFERENCE.Preferential}
                        control={<Radio />}
                        sx={{ m: 0, alignItems: 'center' }}
                        label={
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                            <Box component="span" fontWeight={600} color="text.primary">
                              {jsonValue.label.preferentialEoiRadio}
                            </Box>
                            {' - '}
                            {formatPrefAmountHint(
                              getPreEoiAmount(
                                campaignDetails,
                                typologyForPreferenceAmountHint(
                                  campaignDetails,
                                  formik.values.typology,
                                  'preferential'
                                )
                              )
                            )}{' '}
                            <Box component="span" sx={{ fontWeight: 700 }}>
                              (EOI Value)
                            </Box>
                          </Typography>
                        }
                      />
                    )}
                  </RadioGroup>
                  {formik?.touched?.eoiType && typeof formik?.errors?.eoiType === 'string' && (
                    <Typography sx={{ color: 'red', fontSize: '12px', ml: 1, mt: 0.5 }}>
                      {formik?.errors?.eoiType}
                    </Typography>
                  )}
                </Grid>
              )}
            </Section>

            <Section title={jsonValue.paymentSectionTitle} noBorder>
              {/* <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
                <AmountBox isEOI={isEOI} formik={formik} campaignDetails={campaignDetails} />
              </Grid> */}

                <PaymentDetailsForm
                  moreDetailsFormik={formik}
                  isCreate={!isEditMode}
                  handleRazorPay={handleRazorPay}
                  handleEasebuzzPay={handleEasebuzzPay}
                  payButtonLoading={payButtonLoading}
                  verifyingPayment={isVerifyingPayment}
                  totalAmountPayable={getLivePayableAmount(formik.values)}
                  availableGateways={availableGateways}
                />
            </Section>

            {showMissingDocumentsSection && (
              <Section>
                <MissingDocuments
                  formik={formik}
                  applicant1={applicant1ForDocs}
                  applicant2={applicant2ForDocs}
                  handledelete={handledelete}
                />
              </Section>
            )}

            {isEditMode && (
              <Section>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {jsonValue.label.cancellationCase}
                  </Typography>
                </Grid>
                <CustomTextField
                  name="payeeName"
                  label={jsonValue.label.payeeName}
                  required={isEditMode}
                  formik={formik}
                />
                <CustomTextField
                  name="payeeBankName"
                  label={jsonValue.label.payeeBankName}
                  required={isEditMode}
                  formik={formik}
                />
                <CustomTextField
                  name="ifscCode"
                  label={jsonValue.label.ifscCode}
                  required={isEditMode}
                  formik={formik}
                />
                <CustomTextField
                  name="swiftCode"
                  label={jsonValue.label.swiftCode}
                  required={false}
                  formik={formik}
                />
                <CustomTextField
                  name="payeeAccountNo"
                  label={jsonValue.label.payeeAccNo}
                  required={isEditMode}
                  formik={formik}
                />
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormikAutocomplete
                    name="payeeAccountType"
                    label={jsonValue.label.payeeAccType}
                    required={isEditMode}
                    formik={formik}
                    options={[
                      { value: 'Savings', label: 'Savings' },
                      { value: 'Current', label: 'Current' },
                    ]}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <NewDropzone
                    name="cancelledCheque"
                    file
                    required={isEditMode}
                    fieldName="Upload Cancelled Cheque or Bank Statement"
                    fileValue={formik?.values?.cancelledCheque || ''}
                    handleupload={() => {}}
                    handledelete={handledelete}
                    documentType="image"
                    isOther={false}
                    path={formik?.values?.cancelledCheque || ''}
                    id={formik?.values?.cancelledCheque || ''}
                    formik={formik}
                    uploadText="Cancelled Cheque or Bank Statement"
                    showAsterik
                    errorMarginLeft={2}
                  />
                  <Typography sx={{ fontSize: '12px', color: '#9B9EAB', mt: 0.3, ml: 2 }}>
                    {jsonValue.paymentDetails.label.accountHolderName}
                  </Typography>
                </Grid>
              </Section>
            )}
            <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
              <Button type="submit" variant="contained" className="primaryBtn">
                {uiText.button.submit}
              </Button>
            </Box>
          </Form>
        )}
      </Formik>
      <PaymentFailedModal
        open={openPaymentFailedModal}
        onClose={handleClosePaymentFailedModal}
        onProceed={(selectedGateway) => handleProceedGateway(selectedGateway)}
        allowedGateways={availableGateways}
        singleGatewayMode={failedGatewayForRetry != null}
        retryGateway={failedGatewayForRetry}
      />

    </Card>
  );
};

export default MoreDetailsExpressionForm;
