import type { IncentivePayload } from 'src/types/admin/services/incetive';
import type {
  ProjectList,
  IIncentiveStructureCreateItem,
} from 'src/types/admin/feature/incentive-structure';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { Button, Divider, Tooltip, IconButton } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { PROJECT_TYPE_FLAG } from 'src/utils/constant';
import { isIndianGroup as isIndianGroupHelper } from 'src/utils/groups';
import { transformKeys, convertToNumberObject, getMinMaxDateForFilter } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';
import { fetchRegionOptions } from 'src/redux/actions/admin/incentive-actions';
import { createIncentive, updateIncentive } from 'src/services/admin-services/incentive-srvice';
import {
  fetchBrands,
  fetchUserGroups,
  fetchCitiesByBrandId,
  fetchUnmappedProjectByBrandIdAndCityId,
} from 'src/redux/actions/admin/common-actions';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field, } from 'src/components/hook-form';
import { IncentiveStructureBottom, IncentiveStructureHeader } from 'src/components/table-slabs';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

export type NewIncentiveStructureType = zod.infer<ReturnType<typeof NewIncentiveStructure>>;
export const NewIncentiveStructure = (launchValidation: boolean, sustenanceValidation: boolean) =>
  zod
    .object({
      name: zod.string().min(1, { message: uiText.incentiveStructure.form.create.validation.name }),
      // @ts-ignore
      groupId: zod
        .string()
        .min(1, { message: 'Group is required' }),
      regions: zod
        .array(
          zod.string().min(1, { message: uiText.incentiveStructure.form.create.validation.region })
        )
        // @ts-ignore
        .min(1, { message: uiText.incentiveStructure.form.create.validation.region }),
      cities: zod
        .array(
          zod.string().min(1, { message: uiText.incentiveStructure.form.create.validation.city })
        )
        // @ts-ignore
        .min(1, { message: uiText.incentiveStructure.form.create.validation.city }),
      // @ts-ignore
      brandId: zod.union([
        zod.string().min(1, { message: uiText.incentiveStructure.form.create.validation.brand }),
        zod
          .array(zod.string())
          .min(1, { message: uiText.incentiveStructure.form.create.validation.brand }),
      ]),
      projects: zod
        .array(
          zod.string().min(1, { message: uiText.incentiveStructure.form.create.validation.project })
        )
        .min(1, { message: uiText.incentiveStructure.form.create.validation.project }),
      startDate: zod
        .string()
        .nullable()
        .refine((val) => val !== null && val.trim() !== '', { message: 'Start date is required' })
        // eslint-disable-next-line no-restricted-globals
        .refine((val) => !Number.isNaN(Date.parse(val as string)), {
          message: 'Invalid start date format',
        }),
      endDate: zod
        .string()
        .nullable()
        .refine((val) => val !== null && val.trim() !== '', { message: 'End date is required' })
        // eslint-disable-next-line no-restricted-globals
        .refine((val) => !Number.isNaN(Date.parse(val as string)), { message: 'Invalid end date format' }),

      slabs: zod
        .array(
          zod
            .object({
              launchStartRange: zod
                .string()
                .refine((value) => !value.startsWith('.'), {
                  message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
                })
                .refine((value) => value === '' || /^-?\d+(\.\d{1,7})?$/.test(value), {
                  message: 'Only numbers with up to 7 decimal places are allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) >= 0, {
                  message: 'Negative numbers are not allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) <= 100000, {
                  message: 'Launch Start Range cannot exceed 100000',
                }),
              launchEndRange: zod
                .string()
                .refine((value) => !value.startsWith('.'), {
                  message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
                })
                .refine((value) => value === '' || /^-?\d+(\.\d{1,7})?$/.test(value), {
                  message: 'Only numbers with up to 7 decimal places are allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) >= 0, {
                  message: 'Negative numbers are not allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) <= 100000, {
                  message: 'Launch End Range cannot exceed 100000',
                })
                .refine((val) => val !== '0', { message: 'End range cannot be 0' }),
              sustenanceStartRange: zod
                .string()
                .refine((value) => !value.startsWith('.'), {
                  message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
                })
                .refine((value) => value === '' || /^-?\d+(\.\d{1,7})?$/.test(value), {
                  message: 'Only numbers with up to 7 decimal places are allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) >= 0, {
                  message: 'Negative numbers are not allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) <= 100000, {
                  message: 'Sustenance Start Range cannot exceed 100000',
                }),
              sustenanceEndRange: zod
                .string()
                .refine((value) => !value.startsWith('.'), {
                  message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
                })
                .refine((value) => value === '' || /^-?\d+(\.\d{1,7})?$/.test(value), {
                  message: 'Only numbers with up to 7 decimal places are allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) >= 0, {
                  message: 'Negative numbers are not allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) <= 100000, {
                  message: 'Sustenance End Range cannot exceed 100000',
                })
                .refine((val) => val !== '0', { message: 'End range cannot be 0' }),
              launchIncentivePercentage: zod
                .string()
                .refine((value) => !value.startsWith('.'), {
                  message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
                })
                .refine((value) => value === '' || /^-?\d+(\.\d{1,3})?$/.test(value), {
                  message: 'Only numbers with up to 3 decimal places are allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) >= 0, {
                  message: 'Negative numbers are not allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) <= 100, {
                  message: 'Value cannot be greater than 100',
                }),
              sustenanceIncentivePercentage: zod
                .string()
                .refine((value) => !value.startsWith('.'), {
                  message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
                })
                .refine((value) => value === '' || /^-?\d+(\.\d{1,3})?$/.test(value), {
                  message: 'Only numbers with up to 3 decimal places are allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) >= 0, {
                  message: 'Negative numbers are not allowed',
                })
                .refine((val) => val === '' || Number.parseFloat(val) <= 100, {
                  message: 'Value cannot be greater than 100',
                }),
              launchMinBookings: zod.preprocess((val) => {
                if (val === '' || val === null || val === undefined) return '';
                if (typeof val === 'number') return val.toString();
                if (typeof val === 'string') return val;
                return '';
              }, zod.string()),

              sustenanceMinBookings: zod.preprocess((val) => {
                if (val === '' || val === null || val === undefined) return '';
                if (typeof val === 'number') return val.toString();
                if (typeof val === 'string') return val;
                return '';
              }, zod.string()),
            })
            .superRefine((data, ctx) => {
              const hasAnyLaunchValue =
                data.launchStartRange.trim() !== '' ||
                data.launchEndRange.trim() !== '' ||
                data.launchIncentivePercentage.trim() !== '';

              const hasAnySustenanceValue =
                data.sustenanceStartRange.trim() !== '' ||
                data.sustenanceEndRange.trim() !== '' ||
                data.sustenanceIncentivePercentage.trim() !== '';

              if (launchValidation || hasAnyLaunchValue) {
                if (data.launchStartRange.trim() === '') {
                  ctx.addIssue({
                    code: zod.ZodIssueCode.custom,
                    message: 'Launch Start Range is required',
                    path: ['launchStartRange'],
                  });
                }
                if (data.launchEndRange.trim() === '') {
                  ctx.addIssue({
                    code: zod.ZodIssueCode.custom,
                    message: 'Launch End Range is required',
                    path: ['launchEndRange'],
                  });
                }
                if (data.launchIncentivePercentage.trim() === '') {
                  ctx.addIssue({
                    code: zod.ZodIssueCode.custom,
                    message: 'Launch Incentive Percentage is required',
                    path: ['launchIncentivePercentage'],
                  });
                }
                if (
                  data.launchMinBookings.trim() !== '' &&
                  Number.isNaN(Number(data.launchMinBookings))
                ) {
                  ctx.addIssue({
                    code: zod.ZodIssueCode.custom,
                    message: 'Must be a number',
                    path: ['launchMinBookings'],
                  });
                }
              }
              if (sustenanceValidation || hasAnySustenanceValue) {
                if (data.sustenanceStartRange.trim() === '') {
                  ctx.addIssue({
                    code: zod.ZodIssueCode.custom,
                    message: 'Sustenance Start Range is required',
                    path: ['sustenanceStartRange'],
                  });
                }
                if (data.sustenanceEndRange.trim() === '') {
                  ctx.addIssue({
                    code: zod.ZodIssueCode.custom,
                    message: 'Sustenance End Range is required',
                    path: ['sustenanceEndRange'],
                  });
                }
                if (data.sustenanceIncentivePercentage.trim() === '') {
                  ctx.addIssue({
                    code: zod.ZodIssueCode.custom,
                    message: 'Sustenance Incentive Percentage is required',
                    path: ['sustenanceIncentivePercentage'],
                  });
                }
                if (
                  data.sustenanceMinBookings.trim() !== '' &&
                  Number.isNaN(Number(data.sustenanceMinBookings))
                ) {
                  ctx.addIssue({
                    code: zod.ZodIssueCode.custom,
                    message: 'Must be a number',
                    path: ['sustenanceMinBookings'],
                  });
                }
              }
            })
            // You can then add your cross-field or inter-slab refinements here.
            .refine(
              (data) => {
                if (data.launchStartRange !== '' && data.launchEndRange !== '') {
                  return Number(data.launchEndRange) > Number(data.launchStartRange);
                }
                return true;
              },
              {
                message: 'Launch End Range must be greater than Launch Start Range',
                path: ['launchEndRange'],
              }
            )
            .refine(
              (data) => {
                if (data.sustenanceStartRange !== '' && data.sustenanceEndRange !== '') {
                  return Number(data.sustenanceEndRange) > Number(data.sustenanceStartRange);
                }
                return true;
              },
              {
                message: 'Sustenance End Range must be greater than Sustenance Start Range',
                path: ['sustenanceEndRange'],
              }
            )
        )
        .superRefine((slabs, ctx) => {
          slabs.forEach((slab, index) => {
            if (index > 0) {
              const prevSlab = slabs[index - 1];

              if (
                slab.launchStartRange !== '' &&
                prevSlab.launchEndRange !== '' &&
                Number(slab.launchStartRange) <= Number(prevSlab.launchEndRange)
              ) {
                ctx.addIssue({
                  code: zod.ZodIssueCode.custom,
                  message: `Launch Start Range must be greater than previous End Range`,
                  path: [index, 'launchStartRange'],
                });
              }

              if (
                slab.sustenanceStartRange !== '' &&
                prevSlab.sustenanceEndRange !== '' &&
                Number(slab.sustenanceStartRange) <= Number(prevSlab.sustenanceEndRange)
              ) {
                ctx.addIssue({
                  code: zod.ZodIssueCode.custom,
                  message: `Sustenance Start Range must be greater than previous End Range`,
                  path: [index, 'sustenanceStartRange'],
                });
              }
            }
          });
        }),
      // maxPayableIncentive: zod.string().refine((val) => /^\d*\.?\d{0,3}$/.test(val), {
      //   message: 'Value must be a number string with up to 3 decimal places',
      // }),
      minimumBookings: zod.string().optional(),
    })
    .refine((data) => dayjs(data.startDate) < dayjs(data.endDate), {
      message: 'End date must be greater than the start date',
      path: ['endDate'],
    });
export const defaultIncentiveSlabs = {
  launchStartRange: '',
  launchEndRange: '',
  sustenanceStartRange: '',
  sustenanceEndRange: '',
  launchIncentivePercentage: '',
  sustenanceIncentivePercentage: '',
  launchMinBookings: '',
  sustenanceMinBookings: '',
};

export const defaultValues: NewIncentiveStructureType = {
  projects: [],
  name: '',
  brandId: [], // Changed from '' to [] to ensure it's always an array for multi-select
  regions: [],
  cities: [],
  endDate: null,
  startDate: null,
  slabs: [defaultIncentiveSlabs],
  groupId: '',
};

type Props = {
  currentIncentive?: IIncentiveStructureCreateItem;
  id?: string;
  isEdit?: boolean;
  isCopy?: boolean;
  mappedProjectList?: ProjectList[];
};

const IncentiveStructureCreateEditForm = ({
  currentIncentive,
  id,
  isEdit,
  isCopy = false,
  mappedProjectList = [],
}: Props) => {
  // libraries  //
  const router = useRouter();
  const panelPaths = useAdminPanelPaths();
  const dispatch = useAppDispatch();
  const { cities, brands, unMappedProjects: projects, userGroups } = useAppSelector((state) => state.common);
  const { regionOptions } = useAppSelector((state) => state.incentive);
  const [launchValidationState, setLaunchValidationState] = useState(false);
  const [sustenanceValidationState, setSustenanceValidationState] = useState(false);
  const [isMultiSelectBrand, setIsMultiSelectBrand] = useState(false)
  const { startYearDate, endYearDate } = getMinMaxDateForFilter();

  const schema = React.useMemo(
    () => NewIncentiveStructure(launchValidationState, sustenanceValidationState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [launchValidationState, sustenanceValidationState,]
  );

  const resolver = useMemo(() => zodResolver(schema), [schema]);


  const methods = useForm<NewIncentiveStructureType>({
    mode: 'onBlur',
    resolver,
    defaultValues,
    // @ts-ignore
    values: currentIncentive,
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    watch,
    clearErrors,
  } = methods;

  const groupValue = watch('groupId');
  const brandValue = watch('brandId');
  const cityValues = watch('cities');
  const projectValues = watch('projects');

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'slabs',
  });

  const projectsList = useMemo(() => {
    if (!projects?.length) return [];
    const transformed = transformKeys(projects, { id: 'value', name: 'label' });
    return transformed.map((item: any) => ({
      value: String(item.value),
      label: String(item.label),
      projectTypeFlag: String(item.projectTypeFlag),
    }));
  }, [projects]);

  const selectedProjects = useMemo(() => projectsList.filter((project) =>
    projectValues?.includes(project.value)
  )
    , [projectsList, projectValues]);

  const handleAddIncentive = useCallback(() => {
    if (fields.length < 10) append(defaultIncentiveSlabs);
    else toast.error('You can only add upto 10 incentive slabs');
  }, [fields.length, append]);

  useEffect(() => {
    dispatch(fetchRegionOptions())
      .unwrap()
      .catch((err) => {
        toast.error(err || 'Failed to fetch regions');
      });
  }, [dispatch]);


  useEffect(() => {
    if (!selectedProjects.length) return;

    const flags = selectedProjects.map((project) => project?.projectTypeFlag);
    const definedFlags = flags.filter(Boolean);

    let nextLaunch = true;
    let nextSustenance = true;

    if (flags?.includes(PROJECT_TYPE_FLAG.MIXED)) {
      nextLaunch = true;
      nextSustenance = true;
    } else if (definedFlags.every(f => f === PROJECT_TYPE_FLAG.LAUNCH)) {
      nextLaunch = true;
      nextSustenance = false;
    } else if (definedFlags?.every((flag) => flag === PROJECT_TYPE_FLAG?.SUSTENANCE)) {
      nextLaunch = false;
      nextSustenance = true;
    }

    if (
      nextLaunch !== launchValidationState ||
      nextSustenance !== sustenanceValidationState
    ) {
      setLaunchValidationState(nextLaunch);
      setSustenanceValidationState(nextSustenance);
      clearErrors();
    }
  }, [selectedProjects, launchValidationState, sustenanceValidationState, clearErrors]);


  useEffect(() => {
    dispatch(fetchBrands());
    dispatch(fetchUserGroups());
  }, [dispatch]);

  // Handle brandId conversion for Indian group in edit mode
  useEffect(() => {
    if ((isEdit || isCopy) && currentIncentive?.groupId && userGroups.length > 0) {
      const selectedGroup = userGroups.find((group) => group.id.toString() === currentIncentive.groupId);
      // Use centralized group helper to determine if selected group is in Indian groups
      const isIndianGroup = !!selectedGroup && isIndianGroupHelper(selectedGroup.id, userGroups);

      if (isIndianGroup && Array.isArray(currentIncentive.brandId) && currentIncentive.brandId.length > 0) {
        // Convert array to string for Indian group (single-select)
        methods.setValue('brandId', currentIncentive.brandId[0]);
      }
    }
  }, [isEdit, isCopy, currentIncentive?.groupId, currentIncentive?.brandId, userGroups, methods]);

  const shouldBeMultiSelect = useMemo(() => {
    if (!groupValue) return false;
    const selectedGroup = userGroups.find((group) => group.id.toString() === groupValue);
    return !(selectedGroup && isIndianGroupHelper(selectedGroup.id, userGroups));
  }, [groupValue, userGroups]);

  useEffect(() => {
    if (isMultiSelectBrand === shouldBeMultiSelect) return;

    setIsMultiSelectBrand(shouldBeMultiSelect);

    if (!isEdit && !isCopy) {
      if (shouldBeMultiSelect && Array.isArray(brandValue) && brandValue.length) {
        methods.setValue('brandId', []);
      }

      if (!shouldBeMultiSelect && typeof brandValue === 'string' && brandValue) {
        methods.setValue('brandId', '');
      }

      if (cityValues.length) methods.setValue('cities', []);
      if (projectValues.length) methods.setValue('projects', []);
    }
  }, [
    shouldBeMultiSelect,
    isMultiSelectBrand,
    isEdit,
    isCopy,
    brandValue,
    cityValues.length,
    projectValues.length,
    methods,
  ]);



  const brandIdParam = useMemo(() => {
    const hasBrandId = isMultiSelectBrand
      ? Array.isArray(brandValue) && brandValue.length > 0
      : brandValue && brandValue !== '';

    if (!hasBrandId) return '';

    let result = '';
    if (Array.isArray(brandValue)) {
      result = brandValue.join(',');
    } else if (typeof brandValue === 'string') {
      result = brandValue;
    }

    return result;
  }, [brandValue, isMultiSelectBrand]);


  useEffect(() => {
    if (brandIdParam) {
      dispatch(fetchCitiesByBrandId(brandIdParam));
    }
  }, [dispatch, brandIdParam]);

  useEffect(() => {
    if (!brandIdParam) {
      if (cityValues.length) methods.setValue('cities', []);
      if (projectValues.length) methods.setValue('projects', []);
      return;
    }

    dispatch(fetchUnmappedProjectByBrandIdAndCityId({
      brandId: brandIdParam,
      cityIds: cityValues,
    }));
  }, [brandIdParam, cityValues.length, projectValues.length, dispatch, methods, cityValues]);



  // functions  //

  const onSubmit = handleSubmit(async ({ slabs, ...data }) => {
    try {
      const updatedSlabs = slabs?.map((item: any, ind: number) => ({
        ...convertToNumberObject(item),
        // eligibilitySlab: ind + 1
      }));
      const updatedProjects = data?.projects?.map((item: any) => Number(item));
      // Always convert brandId to an array of numbers, regardless of single or multi-select
      let brandIds: number[] = [];
      if (isMultiSelectBrand) {
        // For multi-select mode
        brandIds = Array.isArray(data?.brandId)
          ? data?.brandId?.map((brandId: string) => Number(brandId))
          : [Number(data?.brandId)];
      } else if (typeof data?.brandId === 'string' && data?.brandId) {
        // single-select (string)
        brandIds = [Number(data.brandId)];
      } else if (Array.isArray(data?.brandId) && data?.brandId?.length > 0) {
        // single-select (array fallback)
        brandIds = [Number(data.brandId[0])];
      }

      const payload = {
        ...data,
        brandId: brandIds,
        groupId: Number(data?.groupId),
        regionIds: data?.regions?.map((regionIds: any) => Number(regionIds)),
        cities: data?.cities?.map((cityId: any) => Number(cityId)),
        incentiveSlabs: updatedSlabs,
        projects: updatedProjects,
        minimumBookings: Number(data?.minimumBookings),
      } as unknown as IncentivePayload;

      await (isEdit ? updateIncentive(payload, id as string) : createIncentive(payload));
      toast.success(
        isEdit ? 'Incentive Policy updated successfully' : 'Incentive Policy created successfully'
      );

      router.push(panelPaths.incentiveStructure.root);
    } catch (error) {
      toast.error(error?.message || 'Something went wrong');
    }
  });

  const handleCancel = useCallback(() => {
    router.push(panelPaths.incentiveStructure.root);
  }, [router, panelPaths]);

  const uniqueProjectsList = useMemo(() => {
    const seen = new Set();
    return projectsList?.filter((project) => {
      if (seen.has(project.value)) return false;
      seen.add(project.value);
      return true;
    });
  }, [projectsList]);

  // html conetent  //
  return (
    <Box className="incentiveStructureTableWrapper">
      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {uiText.incentiveStructure.form.create.basicDetails}
              </Typography>
              <Box
                sx={{
                  mb: 2,
                  rowGap: 3,
                  columnGap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                }}
              >
                <Controller
                  name="groupId"
                  control={methods.control}
                  render={({ field, fieldState }) => (
                    <ControlledAutocomplete
                      label="Group"
                      required
                      placeholder="Select Group"
                      options={
                        userGroups?.map((group) => ({
                          value: String(group.id),
                          label: group.name,
                        })) || []
                      }
                      value={field.value || null}
                      onChange={(newValue) => {
                        field.onChange(newValue);
                      }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disabled={isEdit}
                    />
                  )}
                />

                <Controller
                  name="brandId"
                  control={methods.control}
                  render={({ field, fieldState }) => {
                    const brandArrayValue = Array.isArray(field.value) ? field.value : [];
                    const brandVal = isMultiSelectBrand ? brandArrayValue : field.value || null;
                    return (
                      <ControlledAutocomplete
                        multiple={isMultiSelectBrand}
                        label={uiText.incentiveStructure.form.label.brand}
                        required
                        placeholder={`Select ${uiText.incentiveStructure.form.label.brand}`}
                        options={
                          brands?.map((brand) => ({
                            value: String(brand.id),
                            label: brand.name,
                          })) || []
                        }
                        value={brandVal}
                        onChange={(selectedValues) => {
                          field.onChange(selectedValues);
                        }}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        disabled={isMultiSelectBrand ? false : isEdit}
                        {...(isMultiSelectBrand ? { limitTags: 2 } : {})}
                      />
                    );
                  }}
                />

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
                <Controller
                  name="cities"
                  control={methods.control}
                  render={({ field, fieldState }) => (
                    <ControlledAutocomplete
                      multiple
                      label={uiText.incentiveStructure.form.label.city}
                      required
                      placeholder={`Select ${uiText.incentiveStructure.form.label.city}`}
                      options={
                        cities?.map((city) => ({
                          value: String(city.id),
                          label: city.name,
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
                <Controller
                  name="projects"
                  control={methods.control}
                  render={({ field, fieldState }) => (
                    <ControlledAutocomplete
                      multiple
                      required
                      label={uiText.incentiveStructure.form.label.project}
                      placeholder={`Select ${uiText.incentiveStructure.form.label.project}`}
                      limitTags={2}
                      options={uniqueProjectsList}
                      value={Array.isArray(field.value) ? field.value : []}
                      onChange={(selectedValues) => {
                        field.onChange(selectedValues);
                      }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />

                <Field.Text
                  name="name"
                  label={uiText.incentiveStructure.form.label.name}
                  required
                  inputProps={{ maxLength: 255 }}
                />
                <Field.Date
                  name="startDate"
                  minDate={startYearDate}
                  maxDate={endYearDate}
                  label={uiText.incentiveStructure.form.label.startDate}
                  required
                />
                <Field.Date
                  name="endDate"
                  minDate={startYearDate}
                  maxDate={endYearDate}
                  label={uiText.incentiveStructure.form.label.endDate}
                  required
                />

                {/* <Field.Text
                  name="maxPayableIncentive"
                  label={uiText.incentiveStructure.form.label.maxPayableIncentive}
                  placeholder="Enter multiplier of salary"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip
                          enterTouchDelay={0}
                          arrow
                          placement="bottom"
                        >
                          <IconButton
                            sx={{
                              backgroundColor: '#637381',
                              '&:hover': {
                                backgroundColor: '#54616f',
                              },
                              color: '#fff',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              fontSize: '12px',
                            }}
                          >
                            i
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                /> */}
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />
              <Box className="targetValueContWrapper targetValueContWrapperAdmin">
                <Stack spacing={0} className="firstTableScrollBar">
                  <Typography variant="body2" sx={{ my: 2 }}>
                    {uiText.incentiveStructure.form.create.incentiveSlabs}
                    <Tooltip
                      enterTouchDelay={0}
                      title="The last slab's limit can be set to a higher value (e.g. 1000Cr) instead of infinity."
                      arrow
                      placement="right"
                    >
                      <IconButton
                        sx={{
                          backgroundColor: '#1C252E',
                          '&:hover': {
                            backgroundColor: '#1C252E',
                          },
                          color: '#fff',
                          borderRadius: '50%',
                          width: '14px',
                          height: '14px',
                          fontSize: '10px',
                          marginLeft: '10px',
                        }}
                      >
                        i
                      </IconButton>
                    </Tooltip>
                  </Typography>
                  <IncentiveStructureHeader adminStyling />
                  {fields?.map((item, index) => (
                    <IncentiveStructureBottom
                      isEditable
                      key={item?.id}
                      item={item}
                      index={index}
                      remove={remove}
                      launchRequired={launchValidationState}
                      sustenanceRequired={sustenanceValidationState}
                    />
                  ))}
                </Stack>
              </Box>
              <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="center">
                <Button startIcon={<Iconify icon="eva:plus-fill" />} onClick={handleAddIncentive}>
                  {uiText.incentiveStructure.form.create.button.addSlab}
                </Button>
              </Stack>
              <Stack sx={{ mt: 3 }} justifyContent="end" gap={2} direction="row">
                <LoadingButton
                  type="button"
                  variant="outlined"
                  loading={isSubmitting}
                  onClick={handleCancel}
                >
                  {uiText.button.cancel}
                </LoadingButton>
                <LoadingButton
                  type="submit"
                  className="primaryBtn"
                  variant="contained"
                  loading={isSubmitting}
                >
                  {uiText.button.confirm}
                </LoadingButton>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </Form>
    </Box>
  );
};

export default IncentiveStructureCreateEditForm;