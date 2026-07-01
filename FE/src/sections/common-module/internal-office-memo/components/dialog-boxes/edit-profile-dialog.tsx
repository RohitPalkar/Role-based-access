import * as yup from 'yup';
import { useFormik } from 'formik';
import React, { useEffect } from 'react';

import { Box , Grid, Radio, Button, Divider, IconButton, Typography, FormControlLabel } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';
import transferIcon from 'src/assets/icons/start icon.svg';

import { ConfirmDialog } from 'src/components/custom-dialog';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';

import StatusAlert from 'src/sections/loyalty/components/status-alert';

const { addLoyaltyPoints } = uiText.internalOfficeMemo;
const copy = uiText.internalOfficeMemo.addLoyaltyPoints.editProfile;

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  type: 'referrer' | 'referee';
}>;

const EditProfileDialog = ({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  type,
}: Props) => {
  const isReferrer = type === 'referrer';

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      sapEmail: 'old@email.com',
      pineLabsEmail: 'new@email.com',
      selectedEmail: 'sap',

      sapAddress2: '43, Batavia Chamber, L S P Road',
      pineLabsAddress2: '1775, 1st Floor, Cheera Khana, Nai Sarak',
      selectedAddress: 'pinelabs',
    },
    validationSchema: yup.object({
      selectedEmail: yup.string().required(),
      selectedAddress: yup.string().required(),
    }),
    onSubmit: (values) => {
      console.log(values);
      onSubmit();
    },
  });

  useEffect(() => {
    if (open) {
      formik.resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      showCloseButton
      showDivider
      leftAlignTitle
      isLarge
      contentTextAlign="left"
      titlePadding="24px"
      title={isReferrer ? copy.editReferrerTitle : copy.editRefereeTitle}
      cancelLabel={uiText.button.cancel}
      content={
        <Box component="form">
          <Box sx={{ mb: 2 }}>
            <StatusAlert
              type="info"
              message={addLoyaltyPoints.statusAlert.instruction}
              pineLabsId="PL123456789"
            />
          </Box>

          <Typography
            sx={{
              fontWeight: 600,
              fontSize: 14,
              mb: 1,
            }}
          >
            Email Address
          </Typography>
          <Grid
            container
            spacing={2}
            alignItems="flex-end"
          >
            <Grid item xs={5.5}>
              <FormControlLabel
                control={
                  <Radio
                    checked={formik.values.selectedEmail === 'sap'}
                    onChange={() =>
                      formik.setFieldValue(
                        'selectedEmail',
                        'sap'
                      )
                    }
                    sx={{ ml: 1 }}
                  />
                }
                label={copy.sap}
              />
              <FormikTextField
                noGrid
                formik={formik}
                name="sapEmail"
                disabled
              />
            </Grid>
            <Grid
              item
              xs={12}
              md={1}
              lg={1}
              sx={{ display: "flex", justifyContent: "center" }}
            >
              <IconButton
                sx={{
                  backgroundColor: '#1A407D',
                  color: 'white',
                  borderRadius: '8px',
                  width: { xs: '100%', sm: '100%', md: '100%', lg: 56 },
                  height: 48,
                  '&:hover': {
                    backgroundColor: '#174A9D',
                  },
                }}
              >
                <img src={transferIcon} alt="transfer" />
              </IconButton>
            </Grid>
            <Grid item xs={5.5}>
              <FormControlLabel
                control={
                  <Radio
                    checked={
                      formik.values.selectedEmail ===
                      'pinelabs'
                    }
                    onChange={() =>
                      formik.setFieldValue(
                        'selectedEmail',
                        'pinelabs'
                      )
                    }
                  />
                }
                label={copy.pineLabs}
              />
              <FormikTextField
                noGrid
                formik={formik}
                name="pineLabsEmail"
                disabled
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ borderStyle: 'dashed', borderColor: '#DADADA' }} />
            </Grid>
          </Grid>
        </Box>
      }
      action={
        <Button
          variant="contained"
          className="primaryBtn"
          disabled={isSubmitting}
          onClick={onSubmit}
          sx={{
            minWidth: { xs: '120px', lg: '204px' },
            height: '48px',
          }}
        >
          {uiText.button.update}
        </Button>
      }
    />
  );
};

export default EditProfileDialog;