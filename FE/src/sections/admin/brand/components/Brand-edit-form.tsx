import type { SubmitHandler } from 'react-hook-form';

import { z as zod } from 'zod';
import { toast } from 'sonner';
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Box, Card, Grid, Button, Typography, FormControl, InputAdornment } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';

import { BRAND_ASSET_DROPZONE_BOUNDS, getBrandAssetUploadTooltipContent } from 'src/utils/brand-asset-specs';

import uiText from 'src/locales/langs/en/common.json';
import { editBrand } from 'src/services/admin-services/brand-srvice';

import { Form, Field } from 'src/components/hook-form';
import NewDropzone from 'src/components/dropzone/NewDropzone';

/* Types */
interface BrandDetailsProps {
  brand: any;
 
}

const optionalAlphaNumeric = zod
  .string()
  .optional()
  .refine((val) => !val || /^[a-zA-Z0-9]+$/.test(val), {
    message: 'Only alphanumeric characters are allowed',
});

/** `NewDropzone` clears with `null`; `z.string()` rejects null before `.min(1)`. */
const nullToEmptyString = (val: unknown) => (val === null ? '' : val);

const brandSchema = zod.object({
  name: zod.string().min(3, 'Name must be at least 3 characters long'),
  salaryMultiplier: zod
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Only positive numbers with up to 2 decimal places are allowed',
    })
    .refine((val) => !val || Number.parseFloat(val) > 0, {
      message: 'Value must be greater than 0',
    }),
  razorpayKey: zod
    .string()
    .optional()
    .refine((val) => !val || /^\w+$/.test(val), {
      message: 'Only alphanumeric characters and underscore (_) are allowed',
    }),
  razorpaySecret: zod
    .string()
    .optional()
    .refine((val) => !val || /^[A-Za-z0-9]+$/.test(val), {
      message: 'Only alphanumeric characters are allowed',
    }),
  easebuzzBookingSalt: optionalAlphaNumeric,
  easebuzzBookingKey: optionalAlphaNumeric,
  easebuzzMilestoneSalt: optionalAlphaNumeric,
  easebuzzMilestoneKey: optionalAlphaNumeric,
  easebuzzBookingmid: optionalAlphaNumeric,
  easebuzzMilestonemid: optionalAlphaNumeric,
  reraPayable: zod
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d{1,3})?$/.test(val), {
      message: 'Only positive numbers with up to 3 decimal places are allowed',
    })
    .refine((val) => !val || Number.parseFloat(val) <= 100, {
      message: 'Value cannot be greater than 100',
    }),

  reraRegularization: zod
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d{1,3})?$/.test(val), {
      message: 'Only positive numbers with up to 3 decimal places are allowed',
    })
    .refine((val) => !val || Number.parseFloat(val) <= 100, {
      message: 'Value cannot be greater than 100',
    }),

  rtmPayable: zod
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d{1,3})?$/.test(val), {
      message: 'Only positive numbers with up to 3 decimal places are allowed',
    })
    .refine((val) => !val || Number.parseFloat(val) <= 100, {
      message: 'Value cannot be greater than 100',
    }),

  rtmRegularization: zod
    .string()
    .optional()
    .refine((val) => !val || /^\d+(\.\d{1,3})?$/.test(val), {
      message: 'Only positive numbers with up to 3 decimal places are allowed',
    })
    .refine((val) => !val || Number.parseFloat(val) <= 100, {
      message: 'Value cannot be greater than 100',
    }),

  maxQualificationDays: zod
    .preprocess((val) => Number(val), zod.number())
    .refine((val) => val >= 1 && val <= 365, {
      message: 'Must be between 1 and 365 days',
    })
    .refine((val) => Number.isInteger(val), {
      message: 'Must be a whole number',
    }),
  logo: zod.preprocess(
    nullToEmptyString,
    zod.string().min(1, { message: 'Brand Logo is required' })
  ),
});

interface BrandFormTypes {
  name: string;
  logo: string;
  salaryMultiplier: string;
  razorpayKey?: string;
  razorpaySecret?: string;
  easebuzzBookingSalt?: string;
  easebuzzBookingKey?: string;
  easebuzzMilestoneSalt?: string;
  easebuzzMilestoneKey?: string;
  easebuzzBookingmid?: string;
  easebuzzMilestonemid?: string;
  reraPayable: string;
  reraRegularization: string;
  rtmPayable: string;
  rtmRegularization: string;
  maxQualificationDays: number;
}

/* Styles */
const borderBottomStyle = {
  borderBottom: '1px dashed #DADADA',
  paddingBottom: '20px',
};

export const BrandDetails: React.FC<BrandDetailsProps> = ({ brand}) => {
    const router = useRouter();
    const panelPaths = useAdminPanelPaths();

  const handleCancel = () => {
     router.push(panelPaths.brand?.root);
  };



  const methods = useForm<BrandFormTypes>({
    resolver: zodResolver( brandSchema),
    mode: 'onBlur',
    defaultValues: {
      name: brand?.name || '',
      logo: brand?.logo || '',
      salaryMultiplier: brand?.salaryMultiplier?.toString() || '', 
      razorpayKey: brand?.razorpayKey || '',
      razorpaySecret: brand?.razorpaySecret || '',
      easebuzzBookingSalt: brand?.easebuzzBookingSalt || '',
      easebuzzBookingKey: brand?.easebuzzBookingKey || '',
      easebuzzMilestoneSalt: brand?.easebuzzMilestoneSalt || '',
      easebuzzMilestoneKey: brand?.easebuzzMilestoneKey || '',
      easebuzzBookingmid: brand?.easebuzzBookingmid || '',
      easebuzzMilestonemid: brand?.easebuzzMilestonemid || '',
      reraPayable: brand?.reraPayable || '',
      reraRegularization: brand?.reraRegularization || '',
      rtmPayable: brand?.rtmPayable || '',
      rtmRegularization: brand?.rtmRegularization || '',
      maxQualificationDays: brand?.maxQualificationDays || 30,
    },
  });

const { handleSubmit, reset } = methods;
useEffect(() => {
  if (brand) {
    reset({
      name: brand.name || '',
      logo: brand.logo || '',
      salaryMultiplier: brand.salaryMultiplier?.toString() || '',
      razorpayKey: brand?.razorpayKey || '',
      razorpaySecret: brand?.razorpaySecret || '',
      easebuzzBookingSalt: brand?.easebuzzBookingSalt || '',
      easebuzzBookingKey: brand?.easebuzzBookingKey || '',
      easebuzzMilestoneSalt: brand?.easebuzzMilestoneSalt || '',
      easebuzzMilestoneKey: brand?.easebuzzMilestoneKey || '',
      easebuzzBookingmid: brand?.easebuzzBookingmid || '',
      easebuzzMilestonemid: brand?.easebuzzMilestonemid || '',
      reraPayable: brand.reraPayable?.toString() || '',
      reraRegularization: brand.reraRegularization?.toString() || '',
      rtmPayable: brand.rtmPayable?.toString() || '',
      rtmRegularization: brand.rtmRegularization?.toString() || '',
      maxQualificationDays: brand.maxQualificationDays || 30,
    });
  }
}, [brand, reset]);

  const onSubmit: SubmitHandler<BrandFormTypes> = async (data: any) => {
    try {
      const payload = {
        name: data.name,
        logo: data.logo,
        salaryMultiplier: data.salaryMultiplier ? Number(data.salaryMultiplier) : null,
        razorpayKey: data?.razorpayKey || null,
        razorpaySecret: data?.razorpaySecret || null,
        easebuzzBookingSalt: data?.easebuzzBookingSalt || null,
        easebuzzBookingKey: data?.easebuzzBookingKey || null,
        easebuzzMilestoneSalt: data?.easebuzzMilestoneSalt || null,
        easebuzzMilestoneKey: data?.easebuzzMilestoneKey || null,
        easebuzzBookingmid: data?.easebuzzBookingmid || null,
        easebuzzMilestonemid: data?.easebuzzMilestonemid || null,
        reraRegularization: data.reraRegularization,
        reraPayable: data.reraPayable,
        rtmRegularization: data.rtmRegularization,
        rtmPayable: data.rtmPayable,
        maxQualificationDays: Number(data.maxQualificationDays),
      };
      
      await editBrand(brand?.id, payload);
      
      toast.success('Brand updated successfully');
           router.push(panelPaths.brand?.root);

    } catch (error: any) {
      toast.error(error?.message || 'Failed to update brand');
    }
  };

  return (

          <Card sx={{ padding: '30px' }}>
      <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <Box mb={3} sx={borderBottomStyle}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Grid container spacing={2} mt={2}>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      name="name"
                      label="Brand Name"
                      inputProps={{ maxLength: 255 }}
                      disabled
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      name="salaryMultiplier"
                      label="Salary Multiplier"
                      placeholder="Enter multiplier value"
                      inputProps={{ maxLength: 10 }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      name="razorpayKey"
                      label="RazorPay Merchant ID for booking"
                      placeholder="Enter RazorPay Merchant ID for booking"
                      inputProps={{ maxLength: 50 }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      name="razorpaySecret"
                      label="RazorPay Secret Key (Booking)"
                      placeholder="Enter RazorPay Merchant Key (Booking)"
                      inputProps={{ maxLength: 50 }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      name="easebuzzBookingSalt"
                      label="Easebuzz Salt (Booking)"
                      placeholder="Enter Easebuzz Booking Salt"
                      inputProps={{ maxLength: 50 }}
                      onChange={(event) => {
                        const { value } = event.target;
                        methods.setValue("easebuzzBookingSalt", value, { shouldValidate: true });
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      name="easebuzzBookingKey"
                      label="Easebuzz Key (Booking)"
                      placeholder="Enter Easebuzz Booking Key"
                      inputProps={{ maxLength: 50 }}
                      onChange={(event) => {
                        const { value } = event.target;
                        methods.setValue("easebuzzBookingKey", value, { shouldValidate: true });
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      name="easebuzzMilestoneSalt"
                      label="Easebuzz Salt (Milestone)"
                      placeholder="Enter Easebuzz Milestone Salt"
                      inputProps={{ maxLength: 50 }}
                      onChange={(event) => {
                        const { value } = event.target;
                        methods.setValue("easebuzzMilestoneSalt", value, { shouldValidate: true });
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      name="easebuzzMilestoneKey"
                      label="Easebuzz Key (Milestone)"
                      placeholder="Enter Easebuzz Milestone Key"
                      inputProps={{ maxLength: 50 }}
                      onChange={(event) => {
                        const { value } = event.target;
                        methods.setValue("easebuzzMilestoneKey", value, { shouldValidate: true });
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      name="easebuzzBookingmid"
                      label="Easebuzz Sub-Merchant ID (Booking)"
                      placeholder="Enter Easebuzz Sub-Merchant ID"
                      inputProps={{ maxLength: 50 }}
                      onChange={(event) => {
                        const { value } = event.target;
                        methods.setValue("easebuzzBookingmid", value, { shouldValidate: true });
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      name="easebuzzMilestonemid"
                      label="Easebuzz Sub-Merchant ID (Milestone)"
                      placeholder="Enter Easebuzz Sub-Merchant ID"
                      inputProps={{ maxLength: 50 }}
                      onChange={(event) => {
                        const { value } = event.target;
                        methods.setValue("easebuzzMilestonemid", value, { shouldValidate: true });
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="logo"
                    control={methods.control}
                    render={({ field, fieldState }) => (
                      <NewDropzone
                        label="Brand Logo"
                        path={field.value}
                        name="logo"
                        fieldName="logo"
                        documentType="image"
                        allowSvg
                        previewContrastBg
                        uploadText='Upload Brand Logo'
                        isOther={false}
                        required
                        imgMinWidth={BRAND_ASSET_DROPZONE_BOUNDS.headerBrandLogo.imgMinWidth}
                        imgMaxWidth={BRAND_ASSET_DROPZONE_BOUNDS.headerBrandLogo.imgMaxWidth}
                        imgMinHeight={BRAND_ASSET_DROPZONE_BOUNDS.headerBrandLogo.imgMinHeight}
                        imgMaxHeight={BRAND_ASSET_DROPZONE_BOUNDS.headerBrandLogo.imgMaxHeight}
                        dimensionSpecTooltip={getBrandAssetUploadTooltipContent('headerBrandLogo')}
                        errorMarginLeft={2}
                        formik={{
                          setFieldValue: (_: string, value: string) => field.onChange(value),
                          setFieldError: () => { },
                          errors: {
                            logo: fieldState.error?.message || "",
                          },
                          touched: {
                            logo: fieldState.isTouched || false,
                          },
                        }}
                        error={fieldState.error?.message}
                        touched={!!fieldState.error}
                         s3UploadFilePath="brands"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>

        <Box mb={3} sx={borderBottomStyle}>
          <Typography variant="h6">Incentive Qualification</Typography>

          <Grid container  spacing={2}>
            <Grid item xs={6}>
              <Typography variant="h6" sx={{ textAlign: 'center' }}>
                RERA/Under Construction
              </Typography>
              <Grid container spacing={2} mt={2}>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      name="reraRegularization"
                      label="Regularization"
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      name="reraPayable"
                      label="Payable"
                    />
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="h6" sx={{ textAlign: 'center' }}>
                RTM/OC Received
              </Typography>
              <Grid container spacing={2} mt={2}>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      name="rtmRegularization"
                      label="Regularization"
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormControl fullWidth>
                    <Field.Text
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      name="rtmPayable"
                      label="Payable"
                    />
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Grid container spacing={3} mt={2}>
            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <FormControl fullWidth>
                <Field.Text
                  name="maxQualificationDays"
                  label="Maximum Regularization Days"
                  placeholder="Enter days"
                  
                />
              </FormControl>
            </Grid>
          </Grid>
        </Box>
        <Box sx={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="inherit" onClick={handleCancel}>
            {uiText.button.cancel}
          </Button>
          <Button type="submit" className="primaryBtn" sx={{ color: '#fff' }}>
            {uiText.button.save}
          </Button>
        </Box>
      </Form>
    </Card>
         
   
  );
};
