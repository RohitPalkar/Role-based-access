import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { BatchViewRecordsListData } from 'src/services/common-module/batch-manager-services';

import { toast } from 'sonner';
import React, { useRef, useState, useCallback } from 'react';

import { Button, TableRow, TableCell } from '@mui/material';

import { useAppDispatch } from 'src/hooks/use-redux';

import { BatchVoucherStatus } from 'src/utils/constant';
import { formatDateIST, formatTimeToAMPM } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';
import { sendCheckinOtpAction, resendCheckinOtpAction, attendanceCheckInAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { Label } from 'src/components/label';
import { OtpDialog } from 'src/components/otp-dialog/otp-dialog';


type Props = {
  row: BatchViewRecordsListData;
  visibleColumns: ColumnDefinition[];
  onRefresh: () => void;
};

const getDisplayValue = (value?: number | string) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number' && value === 0) return '-';
  return value;
};

const BatchRecordsRow = ({ row, visibleColumns, onRefresh }: Props) => {
  const dispatch = useAppDispatch();
  const { batchViewRecords } = uiText
  const isAttended = row?.attendanceStatus === BatchVoucherStatus.ATTENDED;
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [headCount, setHeadCount] = useState('');
  const attemptCountRef = useRef(0);

  const handleCheckInClick = async () => {
    try {
      setOtpError('');

      await dispatch(
        sendCheckinOtpAction({
          batchVoucherId: row?.id,
        })
      ).unwrap();
      toast.success(batchViewRecords.otpDialog.otpSentSuccess);

      setOtpOpen(true);
    } catch (error: any) {
      setOtpError(error || batchViewRecords.otpDialog.failedToSendOtp);
      toast.error(
        error || batchViewRecords.otpDialog.failedToSendOtp
      );
    }
  };

  const handleOtpClose = () => {
    setOtpOpen(false);
    setOtpError('');
    setHeadCount('');
    attemptCountRef.current = 0;
    setIsBlocked(false);
  };

  const handleOtpVerify = useCallback(
    async (otp: string) => {
      if (isBlocked) return;

      if (!headCount || Number(headCount) <= 0) {
        setOtpError(batchViewRecords.otpDialog.headCountValidation);
        return;
      }

      try {
        setOtpError('');

        await dispatch(
          attendanceCheckInAction({
            batchVoucherId: row?.id,
            otp,
            headCount: Number(headCount),
          })
        ).unwrap();
        toast.success(batchViewRecords.otpDialog.attendanceMarkedSuccess);
        onRefresh();
        handleOtpClose();
      } catch (error: any) {
        setOtpError(error || batchViewRecords.otpDialog.invalidOtp);

        attemptCountRef.current += 1;

        if (attemptCountRef.current >= 5) {
          setIsBlocked(true);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, headCount, row, isBlocked]
  );

  const handleOtpResend = useCallback(async () => {
    try {
      setOtpError('');

      await dispatch(
        resendCheckinOtpAction({
          batchVoucherId: row?.id,
        })
      ).unwrap();
      toast.success(batchViewRecords.otpDialog.otpResentSuccess);
    } catch (error: any) {
      setOtpError(error || batchViewRecords.otpDialog.failedToResendOtp);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, row]);

  return (
    <>
      <TableRow hover tabIndex={-1} sx={{ height: '41px' }}>
        {visibleColumns.map((col) => {
          const value = row[col.id as keyof BatchViewRecordsListData];
          if (col.id === 'sequence') {
            return (
              <TableCell key={col.id}>
                {getDisplayValue(row?.slotName)}
              </TableCell>
            );
          }

          if (col.id === 'date') {
            return (
              <TableCell key={col.id}>
                {getDisplayValue(formatDateIST(row?.date, { hideTime: true }))}
              </TableCell>
            );
          }

          if (col.id === 'startTime') {
            return (
              <TableCell key={col.id}>
                {getDisplayValue(formatTimeToAMPM(row?.startTime))}
              </TableCell>
            );
          }

          if (col.id === 'attendance') {
            return (
              <TableCell key={col.id}>
                {isAttended ? (
                  <Label variant="soft" color="success">
                    {batchViewRecords.attended}
                  </Label>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    onClick={handleCheckInClick}
                    sx={{
                      '&:hover': {
                        backgroundColor: '#1a407d',
                        color: '#fff',
                      },
                    }}
                  >
                    {batchViewRecords.checkIn}
                  </Button>
                )}
              </TableCell>
            );
          }

          return (
            <TableCell key={col.id}>{getDisplayValue(value as number | string)}</TableCell>
          );
        })}
      </TableRow>

      <OtpDialog
        open={otpOpen}
        onClose={handleOtpClose}
        onVerify={handleOtpVerify}
        onResend={handleOtpResend}
        errorMessage={otpError}
        isBlocked={isBlocked}
        title={batchViewRecords.otpDialog.title}
        description={batchViewRecords.otpDialog.description}
        submitButtonText={batchViewRecords.otpDialog.submitButtonText}
        showHeadCount
        headCount={headCount}
        onHeadCountChange={setHeadCount}
      />
    </>
  );
};

export default BatchRecordsRow;