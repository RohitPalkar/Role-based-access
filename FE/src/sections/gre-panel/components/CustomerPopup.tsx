import dayjs from 'dayjs';
import React, { useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';

import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Grid,
  Dialog,
  Button,
  TextField,
  FormLabel,
  Typography,
  IconButton,
  DialogTitle,
  FormControl,
  Autocomplete,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { GRE_DESIGNATION_OPTIONS } from 'src/utils/constant';

import { route } from 'src/services/apiRoutes';
import { PATCH } from 'src/services/axiosInstance';
import { fetchVisitById, fetchDropdownsByProject } from 'src/redux/actions/gre/visit-action';

import { toast } from 'src/components/snackbar';
import { AnimateLogo1 } from 'src/components/animate';
import RHFGoogleMapsAutocomplete from 'src/components/google-maps-autocomplete/RHFGoogleMapsAutocomplete';

type FormValues = {
  maritalStatus?: string;
  purchaseReason?: string;
  currentResidenceType?: string;
  occupation?: string | null; // store the value like "Z002"
  designation?: string | null;
  organizationName: string;
  organizationAddress: string;
  budget?: string | null;
  firstName: string;
  lastName: string;
  enquiryId: string;
  svDate: string;
};

type CustomerPopupProps = {
  id: string;
  projectName: string;
  open: boolean;
  onClose: () => void;
};

const CustomerPopup: React.FC<CustomerPopupProps> = ({ id, projectName, open, onClose }) => {
  const dispatch = useAppDispatch();
  const { visit, dropdowns, loading, error } = useAppSelector((state: any) => state.visit);

  const HIDE_ALL = useMemo(() => ['Retired', 'Freelance', 'Homekeeper'], []);
  const BUSINESS = useMemo(() => ['Business'], []);
  const SALARIED = useMemo(() => ['Salaried', 'Professional'], []);

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormValues>({
    mode: 'all',
    defaultValues: {
      occupation: null,
      designation: null,
      organizationName: '',
      organizationAddress: '',
      maritalStatus: '',
      purchaseReason: '',
      currentResidenceType: '',
      budget: null,
      firstName: '',
      lastName: '',
      enquiryId: '',
      svDate: '',
    },
  });

  const selectedOccupationName = useMemo(() => {
    const v = Array.isArray(visit) && visit.length > 0 ? visit[0] : null;
    return (
      (dropdowns?.Occupation ?? []).find((opt: any) => opt.value === v?.Sv_Occupation_Employment)
        ?.name ?? null
    );
  }, [visit, dropdowns]);

  useEffect(() => {
    if (open && projectName) dispatch(fetchDropdownsByProject(projectName));
  }, [open, projectName, dispatch]);

  useEffect(() => {
    if (open && id) dispatch(fetchVisitById(id));
  }, [open, id, dispatch]);

  useEffect(() => {
    const v = Array.isArray(visit) ? visit[0] : visit;
    if (v) {
      setValue('occupation', v?.Sv_Occupation_Employment ?? null);
      setValue('designation', v?.SV_Desination_of_Customer ?? null);
      setValue('organizationName', v?.SV_Company_Name || '');
      setValue('organizationAddress', v?.SV_Current_Company_Address || '');
      setValue('budget', v?.Budget ?? null);
      setValue('maritalStatus', v?.SV_Marital_Status || '');
      setValue('purchaseReason', v?.SV_Reason_for_Purchase || '');
      setValue('currentResidenceType', v?.Current_Residence_Typology || '');
      setValue('firstName', v?.firstName || '');
      setValue('lastName', v?.lastName || '');
      setValue('enquiryId', v?.Enquiry_Ref_No || '');
      setValue('svDate', v?.createdAt ? dayjs(v.createdAt).format('DD-MM-YYYY hh:mm a') : '');
    }
  }, [visit, setValue, id]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const v = Array.isArray(visit) && visit.length > 0 ? visit[0] : null;
      const payload = {
        ...data,
        maritalStatus: data.maritalStatus?.toLowerCase() || '',
        leadId: v.leadId,
      };
      const response = await PATCH(`${route.PATCH_CUSTOMER_DETAILS}?id=${id}`, payload);
      toast.success(
        response?.response?.response?.message ?? 'Customer fields updated successfully.'
      );
      handleClose();
    } catch (err) {
      toast.error(err?.response?.data?.errors?.message ?? 'Failed to update customer fields.');
    }
  };

  useEffect(() => {
    if (HIDE_ALL.includes(selectedOccupationName)) {
      setValue('organizationName', '');
      setValue('organizationAddress', '');
      setValue('designation', null);
    } else if (BUSINESS.includes(selectedOccupationName)) {
      setValue('designation', null);
    }
  }, [selectedOccupationName, setValue, HIDE_ALL, BUSINESS]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg" scroll="body">
      <DialogTitle
        sx={{
          fontWeight: 700,
          textAlign: 'center',
          position: 'relative',
        }}
      >
        RM Fields
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ position: 'absolute', right: 10, top: 10 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      {loading ? (
        <Box
          sx={{
            width: '100%',
            height: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimateLogo1 />
        </Box>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                    Marital Status
                  </FormLabel>
                  <Controller
                    name="maritalStatus"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={dropdowns?.siteVisitDropDown?.marital_status ?? []}
                        value={field.value || null}
                        onChange={(_, newValue) => field.onChange(newValue || '')}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Select Marital Status" />
                        )}
                      />
                    )}
                  />
                </FormControl>
              </Grid>

              {/* Designation (only show if Salaried/Professional) */}
              {SALARIED.includes(selectedOccupationName) && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                      Designation
                    </FormLabel>
                    <Controller
                      name="designation"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          options={GRE_DESIGNATION_OPTIONS ?? []}
                          getOptionLabel={(option) => option?.name || ''}
                          value={
                            (GRE_DESIGNATION_OPTIONS ?? []).find(
                              (opt: any) => opt.name === field.value
                            ) || null
                          }
                          onChange={(_, newValue) =>
                            field.onChange(newValue ? newValue.name : null)
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Select Designation"
                              error={!!errors.designation}
                              helperText={errors.designation?.message}
                            />
                          )}
                        />
                      )}
                    />
                  </FormControl>
                </Grid>
              )}

              {/* Organization Name (show if Business, Salaried, Professional) */}
              {(BUSINESS.includes(selectedOccupationName) ||
                SALARIED.includes(selectedOccupationName)) && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                      Organization Name
                    </FormLabel>
                    <Controller
                      name="organizationName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="Enter Organization Name"
                          error={!!errors.organizationName}
                          helperText={errors.organizationName?.message}
                        />
                      )}
                    />
                  </FormControl>
                </Grid>
              )}

              {/* Organization Address (show if Business, Salaried, Professional) */}
              {(BUSINESS.includes(selectedOccupationName) ||
                SALARIED.includes(selectedOccupationName)) && (
                <Grid item xs={12} md={6}>
                  <RHFGoogleMapsAutocomplete
                    name="organizationAddress"
                    control={control}
                    label="Organization Address"
                    placeholder="Search Organization Address"
                  />
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                    Reason for Purchase
                  </FormLabel>
                  <Controller
                    name="purchaseReason"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={dropdowns?.siteVisitDropDown?.purchase_reason ?? []}
                        value={field.value || null}
                        onChange={(_, newValue) => field.onChange(newValue || '')}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Select Reason for Purchase" />
                        )}
                      />
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                    Budget
                  </FormLabel>
                  <Controller
                    name="budget"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={dropdowns?.siteVisitDropDown?.priceRange ?? []}
                        value={field.value || null}
                        onChange={(_, newValue) => field.onChange(newValue || null)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select Budget"
                            error={!!errors.budget}
                            helperText={errors.budget?.message}
                          />
                        )}
                      />
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                    Current Residence Typology
                  </FormLabel>
                  <Controller
                    name="currentResidenceType"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={dropdowns?.siteVisitDropDown?.current_residence_type ?? []}
                        value={field.value || null}
                        onChange={(_, newValue) => field.onChange(newValue || '')}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Select Current Residence Typology" />
                        )}
                      />
                    )}
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Customer Details
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="enquiryId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Enquiry ID"
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="svDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="SV Date Time"
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="First Name"
                      fullWidth
                      disabled
                      variant="outlined"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="lastName"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Last Name" fullWidth disabled variant="outlined" />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              sx={{
                bgcolor: '#002D72',
                '&:hover': { bgcolor: '#00285f' },
                px: 5,
                py: 1,
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
};

export default CustomerPopup;
