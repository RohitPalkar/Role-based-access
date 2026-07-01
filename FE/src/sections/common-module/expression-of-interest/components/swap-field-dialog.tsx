import React from 'react';
import { useFormik } from 'formik';

import { Box, Button, Typography } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import { ConfirmDialog } from 'src/components/custom-dialog';

import { SwapFieldRow } from './swap-field-row';

type SwapFieldDialogProps = {
  open: boolean;
  swappedFields: string[];
  onClose: () => void;
  swapData: {
    firstName: { current: string; new: string };
    lastName: { current: string; new: string };
    emailId: { current: string; new: string };
    contactNumber: { current: string; new: string };
    primarySource: { current: string; new: string };
    amountPaid: { current: string; new: string };
  };
  onApply: (selectedKeys: string[]) => void;
};

const SwapFieldDialog = ({
  open,
  onClose,
  swapData,
  swappedFields,
  onApply,
}: SwapFieldDialogProps) => {
  const currentCustomerName = `${swapData.firstName.current} ${swapData.lastName.current}`;
  const newCustomerName = `${swapData.firstName.new} ${swapData.lastName.new}`;
  const isCustomerNameSwapped =
    swappedFields.includes('firstName') || swappedFields.includes('lastName');
  const isMobileSwapped =
    swappedFields.includes('contactNumber') || swappedFields.includes('countryCode');
  const isEmailIdSwapped = swappedFields.includes('emailId');
  const isPrimarySourceSwapped = swappedFields.includes('primarySource');
  const isAmountSwapped = swappedFields.includes('amountPaid');
  const hasAmountPaidValue = Boolean(swapData?.amountPaid?.new && Number(swapData.amountPaid.new) > 0);

  const swapFormik = useFormik({
    initialValues: {
      swapCustomerName: isCustomerNameSwapped,
      swapEmailId: isEmailIdSwapped,
      swapMobile: isMobileSwapped,
      swapPrimarySource: isPrimarySourceSwapped,
      swapAmount: isAmountSwapped,
      currentCustomerName: currentCustomerName || '',
      newCustomerName: newCustomerName || '',
      currentEmailId: swapData?.emailId?.current || '',
      newEmailId: swapData?.emailId?.new || '',
      currentMobile: swapData?.contactNumber?.current || '',
      newMobile: swapData?.contactNumber?.new || '',
      currentPrimarySource: swapData?.primarySource?.current || '',
      newPrimarySource: swapData?.primarySource?.new || '',
      currentAmount: swapData?.amountPaid?.current || 0,
      newAmount: swapData?.amountPaid?.new || 0,
    },
    onSubmit: (values: any) => {},
    enableReinitialize: true,
  });

  const isAnyFieldSelected =
    swapFormik.values.swapCustomerName ||
    swapFormik.values.swapEmailId ||
    swapFormik.values.swapMobile ||
    swapFormik.values.swapPrimarySource ||
    swapFormik.values.swapAmount;

  const handleApply = () => {
    const selectedKeys: string[] = [];

    if (swapFormik.values.swapCustomerName) selectedKeys.push('firstName');
    if (swapFormik.values.swapCustomerName) selectedKeys.push('lastName');
    if (swapFormik.values.swapEmailId) selectedKeys.push('emailId');
    if (swapFormik.values.swapMobile) selectedKeys.push('contactNumber');
    if (swapFormik.values.swapMobile) selectedKeys.push('countryCode');
    if (swapFormik.values.swapPrimarySource) selectedKeys.push('primarySource');
    if (swapFormik.values.swapAmount) selectedKeys.push('amountPaid');

    onApply(selectedKeys);
    onClose();
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={uiText.swapFieldsDialog.title}
      showDivider
      showCancel
      isLarge
      showCloseButton
      leftAlignTitle
      cancelLabel="Cancel"
      titlePadding="24px"
      content={
        <Box>
          <Typography sx={{ fontSize: '14px', fontWeight: 600, textAlign: 'left', mb: 2 }}>
            {uiText.swapFieldsDialog.desc}
          </Typography>

          {/* Rows */}
          <SwapFieldRow
            label={uiText.swapFieldsDialog.label.customerName}
            checkboxName="swapCustomerName"
            currentField={{ name: 'currentCustomerName', label: uiText.swapFieldsDialog.current }}
            newField={{ name: 'newCustomerName', label: uiText.swapFieldsDialog.new }}
            formik={swapFormik}
          />

          <SwapFieldRow
            label={uiText.swapFieldsDialog.label.email}
            checkboxName="swapEmailId"
            currentField={{ name: 'currentEmailId', label: uiText.swapFieldsDialog.current }}
            newField={{ name: 'newEmailId', label: uiText.swapFieldsDialog.new }}
            formik={swapFormik}
          />

          <SwapFieldRow
            label={uiText.swapFieldsDialog.label.mobile}
            checkboxName="swapMobile"
            currentField={{ name: 'currentMobile', label: uiText.swapFieldsDialog.current }}
            newField={{ name: 'newMobile', label: uiText.swapFieldsDialog.new }}
            formik={swapFormik}
          />

          <SwapFieldRow
            label={uiText.swapFieldsDialog.label.primarySource}
            checkboxName="swapPrimarySource"
            currentField={{ name: 'currentPrimarySource', label: uiText.swapFieldsDialog.current }}
            newField={{ name: 'newPrimarySource', label: uiText.swapFieldsDialog.new }}
            formik={swapFormik}
          />
          {hasAmountPaidValue && (
            <SwapFieldRow
              label={uiText.swapFieldsDialog.label.amount}
              checkboxName="swapAmount"
              currentField={{ name: 'currentAmount', label: uiText.swapFieldsDialog.current }}
              newField={{ name: 'newAmount', label: uiText.swapFieldsDialog.new }}
              formik={swapFormik}
            />
          )}
        </Box>
      }
      action={
        <Button
          variant="contained"
          sx={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#fff',
            background: '#1A407D',
            minWidth: { xs: '120px', lg: '204px' },
            height: '48px',
            margin: 0,
            '&:hover': {
              background: '#174A9D',
              boxShadow: 'none',
            },
          }}
          disabled={!isAnyFieldSelected}
          onClick={handleApply}
        >
          {uiText.button.apply}
        </Button>
      }
    />
  );
};

export default SwapFieldDialog;
