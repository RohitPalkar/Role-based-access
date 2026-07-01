import type { SubmitHandler } from 'react-hook-form';

import { z as zod } from 'zod';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';

import {
  Box,
  Radio,
  Button,
  Divider,
  Typography,
  RadioGroup,
  FormControl,
  FormHelperText,
  FormControlLabel,
} from '@mui/material';

import { PointsClassification } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';

import { Form } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

const copy = uiText.internalOfficeMemo.addLoyaltyPoints.pointsClassification;

const DEFAULT_VALUES = {
  clarificationStatus: PointsClassification.ELIGIBLE,
};

const pointsClassificationSchema = zod.object({
  clarificationStatus: zod.string().min(1, { message: `${copy.clarificationStatus} is required` }),
});

export type PointsClassificationFormValues = zod.infer<typeof pointsClassificationSchema>;

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PointsClassificationFormValues) => void;
  isSubmitting?: boolean;
  eligiblePoolAmount: string | number;
  redeemablePoolAmount: string | number;
}>;

export function PointsClassificationDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  eligiblePoolAmount,
  redeemablePoolAmount,
}: Props) {
  const methods = useForm<PointsClassificationFormValues>({
    resolver: zodResolver(pointsClassificationSchema),
    mode: 'onChange',
    defaultValues: DEFAULT_VALUES,
  });

  const { control, handleSubmit, reset } = methods;

  useEffect(() => {
    if (open) {
      reset(DEFAULT_VALUES);
    }
  }, [open, reset]);

  const handleFormSubmit: SubmitHandler<PointsClassificationFormValues> = (values) => {
    onSubmit(values);
  };

  const formatIndianCurrency = (value: string | number) => Number(value || 0).toLocaleString('en-IN');

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      showCloseButton
      leftAlignTitle
      contentTextAlign="left"
      showDivider
      titlePadding="24px 24px"
      title={copy.title}
      cancelLabel={uiText.button.cancel}
      content={
        <Form methods={methods} onSubmit={handleSubmit(handleFormSubmit)}>
          <FormControl component="fieldset" fullWidth>
            <Typography sx={{ fontSize: '14px', mb: 1 }}>
              {copy.clarificationStatus} <span style={{ color: '#FF0000' }}>*</span>
            </Typography>
            <Typography sx={{ fontSize: '12px', mb: 1.5 }}>
              {copy.description}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 1,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  py: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#2E3192',
                    lineHeight: 1.2,
                  }}
                >
                  ₹ {formatIndianCurrency(eligiblePoolAmount)}
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: '14px', fontWeight: 500 }}>
                  {copy.eligiblePoolAmount}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />

              <Box
                sx={{
                  flex: 1,
                  py: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#2E3192',
                    lineHeight: 1.2,
                  }}
                >
                  ₹ {formatIndianCurrency(redeemablePoolAmount)}
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: '14px', fontWeight: 500 }}>
                  {copy.redeemablePoolAmount}
                </Typography>
              </Box>
            </Box>
            <Controller
              name="clarificationStatus"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <RadioGroup row {...field} sx={{ ml: 1 }}>
                    <FormControlLabel
                      value={PointsClassification.ELIGIBLE}
                      control={<Radio />}
                      label={PointsClassification.ELIGIBLE}
                    />
                    <FormControlLabel
                      value={PointsClassification.REDEEMABLE}
                      control={<Radio />}
                      label={PointsClassification.REDEEMABLE}
                    />
                  </RadioGroup>
                  {fieldState.error?.message ? (
                    <FormHelperText error>{fieldState.error.message}</FormHelperText>
                  ) : null}
                </>
              )}
            />
          </FormControl>
        </Form>
      }
      action={
        <Button
          variant="contained"
          disabled={isSubmitting}
          onClick={handleSubmit(handleFormSubmit)}
          className="primaryBtn"
          sx={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#fff',
            minWidth: { xs: '120px', lg: '204px' },
            height: '48px',
            margin: 0,
          }}
        >
          {uiText.button.update}
        </Button>
      }
    />
  );
}
