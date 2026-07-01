import '../../rm-panel.css';

import type { AppDispatch } from 'src/redux/store';

import dayjs from 'dayjs';
import { toast } from 'sonner';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getIn, FieldArray, type FormikProps } from 'formik';

import DeleteIcon from '@mui/icons-material/Delete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Box,
  Grid,
  Radio,
  Button,
  TextField,
  Typography,
  RadioGroup,
  IconButton,
  FormHelperText,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { GATEWAY, MAX_TRANSACTION_LIMIT } from 'src/utils/payment';
import { EOIPaymentMode, getStatusStyles, EOIFinanceStatus } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { deleteImage } from 'src/redux/actions/rm-panel/upload-actions';
import { deletePaymentDetails } from 'src/redux/actions/rm-panel/eoi-actions';

import NewDropzone from 'src/components/dropzone/NewDropzone';
import { DigitBoxInput } from 'src/components/digit-box-input';

import TransactionCard from './transaction-card';

const LAST_FOUR_DIGITS_LENGTH = 4;

/** Keep `touched.transactions` aligned with `values.transactions` after splice/remove (Formik does not prune nested touched). */
const spliceTransactionsTouched = (formik: FormikProps<any>, removedIndex: number) => {
  const txTouched = getIn(formik.touched, 'transactions');
  if (!Array.isArray(txTouched) || removedIndex < 0 || removedIndex >= txTouched.length) {
    return;
  }
  const next = [...txTouched];
  next.splice(removedIndex, 1);
  formik.setTouched({ ...formik.touched, transactions: next }, false);
};

const CustomTextField = ({
  name,
  label,
  required,
  formik,
  disabled = false,
  noGrid = false,
  showErrorOnSubmitOnly = false,
  /** Mark field touched on each change so sync effects (e.g. payable prefill) do not overwrite while editing before blur. */
  touchFieldOnChange = false,
}: {
  name: string;
  label: string;
  required?: boolean;
  formik: FormikProps<any>;
  disabled?: boolean;
  noGrid?: boolean;
  showErrorOnSubmitOnly?: boolean;
  touchFieldOnChange?: boolean;
}) => {
  const fieldError = getIn(formik.errors, name);
  const isTouched = getIn(formik.touched, name);
  const showError = showErrorOnSubmitOnly ? formik.submitCount > 0 : isTouched;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (touchFieldOnChange) {
      formik.setFieldTouched(name, true, false);
    }
    formik.handleChange(e);
  };

  const field = (
    <TextField
      fullWidth
      label={label}
      name={name}
      value={getIn(formik.values, name) || ''}
      onChange={handleChange}
      onBlur={formik.handleBlur}
      error={Boolean(fieldError && showError)}
      helperText={
        showError && typeof fieldError === 'string'
          ? fieldError
          : ''
      }
      InputLabelProps={{ required }}
      className="requiredField custom-input"
      disabled={disabled}
    />
  );

  if (!noGrid) {
    return (
      <Grid item xs={12} sm={6}>
        {field}
      </Grid>
    );
  }

  return field;
};

const LastFourDigitsField = ({
  txn,
  index,
  moreDetailsFormik,
  isDisabled,
  label,
}: {
  txn: any;
  index: number;
  moreDetailsFormik: FormikProps<any>;
  isDisabled: boolean;
  label: string;
}) => {
  const fieldName = `transactions[${index}].lastFourDigits`;
  const fieldError = getIn(moreDetailsFormik.errors, fieldName);
  const showError = moreDetailsFormik.submitCount > 0;
  const hasError =
    Boolean(fieldError) && showError && typeof fieldError === 'string';

  return (
    <Grid item xs={12} sm={6}>
      <DigitBoxInput
        id={`transactions-${index}-lastFourDigits`}
        aria-label={label}
        label={label}
        required
        length={LAST_FOUR_DIGITS_LENGTH}
        value={txn?.lastFourDigits || ''}
        disabled={isDisabled}
        error={hasError}
        helperText={hasError ? fieldError : undefined}
        onChange={(next) => {
          moreDetailsFormik.setFieldValue(fieldName, next);
          moreDetailsFormik.setFieldTouched(fieldName, true, false);
        }}
      />
    </Grid>
  );
};

const PaymentDetailsForm = ({
  moreDetailsFormik,
  isCreate = false,
  handleRazorPay,
  handleEasebuzzPay,
  payButtonLoading = false,
  /** True while verify API runs (after gateway success, including retries). */
  verifyingPayment = false,
  totalAmountPayable,
  availableGateways = [GATEWAY.RAZORPAY, GATEWAY.EASEBUZZ],
  showAddTransaction = true,

}: {
  moreDetailsFormik: FormikProps<any>;
  isCreate?: boolean;
  handleRazorPay?: (amount: number, index: number, formik: any) => Promise<void>;
  handleEasebuzzPay?: (amount: number, index: number, formik: any) => Promise<void>;
  payButtonLoading?: boolean;
  verifyingPayment?: boolean;
  totalAmountPayable?: number;
  availableGateways?: string[];
  showAddTransaction?: boolean;
}) => {
  const dispatch: AppDispatch = useDispatch();
  const { voucherData } = useAppSelector((state) => state.expressonOfInterest);
  const jsonValue = uiText.EOIJson.createEOI.form.moreDetails.paymentDetails;
  const transactionsLength =
    moreDetailsFormik.values.transactions?.length ?? 0;
  useEffect(() => {
    // if we're in edit mode (isCreate = false) and no transactions exist, show one blank
    if (!isCreate && !moreDetailsFormik.values.transactions?.length) {
      moreDetailsFormik.setFieldValue('transactions', [
        {
          paymentMethod: '',
          chequeDDNumber: '',
          transactionNumber: '',
          bankName: '',
          date: '',
          amount: '',
          paymentProof: null,
          status: EOIFinanceStatus.UNVERIFIED,
          paymentMode: '',
          isPaid: false,
          lastFourDigits: '',
        },
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreate, moreDetailsFormik.values.transactions?.length]);


  const handledelete = async (fieldName: any, index: any, deleteKey?: any) => {
    try {
      await dispatch(deleteImage({ key: deleteKey }));
      toast?.success(jsonValue.fileDeletedMsg);
    } catch (error) {
      toast.error(jsonValue.fileErrorMsg);
      console.error('Error deleting file:', error);
    }
  };

  const handleDeleteTransaction = async (index: number, paymentId?: number) => {
    // If paymentId exists and voucherId is provided, call API to delete from backend
    if (paymentId && voucherData?.voucherId) {
      try {
        await dispatch(
          deletePaymentDetails({
            voucherId: voucherData?.voucherId,
            paymentId,
          })
        ).unwrap();

        // If API call succeeds, remove from formik array
        const transactions = [...(moreDetailsFormik.values.transactions ?? [])];
        transactions.splice(index, 1);
        spliceTransactionsTouched(moreDetailsFormik, index);
        moreDetailsFormik.setFieldValue('transactions', transactions);
      } catch (error: any) {
        console.error('Error deleting payment details:', error);
        toast.error(`${jsonValue.failedDeletePayment}: ${error?.message || 'Unknown error'}`);
      }
    } else {
      // If no paymentId or voucherId, just remove from local formik array (for new transactions)
      const transactions = [...(moreDetailsFormik.values.transactions ?? [])];
      transactions.splice(index, 1);
      spliceTransactionsTouched(moreDetailsFormik, index);
      moreDetailsFormik.setFieldValue('transactions', transactions);
      toast.success(jsonValue.transactionRemoved);
    }
};

const handleAddTransaction = () => {
  const transactions = moreDetailsFormik.values.transactions || [];

  if (transactions.length >= MAX_TRANSACTION_LIMIT) return;




  const nextTransactions = [
    ...transactions,
    {
      id: null,
      paymentMode: '',
      paymentMethod: '',
      // amount: remainingAmount.toString(), // ✅ correct online amount
      amount: '',
      status: EOIFinanceStatus.UNVERIFIED,
      isPaid: false,
      date: '',
      paymentProof: null,
      onlineMethod: '',
      gatewayPaymentId: '',
      chequeDDNumber: '',
      transactionNumber: '',
      bankName: '',
      branchName: '',
      accountNumber: '',
      lastFourDigits: '',
    },
  ];
  const newIndex = nextTransactions.length - 1;
  moreDetailsFormik.setFieldValue('transactions', nextTransactions);
  // Reuse of the same row index can leave stale `touched` from a removed row; clear so payable sync can prefill again.
  moreDetailsFormik.setFieldTouched(`transactions[${newIndex}].amount`, false, false);
};

  const showPaymentBusy = payButtonLoading || verifyingPayment;

  return (
    <Grid container spacing={2} px={3} mt={1}>
      <FieldArray name="transactions">
        {({ push, remove }) => (
          <>
            {moreDetailsFormik?.values?.transactions?.map((txn: any, index: number) => {
              const isDisabled =
                txn?.paymentMode === EOIPaymentMode.OFFLINE &&
                txn?.status === EOIFinanceStatus.VERIFIED;

              // For payment Proof to not be disabled after verified when selected "Submit Later" from Cx Form
              const isPaymentProofDisabled = isDisabled && !txn?.isPhysicalPaymentProof;
              const { bg, color, text } = getStatusStyles(txn?.status);

              /** Paid gateway: show card. Rejected gateway: show card only (no Pay Now / Proceed). */
              const showGatewayTransactionCard =
                txn?.paymentMode === EOIPaymentMode.GATEWAY &&
                (txn?.isPaid || txn?.status === EOIFinanceStatus.REJECTED);

              return (
                <React.Fragment key={index}>
                  {showGatewayTransactionCard ? (
                    <Grid item xs={12}>
                      <TransactionCard
                        index={index}
                        amount={txn?.amount || ''}
                        method={txn?.onlineMethod || txn?.paymentMethod || ''}
                        date={txn?.date || ''}
                        status={txn?.status || ''}
                        paymentId={txn?.gatewayPaymentId || ''}
                      />
                    </Grid>
                  ) : (
                    <>
                      <Grid
                        item
                        xs={12}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        {/* Left side */}
                        <Box>
                          {(!isCreate || index > 0) && (
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                              {jsonValue.transaction} {index + 1}
                            </Typography>
                          )}
                        </Box>

                        {/* Right side: status + delete */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          {txn?.id && (
                            <Box
                              sx={{
                                backgroundColor: bg,
                                color,
                                borderRadius: '6px',
                                px: 1.5,
                                py: 0.5,
                                fontWeight: 700,
                                fontSize: '14px',
                                mr: 2,
                              }}
                            >
                              {text}
                            </Box>
                          )}

                          {!isDisabled && index > 0 && (
                            <IconButton
                              aria-label="delete"
                              onClick={() => handleDeleteTransaction(index, txn?.id)}
                              sx={{
                                color: '#d32f2f',
                                '&:hover': {
                                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                                },
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      </Grid>
                      
                        {!txn?.isPaid && !txn?.id && (
                          <Grid item xs={12}>
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <Typography sx={{ fontSize: "16px", fontWeight: 500 }}>
                                  {jsonValue.label.selectPayment}
                                  <span className="asteriskColor"> *</span>
                                </Typography>
                              </Grid>

                              {/* PAY NOW */}
                              <Grid item xs={6}>
                                <Box
                                  onClick={() => {
                                if (txn?.id && txn?.paymentMode === EOIPaymentMode.OFFLINE) return;

                                  moreDetailsFormik.setFieldValue(
                                    `transactions[${index}].paymentMode`,
                                    EOIPaymentMode.GATEWAY
                                  );
                                  moreDetailsFormik.setFieldValue(
                                    `transactions[${index}].lastFourDigits`,
                                    ''
                                  );
                                  moreDetailsFormik.setFieldTouched(
                                    `transactions[${index}].lastFourDigits`,
                                    false,
                                    false
                                  );
                              }}
                              sx={{
                                width: "100%",
                                height: "42px",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                fontWeight: 500,
                                cursor:
                                  txn?.id && txn?.paymentMode === EOIPaymentMode.OFFLINE
                                    ? "not-allowed"
                                    : "pointer",
                                border:
                                  txn?.paymentMode === EOIPaymentMode.GATEWAY
                                    ? "1px solid rgba(0, 54, 140, 1)"
                                    : "1px solid rgba(208, 213, 221, 1)",
                                backgroundColor:
                                  txn?.paymentMode === EOIPaymentMode.GATEWAY
                                    ? "rgba(26, 64, 125, 1)"
                                    : "",
                                color:
                                  txn?.paymentMode === EOIPaymentMode.GATEWAY
                                    ? "#fff"
                                    : "#1A407D",
                                opacity:
                                  txn?.id && txn?.paymentMode === EOIPaymentMode.OFFLINE ? 0.6 : 1,
                              }}
                            >
                              Pay Now
                            </Box>
                          </Grid>

                          {/* PAY OFFLINE */}
                          <Grid item xs={6}>
                            <Box
                              onClick={() => {
                                if (txn?.id && txn?.paymentMode === EOIPaymentMode.GATEWAY) return;

                                moreDetailsFormik.setFieldValue(
                                  `transactions[${index}].paymentMode`,
                                  EOIPaymentMode.OFFLINE
                                );
                                moreDetailsFormik.setFieldValue(
                                  `transactions[${index}].paymentMethod`,
                                  "CHEQUE"
                                );
                                moreDetailsFormik.setFieldValue(
                                  `transactions[${index}].status`,
                                  EOIFinanceStatus.UNVERIFIED
                                );
                              }}
                              sx={{
                                width: "100%",
                                height: "42px",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                fontWeight: 500,
                                cursor:
                                  txn?.id && txn?.paymentMode === EOIPaymentMode.GATEWAY
                                    ? "not-allowed"
                                    : "pointer",
                                border:
                                  txn?.paymentMode === EOIPaymentMode.OFFLINE
                                    ? "1px solid rgba(0, 54, 140, 1)"
                                    : "1px solid rgba(208, 213, 221, 1)",
                                backgroundColor:
                                  txn?.paymentMode === EOIPaymentMode.OFFLINE
                                    ? "rgba(26, 64, 125, 1)"
                                    : "",
                                color:
                                  txn?.paymentMode === EOIPaymentMode.OFFLINE
                                    ? "#fff"
                                    : "#1A407D",
                                opacity:
                                  txn?.id && txn?.paymentMode === EOIPaymentMode.GATEWAY ? 0.6 : 1,
                              }}
                            >
                              Pay Offline
                            </Box>
                          </Grid>
                          </Grid>
                            <FormHelperText error>
                              {getIn(moreDetailsFormik.touched, `transactions[${index}].paymentMode`) &&
                                getIn(moreDetailsFormik.errors, `transactions[${index}].paymentMode`)}
                            </FormHelperText>
                        </Grid>
                        )}

                        {txn?.paymentMode === EOIPaymentMode.GATEWAY && (
                        <>
                          <Grid item xs={12} mb={1}>
                            <Typography sx={{ fontSize: "14px" }}>
                              <span style={{ fontWeight: '600'}}>{jsonValue.label.note}:</span> {jsonValue.label.noteMessage}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Grid container spacing={2} alignItems="flex-start">
                              <Grid item xs={12} sm={8}>
                                <CustomTextField
                                  name={`transactions[${index}].amount`}
                                  label={jsonValue.label.amount}
                                  required
                                  formik={moreDetailsFormik}
                                  noGrid
                                  showErrorOnSubmitOnly
                                  touchFieldOnChange
                                />
                              </Grid>

                              <Grid item xs={12} sm={4}>
                                <Button
                                  fullWidth
                                  variant="contained"
                                  onClick={() => {
                                    const amount = Number(txn?.amount);
                                    if (availableGateways.length >= 2) {
                                      handleEasebuzzPay?.(amount, index, moreDetailsFormik);
                                    } else if (availableGateways.includes(GATEWAY.EASEBUZZ)) {
                                      handleEasebuzzPay?.(amount, index, moreDetailsFormik);
                                    } else {
                                      handleRazorPay?.(amount, index, moreDetailsFormik);
                                    }
                                  }}
                                  sx={{
                                    height: '53px',
                                    backgroundColor: '#1A407D',
                                    '&:hover': { backgroundColor: '#174A9D' },
                                  }}
                                  disabled={showPaymentBusy || Number(txn?.amount) <= 0 || !txn?.paymentMode}
                                >
                                  {showPaymentBusy ? (
                                    <CircularProgress size={24} color="inherit" />
                                  ) : (
                                    'Proceed'
                                  )}
                                </Button>
                              </Grid>

                            </Grid>
                          </Grid>
                        </>
                        )}

                        {txn?.paymentMode === EOIPaymentMode.OFFLINE && (
                          <>

                            <Grid item xs={12}>
                        <Typography sx={{ fontSize: '14px', fontWeight: '500' }}>
                          {jsonValue.label.selectPayment}
                        </Typography>
                        <RadioGroup
                          sx={{ ml: 1, gap: '16px' }}
                          row
                          name={`transactions[${index}].paymentMethod`}
                          value={moreDetailsFormik?.values?.transactions?.[index]?.paymentMethod}
                          onChange={(e) => {
                            moreDetailsFormik.handleChange(e);
                            if (e.target.value !== 'EDC MACHINE') {
                              moreDetailsFormik.setFieldValue(
                                `transactions[${index}].lastFourDigits`,
                                ''
                              );
                              moreDetailsFormik.setFieldTouched(
                                `transactions[${index}].lastFourDigits`,
                                false,
                                false
                              );
                            }
                          }}
                        >
                          <FormControlLabel
                            value="CHEQUE"
                            control={<Radio />}
                            label={jsonValue.label.cheque}
                            disabled={isDisabled}
                          />
                          <FormControlLabel
                            value="ONLINE TRANSFER"
                            control={<Radio />}
                            label={jsonValue.label.onlineTransfer}
                            disabled={isDisabled}
                          />
                          <FormControlLabel
                            value="UPI CARD"
                            control={<Radio />}
                            label={jsonValue.label.upiCard}
                            disabled={isDisabled}
                          />
                          <FormControlLabel
                            value="EDC MACHINE"
                            control={<Radio />}
                            label={jsonValue.label.edcMachine}
                            disabled={isDisabled}
                          />
                        </RadioGroup>
                      </Grid>

                      {/* Cheque/DD Number */}
                      {txn?.paymentMethod === 'CHEQUE' && (
                        <CustomTextField
                          name={`transactions[${index}].chequeDDNumber`}
                          label={jsonValue.label.chequeNumber}
                          required
                          formik={moreDetailsFormik}
                          disabled={isDisabled}
                        />
                      )}

                      {/* Transaction ID */}
                      {['ONLINE TRANSFER', 'UPI CARD', 'EDC MACHINE']?.includes(
                        txn?.paymentMethod
                      ) && (
                        <CustomTextField
                          name={`transactions[${index}].transactionNumber`}
                          label={jsonValue.label.transactionId}
                          required
                          formik={moreDetailsFormik}
                          disabled={isDisabled}
                        />
                      )}

                      {/* Last 4 Digits of Card – EDC MACHINE only */}
                      {txn?.paymentMethod === 'EDC MACHINE' && (
                        <LastFourDigitsField
                          txn={txn}
                          index={index}
                          moreDetailsFormik={moreDetailsFormik}
                          isDisabled={isDisabled}
                          label={jsonValue.label.lastFourDigitsOfCard}
                        />
                      )}

                      {/* Date */}
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Grid item xs={12} sm={6} md={6}>
                          <DatePicker
                            label={
                              <>
                                {txn?.paymentMethod === 'CHEQUE'
                                  ? jsonValue.label.chequeDate
                                  : jsonValue.label.date}{' '}
                                <span style={{ color: 'red' }}>*</span>
                              </>
                            }
                            value={
                              moreDetailsFormik?.values?.transactions?.[index]?.date
                                ? dayjs(moreDetailsFormik?.values?.transactions?.[index]?.date)
                                : null
                            }
                            onChange={(newValue) => {
                              // Store as ISO string for consistent Yup validation
                              const iso =
                                newValue && dayjs(newValue).isValid()
                                  ? dayjs(newValue).toISOString()
                                  : null;
                              moreDetailsFormik.setFieldValue(`transactions[${index}].date`, iso);
                            }}
                            maxDate={dayjs()}
                            minDate={dayjs().subtract(90, "day")}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                error: Boolean(
                                  getIn(
                                    moreDetailsFormik?.touched,
                                    `transactions[${index}].date`
                                  ) &&
                                    getIn(moreDetailsFormik?.errors, `transactions[${index}].date`)
                                ),
                                helperText:
                                  getIn(
                                    moreDetailsFormik?.touched,
                                    `transactions[${index}].date`
                                  ) &&
                                  getIn(moreDetailsFormik?.errors, `transactions[${index}].date`),
                              },
                            }}
                            className="requiredField custom-input"
                            disabled={isDisabled}
                          />
                        </Grid>
                      </LocalizationProvider>

                      {/* Bank Name */}
                      {txn?.paymentMethod === 'CHEQUE' && (
                        <CustomTextField
                          name={`transactions[${index}].bankName`}
                          label={jsonValue.label.bankName}
                          required
                          formik={moreDetailsFormik}
                          disabled={isDisabled}
                        />
                      )}

                      {/* Amount */}
                      <CustomTextField
                        name={`transactions[${index}].amount`}
                        label={jsonValue.label.amount}
                        required
                        formik={moreDetailsFormik}
                        disabled={isDisabled}
                        touchFieldOnChange
                      />

                      {/* Payment Proof Upload */}
                      <Grid item xs={12} sm={6}>
                        <NewDropzone
                          name={`transactions[${index}].paymentProof`}
                          file
                          required
                          fieldName="Payment Proof"
                          // fileValue={`transactions[${index}].paymentProof` || ''}
                          fileValue={
                            moreDetailsFormik?.values?.transactions?.[index]?.paymentProof || ''
                          }
                          handleupload={() => {}}
                          handledelete={handledelete}
                          documentType="image"
                          isOther={false}
                          path={moreDetailsFormik?.values?.transactions?.[index]?.paymentProof || ''}
                          id={moreDetailsFormik?.values?.transactions?.[index]?.paymentProof || ''}
                          // action={<Button variant="contained">Yes</Button>}
                          showAsterik
                          formik={moreDetailsFormik}
                          disabled={isPaymentProofDisabled}
                          uploadText="Payment Proof"
                          errorMarginLeft={2}
                        />
                      </Grid>
                      {txn?.paymentMethod === 'CHEQUE' && !isCreate && <Grid item xs={12} sm={6}>
                        <NewDropzone
                          name={`transactions[${index}].chequeDepositSlip`}
                          customImageSize = {2 * 1024 * 1024}
                          file
                          fieldName="Cheque Deposit Slip"
                          // fileValue={`transactions[${index}].paymentProof` || ''}
                          fileValue={
                            moreDetailsFormik?.values?.transactions?.[index]?.chequeDepositSlip || ''
                          }
                          handleupload={() => {}}
                          handledelete={handledelete}
                          documentType="image"
                          isOther={false}
                          path={moreDetailsFormik?.values?.transactions?.[index]?.chequeDepositSlip || ''}
                          id={moreDetailsFormik?.values?.transactions?.[index]?.chequeDepositSlip || ''}
                          // action={<Button variant="contained">Yes</Button>}
                          formik={moreDetailsFormik}
                          disabled={isDisabled}
                          uploadText="Cheque Deposit Slip"
                          errorMarginLeft={2}
                        />
                      </Grid>}
                    </>
                  )}
                </>
              )} 
            {showAddTransaction && transactionsLength - 1 === index && txn?.paymentMode &&  (
               <Grid item xs={12}>
                <Box
                  sx={{
                    width: 'fit-content',
                    margin: '0px auto',
                  }}
                >
                      <Button
                        startIcon={<AddCircleOutlineIcon />}
                        sx={{ textDecoration: 'underline' }}
                        color="primary"
                        onClick={handleAddTransaction}
                        disabled={
                          (!txn?.isPaid &&
                            txn?.paymentMode === EOIPaymentMode.GATEWAY &&
                            txn?.status !== EOIFinanceStatus.REJECTED) ||
                          moreDetailsFormik?.values?.transactions?.length >= MAX_TRANSACTION_LIMIT
                        }
                      >
                        {jsonValue.label.addNewTransaction}
                      </Button>
                    </Box>
                  </Grid>)}
                  
   
                </React.Fragment>
              );
            })}


          </>
        )}
      </FieldArray>

      <Grid item xs={12}>
        <Box sx={{ borderBottom: '1px dashed #DADADA', width: '100%' }} />
      </Grid>
    </Grid>
  );
};

export default PaymentDetailsForm;