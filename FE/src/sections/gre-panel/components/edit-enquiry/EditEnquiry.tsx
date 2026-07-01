import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm, Controller } from 'react-hook-form';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker, renderTimeViewClock } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Box,
  Grid,
  Stack,
  Paper,
  Button,
  Divider,
  TextField,
  Typography,
} from '@mui/material';

import { paths } from 'src/routes/paths';
import { useParams, useRouter } from 'src/routes/hooks';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { route } from 'src/services/apiRoutes';
import { GET, PATCH } from 'src/services/axiosInstance';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchVisitById } from 'src/redux/actions/gre/visit-action';

import { toast } from 'src/components/snackbar';
import { AnimateLogo1 } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { AsyncAutocomplete } from '../AsyncAutocomplete';

type FormValues = {
  enquiryId: string;
  firstName: string;
  lastName: string;
  headCount: number;
  svDate: string;
  exitTime: string;
  sourcingRm: { label: string; value: string } | null;
  assignedRM: { label: string; value: string } | null;
};

export default function EditEnquiry() {
  const router = useRouter();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { visit, loading, error } = useAppSelector((state: any) => state.visit);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
    setValue,
  } = useForm<FormValues>({
    mode: 'all',
    defaultValues: {
      enquiryId: '',
      firstName: '',
      lastName: '',
      headCount: 1,
      svDate: '',
      exitTime: '',
      sourcingRm: null,
      assignedRM: null,
    },
  });

  useEffect(() => {
    if (id) dispatch(fetchVisitById(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (visit) {
      setValue('enquiryId', visit?.enquiryId || '');
      setValue('firstName', visit?.firstName || '');
      setValue('lastName', visit?.lastName || '');
      setValue('headCount', visit?.headCount || '');
      setValue('svDate', visit?.createdAt ? dayjs(visit.createdAt).format('YYYY-MM-DD') : '');
      setValue(
        'exitTime',
        visit?.exitTime ? visit.exitTime : dayjs().format('HH:mm')
      );
      setValue(
        'sourcingRm',
        visit?.sourcingRm && visit?.sourcingRmName
          ? { value: visit?.sourcingRm, label: visit?.sourcingRmName }
          : null
      );
      setValue(
        'assignedRM',
        visit?.assignedRM && visit?.assignedRmName
          ? { value: visit?.assignedRM, label: visit?.assignedRmName }
          : null
      );
    }
  }, [visit, setValue]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleRedirect = () => {
    router.push(paths.gre.root);
  };

  const onSubmit = async (data: FormValues) => {
    const payload = {
      ...data,
      sourcingRm: data?.sourcingRm?.value ?? null,
      sourcingRmName: data?.sourcingRm?.label ?? null,
      assignedRM: data?.assignedRM?.value ?? null,
      assignedRmName: data?.assignedRM?.label ?? null,
    };

    try {
      const response = await PATCH(`${route.PATCH_VISIT}?id=${id}`, payload);
      toast.success(
        response?.response?.response?.message ?? 'Enquiry details updated successfully.'
      );
      handleRedirect();
    } catch (err) {
      toast.error(err?.response?.data?.errors?.message ?? 'Failed to update enquiry details.');
    }
  };

  const fetchRMOptions = async (input: string) => {
    try {
      const response = await GET(`${route.GET_RM_OPTIONS}?search=${encodeURIComponent(input)}`);
      const options = response?.response?.response?.data?.map(
        (i: { id: number; name: string }) => ({
          value: i?.id,
          label: i?.name,
        })
      );
      return options ?? [];
    } catch {
      return [];
    }
  };

  return (
    <>
      <Helmet>
        <title>Puravankara | Edit Enquiry</title>
      </Helmet>
      <DashboardContent>
        <CustomBreadcrumbs heading="Edit Enquiry" sx={stickyBreadcrumbsStyles} />
        <Paper elevation={3} sx={{ p: 5 }}>
          {loading ? (
            <Box
              sx={{
                width: '100%',
                height: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimateLogo1 />
            </Box>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6">Customer Details</Typography>
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
                      <TextField
                        {...field}
                        label="Last Name"
                        fullWidth
                        disabled
                        variant="outlined"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
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
                        label="Head Count"
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
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ borderStyle: 'dashed' }} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6">Visit Details</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="svDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="SV Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        disabled
                        variant="outlined"
                      />
                    )}
                  />
                </Grid>
                {/* Exit Time Field */}
                <Grid item xs={12} md={6}>
                  <Controller
                    name="exitTime"
                    control={control}
                    render={({ field }) => (
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <TimePicker
                          {...field}
                          label=""
                          value={field.value ? dayjs(field.value, 'HH:mm') : null}
                          onChange={(newValue) => {
                            field.onChange(newValue ? dayjs(newValue).format('HH:mm') : '');
                          }}
                          viewRenderers={{
                            hours: renderTimeViewClock,
                            minutes: renderTimeViewClock,
                            seconds: renderTimeViewClock,
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              error: !!errors.exitTime,
                              helperText: errors.exitTime?.message,
                            },
                          }}
                        />
                      </LocalizationProvider>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ borderStyle: 'dashed' }} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6">Assignment Details</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="sourcingRm"
                    control={control}
                    render={({ field }) => (
                      <AsyncAutocomplete
                        label="Sourcing RM"
                        placeholder="Select Sourcing RM"
                        fetchOptions={fetchRMOptions}
                        value={field.value ?? null}
                        onChange={(v) => field.onChange(v ?? null)}
                        error={!!errors.sourcingRm}
                        helperText={errors.sourcingRm?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="assignedRM"
                    control={control}
                    rules={{ required: 'Closing RM is required.' }}
                    render={({ field }) => (
                      <AsyncAutocomplete
                        label={
                          <>
                            Closing RM{' '}
                            <Typography component="span" sx={{ color: 'red' }}>
                              *
                            </Typography>
                          </>
                        }
                        placeholder="Select Closing RM"
                        fetchOptions={fetchRMOptions}
                        value={field.value ?? null}
                        onChange={(v) => field.onChange(v ?? null)}
                        error={!!errors.assignedRM}
                        helperText={errors.assignedRM?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={3} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      size="large"
                      color="inherit"
                      onClick={handleRedirect}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={isSubmitting}
                      sx={{
                        bgcolor: '#002D72',
                        '&:hover': { bgcolor: '#00285f' },
                      }}
                    >
                      {isSubmitting ? 'Submitting...' : 'Save Changes'}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </form>
          )}
        </Paper>
      </DashboardContent>
    </>
  );
}