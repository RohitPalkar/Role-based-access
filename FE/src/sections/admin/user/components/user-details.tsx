import type { User } from 'src/redux/type';
import type { RootState, AppDispatch } from 'src/redux/store';

import { z } from 'zod';
import { useDispatch } from 'react-redux';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Grid,
  Button,
  TextField,
  Typography,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';
import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';

import { isValidPhoneNumberWithRules } from 'src/utils/helper';
import { ROLES, employmentStatusOptions } from 'src/utils/constant';
import { isIndianGroup as isIndianGroupHelper } from 'src/utils/groups';

import { CONFIG } from 'src/config-global';
import uiText from 'src/locales/langs/en/common.json';
import { editUser } from 'src/redux/actions/admin/user-actions';
import { fetchRegionOptions } from 'src/redux/actions/admin/incentive-actions';
import { fetchProjectByBrandIdAndCityId } from 'src/redux/actions/admin/common-actions';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

interface UserDetailsProps {
  user: User;
}

const borderBottomStyle = {
  borderBottom: '1px dashed #DADADA',
  paddingBottom: '20px',
};

const userFormSchema = z.object({
  name: z.string().min(1, { message: uiText.userJson.updateUser.validation.nameVal }).optional(),
  email: z.string().email({ message: uiText.userJson.updateUser.validation.emailVal }).optional(),
  role: z.string().min(1, { message: uiText.userJson.updateUser.validation.roleVal }).optional(),
  group: z.string().min(1, { message: uiText.userJson.updateUser.validation.groupVal }).optional(),
  regions: z.array(z.string()).min(1, { message: uiText.userJson.updateUser.validation.regionVal }),
  startDate: z.string().min(1, {message: uiText.userJson.updateUser.validation.startDate}),
  endDate: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  employeeStatus: z.string().optional(),
  contactNumber: z.string().optional(),
  countryCode: z.string().optional(),
}).superRefine((data, ctx) => {

    const { contactNumber, countryCode } = data;

    // Skip validation if empty (optional field)

    if (!contactNumber) return;

    const isValid =
      isValidPhoneNumberWithRules(
        countryCode || '+91',
        contactNumber
      );

    if (!isValid) {

      ctx.addIssue({

        code: z.ZodIssueCode.custom,

        path: ['contactNumber'],

        message: uiText.userJson.updateUser.validation.invalidContactNumber,
      });

    };
  });

type UserFormTypes = z.infer<typeof userFormSchema>;

const Section = ({
  title,
  fields,
  control,
  errors,
  disabled = false,
  isIndianGroup,
}: {
  title: string;
  fields: { name: keyof UserFormTypes; label: string }[];
  control: any;
  errors: any;
  disabled?: boolean;
  isIndianGroup: any;
}) => (
  <Box sx={isIndianGroup ? borderBottomStyle : undefined}>
    <Typography variant="h6">{title}</Typography>
    <Grid container spacing={3} mt={2}>
      {fields.map(({ name, label }, index) => (
        <Grid key={name} item xs={12} sm={6} md={6} lg={6} xl={6}>
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={label}
                fullWidth
                disabled={disabled}
                error={!!errors[name]}
                helperText={errors[name]?.message}
                autoComplete="off"
              />
            )}
          />
        </Grid>
      ))}
    </Grid>
  </Box>
);

const UserDetails: React.FC<UserDetailsProps> = ({ user }) => {
  const dispatch: AppDispatch = useDispatch();
  const { projects } = useAppSelector((state) => state.common);
  const { groups, rolesDropdown } = useAppSelector((state: RootState) => state.userlist);
  const { regionOptions } = useAppSelector((state) => state.incentive);
  const router = useRouter();
  const panelPaths = useAdminPanelPaths();

  // State for project search
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [searchTimeoutId, setSearchTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const methods = useForm<UserFormTypes>({
    resolver: zodResolver(userFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      regions:[], 
      role: '',
      group: '',
      startDate: '',
      endDate: null,
      project: '',
      employeeStatus: '',
      contactNumber: '',
      countryCode: '+91',
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = methods;
  const { watch } = methods;
  const currentGroup = watch('group');
  const isIndianGroup = isIndianGroupHelper(currentGroup, groups);

  // Condition to show/hide signature
  const watchedRoleId = watch('role');

  const watchedRoleLabel = useMemo(() => rolesDropdown?.find(
      (role) => String(role.id) === String(watchedRoleId)
  )?.name, [watchedRoleId, rolesDropdown]);
  
  useEffect(() => {
    if (user) {
      reset({
      name: user.name,
      email: user.email,
      role: user.roleId ? String(user.roleId) : '',
      group: user.group?.id ? String(user.group.id) : '',
      startDate: user.group?.startDate || '',
      endDate: user.group?.endDate || null,
      regions: user.regionIds?.map(String) || [],
      // @ts-ignore
      project: user.project?.id ? String(user.project.id) : '',
      employeeStatus: user.employeeStatus || '',
      contactNumber: user.contactNumber || '',
      countryCode: user.countryCode || '+91',
    });
    }

    return () => {
      reset({ name: '', email: '', role: '', group: '', startDate: '', endDate: null, project: '', regions: [], contactNumber: '', countryCode: '+91' });
    };
  }, [user, reset]);

  useEffect(() => {
    dispatch(fetchProjectByBrandIdAndCityId({ brand: '' }));
  }, [dispatch]);

   // fetch region options
    useEffect(() => {
      dispatch(fetchRegionOptions())
        .unwrap()
        .catch((err) => {
          toast.error(err || 'Failed to fetch regions');
        });
    }, [dispatch]);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId);
      }
    },
    [searchTimeoutId]
  );

  // Initialize filtered projects with all projects
  useEffect(() => {
    setFilteredProjects(projects || []);
  }, [projects]);

  // Project search handler with debouncing
  const handleProjectSearch = useCallback(
    (query: string) => {
      // Clear existing timeout
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId);
      }

      if (!query || query.length < 2) {
        setFilteredProjects(projects || []);
        return;
      }

      // Set new timeout for debounced search
      const timeoutId = setTimeout(() => {
        const filtered =
          projects?.filter((project: any) =>
            project.name.toLowerCase().includes(query.toLowerCase())
          ) || [];
        setFilteredProjects(filtered);
        setSearchTimeoutId(null);
      }, 300);

      setSearchTimeoutId(timeoutId);
    },
    [projects, searchTimeoutId]
  );

  // Transform filtered projects for the searchable component
  const searchableProjectOptions = useMemo(
    () =>
      filteredProjects?.map((project: any) => ({
        label: project.name,
        value: String(project.id),
      })) || [],
    [filteredProjects]
  );

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (!user?.id) {
        toast.error('User ID is missing');
        return;
      }

      await dispatch(
        editUser({
          userId: user.id,
          payload: {
            roleId: Number(data?.role || null),
            groupId: Number(data?.group || null),
            groupStartDate: data?.startDate || '',
            groupEndDate: data.endDate && data.endDate.trim() !== ''
              ? data.endDate
              : null,
            projectId: isIndianGroup && data?.project ? Number(data.project) : null,
            employeeStatus: data?.employeeStatus || '',
            contactNumber: data?.contactNumber || '',
            countryCode: data?.countryCode || '+91',
            regionIds: data.regions.map(Number) || [],
          },
        })
      ).unwrap();

      router.push(panelPaths.user.root);
      toast.success('User updated successfully');
    } catch (error: any) {
      toast.error(error || 'Failed to update user details');
    }
  });

  const handleCancel = () => {
    router.push(panelPaths.user.root);
  };

  return (
    <Card sx={{ padding: '30px' }} key={user.id}>
      <Form methods={methods} onSubmit={onSubmit}>
        <Section 
          title={uiText.userJson.titleUserDetails}
          fields={[
            { name: 'name', label: 'Name' },
            { name: 'email', label: 'Email' },
          ]}
          control={control}
          errors={errors}
          disabled
          isIndianGroup={isIndianGroup}
        />

        {/* Project Dropdown Field */}
        <Box mb={3} sx={borderBottomStyle}>
          {/* <Typography variant="h6">Project</Typography> */}
          <Grid container spacing={3} mt={0}>
            {/* Role */}
            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <Controller
                name="role"
                control={methods.control}
                render={({ field, fieldState }) => (
                  <ControlledAutocomplete
                    label="Role"
                    required
                    placeholder="Role"
                    options={
                      Array.isArray(rolesDropdown)
                        ? rolesDropdown.map((role) => ({
                            value: String(role.id),
                            label: role.name,
                          }))
                        : []
                    }
                    value={field.value || null}
                    onChange={(value) => {
                      field.onChange(value ?? '');
                    }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            {/* User Group */}
            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <Controller
                name="group"
                control={methods.control}
                render={({ field, fieldState }) => (
                  <ControlledAutocomplete
                    label="User Group"
                    required
                    placeholder="User Group"
                    options={
                      Array.isArray(groups)
                        ? groups.map((group) => ({
                            value: String(group.id),
                            label: group.name,
                          }))
                        : []
                    }
                    value={field.value || null}
                    onChange={(value) => {
                      field.onChange(value ?? '');
                    }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <Field.Date
                name="startDate"
                label="Group Start Date"
                required
              />
            </Grid>

            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <Field.Date
                name="endDate"
                label="Group End Date"
              />
            </Grid>

            {isIndianGroup && (
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <Controller
                  name="project"
                  control={control}
                  render={({ field, fieldState: { error } }) => {
                    const projectOptions = searchableProjectOptions?.map((option) => ({
                      label: option.label,
                      value: option.value,
                    })) || [];

                    return (
                      <ControlledAutocomplete
                        label="Project"
                        placeholder="Project"
                        options={projectOptions}
                        value={field.value || null}
                        onChange={(newValue) => {
                          field.onChange(newValue ?? null);
                        }}
                        onInputChange={(_, newInputValue) => {
                          handleProjectSearch(newInputValue);
                        }}
                        error={!!error}
                        helperText={error?.message || ''}
                      />
                    );
                  }}
                />
              </Grid>
            )}
            
            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <Controller
                name="employeeStatus"
                control={control}
                render={({ field }) => (
                  <ControlledAutocomplete
                    label={uiText.userJson.updateUser.employeeStatus}
                    placeholder={uiText.userJson.updateUser.employeeStatus}
                    options={employmentStatusOptions}
                    value={field.value || null}
                    onChange={field.onChange}
                    error={!!errors.employeeStatus}
                    helperText={errors.employeeStatus?.message}
                  />
                )}
              />
            </Grid>
            {/* Regions */}
            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <Controller
                  name="regions"
                  control={methods.control}
                  render={({ field, fieldState }) => (
                    <ControlledAutocomplete
                      multiple
                      label={uiText.incentiveStructure.form.label.region}
                      required
                      placeholder={`Select ${uiText.incentiveStructure.form.label.region}`}
                      options={
                        regionOptions?.map((region) => ({
                          value: String(region.id),
                          label: region.name,
                        })) || []
                      }
                      value={Array.isArray(field.value) ? field.value : []}
                      onChange={(selectedValues) => {
                        field.onChange(selectedValues);
                      }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      limitTags={2}
                    />
                  )}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
              <Controller
                name="contactNumber"
                control={control}
                render={({ field, fieldState }) => {
                  const formikAdapter = {
                    values: { ...methods.getValues(), },
                    errors: { contactNumber: fieldState.error?.message, },
                    touched: { contactNumber: true, },
                    setFieldValue: (name: string, value: any) => {
                      methods.setValue(name as any, value, { shouldValidate: true, shouldDirty: true, });
                    },
                    setFieldTouched: (name: string) => {
                      methods.trigger(name as any);
                    },
                  };
                  return (
                    <Field.Phone
                      name="contactNumber"
                      countryCodeName="countryCode"
                      placeholder={
                        uiText.userJson.updateUser.contactNoPlaceholder
                      }
                      country="IN"
                      formik={formikAdapter as any}
                      helperText={
                        fieldState.error?.message
                      }
                    />
                  );
                }}
              />
            </Grid>
          </Grid>
        </Box>

        {watchedRoleLabel === ROLES.RM && (
          <Box mb={3}>
            <Typography variant="h6" mb={2}>
              Signature
            </Typography>
            <Box
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '120px',
                backgroundColor: user?.signatureImage ? '#fff' : '#fafafa',
              }}
            >
              {user?.signatureImage ? (
                <img
                  src={`${CONFIG.site.s3BasePath}/${user.signatureImage}`}
                  alt="User Signature"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100px',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML =
                        '<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;"><img src="/assets/icons/Signature.svg" alt="No signature" style="width: 48px; height: 48px; opacity: 0.5;" /><span style="color: #919EAB; font-size: 14px;">Invalid signature format</span></div>';
                    }
                  }}
                />
              ) : (
                <Typography color="text.secondary" variant="body2">
                  No signature available
                </Typography>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              * This signature is read-only and cannot be modified
            </Typography>
          </Box>
        )}

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

export default UserDetails;
