import dayjs from 'dayjs';
import React, { useEffect } from 'react';
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

import { ROLES } from 'src/utils/constant';

import { route } from 'src/services/apiRoutes';
import { PATCH } from 'src/services/axiosInstance';
import { searchSalesTeamDropdown } from 'src/redux/actions/rm-panel/dashboard-actions';
import { fetchVisitById, fetchDropdownsByProject } from 'src/redux/actions/gre/visit-action';

import { toast } from 'src/components/snackbar';
import { AnimateLogo1 } from 'src/components/animate';

import { AsyncAutocomplete } from './AsyncAutocomplete';

type FormValues = {
  gender?: string;
  maritalStatus?: string;
  purchaseReason?: string;
  currentResidenceType?: string;
  headCount: number;
  exitTime: string;
  sourcingRm: { label: string; value: string } | null;
  assignedRM: { label: string; value: string } | null;
  firstName: string;
  lastName: string;
  enquiryId: string;
  svDate: string;
};

type GREPopupProps = {
  id: string;
  projectName: string;
  open: boolean;
  onClose: () => void;
};

const GREPopup: React.FC<GREPopupProps> = ({ id, projectName, open, onClose }) => {
  const dispatch = useAppDispatch();
  const { visit, dropdowns, loading, error } = useAppSelector((state: any) => state.visit);

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormValues>({
    mode: 'all',
    defaultValues: {
      gender: '',
      maritalStatus: '',
      purchaseReason: '',
      currentResidenceType: '',
      headCount: 1,
      exitTime: '',
      sourcingRm: null,
      assignedRM: null,
      firstName: '',
      lastName: '',
      enquiryId: '',
      svDate: '',
    },
  });

  useEffect(() => {
    if (open && projectName) dispatch(fetchDropdownsByProject(projectName));
  }, [open, projectName, dispatch]);

  useEffect(() => {
    if (open && id) dispatch(fetchVisitById(id));
  }, [open, id, dispatch]);

  useEffect(() => {
    const v = Array.isArray(visit) ? visit[0] : visit;
    if (v) {
      setValue('gender', v?.SV_Gender || '');
      setValue('maritalStatus', v?.SV_Marital_Status || '');
      setValue('purchaseReason', v?.SV_Reason_for_Purchase || '');
      setValue('currentResidenceType', v?.Current_Residence_Typology || '');
      setValue('headCount', v?.SV_Head_Count || 1);
      setValue('exitTime', v?.Exit_Time ? dayjs(v.Exit_Time).format('HH:mm') : '');
      setValue('firstName', v?.firstName || '');
      setValue('lastName', v?.lastName || '');
      setValue('enquiryId', v?.Enquiry_Ref_No || '');
      setValue(
        'sourcingRm',
        v?.sourcingRm && v?.sourcingRmName
          ? { value: v?.sourcingRm, label: v?.sourcingRmName }
          : null
      );
      setValue(
        'assignedRM',
        v?.STM_2 && v?.leadOwner ? { value: v?.STM_2, label: v?.leadOwner } : null
      );
      setValue(
        'svDate',
        v?.Time_of_Visit ? dayjs(v.Time_of_Visit).format('DD-MM-YYYY hh:mm a') : ''
      );
    }
  }, [visit, setValue, id]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const fetchRMOptions = async (input: string) => {
    try {
      const result = await dispatch(
        searchSalesTeamDropdown({
          search: input,
          role: ROLES.RM,
        })
      ).unwrap();

      const resultRes = result?.data?.data?.users;

      if (resultRes && Array.isArray(resultRes)) {
        const formattedOptions = resultRes.map((user: any) => ({
          value: user?.userId || '',
          label: user?.userName || '',
        }));
        return formattedOptions || [];
      }

      return [];
    } catch {
      return [];
    }
  };

  const onSubmit = async (data: FormValues) => {
    const v = Array.isArray(visit) ? visit[0] : visit;
    const payload = {
      gender: data?.gender ?? null,
      maritalStatus: data.maritalStatus,
      purchaseReason: data.purchaseReason,
      currentResidenceType: data.currentResidenceType,
      headCount: data.headCount,
      exitTime: data.exitTime,
      sourcingRm: data?.sourcingRm?.value ?? null,
      sourcingRmName: data?.sourcingRm?.label ?? null,
      assignedRM: data?.assignedRM?.value ?? null,
      assignedRmName: data?.assignedRM?.label ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      enquiryId: data.enquiryId,
      svDate: data.svDate,
      leadId: v.leadId,
    };

    try {
      const response = await PATCH(`${route.PATCH_VISIT}?id=${id}`, payload);
      toast.success(response?.response?.response?.message ?? 'GRE fields updated successfully.');
      handleClose();
    } catch (err) {
      toast.error(err?.response?.data?.errors?.message ?? 'Failed to update GRE fields.');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg" scroll="body">
      <DialogTitle
        sx={{
          fontWeight: 700,
          textAlign: 'center',
          position: 'relative',
        }}
      >
        GRE Fields
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
              {/* Closing RM Field */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                    Closing RM
                    <Box component="span" sx={{ color: '#D3151A' }}>
                      *
                    </Box>
                  </FormLabel>
                  <Controller
                    name="assignedRM"
                    control={control}
                    rules={{ required: 'Closing RM is required.' }}
                    render={({ field }) => (
                      <AsyncAutocomplete
                        label=""
                        placeholder="Select Closing RM"
                        fetchOptions={fetchRMOptions}
                        value={field.value ?? null}
                        onChange={(v) => field.onChange(v ?? null)}
                        error={!!errors.assignedRM}
                        helperText={errors.assignedRM?.message}
                      />
                    )}
                  />
                </FormControl>
              </Grid>

              {/* Sourcing RM Field */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ position: 'relative' }}>
                  <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                    Sourcing RM
                  </FormLabel>
                  <Box sx={{ pointerEvents: 'none', opacity: 0.6 }}>
                    <Controller
                      name="sourcingRm"
                      control={control}
                      render={({ field }) => (
                        <AsyncAutocomplete
                          label=""
                          placeholder="Select Sourcing RM"
                          fetchOptions={fetchRMOptions}
                          value={field.value ?? null}
                          onChange={(v) => field.onChange(v ?? null)}
                          error={!!errors.sourcingRm}
                          helperText={errors.sourcingRm?.message}
                        />
                      )}
                    />
                  </Box>
                </FormControl>
              </Grid>

              {/* Head Count Field */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                    Head Count
                  </FormLabel>
                  <Controller
                    name="headCount"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (!value) return true;
                        const num = Number(value);
                        if (Number.isNaN(num)) return 'Please enter a valid number';
                        return num >= 1 || 'Head Count must be at least 1';
                      },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        // label="Head Count"
                        fullWidth
                        variant="outlined"
                        error={!!errors.headCount}
                        helperText={errors.headCount?.message}
                        inputProps={{ inputMode: 'numeric' }}
                        onKeyDown={(e) => {
                          if (
                            !/\d/.test(e.key) &&
                            e.key !== 'Backspace' &&
                            e.key !== 'Delete' &&
                            e.key !== 'Tab' &&
                            e.key !== 'ArrowLeft' &&
                            e.key !== 'ArrowRight'
                          ) {
                            e.preventDefault();
                          }
                        }}
                        onPaste={(e) => {
                          const paste = e.clipboardData.getData('text');
                          if (!/^\d*$/.test(paste)) {
                            e.preventDefault();
                          }
                        }}
                      />
                    )}
                  />
                </FormControl>
              </Grid>

              {/* Exit Time Field */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                    {' '}
                    Exit Time{' '}
                  </FormLabel>
                  <Controller
                    name="exitTime"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="time"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        variant="outlined"
                        error={!!errors.exitTime}
                        helperText={errors.exitTime?.message}
                      />
                    )}
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <FormLabel sx={{ color: '#1C252E', fontWeight: '600', mb: 0.5 }}>
                    Gender{' '}
                    <Box component="span" sx={{ color: '#D3151A' }}>
                      *
                    </Box>
                  </FormLabel>
                  <Controller
                    name="gender"
                    control={control}
                    rules={{ required: 'Please select the gender.' }}
                    render={({ field }) => (
                      <Autocomplete
                        options={dropdowns?.siteVisitDropDown?.gender ?? []}
                        value={field.value || null}
                        onChange={(_, newValue) => field.onChange(newValue || '')}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select Gender"
                            error={!!errors.gender}
                            helperText={errors.gender?.message}
                          />
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

export default GREPopup;