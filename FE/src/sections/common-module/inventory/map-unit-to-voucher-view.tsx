import '../rm-panel.css';

import type { AppDispatch } from 'src/redux/store';

import * as yup from 'yup';
import { toast } from 'sonner';
import { useParams } from 'react-router';
import { useDispatch } from 'react-redux';
import { useDebounce } from 'minimal-shared/hooks';
import { Form, getIn, Formik, type FormikProps } from 'formik';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { Box, Card, Grid, Button, Typography } from '@mui/material';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';

import { useRouter } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';
import { EOIPaymentMode, EOIFinanceStatus, generateRoleBasedRoute } from 'src/utils/constant';
import {
  toPlainRecord,
  parsePositiveMinutes,
  isBlockingApprovedStatus,
  getBlockPaymentWindowEndMs,
  getTimerExtensionMinutesFromUnit,
} from 'src/utils/inventory-block-timer';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { getEOICampaignDetailsById } from 'src/redux/actions/rm-panel/eoi-actions';
import { clearMappedVoucherTransactions } from 'src/redux/slices/rm-panel/unit-inventory-slice';
import {
  blockInventoryUnit,
  getVoucherForMapping,
  releaseInventoryUnit,
  fetchUnitInventoryById,
  fetchMappedTransactions,
  updateInventoryPaymentMapping,
} from 'src/redux/actions/rm-panel/unit-inventory-actions';

import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { CustomAutocomplete } from 'src/components/customautocomplete';

import { PaymentSection } from 'src/sections/common-module/expression-of-interest/components/voucher-payment-section';

import UnitDetailsCard from './unit-inventory-components/unit-details-card';

const jsonValue = uiText.EOIJson.mapUnitToVoucher;
const moreDetailsJson = uiText.EOIJson.createEOI.form.moreDetails;

type MapUnitFormValues = {
  search: string;
  transactions: any[];
};

const secondsRemainingUntil = (expiryAtMs: number): number =>
  Math.max(0, Math.floor((expiryAtMs - Date.now()) / 1000));

const emptyTransaction = () => ({
  id: null,
  paymentMethod: '',
  chequeDDNumber: '',
  transactionNumber: '',
  bankName: '',
  date: '',
  amount: '',
  paymentProof: null,
  chequeDepositSlip: null,
  status: EOIFinanceStatus.UNVERIFIED,
  paymentMode: '',
  isPaid: false,
  onlineMethod: '',
  gatewayPaymentId: '',
  branchName: '',
  accountNumber: '',
  isPhysicalPaymentProof: false,
});

/**
 * Coerce API fields to string without `String(object)` — some nested objects throw
 * "Cannot convert object to primitive value" when coerced.
 */
const apiValueToString = (value: unknown, fallback = ''): string => {
  if (value == null) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'bigint') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return fallback;
  }
  if (typeof value === 'symbol') {
    return String(value);
  }
  return fallback;
};

const paidAmountToFormString = (value: unknown): string => {
  if (value == null || value === '') {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return '';
};

const normalizePaymentModeFromApi = (raw: unknown): string => {
  const s = apiValueToString(raw).trim();
  if (!s) {
    return EOIPaymentMode.OFFLINE;
  }
  const lower = s.toLowerCase();
  if (lower === 'gateway' || lower === EOIPaymentMode.GATEWAY.toLowerCase()) {
    return EOIPaymentMode.GATEWAY;
  }
  return EOIPaymentMode.OFFLINE;
};

/** Maps a voucher payment row (EOI `payments[]` shape) into Formik `transactions[]` for PaymentSection. */
const mapApiPaymentRecordToFormTransaction = (txn: Record<string, unknown>) => {
  const pd =
    txn.paymentDetails && typeof txn.paymentDetails === 'object' && !Array.isArray(txn.paymentDetails)
      ? (txn.paymentDetails as Record<string, unknown>)
      : {};

  const paymentMode = normalizePaymentModeFromApi(txn.paymentMode);
  const status =
    typeof txn.status === 'string' && txn.status.trim()
      ? txn.status.trim()
      : EOIFinanceStatus.UNVERIFIED;
  const gatewayIsPaid = [
    EOIFinanceStatus.VERIFIED,
    EOIFinanceStatus.UNVERIFIED,
    EOIFinanceStatus.REVERSED,
  ].includes(status as EOIFinanceStatus);

  const paidAmount = txn.paidAmount ?? txn.amount;
  const amountStr = paidAmountToFormString(paidAmount);

  const idRaw = txn.id;
  let id: number | null = null;
  if (typeof idRaw === 'number' && Number.isFinite(idRaw)) {
    id = idRaw;
  } else if (typeof idRaw === 'string' && /^\s*\d+\s*$/.test(idRaw)) {
    const n = Number(idRaw.trim());
    id = Number.isFinite(n) ? n : null;
  }

  const paymentProofVal = pd.paymentProof;
  const paymentProof = Array.isArray(paymentProofVal)
    ? paymentProofVal[0] ?? null
    : paymentProofVal ?? null;
  const chequeSlipVal = pd.chequeDepositSlip;
  const chequeDepositSlip = Array.isArray(chequeSlipVal)
    ? chequeSlipVal[0] ?? null
    : chequeSlipVal ?? null;

  const gatewayId =
    apiValueToString(pd.gatewayPaymentId) || apiValueToString(txn.voucherTransactionId);

  if (paymentMode === EOIPaymentMode.GATEWAY) {
    return {
      ...emptyTransaction(),
      id,
      paymentMode: EOIPaymentMode.GATEWAY,
      paymentMethod: apiValueToString(pd.method),
      onlineMethod: apiValueToString(pd.method),
      chequeDDNumber: apiValueToString(pd.chequeNumber),
      transactionNumber: apiValueToString(pd.transactionNumber),
      bankName: apiValueToString(pd.drawnOn) || apiValueToString(pd.bank),
      branchName: apiValueToString(pd.branchName),
      accountNumber: apiValueToString(pd.accountNumber),
      date: apiValueToString(txn.date),
      amount: amountStr,
      paymentProof,
      chequeDepositSlip,
      status,
      isPaid: gatewayIsPaid,
      gatewayPaymentId: gatewayId,
      isPhysicalPaymentProof: Boolean(pd.isPhysicalPaymentProof),
    };
  }

  return {
    ...emptyTransaction(),
    id,
    paymentMode: EOIPaymentMode.OFFLINE,
    paymentMethod: apiValueToString(pd.method) || 'CHEQUE',
    chequeDDNumber: apiValueToString(pd.chequeNumber),
    transactionNumber: apiValueToString(pd.transactionNumber),
    bankName: apiValueToString(pd.drawnOn),
    branchName: apiValueToString(pd.branchName),
    accountNumber: apiValueToString(pd.accountNumber),
    date: apiValueToString(txn.date),
    amount: amountStr,
    paymentProof,
    chequeDepositSlip,
    status,
    isPaid: false,
    gatewayPaymentId: apiValueToString(pd.gatewayPaymentId),
    isPhysicalPaymentProof: Boolean(pd.isPhysicalPaymentProof),
  };
};

/** Stable Formik defaults (new object per mount only — avoids constant Formik reset from changing `initialValues` refs). */
const createMapUnitFormInitialValues = (): MapUnitFormValues => ({
  search: '',
  transactions: [emptyTransaction()],
});

/**
 * Dropdown shows `Name | PRID | phone`; search API expects PRID (or a plain typed query).
 * When the value contains `|`, use the second segment as the search term.
 */
const getVoucherSearchQueryForApi = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  const parts = trimmed
    .split('|')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length >= 2) {
    return parts[1];
  }
  return trimmed;
};

/**
 * Maps a Formik `transactions[]` row to an inventory `update-payment-mapping` payment line
 * (aligned with `more-details-expression-form` offline rows + paid gateway rows).
 */
const mapFormTransactionToInventoryPaymentLine = (
  txn: any
): {
  id: number | null;
  paymentMode: string;
  paidAmount: number;
  date: string;
  status: string;
  paymentDetails: Record<string, unknown>;
} | null => {
  if (txn?.paymentMode === EOIPaymentMode.OFFLINE) {
    const hasContent =
      txn.paymentMethod ||
      txn.chequeDDNumber ||
      txn.transactionNumber ||
      txn.bankName ||
      txn.date ||
      txn.amount ||
      txn.paymentProof;
    if (!hasContent) {
      return null;
    }

    const paymentDetails: Record<string, unknown> = {
      method: txn?.paymentMethod,
      drawnOn: txn?.bankName || '',
      paymentProof: [txn?.paymentProof],
      chequeDepositSlip: txn?.chequeDepositSlip ? [txn?.chequeDepositSlip] : null,
      isPhysicalPaymentProof: Boolean(txn?.isPhysicalPaymentProof),
    };
    if (txn?.chequeDDNumber) paymentDetails.chequeNumber = txn.chequeDDNumber;
    if (txn?.transactionNumber) paymentDetails.transactionNumber = txn.transactionNumber;
    if (txn?.branchName) paymentDetails.branchName = txn.branchName;
    if (txn?.accountNumber) paymentDetails.accountNumber = txn.accountNumber;

    return {
      id: txn?.id ?? null,
      paymentMode: txn?.paymentMode || EOIPaymentMode.OFFLINE,
      paidAmount: Number(txn?.amount) || 0,
      date: txn?.date || '',
      status: txn?.status || EOIFinanceStatus.UNVERIFIED,
      paymentDetails,
    };
  }

  if (
    txn?.paymentMode === EOIPaymentMode.GATEWAY &&
    txn?.isPaid &&
    typeof txn?.gatewayPaymentId === 'string' &&
    txn.gatewayPaymentId.trim()
  ) {
    const paymentDetails: Record<string, unknown> = {
      method: txn?.onlineMethod || 'Online',
      drawnOn: txn?.bankName || '',
      paymentProof: txn?.paymentProof ? [txn.paymentProof] : [],
      gatewayPaymentId: txn.gatewayPaymentId,
      isPhysicalPaymentProof: Boolean(txn?.isPhysicalPaymentProof),
    };
    if (txn?.branchName) paymentDetails.branchName = txn.branchName;
    if (txn?.accountNumber) paymentDetails.accountNumber = txn.accountNumber;

    return {
      id: txn?.id ?? null,
      paymentMode: EOIPaymentMode.GATEWAY,
      paidAmount: Number(txn?.amount) || 0,
      date: txn?.date || '',
      status: txn?.status || EOIFinanceStatus.UNVERIFIED,
      paymentDetails,
    };
  }

  return null;
};

/** At least one row qualifies for `update-payment-mapping` (offline details or completed gateway). Used to allow timer extension only after a real payment attempt. */
const hasAtLeastOneMappablePayment = (
  transactions: MapUnitFormValues['transactions'] | undefined
): boolean =>
  (transactions ?? []).some((txn) => mapFormTransactionToInventoryPaymentLine(txn) != null);

const sumTransactionAmountsExceptIndex = (
  transactions: MapUnitFormValues['transactions'] | undefined,
  excludeIndex: number
): number =>
  (transactions ?? []).reduce((sum, t, j) => {
    if (j === excludeIndex) {
      return sum;
    }
    return sum + (Number((t as { amount?: unknown })?.amount) || 0);
  }, 0);

const parseMoneyAmount = (raw: unknown): number => {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw.replaceAll(',', '').trim());
    return Number.isFinite(n) ? n : Number.NaN;
  }
  return Number.NaN;
};

/** Safe number for voucher / API money fields. */
const moneyOrZero = (value: unknown): number => {
  const n = parseMoneyAmount(value);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return n;
};

/** Sum of amounts on rows loaded from server (have an id). Used with voucher amountPaid so we do not double-count. */
const historyAmountTotal = (
  transactions: MapUnitFormValues['transactions'] | undefined
): number =>
  (transactions ?? []).reduce((sum, row) => {
    if (!row || typeof row !== 'object') {
      return sum;
    }
    const {id} = (row as { id?: unknown });
    const hasServerId =
      (typeof id === 'number' && Number.isFinite(id)) ||
      (typeof id === 'string' && /^\s*\d+\s*$/.test(id));
    if (!hasServerId) {
      return sum;
    }
    return sum + (Number((row as { amount?: unknown }).amount) || 0);
  }, 0);

/** What is left to put on this row: pre‑EOI − voucher paid + history total − other rows. */
const remainingBalanceForRow = (
  preEoi: number,
  voucherAmountPaid: unknown,
  transactions: MapUnitFormValues['transactions'] | undefined,
  rowIndex: number
): number => {
  if (!Number.isFinite(preEoi) || preEoi <= 0) {
    return 0;
  }
  const cap =
    preEoi - moneyOrZero(voucherAmountPaid) + historyAmountTotal(transactions);
  if (!Number.isFinite(cap)) {
    return 0;
  }
  return Math.max(0, cap - sumTransactionAmountsExceptIndex(transactions, rowIndex));
};

/**
 * When total paid (voucher and/or blocking) >= `blocking.thresholdAmount`,
 * map-unit payment form validation is not required.
 * APIs may put paid on `voucher.amountPaid`, `blocking.amountPaid`, or both — use the max.
 */
const isMapUnitPaymentThresholdMet = (
  voucher: Record<string, unknown> | null,
  blocking: Record<string, unknown> | null
): boolean => {
  if (!blocking) {
    return false;
  }
  const threshold = parseMoneyAmount(blocking.thresholdAmount);
  if (!Number.isFinite(threshold)) {
    return false;
  }
  const fromVoucher = voucher ? parseMoneyAmount(voucher.amountPaid) : Number.NaN;
  const fromBlocking = parseMoneyAmount(blocking.amountPaid);
  const paid = Math.max(
    Number.isFinite(fromVoucher) ? fromVoucher : 0,
    Number.isFinite(fromBlocking) ? fromBlocking : 0
  );
  return paid >= threshold;
};

const formatMapUnitInr = (amount: number): string =>
  `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;

/** Block `thresholdAmount` from current unit / blocking payload (same source as threshold validation). */
const getBlockingThresholdAmount = (unit: unknown): number => {
  if (unit == null || typeof unit !== 'object') {
    return Number.NaN;
  }
  const blocking = toPlainRecord((unit as Record<string, unknown>).blocking);
  return parseMoneyAmount(blocking?.thresholdAmount);
};

type MapUnitInventoryPaymentLine = NonNullable<ReturnType<typeof mapFormTransactionToInventoryPaymentLine>>;

type MapSubmitDispatchContext = {
  voucherPk: number;
  amountPayable: number;
  offlinePaymentLines: MapUnitInventoryPaymentLine[];
  activeBlockingId: string;
  inventoryUnitId: string;
};

const MONEY_EPS = 0.01;

/** Ask user to confirm when total paid is at least minimum block amount but below full pre‑EOI. */
const shouldShowPartialThresholdPreferredConfirm = (
  fullPreEoi: number,
  minBlockAmount: number,
  totalPaid: number
): boolean => {
  const okNumbers =
    Number.isFinite(fullPreEoi) &&
    fullPreEoi > 0 &&
    Number.isFinite(minBlockAmount) &&
    minBlockAmount > 0 &&
    Number.isFinite(totalPaid) &&
    totalPaid >= 0;
  if (!okNumbers || fullPreEoi <= minBlockAmount) {
    return false;
  }
  const belowFull = fullPreEoi - totalPaid > MONEY_EPS;
  const atOrAboveMin = totalPaid + MONEY_EPS >= minBlockAmount;
  return belowFull && atOrAboveMin;
};

type MapUnitTxnCtx = {
  preEoi: number;
  voucherAmountPaid: unknown;
  transactions: MapUnitFormValues['transactions'];
  index: number;
};


/** Prefills empty amount fields with what is left to pay (same rules as remainingBalanceForRow). */
function MapUnitTransactionAmountSync({
  campaignPreEoi,
  voucherAmountPaid,
  formik,
}: Readonly<{
  campaignPreEoi: number;
  voucherAmountPaid: unknown;
  formik: FormikProps<MapUnitFormValues>;
}>) {
  useEffect(() => {
    if (!Number.isFinite(campaignPreEoi) || campaignPreEoi <= 0) {
      return undefined;
    }
    const txs = formik.values.transactions || [];
    txs.forEach((t, i) => {
      if ((t as { isPaid?: boolean })?.isPaid) {
        return;
      }
      const amountTouched = getIn(formik.touched, `transactions[${i}].amount`);
      if (amountTouched) {
        return;
      }
      const remaining = remainingBalanceForRow(campaignPreEoi, voucherAmountPaid, txs, i);
      const normalizedCurrent = String((t as { amount?: unknown })?.amount ?? '').trim();
      if (normalizedCurrent !== '') {
        return;
      }
      const next = remaining > 0 ? String(remaining) : '';
      if (normalizedCurrent === next) {
        return;
      }
      formik.setFieldValue(`transactions[${i}].amount`, next, false);
    });
    return undefined;
  }, [campaignPreEoi, voucherAmountPaid, formik.values.transactions, formik.touched, formik]);

  return null;
}

const createMapUnitTransactionSchema = (preEoiFallback: number) =>
  yup.object().shape({
    paymentMode: yup.string().required('Payment method is required'),
    paymentMethod: yup.string().when('paymentMode', {
      is: EOIPaymentMode.OFFLINE,
      then: (schema) => schema.required(moreDetailsJson.validations.paymentMethod),
      otherwise: (schema) => schema.notRequired(),
    }),
    chequeDDNumber: yup.string().when(['paymentMode', 'paymentMethod'], {
      is: (mode: string, method: string) =>
        mode === EOIPaymentMode.OFFLINE && method === 'CHEQUE',
      then: (schema) =>
        schema
          .required(moreDetailsJson.validations.chequeNo)
          .matches(/^\d{6}$/, moreDetailsJson.validations.matchChequeNo),
      otherwise: (schema) => schema.notRequired(),
    }),
    transactionNumber: yup.string().when(['paymentMode', 'paymentMethod'], {
      is: (mode: string, method: string) =>
        mode === EOIPaymentMode.OFFLINE &&
        ['ONLINE TRANSFER', 'UPI CARD', 'EDC MACHINE'].includes(method),
      then: (schema) => schema.required(moreDetailsJson.validations.transactionId),
      otherwise: (schema) => schema.notRequired(),
    }),
    bankName: yup.string().when(['paymentMode', 'paymentMethod'], {
      is: (mode: string, method: string) =>
        mode === EOIPaymentMode.OFFLINE && method === 'CHEQUE',
      then: (schema) =>
        schema
          .required(moreDetailsJson.validations.bankName)
          .matches(/^[A-Za-z ]+$/, moreDetailsJson.validations.matchBankName),
      otherwise: (schema) => schema.notRequired(),
    }),
    date: yup.string().when('paymentMode', {
      is: EOIPaymentMode.OFFLINE,
      then: (schema) => schema.required(moreDetailsJson.validations.date),
      otherwise: (schema) => schema.notRequired(),
    }),
    amount: yup
      .mixed()
      .test('amount', function mapUnitValidateTransactionAmount(value) {
        const parent = this.parent as {
          paymentMode?: string;
          isPaid?: boolean;
        };
        const { paymentMode, isPaid } = parent;
        const ctx = this.options.context as MapUnitTxnCtx | undefined;
        const idx = typeof ctx?.index === 'number' ? ctx.index : 0;
        const preEoi = typeof ctx?.preEoi === 'number' ? ctx.preEoi : preEoiFallback;
        const txs = ctx?.transactions ?? [];
        const remaining = remainingBalanceForRow(
          preEoi,
          ctx?.voucherAmountPaid,
          txs,
          idx
        );
        const raw = value === null || value === undefined ? '' : String(value).trim();
        const empty = raw === '';

        if (empty) {
          if (paymentMode === EOIPaymentMode.GATEWAY && !isPaid && remaining > 0) {
            return this.createError({ message: moreDetailsJson.validations.amount });
          }
          if (paymentMode === EOIPaymentMode.OFFLINE) {
            return this.createError({ message: moreDetailsJson.validations.amount });
          }
          return true;
        }
        const n = Number(raw);
        if (!Number.isFinite(n) || Number.isNaN(n)) {
          return this.createError({ message: 'Amount must be numeric' });
        }
        if (n <= 0) {
          return this.createError({ message: 'Amount must be greater than 0' });
        }
        return true;
      })
      .test(
        'gateway-payment-not-paid',
        moreDetailsJson.validations.onlinePaymentDone,
        function mapUnitValidateGatewayPaymentStatus(_value) {
          const { paymentMode, isPaid, status } = this.parent as {
            paymentMode?: string;
            isPaid?: boolean;
            status?: string;
          };
          if (
            paymentMode === EOIPaymentMode.GATEWAY &&
            status === EOIFinanceStatus.REJECTED
          ) {
            return true;
          }
          const ctx = this.options.context as MapUnitTxnCtx | undefined;
          const idx = typeof ctx?.index === 'number' ? ctx.index : 0;
          const preEoi = typeof ctx?.preEoi === 'number' ? ctx.preEoi : preEoiFallback;
          const txs = ctx?.transactions ?? [];
          const remaining = remainingBalanceForRow(
            preEoi,
            ctx?.voucherAmountPaid,
            txs,
            idx
          );
          if (paymentMode === EOIPaymentMode.GATEWAY && !isPaid && remaining <= 0) {
            return true;
          }
          return !(paymentMode === EOIPaymentMode.GATEWAY && isPaid === false);
        }
      ),
    paymentProof: yup.mixed().when('paymentMode', {
      is: EOIPaymentMode.OFFLINE,
      then: (schema) => schema.required(moreDetailsJson.validations.paymentProof),
      otherwise: (schema) => schema.notRequired(),
    }),
    isPaid: yup.mixed().test(
      'isPaid',
      moreDetailsJson.validations.onlinePaymentDone,
      function mapUnitValidateGatewayIsPaid(value) {
        const { paymentMode, status } = this.parent as {
          paymentMode?: string;
          status?: string;
        };
        if (paymentMode !== EOIPaymentMode.GATEWAY || status === EOIFinanceStatus.REJECTED) {
          return true;
        }
        const ctx = this.options.context as MapUnitTxnCtx | undefined;
        const idx = typeof ctx?.index === 'number' ? ctx.index : 0;
        const preEoi = typeof ctx?.preEoi === 'number' ? ctx.preEoi : preEoiFallback;
        const txs = ctx?.transactions ?? [];
        const remaining = remainingBalanceForRow(
          preEoi,
          ctx?.voucherAmountPaid,
          txs,
          idx
        );
        if (remaining <= 0) {
          return true;
        }
        if (value !== true) {
          return this.createError({ message: moreDetailsJson.validations.onlinePaymentDone });
        }
        return true;
      }
    ),
  });

/** Campaign `preEoiAmount` is the payable for map-unit (same as voucher `amountPayable` in more-details). */
const parseCampaignPreEoiAsAmountPayable = (campaign: unknown): number => {
  if (campaign == null || typeof campaign !== 'object') {
    return 0;
  }
  const raw = (campaign as Record<string, unknown>).preEoiAmount;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  if (typeof raw === 'string') {
    const n = Number(raw.replaceAll(',', '').trim());
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  return 0;
};

const MapUnitToVoucher = () => {
  const { id: unitInventoryRouteId } = useParams();
  const route = useRouter();
  const { userRole } = useRoleBasedPermissions({ module: 'unitInventory' });
  const dispatch: AppDispatch = useDispatch();
  const formikRef = useRef<FormikProps<MapUnitFormValues> | null>(null);
  const mapUnitFormInitialValues = useMemo(
    () => createMapUnitFormInitialValues(),
    []
  );

  const [isFetched, setIsFetched] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [voucherOptions, setVoucherOptions] = useState<{ userName: string; userId: string }[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<{ userName: string; userId: string } | null>(
    null
  );
  const [selectedVoucherData, setSelectedVoucherData] = useState<any>(null);
  const [mapSubmitLoading, setMapSubmitLoading] = useState(false);
  const [paymentGatewayBusy, setPaymentGatewayBusy] = useState(false);
  const [blockUnitLoading, setBlockUnitLoading] = useState(false);
  const [releaseUnitLoading, setReleaseUnitLoading] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isUnitBlocked, setIsUnitBlocked] = useState(false);
  const [isTimerExtended, setIsTimerExtended] = useState(false);
  const [paymentWindowExpiresAtMs, setPaymentWindowExpiresAtMs] = useState<number | null>(null);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [timerExtensionMinutesFromApi, setTimerExtensionMinutesFromApi] = useState<number | null>(
    null
  );

  const [openModal, setOpenModal] = useState(false);
  /** Confirm when submitted payment is at least block threshold but below full preferred (pre-EOI) amount. */
  const [partialThresholdPayDialog, setPartialThresholdPayDialog] = useState<{
    preferred: number;
    threshold: number;
    submittingTotal: number;
  } | null>(null);
  const pendingMapSubmitDispatchRef = useRef<MapSubmitDispatchContext | null>(null);
  /** After payment window ends (client countdown or API refresh): show frozen `00:00`; Block again is allowed, Release is disabled. */
  const [paymentCountdownExpired, setPaymentCountdownExpired] = useState(false);

  /**
   * Clears all map-unit local UI (block/timer, voucher, form, dialogs, loading flags)
   * when `unitDetails` is out of sync or the API has no active block.
   */
  const resetAllMapUnitLocalState = useCallback(() => {
    setBlockingId(null);
    setIsUnitBlocked(false);
    setPaymentWindowExpiresAtMs(null);
    setTimerActive(false);
    setShowPaymentOptions(false);
    setTimeLeft(0);
    setPaymentCountdownExpired(false);
    setTimerExtensionMinutesFromApi(null);
    setIsTimerExtended(false);
    setOpenModal(false);
    setPaymentThresholdMetFromBlockResponse(false);
    dispatch(clearMappedVoucherTransactions());
    setSelectedVoucher(null);
    setSelectedVoucherData(null);
    setSearchQuery('');
    setVoucherOptions([]);
    setIsFetched(false);
    setPartialThresholdPayDialog(null);
    pendingMapSubmitDispatchRef.current = null;
    setMapSubmitLoading(false);
    setPaymentGatewayBusy(false);
    setBlockUnitLoading(false);
    setReleaseUnitLoading(false);
    queueMicrotask(() => {
      formikRef.current?.setFieldValue('search', '');
      formikRef.current?.setFieldTouched('search', false);
      formikRef.current?.setFieldValue('transactions', [emptyTransaction()]);
    });
  }, [dispatch]);

  const paymentWindowExpiresAtMsRef = useRef<number | null>(null);
  const isTimerExtendedRef = useRef(false);
  const activeTimerExtensionMinutesRef = useRef(0);
  useEffect(() => {
    paymentWindowExpiresAtMsRef.current = paymentWindowExpiresAtMs;
  }, [paymentWindowExpiresAtMs]);

  useEffect(() => {
    isTimerExtendedRef.current = isTimerExtended;
  }, [isTimerExtended]);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const { unitDetails, voucherList, mappedVoucherTransactions } = useAppSelector(
    (state: any) => state.unitInventory
  );
  const { campaignDetails } = useAppSelector((state: any) => state.expressonOfInterest);

  const showMappedPaymentUi =
    showPaymentOptions ||
    (Array.isArray(mappedVoucherTransactions) && mappedVoucherTransactions.length > 0);

  const inventoryUnitRecord = unitDetails as unknown as Record<string, unknown> | undefined;

  const [paymentThresholdMetFromBlockResponse, setPaymentThresholdMetFromBlockResponse] =
    useState(false);

  const skipMapUnitPaymentValidation = useMemo(() => {
    const blocking = toPlainRecord(inventoryUnitRecord?.blocking);
    const voucherOnUnit = toPlainRecord(inventoryUnitRecord?.voucher);
    if (isMapUnitPaymentThresholdMet(voucherOnUnit, blocking)) {
      return true;
    }
    const selected = selectedVoucherData as Record<string, unknown> | null | undefined;
    if (!selected || !blocking || !voucherOnUnit) {
      return false;
    }
    const selectedPk = selected.userId ?? selected.id;
    if (String(voucherOnUnit.id ?? '') !== String(selectedPk ?? '')) {
      return false;
    }
    return isMapUnitPaymentThresholdMet(toPlainRecord(selected), blocking);
  }, [inventoryUnitRecord, selectedVoucherData]);

  const effectiveSkipMapUnitPaymentValidation =
    skipMapUnitPaymentValidation || paymentThresholdMetFromBlockResponse;

  const skipMapUnitPaymentValidationRef = useRef(false);
  useEffect(() => {
    skipMapUnitPaymentValidationRef.current = effectiveSkipMapUnitPaymentValidation;
  }, [effectiveSkipMapUnitPaymentValidation]);

  const isBlockingApproved = useMemo(() => {
    const blocking = inventoryUnitRecord ? toPlainRecord(inventoryUnitRecord.blocking) : null;
    return isBlockingApprovedStatus(blocking);
  }, [inventoryUnitRecord]);

  const defaultUnitBlockDurationMinutes =
    selectedVoucherData?.unitBlockDuration ??
    parsePositiveMinutes(inventoryUnitRecord?.unitBlockDuration) ??
    voucherList?.campaignDetails?.unitBlockDuration ??
    10;

  const defaultTimerExtensionMinutes =
    selectedVoucherData?.timerExtension ??
    parsePositiveMinutes(inventoryUnitRecord?.timerExtension) ??
    voucherList?.campaignDetails?.timerExtension ??
    0;

  const activeTimerExtensionMinutes = useMemo(() => {
    if (timerExtensionMinutesFromApi != null && timerExtensionMinutesFromApi > 0) {
      return timerExtensionMinutesFromApi;
    }
    return defaultTimerExtensionMinutes;
  }, [timerExtensionMinutesFromApi, defaultTimerExtensionMinutes]);

  useEffect(() => {
    activeTimerExtensionMinutesRef.current = activeTimerExtensionMinutes;
  }, [activeTimerExtensionMinutes]);

  const campaignAmountPayable = useMemo(() => {
    const fromCampaign = parseCampaignPreEoiAsAmountPayable(campaignDetails);
    if (fromCampaign > 0) {
      return fromCampaign;
    }
    return parseCampaignPreEoiAsAmountPayable(voucherList?.campaignDetails);
  }, [campaignDetails, voucherList?.campaignDetails]);

  const voucherAmountPaidRaw = useMemo(
    () =>
      selectedVoucherData?.amountPaid ??
      selectedVoucherData?.paidAmount ??
      selectedVoucherData?.totalAmountPaid,
    [selectedVoucherData]
  );

  /** Payable for gateway orders + UI total — always campaign `preEoiAmount` (not sum of txn rows). */
  const getLivePayableAmount = useCallback(
    (_values: MapUnitFormValues) => campaignAmountPayable,
    [campaignAmountPayable]
  );

  const transactionSchema = useMemo(
    () => createMapUnitTransactionSchema(campaignAmountPayable),
    [campaignAmountPayable]
  );

  useEffect(() => {
    if (unitInventoryRouteId) {
      dispatch(fetchUnitInventoryById(unitInventoryRouteId));
    }
  }, [dispatch, unitInventoryRouteId]);

  /**
   * Refresh: active block is indicated by `data.blocking`.
   * Countdown end = `blocking.unitBlockExpiry`, or `blocking.createdAt` + root `unitBlockDuration`.
   * Extension length after that window = root `timerExtension` (not inside `blocking`).
   */
  useEffect(() => {
    if (!unitInventoryRouteId) {
      return;
    }
    if (!unitDetails) {
      resetAllMapUnitLocalState();
      return;
    }
    if (String(unitDetails.id) !== String(unitInventoryRouteId)) {
      resetAllMapUnitLocalState();
      return;
    }
    const inventoryUnit = unitDetails as unknown as Record<string, unknown>;
    const blocking = toPlainRecord(inventoryUnit.blocking);
    if (!blocking) {
      resetAllMapUnitLocalState();
      return;
    }

    const blockingRecordId = typeof blocking.id === 'string' && blocking.id ? blocking.id : null;
    if (blockingRecordId) {
      setBlockingId(blockingRecordId);
    }
    setIsUnitBlocked(true);

    if (isBlockingApprovedStatus(blocking)) {
      setPaymentWindowExpiresAtMs(null);
      setTimerActive(false);
      setShowPaymentOptions(false);
      setTimeLeft(0);
      setPaymentCountdownExpired(false);
      setTimerExtensionMinutesFromApi(null);
      setIsTimerExtended(false);
      return;
    }

    const paymentWindowEndMs = getBlockPaymentWindowEndMs(inventoryUnit);
    if (paymentWindowEndMs == null || paymentWindowEndMs <= Date.now()) {
      setPaymentWindowExpiresAtMs(null);
      setTimerActive(false);
      setShowPaymentOptions(false);
      setTimeLeft(0);
      setPaymentCountdownExpired(true);
      setTimerExtensionMinutesFromApi(null);
      setIsTimerExtended(false);
      return;
    }

    setPaymentCountdownExpired(false);
    setPaymentWindowExpiresAtMs(paymentWindowEndMs);
    setTimeLeft(secondsRemainingUntil(paymentWindowEndMs));
    setShowPaymentOptions(true);
    setTimerActive(true);

    const timerExtensionMinutes = getTimerExtensionMinutesFromUnit(inventoryUnit);
    setTimerExtensionMinutesFromApi(
      timerExtensionMinutes != null && timerExtensionMinutes > 0 ? timerExtensionMinutes : null
    );
  }, [resetAllMapUnitLocalState, unitInventoryRouteId, unitDetails]);

  /**
   * When the API embeds `voucher` on a blocked unit, hydrate the autocomplete + card.
   * Not gated on payment-window expiry — the user should still see who the unit is held for.
   */
  useEffect(() => {
    if (!unitInventoryRouteId || !unitDetails) {
      return;
    }
    if (String(unitDetails.id) !== String(unitInventoryRouteId)) {
      return;
    }
    const inventoryUnit = unitDetails as unknown as Record<string, unknown>;
    const voucherPayload = toPlainRecord(inventoryUnit.voucher);
    const blockingPayload = toPlainRecord(inventoryUnit.blocking);
    if (!voucherPayload || !blockingPayload) {
      return;
    }

    const voucherIdRaw = voucherPayload.id;
    let voucherPrimaryKey: number | null = null;
    if (typeof voucherIdRaw === 'number' && Number.isFinite(voucherIdRaw)) {
      voucherPrimaryKey = voucherIdRaw;
    } else if (typeof voucherIdRaw === 'string' && /^\s*\d+\s*$/.test(voucherIdRaw)) {
      voucherPrimaryKey = Number(voucherIdRaw.trim());
    }
    if (voucherPrimaryKey == null || !Number.isFinite(voucherPrimaryKey)) {
      return;
    }

    const selectedVoucherPrimaryKey = Number(
      selectedVoucherData?.userId ?? selectedVoucherData?.id
    );
    const voucherIdString = String(voucherPrimaryKey);
    const alreadyRestoredUi =
      Number.isFinite(selectedVoucherPrimaryKey) &&
      selectedVoucherPrimaryKey === voucherPrimaryKey &&
      selectedVoucher != null &&
      String(selectedVoucher.userId) === voucherIdString;
    if (alreadyRestoredUi) {
      return;
    }

    const voucherLabel = typeof voucherPayload.label === 'string' ? voucherPayload.label : '';
    const voucherAutocompleteOption = {
      ...voucherPayload,
      userName: voucherLabel || voucherIdString,
      userId: voucherIdString,
    };

    setSelectedVoucher(voucherAutocompleteOption as { userName: string; userId: string });
    setSearchQuery(voucherLabel || voucherIdString);
    setSelectedVoucherData({
      ...voucherPayload,
      userName: voucherLabel || String(voucherPayload.customerName ?? ''),
      userId: voucherPrimaryKey,
      id: voucherPrimaryKey,
    });
    setVoucherOptions([voucherAutocompleteOption as { userName: string; userId: string }]);
    setIsFetched(true);

    queueMicrotask(() => {
      formikRef.current?.setFieldValue('search', voucherIdString);
    });
  }, [unitInventoryRouteId, unitDetails, selectedVoucherData?.id, selectedVoucherData?.userId, selectedVoucher]);

  useEffect(() => {
    const campaignId = unitDetails?.campaignId;
    if (campaignId == null || campaignId === '') {
      return undefined;
    }
    const idNum = Number(campaignId);
    if (!Number.isFinite(idNum)) {
      return undefined;
    }
    const loadedId = campaignDetails?.id;
    if (campaignDetails == null || Number(loadedId) !== idNum) {
      dispatch(getEOICampaignDetailsById({ id: idNum }));
    }
    return undefined;
  }, [dispatch, campaignDetails, unitDetails?.campaignId]);

  /** Request mapped voucher transactions (Redux → Formik sync in following effect). */
  useEffect(() => {
    const voucherPk = Number(selectedVoucherData?.userId ?? selectedVoucherData?.id);
    if (!Number.isFinite(voucherPk)) {
      dispatch(clearMappedVoucherTransactions());
      return undefined;
    }
    const req = dispatch(fetchMappedTransactions(voucherPk));
    return () => {
      req.abort();
    };
  }, [dispatch, selectedVoucherData?.userId, selectedVoucherData?.id]);

  useEffect(() => {
    const rows: unknown[] = Array.isArray(mappedVoucherTransactions)
      ? mappedVoucherTransactions
      : [];
    const objects = rows.filter(
      (r: unknown): r is Record<string, unknown> =>
        r != null && typeof r === 'object' && !Array.isArray(r)
    );
    const mapped = objects.map((row: Record<string, unknown>) =>
      mapApiPaymentRecordToFormTransaction(row)
    );
    queueMicrotask(() => {
      if (!formikRef.current) {
        return;
      }
      formikRef.current.setFieldValue(
        'transactions',
        mapped.length > 0 ? mapped : [emptyTransaction()]
      );
    });
  }, [mappedVoucherTransactions]);

  useEffect(() => {
    if (!debouncedSearch?.trim()) {
      // `searchQuery` can be ahead of `debouncedSearch` (e.g. right after API restore). Do not wipe
      // options in that gap or MUI Autocomplete loses `value` ↔ `options` match and the input looks empty.
      if (searchQuery.trim()) {
        return;
      }
      setVoucherOptions([]);
      return;
    }

    const q = debouncedSearch.trim();
    const selectedLabel = selectedVoucher?.userName?.trim() ?? '';
    // After picking a row, the input shows the composite label — voucher data is already in state; do not call list API again.
    if (selectedVoucher && selectedLabel && q === selectedLabel) {
      return;
    }

    const apiSearch = getVoucherSearchQueryForApi(debouncedSearch);
    if (!apiSearch) {
      setVoucherOptions([]);
      return;
    }

    const fetchVouchers = async () => {
      try {
        const res = await dispatch(
          getVoucherForMapping({
            campaignId: unitDetails?.campaignId,
            search: apiSearch,
          })
        ).unwrap();

        const formatted = res?.vouchers?.map((item: any) => ({
          ...item,
          userName: item?.label,
          userId: String(item?.id ?? ''),
        }));

        setVoucherOptions(formatted);
        setIsFetched(true);
      } catch (error) {
        console.error(error);
        setVoucherOptions([]);
      }
    };

    fetchVouchers();
  }, [debouncedSearch, dispatch, unitDetails?.campaignId, searchQuery, selectedVoucher]);

  useEffect(() => {
    if (!timerActive || paymentWindowExpiresAtMs == null) {
      return undefined;
    }

    const tick = () => {
      const currentDeadlineMs = paymentWindowExpiresAtMsRef.current;
      if (currentDeadlineMs == null) {
        return;
      }

      const secondsRemaining = secondsRemainingUntil(currentDeadlineMs);
      setTimeLeft(secondsRemaining);

      if (secondsRemaining > 0) {
        return;
      }

      setTimerActive(false);

      const allowExtension =
        skipMapUnitPaymentValidationRef.current ||
        hasAtLeastOneMappablePayment(formikRef.current?.values?.transactions);
      const extensionMinutes = activeTimerExtensionMinutesRef.current;
      if (
        !allowExtension ||
        !extensionMinutes ||
        extensionMinutes <= 0 ||
        isTimerExtendedRef.current
      ) {
        toast.error('Time expired. Please block the unit again.');
        setTimeLeft(0);
        setPaymentCountdownExpired(true);
        setShowPaymentOptions(false);
        setPaymentWindowExpiresAtMs(null);
        setTimerExtensionMinutesFromApi(null);
        setIsTimerExtended(false);
        return;
      }

      setPaymentCountdownExpired(false);
      setIsTimerExtended(true);
      setOpenModal(true);
      const extendedDeadlineMs = Date.now() + extensionMinutes * 60 * 1000;
      setPaymentWindowExpiresAtMs(extendedDeadlineMs);
      setTimeLeft(secondsRemainingUntil(extendedDeadlineMs));
      setTimerActive(true);
    };

    const intervalId = globalThis.setInterval(tick, 1000);
    tick();

    return () => globalThis.clearInterval(intervalId);
  }, [timerActive, paymentWindowExpiresAtMs, activeTimerExtensionMinutes]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleReset = () => {
    resetAllMapUnitLocalState();
  };

  const handleBlockUnit = async () => {
    if (!selectedVoucherData) {
      toast.error('Please select a voucher');
      return;
    }
    if (!unitDetails) {
      toast.error('Unit details not loaded');
      return;
    }

    const campaignId = Number(unitDetails.campaignId);
    const inventoryUnitIdFromRoute = unitDetails.id;
    const inventoryUnitId =
      typeof inventoryUnitIdFromRoute === 'string' || typeof inventoryUnitIdFromRoute === 'number'
        ? String(inventoryUnitIdFromRoute).trim()
        : '';
    const voucherId = Number(selectedVoucherData?.userId ?? selectedVoucherData?.id);

    if (!Number.isFinite(campaignId) || !inventoryUnitId) {
      toast.error('Missing campaign or inventory unit');
      return;
    }
    if (!Number.isFinite(voucherId)) {
      toast.error('Invalid voucher');
      return;
    }

    setBlockUnitLoading(true);
    try {
      const blockInventoryResponse = await dispatch(
        blockInventoryUnit({ campaignId, inventoryUnitId, voucherId })
      ).unwrap();

      const blockResponseRecord = blockInventoryResponse as Record<string, unknown>;
      setPaymentThresholdMetFromBlockResponse(
        isMapUnitPaymentThresholdMet(
          toPlainRecord(blockResponseRecord.voucher),
          toPlainRecord(blockResponseRecord.blocking)
        )
      );

      const inventoryUnitFields = unitDetails as unknown as Record<string, unknown>;
      const serverUnitBlockExpiryMs = blockInventoryResponse.unitBlockExpiry
        ? Date.parse(blockInventoryResponse.unitBlockExpiry)
        : Number.NaN;
      const serverBlockCreatedAtMs = blockInventoryResponse.createdAt
        ? Date.parse(blockInventoryResponse.createdAt)
        : Number.NaN;
      const unitBlockDurationMinutes =
        parsePositiveMinutes(blockInventoryResponse.unitBlockDuration) ??
        parsePositiveMinutes(inventoryUnitFields.unitBlockDuration) ??
        defaultUnitBlockDurationMinutes;

      let computedPaymentDeadlineMs: number;
      if (Number.isFinite(serverUnitBlockExpiryMs)) {
        computedPaymentDeadlineMs = serverUnitBlockExpiryMs;
      } else if (Number.isFinite(serverBlockCreatedAtMs)) {
        computedPaymentDeadlineMs =
          serverBlockCreatedAtMs + Math.max(1, unitBlockDurationMinutes) * 60 * 1000;
      } else {
        computedPaymentDeadlineMs =
          Date.now() + Math.max(1, unitBlockDurationMinutes) * 60 * 1000;
      }

      setPaymentWindowExpiresAtMs(computedPaymentDeadlineMs);

      const timerExtensionMinutes =
        getTimerExtensionMinutesFromUnit(inventoryUnitFields) ??
        parsePositiveMinutes(blockInventoryResponse.timerExtension);
      setTimerExtensionMinutesFromApi(
        timerExtensionMinutes != null && timerExtensionMinutes > 0 ? timerExtensionMinutes : null
      );

      if (
        typeof blockInventoryResponse.blockingId === 'string' &&
        blockInventoryResponse.blockingId
      ) {
        setBlockingId(blockInventoryResponse.blockingId);
      }

      setPaymentCountdownExpired(false);
      setShowPaymentOptions(true);
      setTimerActive(true);
      setIsUnitBlocked(true);
      setTimeLeft(secondsRemainingUntil(computedPaymentDeadlineMs));

      toast.success(
        `Your ${unitBlockDurationMinutes}-minute timer has started. Please complete the payment within this time to map the unit.`,
        {
          duration: 5000,
        }
      );

      if (unitInventoryRouteId) {
        await dispatch(fetchUnitInventoryById(unitInventoryRouteId));
      }
    } catch (e: any) {
      toast.error(e?.message || String(e || 'Could not block unit'));
    } finally {
      setBlockUnitLoading(false);
    }
  };

  const handleReleaseUnit = async () => {
    const activeBlockingId =
      blockingId ??
      (unitDetails as { blocking?: { id?: string } | null })?.blocking?.id ??
      null;
    if (!activeBlockingId || !unitInventoryRouteId) {
      toast.error('No active block to release');
      return;
    }

    setReleaseUnitLoading(true);
    try {
      const msg = await dispatch(releaseInventoryUnit(activeBlockingId)).unwrap();
      toast.success(msg || 'Unit released');
      handleReset();
      await dispatch(fetchUnitInventoryById(unitInventoryRouteId));
    } catch (e: any) {
      toast.error(e?.message || String(e || 'Could not release unit'));
    } finally {
      setReleaseUnitLoading(false);
    }
  };

  const guestFromVoucher = (v: any) => {
    const nameRaw = v?.customerName || v?.name || '';
    const parts = String(nameRaw).trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    return {
      name: `${firstName} ${lastName}`.trim() || 'Customer',
      email: v?.email || v?.customerEmail || v?.emailAddress,
      phone: v?.mobile || v?.mobileNumber || v?.phone || v?.contactNumber,
    };
  };

  const mapPaymentGetOrderNotes = useCallback(
    (_formValues: MapUnitFormValues) => {
      const v = selectedVoucherData;
      if (!v) {
        return {
          entityId: '',
          projectId: unitDetails?.campaignId,
          guest: { name: 'Customer' },
        };
      }
      const voucherPk = Number(v.userId ?? v.id);
      return {
        entityId: String(voucherPk),
        projectId: unitDetails?.campaignId,
        voucherId: v?.voucherId ?? v?.paidVoucherId,
        productInfo: v?.uniqueReferenceId,
        guest: guestFromVoucher(v),
      };
    },
    [selectedVoucherData, unitDetails?.campaignId]
  );

  const submitMapDispatch = useCallback(
    async (ctx: MapSubmitDispatchContext) => {
      setMapSubmitLoading(true);
      try {
        const message = await dispatch(
          updateInventoryPaymentMapping({
            blockingId: ctx.activeBlockingId,
            inventoryUnitId: ctx.inventoryUnitId,
            voucherId: ctx.voucherPk,
            paymentDetails: {
              amountPayable: ctx.amountPayable,
              payments: ctx.offlinePaymentLines,
            },
          })
        ).unwrap();

        toast.success(typeof message === 'string' && message ? message : 'Payment details saved');
        route.push(generateRoleBasedRoute(userRole, 'inventory'));
      } catch (e: any) {
        toast.error(e?.message || String(e || 'Could not save payment details'));
      } finally {
        setMapSubmitLoading(false);
      }
    },
    [dispatch, route, userRole]
  );

  const handlePartialThresholdContinue = useCallback(async () => {
    const ctx = pendingMapSubmitDispatchRef.current;
    pendingMapSubmitDispatchRef.current = null;
    setPartialThresholdPayDialog(null);
    if (!ctx) {
      return;
    }
    await submitMapDispatch(ctx);
  }, [submitMapDispatch]);

  const handlePartialThresholdFullPay = useCallback(() => {
    pendingMapSubmitDispatchRef.current = null;
    setPartialThresholdPayDialog(null);
  }, []);

  const handleMapSubmit = async (values: MapUnitFormValues) => {
    if (!showPaymentOptions) return;
    if (isBlockingApproved) {
      return;
    }

    if (!unitDetails || !selectedVoucherData) {
      toast.error('Unit or voucher not loaded');
      return;
    }

    const voucherPk = Number(selectedVoucherData?.userId ?? selectedVoucherData?.id);
    if (!Number.isFinite(voucherPk)) {
      toast.error('Invalid voucher');
      return;
    }

    const amountPayable = campaignAmountPayable;
    if (!Number.isFinite(amountPayable) || amountPayable <= 0) {
      toast.error('Campaign pre-EOI amount is not available. Please try again later.');
      return;
    }

    if (!effectiveSkipMapUnitPaymentValidation) {
      const txnsForGatewayCheck = values.transactions || [];
      for (let i = 0; i < txnsForGatewayCheck.length; i += 1) {
        const t = txnsForGatewayCheck[i] as {
          paymentMode?: string;
          isPaid?: boolean;
        };
        if (t?.paymentMode === EOIPaymentMode.GATEWAY && !t?.isPaid) {
          if (
            remainingBalanceForRow(
              amountPayable,
              voucherAmountPaidRaw,
              txnsForGatewayCheck,
              i
            ) > 0
          ) {
            toast.error(moreDetailsJson.validations.onlinePaymentDone);
            return;
          }
        }
      }
    }

    const allMappedLines = (values.transactions || [])
      .map(mapFormTransactionToInventoryPaymentLine)
      .filter((row): row is NonNullable<typeof row> => row != null);

    const offlinePaymentLines = allMappedLines.filter(
      (row) => row.paymentMode === EOIPaymentMode.OFFLINE
    );

    const hasCompletedGateway = (values.transactions || []).some(
      (t: any) =>
        t?.paymentMode === EOIPaymentMode.GATEWAY &&
        t?.isPaid &&
        typeof t?.gatewayPaymentId === 'string' &&
        String(t.gatewayPaymentId).trim().length > 0
    );

    if (
      !effectiveSkipMapUnitPaymentValidation &&
      offlinePaymentLines.length === 0 &&
      !hasCompletedGateway
    ) {
      toast.error('Add at least one payment before submitting.');
      return;
    }

    const activeBlockingId =
      blockingId ??
      (unitDetails as { blocking?: { id?: string } | null })?.blocking?.id ??
      null;
    const inventoryUnitIdRaw = unitDetails?.id;
    const inventoryUnitId =
      typeof inventoryUnitIdRaw === 'string' || typeof inventoryUnitIdRaw === 'number'
        ? String(inventoryUnitIdRaw).trim()
        : '';

    if (!activeBlockingId) {
      toast.error('No active block. Please block the unit again.');
      return;
    }
    if (!inventoryUnitId) {
      toast.error('Missing inventory unit');
      return;
    }

    const submittingTotal = allMappedLines.reduce(
      (sum, row) => sum + (Number.isFinite(row.paidAmount) ? row.paidAmount : 0),
      0
    );
    const voucherPaid = moneyOrZero(voucherAmountPaidRaw);
    const historyTotal = historyAmountTotal(values.transactions);
    const totalPaid = Math.max(0, voucherPaid + submittingTotal - historyTotal);
    const thresholdAmt = getBlockingThresholdAmount(unitDetails);
    const preferredAmt = amountPayable;

    if (shouldShowPartialThresholdPreferredConfirm(preferredAmt, thresholdAmt, totalPaid)) {
      pendingMapSubmitDispatchRef.current = {
        voucherPk,
        amountPayable,
        offlinePaymentLines,
        activeBlockingId,
        inventoryUnitId,
      };
      setPartialThresholdPayDialog({
        preferred: preferredAmt,
        threshold: thresholdAmt,
        submittingTotal: totalPaid,
      });
      return;
    }

    await submitMapDispatch({
      voucherPk,
      amountPayable,
      offlinePaymentLines,
      activeBlockingId,
      inventoryUnitId,
    });
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={`${jsonValue?.title} ${unitDetails?.unitNumber}`}
        sx={{ ...stickyBreadcrumbsStyles, mb: 2 }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isUnitBlocked && (isBlockingApproved || timerActive || paymentCountdownExpired) && (
            <Box display="flex" alignItems="center" gap={0.5}>
              {isBlockingApproved ? (
                <Typography
                  sx={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#118D57',
                  }}
                >
                  {jsonValue?.unitMapped ?? 'Unit mapped'}
                </Typography>
              ) : (
                <>
                  <AccessTimeFilledIcon
                    sx={{
                      fontSize: 23,
                      color: paymentCountdownExpired || timeLeft <= 300 ? 'red' : 'green',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '23px',
                      fontWeight: 600,
                      color: paymentCountdownExpired || timeLeft <= 300 ? 'red' : 'green',
                    }}
                  >
                    {formatTime(paymentCountdownExpired ? 0 : timeLeft)}
                  </Typography>
                </>
              )}
            </Box>
          )}
          {isUnitBlocked && (
            <Button
              size="large"
              variant="contained"
              type="button"
              sx={{
                backgroundColor: '#1A407D',
                  '&:hover': {
                    backgroundColor: '#174A9D',
                  },
              }}
              disabled={releaseUnitLoading || (paymentCountdownExpired && !isBlockingApproved)}
              onClick={async () => {
                await handleReleaseUnit();
              }}
            >
              {releaseUnitLoading ? 'Releasing…' : uiText.button.releaseUnit}
            </Button>
          )}
          </Box>
        }
      />
      <Formik<MapUnitFormValues>
        key={unitInventoryRouteId ?? 'map-unit'}
        innerRef={formikRef}
        enableReinitialize={false}
        initialValues={mapUnitFormInitialValues}
        validate={(values) => {
          const errors: any = {};
          if (!values.search?.trim()) {
            errors.search = jsonValue?.validations?.search;
          }
          if (!showPaymentOptions) {
            return errors;
          }
          const list = values.transactions || [];
          const txErrs: any[] = [];
          if (!effectiveSkipMapUnitPaymentValidation) {
            for (let i = 0; i < list.length; i += 1) {
              try {
                transactionSchema.validateSync(list[i], {
                  abortEarly: false,
                  context: {
                    preEoi: campaignAmountPayable,
                    voucherAmountPaid: voucherAmountPaidRaw,
                    transactions: list,
                    index: i,
                  },
                });
              } catch (e: any) {
                const row: Record<string, string> = {};
                if (e?.inner?.length) {
                  e.inner.forEach((err: any) => {
                    if (err.path) row[err.path] = err.message;
                  });
                } else if (e?.message) {
                  row._error = e.message;
                }
                txErrs[i] = row;
              }
            }
          }
          if (txErrs.some(Boolean)) {
            errors.transactions = txErrs;
          }
          return errors;
        }}
        onSubmit={async (values, { setSubmitting }) => {
          await handleMapSubmit(values);
          setSubmitting(false);
        }}
      >
        {(formik) => (
          <Form>
            <UnitDetailsCard unitDetails={unitDetails} />
            <Card sx={{ padding: '20px', mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={12}>
                  <CustomAutocomplete
                    label={jsonValue.search}
                    options={voucherOptions}
                    value={selectedVoucher}
                    inputValue={searchQuery}
                    onChange={(event, newValue) => {
                      setSelectedVoucher(newValue);
                      setSearchQuery(newValue?.userName || '');

                      if (newValue) {
                        setSelectedVoucherData(newValue);
                      }

                      formik.setFieldValue(
                        'search',
                        newValue?.userId != null && newValue.userId !== ''
                          ? String(newValue.userId)
                          : ''
                      );
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === 'reset') return;
                      setSearchQuery(newInputValue || '');
                      formik.setFieldValue('search', newInputValue || '');

                      if (!newInputValue) {
                        setSelectedVoucher(null);
                        setSelectedVoucherData(null);
                      }
                    }}
                    placeholder={jsonValue?.search}
                    noOptionsText={searchQuery ? 'No vouchers found' : 'Type to search'}
                    height={55}
                    onClear={handleReset}
                    disableClearable
                    disabled={(isUnitBlocked && !paymentCountdownExpired) || isBlockingApproved}
                    clearIconDisabled={(isUnitBlocked && !paymentCountdownExpired) || isBlockingApproved}
                    renderOptionCustom={(option) => {
                        const parts = option?.userName?.split('|') || [];
                        const name = parts[0]?.trim();
                        const restParts = parts.slice(1)?.map((p: string) => p?.trim());

                        return (
                          <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '16px' }}>
                              {name}
                            </span>

                            {restParts.map((item: string, index: number) => (
                              <span key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ margin: '0 6px', color: '#D9D9D9' }}>|</span>
                                <span style={{ fontSize: '13px', color: '#1C252E' }}>
                                  {item}
                                </span>
                              </span>
                            ))}
                          </span>
                        );
                      }}
                  />
                  {formik.touched.search && formik.errors.search && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                      {formik.errors.search}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              {isFetched && selectedVoucherData && (
                <Card
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    backgroundColor: '#FFFFFF',
                    mt: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '16px' }}>
                      {selectedVoucherData?.customerName || 'N/A'}
                    </Typography>
                    <Button
                      size="large"
                      variant="outlined"
                      type="button"
                      sx={{
                        px: 3.5,
                        border: '1px solid #1A407D',
                        color: '#1A407D',
                      }}
                      disabled={
                        blockUnitLoading ||
                        isBlockingApproved ||
                        (isUnitBlocked && !paymentCountdownExpired)
                      }
                      onClick={async () => {
                        await handleBlockUnit();
                      }}
                    >
                      {blockUnitLoading ? 'Blocking…' : uiText.button.blockUnit}
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      borderBottom: '1px solid #E5E7EB',
                      mb: 2,
                    }}
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={2}>
                      <Typography sx={{ fontSize: '14px', color: '#6A7282' }}>
                        {jsonValue.voucherDetailsCard.uniqueReferenceId}
                      </Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                        {selectedVoucherData?.uniqueReferenceId || 'N/A'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2}>
                      <Typography sx={{ fontSize: '14px', color: '#6A7282' }}>
                        {jsonValue.voucherDetailsCard.voucherId}
                      </Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                        {selectedVoucherData?.paidVoucherId || 'N/A'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2}>
                      <Typography sx={{ fontSize: '14px', color: '#6A7282' }}>
                        {jsonValue.voucherDetailsCard.stdEoiId}
                      </Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                        {selectedVoucherData?.stdEoiId || 'N/A'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2}>
                      <Typography sx={{ fontSize: '14px', color: '#6A7282' }}>
                        {jsonValue.voucherDetailsCard.preEoiId}
                      </Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                        {selectedVoucherData?.preEoiId || 'N/A'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2}>
                      <Typography sx={{ fontSize: '14px', color: '#6A7282' }}>
                        {jsonValue.voucherDetailsCard.amountPayable}
                      </Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                        {campaignAmountPayable > 0
                          ? `₹${campaignAmountPayable.toLocaleString('en-IN')}`
                          : 'N/A'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2}>
                      <Typography sx={{ fontSize: '14px', color: '#6A7282' }}>
                        {jsonValue.voucherDetailsCard.amountPaid}
                      </Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                        ₹{selectedVoucherData?.amountPaid?.toLocaleString('en-IN') || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              )}

              {showMappedPaymentUi && (
                <Card sx={{ p: 2, mt: 2 }}>
                  <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>
                    {moreDetailsJson.paymentSectionTitle}
                  </Typography>
                  {campaignAmountPayable > 0 ? (
                    <MapUnitTransactionAmountSync
                      campaignPreEoi={campaignAmountPayable}
                      voucherAmountPaid={voucherAmountPaidRaw}
                      formik={formik}
                    />
                  ) : null}
                  <PaymentSection
                    formikRef={formikRef}
                    moreDetailsFormik={formik as any}
                    isCreate
                    showAddTransaction={isUnitBlocked}
                    resolveVoucherAmount={getLivePayableAmount}
                    getOrderNotes={mapPaymentGetOrderNotes}
                    availableGatewaysFromCampaign={campaignDetails?.availableGateways}
                    totalAmountPayable={getLivePayableAmount(formik.values)}
                    onGatewayBusyChange={setPaymentGatewayBusy}
                  />
                </Card>
              )}

              {showPaymentOptions && (
                <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                  <Button
                    size="large"
                    variant="outlined"
                    color="inherit"
                    sx={{ px: 3.5 }}
                    type="button"
                    onClick={() => {
                      route.push(generateRoleBasedRoute(userRole, 'inventory'));
                    }}
                  >
                    {uiText.button.cancel}
                  </Button>
                  <Button
                    type="submit"
                    size="large"
                    variant="contained"
                    sx={{
                      px: 3.5,
                      backgroundColor: '#1A407D',
                      '&:hover': {
                        backgroundColor: '#174A9D',
                      },
                    }}
                    disabled={!isFetched || mapSubmitLoading || paymentGatewayBusy}
                  >
                    {mapSubmitLoading ? 'Submitting…' : uiText.button.submit}
                  </Button>
                </Box>
              )}

              <ConfirmDialog 
                open={openModal} 
                onClose={() => setOpenModal(false)}
                title="Time Extension"
                leftAlignTitle
                showCancel={false}
                contentTextAlign="left"
                content={
                  <>
                    <Typography sx={{ fontSize: '14px', fontWeight: 400 }}>
                      This Unit was blocked for {defaultUnitBlockDurationMinutes} minutes and is about to expire.
                    </Typography>
                    <Typography sx={{ fontSize: '14px', fontWeight: 400 }}>
                      We’ve extended your time by {activeTimerExtensionMinutes} more minutes.
                    </Typography>
                  </>
                }
                action={
                  <Button
                    type="submit"
                    size="large"
                    variant="contained"
                    sx={{
                      width: '100%',
                      backgroundColor: '#1A407D',
                      '&:hover': {
                        backgroundColor: '#174A9D',
                      },
                    }}
                    onClick={() => setOpenModal(false)}
                  >
                    {uiText.button.okay}
                  </Button>
                }
              />

              <ConfirmDialog
                open={partialThresholdPayDialog != null}
                onClose={handlePartialThresholdFullPay}
                title={jsonValue?.partialThresholdPayDialog?.title ?? 'Confirm payment amount'}
                leftAlignTitle
                showCloseButton
                contentTextAlign="left"
                titlePadding="24px 24px 16px"
                content={
                  partialThresholdPayDialog ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Typography sx={{ fontSize: '14px', fontWeight: 400 }}>
                        {jsonValue?.partialThresholdPayDialog?.intro}
                      </Typography>
                      <Box component="ul" sx={{ pl: 3, m: 0, listStyleType: 'disc',
                        '& li': {
                          display: 'list-item',
                        }}}
                      >
                        <li>
                          <Typography sx={{ fontSize: '14px', fontWeight: 400, mb: 1 }}>
                            <Box component="span" sx={{ fontWeight: 600 }}>
                              {jsonValue?.partialThresholdPayDialog?.thresholdLabel}:
                            </Box>{' '}
                            {formatMapUnitInr(partialThresholdPayDialog.threshold)}
                          </Typography>
                        </li>

                        <li>
                          <Typography sx={{ fontSize: '14px', fontWeight: 400, mb: 1 }}>
                            <Box component="span" sx={{ fontWeight: 600 }}>
                              {jsonValue?.partialThresholdPayDialog?.preferredLabel}:
                            </Box>{' '}
                            {formatMapUnitInr(partialThresholdPayDialog.preferred)}
                          </Typography>
                        </li>

                        <li>
                          <Typography sx={{ fontSize: '14px', fontWeight: 400, mb: 1 }}>
                            <Box component="span" sx={{ fontWeight: 600 }}>
                              {jsonValue?.partialThresholdPayDialog?.submittingLabel}:
                            </Box>{' '}
                            {formatMapUnitInr(partialThresholdPayDialog.submittingTotal)}
                          </Typography>
                        </li>
                      </Box>
                      <Typography sx={{ fontSize: '14px', fontWeight: 400, mb: 1 }}>
                        {jsonValue?.partialThresholdPayDialog?.approvedBy}{' '}
                        {campaignDetails?.unitApproverId?.name || 'N/A'}{' '}
                        {jsonValue?.partialThresholdPayDialog?.within}{' '}
                        {campaignDetails?.approvalWindowHours || 'N/A'}{' '}
                        {campaignDetails?.approvalWindowHours === 1 ? 'hour' : 'hours'}
                      </Typography>
                      </Box>
                  ) : null
                }
                showCancel
                cancelLabel={jsonValue?.partialThresholdPayDialog?.fullPay ?? 'Pay Full Amount'}
                onCancel={handlePartialThresholdFullPay}
                action={
                  <Button
                    type="button"
                    size="large"
                    variant="contained"
                    disabled={mapSubmitLoading}
                    onClick={() => {
                      handlePartialThresholdContinue();
                    }}
                    sx={{
                      fontSize: '15px',
                      fontWeight: 600,
                      minWidth: { xs: '120px', lg: '204px' },
                      height: '48px',
                      backgroundColor: '#1A407D',
                      '&:hover': { backgroundColor: '#174A9D' },
                    }}
                  >
                    {jsonValue?.partialThresholdPayDialog?.sendForApproval ?? 'Send for Approval'}
                  </Button>
                }
              />
            </Card>
          </Form>
        )}
      </Formik>
    </DashboardContent>
  );
};

export default MapUnitToVoucher;
