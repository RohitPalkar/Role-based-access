import type { DropdownIdNameType } from 'src/services/common-module/batch-manager-services';

import dayjs from 'dayjs';
import * as yup from 'yup';
import { useFormik } from "formik";
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm, FormProvider } from 'react-hook-form';
import React, { useMemo, useState, useEffect } from 'react';

import LoadingButton from '@mui/lab/LoadingButton';
import { Box, Button, TextField, IconButton, Typography } from '@mui/material';

import { mapArrayToLabelValue } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';
import transferIcon from 'src/assets/icons/start icon.svg';

import { Field } from 'src/components/hook-form';
import { ConfirmDialog } from "src/components/custom-dialog";
import { FormikTextField } from "src/components/formik-textfield/formik-textfield";
import FormikAutocomplete from 'src/components/formik-autocomplete/FormikAutocomplete';


export type DialogType = 'MOVE' | 'DELETE' | 'LOCK' | 'UNLOCK' | 'RELEASE' | 'OPEN_BATCH' | 'NOTIFY_CX';

export type NotifySubmitPayload =
  | { mode: 'now' }
  | { mode: 'scheduled'; date: string; time: string };

type BatchListingDialogBoxProps = {
  dialog: boolean;
  setDialog: (val: boolean) => void;
  type: DialogType;
  selectedRow?: {
    name: string;
    batchName?: string;
  };
  onSubmit?: (values?: { firstBatch: string; secondBatch: string; comment?: string }) => void;
  onNotifySubmit?: (payload: NotifySubmitPayload) => Promise<void> | void;
  isNotifySubmitting?: boolean;
  slotId?: string;
  enableScheduleOption?: boolean;
  batchSlotsDropdownData?: DropdownIdNameType[];
};

const labelStyle = {
  fontSize: '14px',
  fontWeight: 600,
  mb: 1,
};

const transferIconStyle = {
  backgroundColor: '#1A407D',
  color: 'white',
  borderRadius: '8px',
  width: { xs: '100%', lg: 56 },
  height: 48,
  mt: 2,
  mb: 2,
  '&:hover': {
    backgroundColor: '#174A9D',
  },
};

const actionButtonStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#fff',
  background: '#1A407D',
  minWidth: { xs: '120px', lg: '204px' },
  height: '48px',
  margin: 0,
  '&:hover': {
    background: '#1A407D',
    boxShadow: 'none',
  },
};

const BatchListingDialogBox = ({
  dialog,
  setDialog,
  type,
  selectedRow,
  onSubmit,
  onNotifySubmit,
  isNotifySubmitting = false,
  enableScheduleOption = true,
  slotId,
  batchSlotsDropdownData,
}: BatchListingDialogBoxProps) => {
  const [showScheduleFields, setShowScheduleFields] = useState(false);
  
  const currentSlot = useMemo(() => 
    batchSlotsDropdownData?.find((slot: any) => slot.id === slotId),
  [batchSlotsDropdownData, slotId]);

  const currentSlotName = currentSlot?.name || selectedRow?.batchName || '';
  const { dialog: dialogJson } = uiText.batchManager;

  const notifyCancelBtnLabel = showScheduleFields ? uiText.button.cancel : dialogJson.nofityCx.cancdlLabel 
  const batchSlotDropdownOptions = useMemo(() => {
    const options = mapArrayToLabelValue(batchSlotsDropdownData || [], 'name', 'id');
    return options.filter((option) => option.value !== slotId);
  }, [batchSlotsDropdownData, slotId]);

  const batchDialogBoxFormik = useFormik({
    initialValues: {
      firstBatch: currentSlotName,
      secondBatch: '',
      comment: '',
      date: '',
      time: '',
    },
    validationSchema: yup.object({
      firstBatch: yup.string().required("Please select batch"),
      secondBatch: yup.string().required("Please select batch"),
      comment: yup.string().required("Comment is required"),
    }),
    enableReinitialize: true,
    onSubmit: (values) => {
      onSubmit?.(values);
    },
  });

  // Create React Hook Form instance for Field components
  const rhfMethods = useForm({
    defaultValues: {
      date: batchDialogBoxFormik.values.date,
      time: batchDialogBoxFormik.values.time,
    },
    resolver: yupResolver(yup.object({
      date: yup.string().required("Date is required"),
      time: yup.string().required("Time is required"),
    })),
  });

  // Sync Formik values with React Hook Form
  useEffect(() => {
    rhfMethods.setValue('date', batchDialogBoxFormik.values.date);
    rhfMethods.setValue('time', batchDialogBoxFormik.values.time);
  }, [batchDialogBoxFormik.values.date, batchDialogBoxFormik.values.time, rhfMethods]);

  // Watch React Hook Form changes and update Formik
  useEffect(() => {
    const subscription = rhfMethods.watch((value) => {
      if (value.date !== batchDialogBoxFormik.values.date) {
        batchDialogBoxFormik.setFieldValue('date', value.date || '');
      }
      if (value.time !== batchDialogBoxFormik.values.time) {
        batchDialogBoxFormik.setFieldValue('time', value.time || '');
      }
    });
    return () => subscription.unsubscribe();
  }, [rhfMethods, batchDialogBoxFormik]);

  const resetNotifyScheduleState = () => {
    setShowScheduleFields(false);
    batchDialogBoxFormik.setFieldValue('date', '');
    batchDialogBoxFormik.setFieldValue('time', '');
    rhfMethods.reset({ date: '', time: '' });
  };

  useEffect(() => {
    if (!dialog) {
      resetNotifyScheduleState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  const renderMoveContent = () => (
    <>
      <Typography sx={labelStyle}>
        {dialogJson.move.batch1Label}
      </Typography>

      <FormikTextField
        name="firstBatch"
        placeholder={dialogJson.move.selectBatch}
        required
        formik={batchDialogBoxFormik}
        disabled
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconButton sx={transferIconStyle}>
          <img src={transferIcon} alt="transfer" />
        </IconButton>
      </Box>

      <Typography sx={labelStyle}>
        {dialogJson.move.toBatchLabel}
      </Typography>

      <FormikAutocomplete
        placeholder={dialogJson.move.selectBatch}
        name="secondBatch"
        required
        formik={batchDialogBoxFormik}
        options={batchSlotDropdownOptions}
      />

      <Typography sx={{ ...labelStyle, mt: 2 }}>
        {dialogJson.move.comment} <span style={{ color: '#d32f2f' }}>*</span>
      </Typography>

      <TextField
        name="comment"
        fullWidth
        placeholder={dialogJson.move.commentPlaceholder}
        multiline
        required
        rows={4}
        value={batchDialogBoxFormik.values.comment}
        onChange={batchDialogBoxFormik.handleChange}
        onBlur={batchDialogBoxFormik.handleBlur}
        inputProps={{ maxLength: 5000 }}
        error={
          batchDialogBoxFormik.touched.comment &&
          Boolean(batchDialogBoxFormik.errors.comment)
        }
        helperText={
          batchDialogBoxFormik.touched.comment &&
            batchDialogBoxFormik.errors.comment
            ? batchDialogBoxFormik.errors.comment
            : `${batchDialogBoxFormik.values.comment.length}/5000 characters`
        }
      />
    </>
  );

  const renderNotifyCxContent = () => {
    const sharedStartMaxTime = dayjs().endOf('day');

    return (
      <FormProvider {...rhfMethods}>
        <Typography>
          {dialogJson.nofityCx.content}
        </Typography>
        {showScheduleFields && (
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              mt: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Field.Date
                name="date"
                label={dialogJson.nofityCx.date}
                minDate={dayjs().startOf('day')}
                required
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Field.Time
                name="time"
                label={dialogJson.nofityCx.time}
                required
                maxTime={sharedStartMaxTime}
              />
            </Box>
          </Box>
        )}
      </FormProvider>
    );
  };

  const dialogConfig = {
    MOVE: {
      title: dialogJson.move.title,
      content: renderMoveContent(),
      actionLabel: dialogJson.move.actionLabel,
      showDivider: true,
      cancelLabel: uiText.button.cancel,
    },
    DELETE: {
      title: dialogJson.delete.title,
      content: dialogJson.delete.content,
      actionLabel: dialogJson.delete.actionLabel,
      showDivider: false,
      cancelLabel: uiText.button.cancel,
    },
    LOCK: {
      title: dialogJson.lock.title,
      content: dialogJson.lock.content,
      actionLabel: dialogJson.lock.actionLabel,
      showDivider: false,
      cancelLabel: uiText.button.cancel,
    },
    UNLOCK: {
      title: dialogJson.unlock.title,
      content: dialogJson.unlock.content,
      actionLabel: dialogJson.unlock.actionLabel,
      showDivider: false,
      cancelLabel: uiText.button.cancel,
    },
    OPEN_BATCH: {
      title: dialogJson.openBatch.title,
      content: dialogJson.openBatch.content.split('\n\n').map((text, index) => (
        <Typography key={text} sx={{ mb: index === 0 ? 1 : 0 }}>
          {text}
        </Typography>
      )),
      actionLabel: dialogJson.openBatch.actionLabel,
      showDivider: false,
      cancelLabel: uiText.button.cancel,
    },
    RELEASE: {
      title: dialogJson.release.title,
      content: dialogJson.release.content.map((text, index) => (
        <Typography key={text} sx={{ mb: index === 0 ? 1 : 0 }}>
          {text}
        </Typography>
      )),
      actionLabel: dialogJson.release.actionLabel,
      showDivider: false,
      cancelLabel: uiText.button.cancel,
    },
    NOTIFY_CX: {
      title: dialogJson.nofityCx.title,
      content: renderNotifyCxContent(),
      actionLabel: showScheduleFields
        ? uiText.button.submit
        : dialogJson.nofityCx.actionLabel,
      showDivider: false,
      cancelLabel: enableScheduleOption ? notifyCancelBtnLabel : uiText.button.cancel,
    },
  };

  const handleAction = async () => {
    if (type === 'MOVE') {
      batchDialogBoxFormik.handleSubmit();
      return;
    }

    if (type === 'NOTIFY_CX') {
      if (!showScheduleFields) {
        try {
          await onNotifySubmit?.({ mode: 'now' });
          resetNotifyScheduleState();
        } catch {
          // Parent shows toast; keep dialog open
        }
        return;
      }

      const isValid = await rhfMethods.trigger(['date', 'time']);
      if (!isValid) {
        return;
      }

      const { date, time } = batchDialogBoxFormik.values;
      try {
        await onNotifySubmit?.({ mode: 'scheduled', date, time });
        resetNotifyScheduleState();
      } catch {
        // Parent shows toast; keep dialog open
      }
      return;
    }

    onSubmit?.();
    setDialog(false);
  };

  const config = dialogConfig[type];
  const isNotifyCx = type === 'NOTIFY_CX';
  const ActionButton = isNotifyCx ? LoadingButton : Button;

  return (
    <ConfirmDialog
      open={dialog}
      onClose={() => {
        resetNotifyScheduleState();
        setDialog(false);
      }}
      title={config.title}
      content={config.content}
      contentTextAlign="left"
      action={
        <ActionButton
          variant="contained"
          sx={actionButtonStyle}
          loading={isNotifyCx && isNotifySubmitting}
          disabled={
            (type === 'MOVE' && !batchDialogBoxFormik.values.secondBatch) ||
            (isNotifyCx && isNotifySubmitting)
          }
          onClick={handleAction}
        >
          {config.actionLabel}
        </ActionButton>
      }
      cancelLabel={config.cancelLabel}
      showCloseButton
      leftAlignTitle
      showDivider={config.showDivider}
      onCancel={() => {
        if (type === 'NOTIFY_CX') {
          // if schedule option disabled
          if (!enableScheduleOption) {
            setDialog(false);
            return;
          }
          // First state -> show fields
          if (!showScheduleFields) {
            setShowScheduleFields(true);
            return;
          }

          // Second state -> hide fields
          resetNotifyScheduleState();
          return;
        }

        setDialog(false);
      }}
    />
  );
};

export default BatchListingDialogBox