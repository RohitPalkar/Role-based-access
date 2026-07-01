import type { BoosterPayload } from 'src/types/admin/services/booster';
import type { ProjectList, IBoosterStructureCreateItem } from 'src/types/admin/feature/booster';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { Button, Divider, useTheme, InputAdornment } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import {
  transformKeys,
  mapArrayToLabelValue,
  getMinMaxDateForFilter,
  convertBoosterNumberObject,
} from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';
import {
  createBooster,
  updateBooster,
  getRewardTypes,
} from 'src/services/admin-services/booster-srvice';
import {
  fetchBrands,
  fetchUserGroups,
  fetchCitiesByBrandId,
  fetchUnmappedProjectByBrandIdAndCityId,
} from 'src/redux/actions/admin/common-actions';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

export type NewBoosterStructureType = zod.infer<ReturnType<typeof NewBoosterStructure>>;

export const NewBoosterStructure = () =>
  zod
    .object({
      name: zod.string().min(1, { message: uiText.boosterStructure.form.create.validation.name }),
      // @ts-ignore
      cityIds: zod
        .array(
          zod.string().min(1, { message: uiText.boosterStructure.form.create.validation.city })
        )
        // @ts-ignore
        .min(1, { message: uiText.boosterStructure.form.create.validation.city }),
      // @ts-ignore
      brandId: zod.union([
        zod.string().min(1, { message: uiText.incentiveStructure.form.create.validation.brand }),
        zod.array(zod.string()).min(1, { message: uiText.incentiveStructure.form.create.validation.brand })
      ]),
      groupId: zod
        .string()
        .min(1, { message: 'User group​ is required' }),
      projects: zod
        .array(
          zod.string().min(1, { message: uiText.boosterStructure.form.create.validation.project })
        )
        .min(1, { message: uiText.boosterStructure.form.create.validation.project }),
      startDate: zod
        .string()
        .min(1, { message: uiText.boosterStructure.form.create.validation.startDate }),
      endDate: zod
        .string()
        .min(1, { message: uiText.boosterStructure.form.create.validation.endDate }),
      boosterSlabs: zod
        .array(
          zod
            .object({
              startRange: zod
                .string()
                .min(1, { message: 'Start range is required' })
                .refine((value) => !value.startsWith('.'), {
                  message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
                })
                .refine((value) => /^-?\d+(\.\d{1,7})?$/.test(value), {
                  message: 'Only numbers with up to 7 decimal places are allowed',
                })
                .refine((val) => Number.parseFloat(val) >= 0, {
                  message: 'Negative numbers are not allowed',
                })
                .refine((val) => val !== '0', { message: 'Start range cannot be 0' }),
              endRange: zod
                .string()
                .min(1, { message: 'End range is required' })
                .refine((value) => !value.startsWith('.'), {
                  message: 'Number must start with a digit (e.g., 0.99 instead of .99)',
                })
                .refine((value) => /^-?\d+(\.\d{1,7})?$/.test(value), {
                  message: 'Only numbers with up to 7 decimal places are allowed',
                })
                .refine((val) => Number.parseFloat(val) >= 0, {
                  message: 'Negative numbers are not allowed',
                })
                .refine((val) => val !== '0', { message: 'End range cannot be 0' }),
              rewardType: zod
                .string()
                .min(1, { message: uiText.boosterStructure.form.create.validation.rewardType }),
              rewardValue: zod
                .string()
                .min(1, { message: uiText.boosterStructure.form.create.validation.rewardValue }),
            })
            .refine((data) => Number(data.endRange) > Number(data.startRange), {
              message: 'End Range must be greater than Start Range',
              path: ['endRange'],
            })
        )
        .superRefine((slabs, ctx) => {
          slabs.forEach((slab, index) => {
            if (index > 0) {
              const prevSlab = slabs[index - 1];
              if (Number(slab.startRange) <= Number(prevSlab.endRange)) {
                ctx.addIssue({
                  code: zod.ZodIssueCode.custom,
                  message: `Start Range must be greater than previous End Range`,
                  path: [index, 'startRange'],
                });
              }
            }

            if (
              ['Percentage'].includes(slab.rewardType) &&
              (!/^\d+(\.\d{1,3})?$/.test(slab.rewardValue) || Number.parseFloat(slab.rewardValue) > 100)
            ) {
              ctx.addIssue({
                code: zod.ZodIssueCode.custom,
                message: `Reward value must be a valid numeric value (up to 3 decimal places) and should not exceed 100%`,
                path: [index, `rewardValue`],
              });
            }
            if (
              ['Cash Prize'].includes(slab.rewardType) &&
              !/^\d+(\.\d{1,3})?$/.test(slab.rewardValue) // Only check if it's a valid number
            ) {
              ctx.addIssue({
                code: zod.ZodIssueCode.custom,
                message: `Reward value must be a valid numeric value (up to 3 decimal places)`,
                path: [index, `rewardValue`],
              });
            }

            if (['Perks'].includes(slab.rewardType) && /^\d+$/.test(slab.rewardValue)) {
              ctx.addIssue({
                code: zod.ZodIssueCode.custom,
                message: `Reward value should be a valid text`,
                path: [index, `rewardValue`],
              });
            }
          });
        }),
    })
    .refine((data) => dayjs(data.startDate) <= dayjs(data.endDate), {
      message: 'The end date cannot be earlier than the start date',
      path: ['endDate'],
    });

export const defaultBoosterSlabs = {
  startRange: '',
  endRange: '',
  rewardType: '',
  rewardValue: '',
};

export const defaultValues: NewBoosterStructureType = {
  projects: [],
  name: '',
  brandId: [], // Will be changed to [] if multi-select is enabled
  cityIds: [],
  groupId: '',
  startDate: '',
  endDate: '',
  boosterSlabs: [defaultBoosterSlabs],
};

type Props = {
  currentBooster?: IBoosterStructureCreateItem;
  id?: string;
  isEdit?: boolean;
};

const BoosterStructureEditCreateForm = ({ currentBooster, id, isEdit }: Props) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const panelPaths = useAdminPanelPaths();
  const theme = useTheme();
  const { cities, brands, unMappedProjects: projects, userGroups } = useAppSelector((state) => state.common);

  // const { projects } = useAppSelector(state => state.project)
  const [citiesOptions, setCitiesOptions] = useState<{ label: string; value: string }[]>([]); // State for cities
  const [brandsOptions, setBrandsOptions] = useState<{ label: string; value: string }[]>([]); // State for brands
  const [projectsOptions, setProjectsOptions] = useState<{ label: string; value: string }[]>([]); // State for projects
  const [rewardTypes, setRewardTypes] = useState<ProjectList[]>([]);
  const [isMultiSelectBrand, setIsMultiSelectBrand] = useState(false);

  const { startYearDate , endYearDate } = getMinMaxDateForFilter();

  const methods = useForm<NewBoosterStructureType>({
    mode: 'onBlur',
    resolver: zodResolver(NewBoosterStructure()),
    defaultValues,
    values: currentBooster,
  });

  const {
    watch,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'boosterSlabs',
  });

  const handleAddBooster = () => {
    if (fields?.length < 10) append(defaultBoosterSlabs);
    else toast.error('You can only add upto 10 incentive slabs');
  };

  useEffect(() => {
    // fetcProjects(); // fetching unmapped projects
    fetchRewardTypes();
  }, []);

  useEffect(() => {
    dispatch(fetchBrands());
    dispatch(fetchUserGroups());
    // dispatch(fetchProjects({ limit: 100 }))
  }, [dispatch]);

  // Initialize isMultiSelectBrand based on initial groupId when editing
  useEffect(() => {
    if (values.groupId) {
      const selectedGroup = userGroups.find((group) => group.id.toString() === values.groupId);
      const shouldBeMultiSelect = !(selectedGroup && selectedGroup.name.toLowerCase() === "indian");

      // Only update if the multi-select mode is changing
      if (isMultiSelectBrand !== shouldBeMultiSelect) {
        setIsMultiSelectBrand(shouldBeMultiSelect);

        // Only reset brandId if not in edit mode or if the multi-select mode is changing
        if (!isEdit) {
          methods.setValue('brandId', shouldBeMultiSelect ? [] : '');
          methods.setValue('cityIds', []);
          methods.setValue('projects', []);
        }
      }
    }
  }, [values.groupId, userGroups, methods, isMultiSelectBrand, isEdit]);

  useEffect(() => {

    const hasBrandId = isMultiSelectBrand
      ? Array.isArray(values.brandId) && values.brandId.length > 0
      : values.brandId && values.brandId !== '';

    if (hasBrandId) {

      let brandIdParam = '';
      if (Array.isArray(values.brandId)) {
        brandIdParam = values.brandId.join(',');
      } else if (values.brandId) {
        brandIdParam = values.brandId || '';
      }

      if (brandIdParam) {
        dispatch(fetchCitiesByBrandId(brandIdParam));
      }
    }
  }, [dispatch, values.brandId, isMultiSelectBrand, isEdit]);


  useEffect(() => {

    const hasBrandId = isMultiSelectBrand
      ? Array.isArray(values.brandId) && values.brandId.length > 0
      : values.brandId && values.brandId !== '';

    if (hasBrandId) {

      const brandId = Array.isArray(values.brandId)
        ? values.brandId.join(',')
        : typeof values.brandId === 'string' ? values.brandId : '';


      if (brandId) {

        dispatch(
          fetchUnmappedProjectByBrandIdAndCityId({ brandId, cityIds: values.cityIds })
        );

      }
    }
  }, [dispatch, values.cityIds, isMultiSelectBrand, values.brandId, isEdit]);

  useEffect(() => {
    if (brands?.length) {
      const transformedBrands = transformKeys(brands, { id: 'value', name: 'label' });
      // @ts-ignore
      setBrandsOptions(
        transformedBrands.map((item: any) => ({
          value: String(item.value),
          label: String(item.label),
        }))
      );
    }
  }, [brands]);

  useEffect(() => {
    if (cities?.length) {
      const transformedCities = transformKeys(cities, { id: 'value', name: 'label' });
      // @ts-ignore
      setCitiesOptions(
        transformedCities.map((item: any) => ({
          value: String(item.value),
          label: String(item.label),
        }))
      );
    } else setCitiesOptions([]);
  }, [cities]);

  useEffect(() => {
    if (projects?.length) {
      const transformedProjects = transformKeys(projects, { id: 'value', name: 'label' });
      // @ts-ignore
      setProjectsOptions(
        transformedProjects.map((item: any) => ({
          value: String(item.value),
          label: String(item.label),
        }))
      );
    } else setProjectsOptions([]);
  }, [projects]);

  const fetchRewardTypes = async () => {
    try {
      const response = await getRewardTypes();
      const rewardTypesList = Object.keys(response).map((key) => ({
        value: response[key],
        label: response[key],
      }));
      setRewardTypes(rewardTypesList);
    } catch (error) {
      console.log(error);
    }
  };

  const getInputProps = (index: any) => {
    let inputProps;
    if (values.boosterSlabs[index].rewardType === 'Percentage') {
      inputProps = {
        endAdornment: <InputAdornment position="end">%</InputAdornment>,
      };
    } else if (values.boosterSlabs[index].rewardType === 'Cash Prize') {
      inputProps = {
        endAdornment: <InputAdornment position="end">₹</InputAdornment>,
      };
    } else {
      inputProps = {
        endAdornment: <InputAdornment position="end" />,
      };
    }
    return inputProps;
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const updatedSlabs = data?.boosterSlabs?.map((item: any, ind: number) => ({
        ...convertBoosterNumberObject(item),
        id: ind + 1,
      }));

      let brandIds: number[] = [];
      if (isMultiSelectBrand) {
        // For multi-select mode
        brandIds = Array.isArray(data.brandId)
          ? data.brandId.map((brandId: string) => Number(brandId))
          : [Number(data.brandId)];
      } else if (typeof data?.brandId === 'string' && data?.brandId) {
        // single-select (string)
        brandIds = [Number(data.brandId)];
      } else if (Array.isArray(data?.brandId) && data?.brandId?.length > 0) {
        // single-select (array fallback)
        brandIds = [Number(data.brandId[0])];
      }

      const updatedCity = data?.cityIds?.map((item: any) => Number(item));
      const updatedProjects = data?.projects?.map((item: any) => Number(item));

      const payload = {
        ...data,
        boosterSlabs: updatedSlabs,
        groupId: Number(data.groupId),
        brandId: brandIds,
        cityIds: updatedCity,
        projects: updatedProjects,
      } as unknown as BoosterPayload;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = isEdit
        ? await updateBooster(payload, id as string)
        : await createBooster(payload); // id is checking if the

      toast.success(isEdit ? 'Booster updated successfully.' : 'Booster created successfully.');
      router.push(panelPaths.booster.root);
    } catch (error) {
      toast.error(error?.message || 'Something went wrong');
    }
  });

  const handleCancel = () => {
    router.push(panelPaths.booster.root);
  };

  return (
    <Box>
      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {uiText.boosterStructure.form.create.basicDetails}
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
                      label="User group​"
                      options={mapArrayToLabelValue(userGroups, 'name', 'id') || []}
                      value={field.value}
                      onChange={(selectedValues) => {
                        field.onChange(selectedValues);
                      }}
                      disabled={isEdit}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  name="brandId"
                  control={methods.control}
                  render={({ field, fieldState }) => (
                    <ControlledAutocomplete
                      multiple={isMultiSelectBrand}
                      required
                      label={uiText.boosterStructure.form.label.brand}
                      placeholder="Select Brand"
                      {...(isMultiSelectBrand ? { limitTags: 2 } : {})}
                      options={
                        isMultiSelectBrand
                          ? mapArrayToLabelValue(brands, 'name', 'id') || []
                          : brandsOptions
                      }
                      value={field.value}
                      disabled={isMultiSelectBrand ? false : isEdit}
                      onChange={(selectedValues) => {
                        field.onChange(selectedValues);
                      }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  name="cityIds"
                  control={methods.control}
                  render={({ field, fieldState }) => (
                    <ControlledAutocomplete
                      multiple
                      required
                      label={uiText.boosterStructure.form.label.city}
                      placeholder={`Select ${uiText.boosterStructure.form.label.city}`}
                      limitTags={2}
                      options={citiesOptions}
                      value={field.value}
                      onChange={(selectedValues) => {
                        field.onChange(selectedValues);
                      }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
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
                      label={uiText.boosterStructure.form.label.project}
                      placeholder={`Select ${uiText.boosterStructure.form.label.project}`}
                      limitTags={2}
                      options={projectsOptions}
                      value={field.value}
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
                  label={uiText.boosterStructure.form.label.name}
                  required
                  inputProps={{ maxLength: 255 }}
                />
                <Field.Date
                  name="startDate"
                  minDate={startYearDate}
                  maxDate={endYearDate}
                  label={uiText.boosterStructure.form.label.startDate}
                  required
                />
                <Field.Date
                  name="endDate"
                  minDate={startYearDate}
                  maxDate={endYearDate}
                  label={uiText.boosterStructure.form.label.endDate}
                  required
                />
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />
              <Box className="targetValueContWrapper targetValueContWrapperAdmin">
                <Stack spacing={0} className="firstTableScrollBar">
                  <Typography variant="body2" sx={{ my: 2 }}>
                    {uiText.boosterStructure.form.create.incentiveSlabs}
                  </Typography>

                  <Grid
                    container
                    sx={{ backgroundColor: '#F4F6F8', mt: 2 }}
                    className="tableBoosterHeader"
                  >
                    <Grid
                      className="eligibilitySlab"
                      item
                      xs={1.5}
                      sx={{
                        textAlign: 'center',
                        alignContent: 'start',
                        borderRight: '1px solid #DADADA',
                        p: 2,
                        py: 2,
                      }}
                    >
                      <Typography variant="body2">
                        {uiText.boosterStructure.form.create.eligibilitySlab}
                      </Typography>
                    </Grid>
                    <Grid
                      className="eligibilitySlab1"
                      item
                      xs={4}
                      sx={{
                        textAlign: 'center',
                        alignContent: 'start',
                        borderRight: '1px solid #DADADA',
                        p: 2,
                        py: 2,
                      }}
                    >
                      <Typography variant="body2">
                        {uiText.boosterStructure.form.create.targetSalesValue}
                      </Typography>
                    </Grid>
                    <Grid
                      className="eligibilitySlab1"
                      item
                      xs={6}
                      sx={{
                        textAlign: 'center',
                        alignContent: 'start',
                        borderLeft: '1px solid #DADADA',
                        p: 2,
                        py: 2,
                      }}
                    >
                      <Typography variant="body2">
                        {uiText.boosterStructure.form.create.reward}
                      </Typography>
                    </Grid>
                  </Grid>
                  {fields?.map((item, index) => {

                    const rewardType = values?.boosterSlabs[index]?.rewardType;
                    let maxLength;
                    if (rewardType === 'Perks') {
                      maxLength = 80;
                    } else if (rewardType === 'Cash Prize') {
                      maxLength = 7;
                    }

                    return (
                    <Box key={item.id}>
                      <Grid container sx={{ mt: 2, border: 'none' }} className="tableBoosterHeader">
                        <Grid
                          className="eligibilitySlab"
                          item
                          xs={1.5}
                          sx={{
                            textAlign: 'center',
                            alignContent: 'start',

                            p: 2,
                            py: 2,
                          }}
                        >
                          <Typography variant="body2" sx={{ lineHeight: '56px', border: 'none' }}>
                            {index + 1}
                          </Typography>
                        </Grid>
                        <Grid
                          className="eligibilitySlab1"
                          item
                          xs={4}
                          sx={{
                            textAlign: 'center',
                            alignContent: 'start',
                            p: 1,
                            py: 1
                          }}
                        >
                          <Grid container spacing={2}>
                            <Grid item xs={6}  sx={{ pl: '2px !important' }}>
                              <Field.Text
                                InputProps={{
                                  endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                                }}
                                name={`boosterSlabs.${index}.startRange`}
                                label={uiText.boosterStructure.form.label.startRange}
                                required
                              />
                            </Grid>
                            <Grid item xs={6}  sx={{ pl: '2px !important' }}>
                              <Field.Text
                                InputProps={{
                                  endAdornment: <InputAdornment position="end">Cr</InputAdornment>,
                                }}
                                name={`boosterSlabs.${index}.endRange`}
                                label={uiText.boosterStructure.form.label.endRange}
                                required
                              />
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid
                          className="eligibilitySlab1"
                          item
                          xs={6}
                          sx={{
                            textAlign: 'center',
                            alignContent: 'start',

                            p: 1,
                            py: 1,
                          }}
                        >
                          <Grid container alignItems="center" sx={{ alignItems: 'start' }}>
                            <Grid item xs={3.5} sx={{ alignSelf: 'flex-start' }}>
                              <Controller
                                name={`boosterSlabs.${index}.rewardType`}
                                control={methods.control}
                                render={({ field, fieldState }) => (
                                  <ControlledAutocomplete
                                    label={uiText.boosterStructure.form.label.rewardType}
                                    required
                                    options={rewardTypes}
                                    value={field.value}
                                    onChange={(selectedValues) => {
                                      field.onChange(selectedValues);
                                    }}
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                  />
                                )}
                              />
                            </Grid>
                            <Grid item xs={0.5} />
                            <Grid item xs={7}>
                              <Field.Text
                                InputProps={{
                                  ...getInputProps(index),
                                  inputProps: { maxLength },
                                }}
                                name={`boosterSlabs.${index}.rewardValue`}
                              />
                            </Grid>
                            <Grid item xs={0.5} />
                            <Grid item xs={0.5} alignItems="center">
                              {index > 0 && (
                                <Iconify
                                  icon="eva:trash-2-fill"
                                  onClick={() => remove(index)}
                                  style={{ cursor: 'pointer' }}
                                  color={theme.palette.error.dark}
                                  sx={{ mt: 2 }}
                                />
                              )}
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>
                      <Divider sx={{ borderStyle: 'dashed' }} />
                    </Box>
                  )})}
                </Stack>
              </Box>

              <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="center">
                <Button startIcon={<Iconify icon="eva:plus-fill" />} onClick={handleAddBooster}>
                  {uiText.boosterStructure.form.create.button.addSlab}
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
                  variant="contained"
                  className="primaryBtn"
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

export default BoosterStructureEditCreateForm;
