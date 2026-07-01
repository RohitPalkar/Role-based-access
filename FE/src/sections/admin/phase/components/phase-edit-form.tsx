import type { AppDispatch } from 'src/redux/store';
import type { SubmitHandler } from 'react-hook-form';

import { z as zod } from 'zod';
import { toast } from 'sonner';
import { useParams } from 'react-router';
import { useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import { Box, Card, Grid, Button, Typography, FormControl, CircularProgress } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';
import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';

import { getMinMaxDateForFilter } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { clearPhaseData } from 'src/redux/slices/admin/phase-slice';
import { fetchBrands, fetchCitiesByBrandId } from 'src/redux/actions/admin/common-actions';
import { getPhaseByIdThunk, createOrEditPhaseThunk } from 'src/redux/actions/admin/phase-actions';

import { Form, Field} from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';


// phase form types
interface PhaseFormTypes {
  brand: string;
  city: string;
  phaseName: string;
  easebuzzBookingmid: string;
  easebuzzMilestonemid: string;
  sfdcPhaseName: string,
  blockNames: string,
  possessionDate: string,
}
/* Styles */
export const borderBottomStyle = {
  borderBottom: '1px dashed #DADADA',
  paddingBottom: '20px',
};

const optionalAlphaNumeric = zod
  .string()
  .optional()
  .refine((val) => !val || /^[a-zA-Z0-9]+$/.test(val), {
    message: 'Only alphanumeric characters are allowed',
});

// phase schema validation
const phaseSchema = zod.object({
  brand: zod.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    zod.number({ required_error: 'Brand is required' })
      .min(1, 'Brand is required')
  ),
  city: zod.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    zod.number({ required_error: 'City is required' })
      .min(1, 'City is required')
  ),
  phaseName: zod.string()
    .min(1, 'Phase Name is required')
    .min(3, 'Phase Name must be at least 3 characters long'),
  sfdcPhaseName: zod.string()
  .max(30, 'Phase Name must be at most 30 characters long')
  .optional(),
  blockNames: zod.string()
  .optional(),
  possessionDate: zod.string().min(1, {message: "Possession Date is requried"}),
  easebuzzBookingmid: optionalAlphaNumeric,
  easebuzzMilestonemid:optionalAlphaNumeric,
});

const PhaseEditForm = () => {
    const { phaseData } = useAppSelector((state) => state.phasesList);    
    const { startYearDate , endYearDate } = getMinMaxDateForFilter();
    const dispatch: AppDispatch = useDispatch();
    const router = useRouter();
    const panelPaths = useAdminPanelPaths();
    const { id } = useParams();
    const { cities, brands } = useAppSelector((state) => state.common);
    const isInitialMount = React.useRef(true);
    const [loading, setLoading] = useState(false);

    // check if edit mode
    const isEditMode = id !== undefined && id !== null && id !== '';

    // brand options
    const brandOptions = useMemo(
        () => brands.map((brand) => ({ value: brand.id, label: brand.name })),
        [brands]
      );

    // city options
    const cityOptions = useMemo(
        () => cities.map((city) => ({ value: city.id, label: city.name })),
        [cities]
      );

    // fetch phase data if id is present ( Edit Mode)
    useEffect(() => {
        if (id) {
        const numericId = Number(id);

        if (!Number.isNaN(numericId)) {        
        dispatch(getPhaseByIdThunk(numericId));
        }
      }
    }, [id, dispatch]);

    // methods
    const methods = useForm<PhaseFormTypes>({
    resolver: zodResolver( phaseSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
        brand: phaseData?.brand?.id ?? '',
        city: phaseData?.city?.id ?? '',
        phaseName: phaseData?.name ?? '',
        sfdcPhaseName: phaseData?.sfdcPhaseName ?? '',
        blockNames: phaseData?.blockNames?.join(', ') ?? '',
        possessionDate: phaseData?.possessionDate ?? '',
        easebuzzMilestonemid: phaseData?.easebuzzMilestonemid ?? '',
        easebuzzBookingmid: phaseData?.easebuzzBookingmid ?? '',
        },
    });

    useEffect(() => {
      if (phaseData) {
        isInitialMount.current = true;
        methods.reset({
          brand: phaseData?.brand?.id ?? '',
          city: phaseData?.city?.id ?? '',
          phaseName: phaseData?.name ?? '',
          sfdcPhaseName: phaseData?.sfdcPhaseName ?? '',
          blockNames: phaseData?.blockNames?.join(', ') ?? '',
          possessionDate: phaseData?.possessionDate ?? '',
          easebuzzMilestonemid: phaseData?.easebuzzMilestonemid ?? '',
          easebuzzBookingmid: phaseData?.easebuzzBookingmid ?? '',
        });
      }
    }, [phaseData, methods]);

    const { handleSubmit, control } = methods;

    const brandValue = methods.watch("brand");

    // Fetch brands on mount
      useEffect(() => {
        dispatch(fetchBrands());
      }, [dispatch]);
    
      // Fetch cities when brand changes
      useEffect(() => {
        if (isInitialMount.current) {
          isInitialMount.current = false;
        } else {
          methods.setValue('city', '');
        }
        if (brandValue) {
          dispatch(fetchCitiesByBrandId(brandValue));
        }
      }, [dispatch,methods, brandValue]);


      // handle cancel
      const handleCancel = useCallback(() => {
          methods.reset(); 
          dispatch(clearPhaseData());
          router.push(panelPaths.phase?.root);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [router, panelPaths]);

      // submit handler
      const onSubmit: SubmitHandler<PhaseFormTypes> = useCallback((data: any) => {
        
          const payload = {
            brandId: data.brand,
            cityId: data.city,
            name: data.phaseName,
            sfdcPhaseName: data.sfdcPhaseName,
            blockNames: data.blockNames
            ? data.blockNames
                .split(',')
                .map((item: string) => item.trim())
                .filter(Boolean)
            : [],
            possessionDate: data.possessionDate,
            easebuzzMilestonemid: data.easebuzzMilestonemid,
            easebuzzBookingmid: data.easebuzzBookingmid
          };
          setLoading(true);
          dispatch(createOrEditPhaseThunk({payload, id}))
            .unwrap()
            .then((response: any) => {
              router.push(panelPaths.phase?.root);
              dispatch(clearPhaseData());
              toast.success(response?.response?.response?.message);
            })
            .catch((error: any) => {
                toast.error(typeof error === 'string' ? error : error?.message || 'Something went wrong');
            }).finally(() => {
              setLoading(false);
            });
            
      }, [dispatch, id, router, panelPaths]);

      // clear data while unmounting
      // eslint-disable-next-line arrow-body-style
      useEffect(() => {
        return () => {
          dispatch(clearPhaseData());
        };
      }, [dispatch]);

    return (
        <DashboardContent>
            {/* Breadcrumb */}
            <CustomBreadcrumbs heading={id ? 'Edit Phase' : 'Create Phase'}
            sx={{ 
                mb: { xs: 0.5 },
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: 'background.default',
                py: 0.25 }} 
            />
            {/* Form */}
            <Card sx={{ padding: '30px' }}>
            <Form methods={methods} onSubmit={handleSubmit(onSubmit, () => { methods.trigger();})}>
              <Box mb={3} sx={borderBottomStyle}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6">Phase Details</Typography> 
                    {/* Brand and City */}
                    <Grid container spacing={2} mt={2}>
                        {/* Brand  */}
                          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                            <FormControl fullWidth>
                              <Controller
                                name="brand"
                                control={control}
                                render={({ field, fieldState }) => (
                                  <ControlledAutocomplete
                                    required
                                    disabled={isEditMode}
                                    label={uiText.boosterStructure.form.label.brand}
                                    options={brandOptions}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                  />
                                )}
                              />
                            </FormControl>
                          </Grid>
                          {/* City */}
                          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                            <FormControl fullWidth>
                              <Controller
                                name="city"
                                control={control}
                                render={({ field, fieldState }) => (
                                  <ControlledAutocomplete
                                    disabled={isEditMode}
                                    required
                                    label={uiText.boosterStructure.form.label.city}
                                    options={cityOptions}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                  />
                                )}
                              />
                            </FormControl>
                          </Grid>
                    </Grid>
                    {/* Phase Name and SFDC Phase Name */}
                    <Grid container spacing={2} mt={1}>
                      <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                        {/* Phase Name */}
                        <FormControl fullWidth>
                          <Field.Text
                            name="phaseName"
                            label="Phase Name"
                            required
                            inputProps={{ maxLength: 255 }}
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                        {/* SFDC Phase Name */}
                        <FormControl fullWidth>
                          <Field.Text
                            name="sfdcPhaseName"
                            label="SFDC Phase Name"
                            inputProps={{ maxLength: 30 }}
                          />
                        </FormControl>
                      </Grid>
                      {/* SFDC Block Name and Salt Booking */}
                      <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                        {/* SFDC Block Name */}
                        <FormControl fullWidth>
                          <Field.Text
                            name="blockNames"
                            label="SFDC Block Name"
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                        <FormControl fullWidth>
                          <Field.Date
                            name="possessionDate"
                            minDate={startYearDate}
                            maxDate={endYearDate}
                            label="Possession Date"
                            required
                          />
                        </FormControl>
                      </Grid>

                      <Grid item xs={12}>
                        <Box mt={-2} sx={borderBottomStyle} />
                      </Grid>
                    </Grid>

                    {/* Milestone and Booking Sub-Merchant ID */}
                    <Grid container spacing={2} mt={1}>
                        {/* Easebuzz Booking  Sub-Merchant ID" */}
                        <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                          <Field.Text
                            name="easebuzzBookingmid"
                            label="Easebuzz Sub-Merchant ID (Booking)"
                            placeholder="Enter Easebuzz Sub-Merchant ID"
                            inputProps={{ maxLength: 50 }}
                            onChange={(event) => {
                              const { value } = event.target
                                methods.setValue("easebuzzBookingmid", value, { shouldValidate: true });
                            }}
                            />
                        </Grid>
                          {/* Easebuzz Milestone  Sub-Merchant ID" */}
                         <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                          <Field.Text
                            name="easebuzzMilestonemid"
                            label="Easebuzz Sub-Merchant ID (Milestone)"
                            placeholder="Enter Easebuzz Sub-Merchant ID"
                            inputProps={{ maxLength: 50 }}
                            onChange={(event) => {
                              const { value } = event.target
                                methods.setValue("easebuzzMilestonemid", value, { shouldValidate: true });
                            }}
                            />
                        </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Box>

                {/* cancel and submit button */}
              <Box sx={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <Button variant="outlined" color="inherit" onClick={handleCancel}>
                  {uiText.button.cancel}
              </Button>
              <Button type="submit"  className="primaryBtn" sx={{ color: '#fff' }}>
                  {loading ? <CircularProgress size={20} color="inherit" /> : uiText.button.save}
              </Button>
              </Box>
            </Form>
            </Card>
        </DashboardContent>
    );
}


export default PhaseEditForm;

