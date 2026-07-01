/* eslint-disable react-hooks/exhaustive-deps */
import type { Project } from 'src/redux/type';
import type { AppDispatch } from 'src/redux/store';
import type { SubmitHandler } from 'react-hook-form';

import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { useDebounce } from 'minimal-shared/hooks';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import { InfoOutlined } from '@mui/icons-material';
import { Box, Card, Grid, Button, Tooltip, Checkbox, FormLabel, FormGroup, Typography, IconButton, FormControl, InputAdornment, FormHelperText, FormControlLabel } from '@mui/material';

import { useParams, useRouter } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';
import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';

import { ROLES } from 'src/utils/constant';
import { mapArrayToLabelValue } from 'src/utils/helper';
import { PAYMENT_GATEWAY_OPTIONS } from 'src/utils/payment';
import { BRAND_ASSET_DROPZONE_BOUNDS, getBrandAssetUploadTooltipContent } from 'src/utils/brand-asset-specs';

import uiText from 'src/locales/langs/en/common.json';
import { getProjectById } from 'src/services/admin-services/project-service';
import { addProject, editProject } from 'src/redux/actions/admin/project-actions';
import { searchSalesTeamDropdown } from 'src/redux/actions/rm-panel/dashboard-actions';
import {
  fetchBrands,
  fetchCompanies,
  fetchCitiesByBrandId,
  fetchPhasesByBrandIdAndCityId,
} from 'src/redux/actions/admin/common-actions';

import { Form, Field } from 'src/components/hook-form';
import NewDropzone from 'src/components/dropzone/NewDropzone';
import { CustomAutocomplete } from 'src/components/customautocomplete';
import CustomMultiAutocomplete from 'src/components/customautocomplete/CustomMultiAutocomplete';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

const optionalAlphaNumeric = zod
  .string()
  .optional()
  .refine((val) => !val || /^[a-zA-Z0-9]+$/.test(val), {
    message: 'Only alphanumeric characters are allowed',
  });

/** `z.string().optional()` allows `undefined` but not `null` (API / inputs / dropzones). */
const nullToEmptyString = (val: unknown) => (val === null ? '' : val);

const nullToUndefined = <T,>(val: T | null | undefined) => (val === null ? undefined : val);

/** Dropzone clears with `null`; API may send `null`. */
const coerceOptionalFormString = (val: unknown) => {
  if (val == null) return '';
  if (Array.isArray(val)) return val[0] == null ? '' : String(val[0]);
  return String(val);
};

/** API returns `string[]`; the form uses a single comma-separated field. */
function normalizeCodenameForForm(val: unknown): string {
  if (val == null) return '';
  if (Array.isArray(val)) {
    return val.map((s) => String(s).trim()).filter(Boolean).join(', ');
  }
  return String(val).trim();
}

function codenameFormValueToPayload(val: string): string[] {
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/* Validation Schema */
const projectSchema = zod.object({
  projectName: zod
    .string()
    .min(3, { message: 'Project name must be at least 3 characters' })
    .max(100, { message: 'Project name must not exceed 100 characters' }),

  city: zod.string().min(1, { message: 'City is required' }),
  companyId: zod.string().min(1, { message: 'Company is required' }),
  sfdcProjectName: zod.preprocess(nullToEmptyString, zod.string().optional()),
  codename: zod.preprocess(normalizeCodenameForForm, zod.string().optional()),
  projectImage: zod.preprocess(
    nullToEmptyString,
    zod.string().min(1, { message: 'Project Image is required' })
  ),
  jvPartnerLogo: zod.preprocess(coerceOptionalFormString, zod.string().optional()),

  brand: zod.preprocess(
    (val) => Number(val),
    zod.number().min(1, { message: 'Brand  is required ' })
  ),

  phases: zod
    .array(zod.string().min(1, { message: 'Phase ID is required' }))
    .min(1, { message: 'At least one phase is required' }),
  billingEntity: zod.preprocess(nullToEmptyString, zod.string().optional()), // Auto-populated from phases, not required
  reraPayable: zod.preprocess(
    nullToEmptyString,
    zod
      .string()
      .optional()
      .refine((val) => !val || /^\d+(\.\d{1,3})?$/.test(val), {
        message: 'Only positive numbers with up to 3 decimal places are allowed',
      })
      .refine((val) => !val || Number.parseFloat(val) <= 100, {
        message: 'Value cannot be greater than 100',
      })
  ),

  reraRegularization: zod.preprocess(
    nullToEmptyString,
    zod
      .string()
      .optional()
      .refine((val) => !val || /^\d+(\.\d{1,3})?$/.test(val), {
        message: 'Only positive numbers with up to 3 decimal places are allowed',
      })
      .refine((val) => !val || Number.parseFloat(val) <= 100, {
        message: 'Value cannot be greater than 100',
      })
  ),

  rtmPayable: zod.preprocess(
    nullToEmptyString,
    zod
      .string()
      .optional()
      .refine((val) => !val || /^\d+(\.\d{1,3})?$/.test(val), {
        message: 'Only positive numbers with up to 3 decimal places are allowed',
      })
      .refine((val) => !val || Number.parseFloat(val) <= 100, {
        message: 'Value cannot be greater than 100',
      })
  ),

  rtmRegularization: zod.preprocess(
    nullToEmptyString,
    zod
      .string()
      .optional()
      .refine((val) => !val || /^\d+(\.\d{1,3})?$/.test(val), {
        message: 'Only positive numbers with up to 3 decimal places are allowed',
      })
      .refine((val) => !val || Number.parseFloat(val) <= 100, {
        message: 'Value cannot be greater than 100',
      })
  ),

  maxQualificationDays: zod.preprocess(
    nullToEmptyString,
    zod
      .string({
        required_error: 'This field is required',
        invalid_type_error: 'Must be a number',
      })
      .refine((val) => val.trim() !== '', {
        message: 'This field is required',
      })
      .refine((val) => !Number.isNaN(Number(val)), {
        message: 'Must be a number',
      })
      .transform((val) => Number(val))
      .refine((val) => val >= 1 && val <= 365, {
        message: 'Must be between 1 and 365 days',
      })
      .refine((val) => Number.isInteger(val), {
        message: 'Must be a whole number',
      })
  ),
  maxQualificationEffectiveFrom: zod.preprocess(nullToEmptyString, zod.string().optional()),
  greIds: zod.preprocess(
    nullToUndefined,
    zod
      .array(
        zod.object({
          userName: zod.string(),
          userId: zod.union([zod.string(), zod.number()]),
        })
      )
      .optional()
  ),
  tlIds: zod.preprocess(
    nullToUndefined,
    zod
      .array(
        zod.object({
          userName: zod.string(),
          userId: zod.union([zod.string(), zod.number()]),
        })
      )
      .optional()
  ),
  phId: zod
    .object({
      userName: zod.string(),
      userId: zod.union([zod.string(), zod.number()]),
    })
    .nullable()
    .optional(),
  rshId: zod
    .object({
      userName: zod.string(),
      userId: zod.union([zod.string(), zod.number()]),
    })
    .nullable()
    .optional(),
  crmIds: zod.preprocess(
    nullToUndefined,
    zod
      .array(
        zod.object({
          userName: zod.string(),
          userId: zod.union([zod.string(), zod.number()]),
        })
      )
      .optional()
  ),
  financeIds: zod.preprocess(
    nullToUndefined,
    zod.array(
      zod.object({
        userName: zod.string(),
        userId: zod.union([zod.string(), zod.number()]),
      })
    ).optional()
  ),
  bisIds: zod.preprocess(
    nullToUndefined,
    zod.array(
      zod.object({
        userName: zod.string(),
        userId: zod.union([zod.string(), zod.number()]),
      })
    ).optional()
  ),
  buddyRmIds: zod.preprocess(
    nullToUndefined,
    zod.array(
      zod.object({
        userName: zod.string(),
        userId: zod.union([zod.string(), zod.number()]),
      })
    )
      .optional()
  ),
  agreementPercentage: zod.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return '';
      if (typeof val === 'number') {
        return Number.isFinite(val) ? String(val) : '';
      }
      return String(val).trim();
    },
    zod
      .string()
      .min(1, { message: uiText.projectJson.validations.agreementPercentageRequired })
      .regex(/^\d+(\.\d{1,3})?$/, {
        message: uiText.projectJson.validations.percentagePattern,
      })
      .refine((val) => Number.parseFloat(val) <= 100, {
        message: uiText.projectJson.validations.percentageMax,
      })
      .transform((val) => Number.parseFloat(val))
  ),
  availableGateways: zod.preprocess(
    (val) => (val === null ? [] : val),
    zod.array(zod.string()).min(1, uiText.projectJson.paymentGateway.validations.required)
  ),
  razorpayKey: zod.preprocess(nullToEmptyString, zod.string().optional().refine((val) => !val || /^\w+$/.test(val), {
    message: 'Only alphanumeric characters and underscore (_) are allowed',
  })),
  razorpaySecret: zod.preprocess(nullToEmptyString, zod.string().optional().refine((val) => !val || /^[A-Za-z0-9]+$/.test(val), {
    message: 'Only alphanumeric characters are allowed',
  })),
  easebuzzBookingSalt: zod.preprocess(nullToEmptyString, optionalAlphaNumeric),
  easebuzzMilestoneSalt: zod.preprocess(nullToEmptyString, optionalAlphaNumeric),
  easebuzzBookingKey: zod.preprocess(nullToEmptyString, optionalAlphaNumeric),
  easebuzzMilestoneKey: zod.preprocess(nullToEmptyString, optionalAlphaNumeric),
  easebuzzBookingmid: zod.preprocess(nullToEmptyString, optionalAlphaNumeric),
  easebuzzMilestonemid: zod.preprocess(nullToEmptyString, optionalAlphaNumeric),
});

/* Types */
export interface SearchDropdown {
  userName: string;
  userId: string;
}
interface ProjectFormTypes {
  projectName: string;
  city: string;
  companyId: string;
  sfdcProjectName: string;
  codename: string;
  projectImage: string;
  jvPartnerLogo: string;
  brand: string;
  phases: string[];
  availableGateways: string[];
  billingEntity: string;
  reraPayable: string;
  reraRegularization: string;
  rtmPayable: string;
  rtmRegularization: string;
  maxQualificationDays: string;
  maxQualificationEffectiveFrom: string;
  greIds?: SearchDropdown[];
  tlIds?: SearchDropdown[];
  phId?: SearchDropdown | null;
  rshId?: SearchDropdown | null;
  crmIds?: SearchDropdown[];
  financeIds?: SearchDropdown[] | null;
  bisIds?: SearchDropdown[] | null;
  buddyRmIds?: SearchDropdown[] | null;
  agreementPercentage: number | undefined;
  razorpayKey: string;
  razorpaySecret: string;
  easebuzzBookingSalt: string;
  easebuzzMilestoneSalt: string;
  easebuzzBookingKey: string;
  easebuzzMilestoneKey: string;
  easebuzzBookingmid: string;
  easebuzzMilestonemid: string;
}

/* Styles */
const borderBottomStyle = {
  borderBottom: '1px dashed #DADADA',
  paddingBottom: '20px',
};

const Section = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <Box mb={3} sx={{ ...borderBottomStyle }}>
    {title && <Typography variant="h6">{title}</Typography>}
    <Grid container spacing={3} mt={2}>
      {children}
    </Grid>
  </Box>
);

const TextField = ({
  name,
  label,
  required = true,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}) => (
  <Grid item xs={12} sm={6}>
    <FormControl fullWidth>
      <Field.Text
        name={name}
        label={label}
        required={required}
        placeholder={placeholder}
        inputProps={{ maxLength: 255 }}
      />
    </FormControl>
  </Grid>
);


const DisabledTextField = ({ name, label, value }: { name: string; label: string; value: string }) => (
  <Grid item xs={12} sm={6}>
    <FormControl fullWidth>
      <Field.Text
        name={name}
        label={label}
        value={value}
        disabled
        inputProps={{ readOnly: true }}
      />
    </FormControl>
  </Grid>
);

const getPhaseState = (allRera: boolean, allOC: boolean): 'RERA' | 'OC' | 'OC-RERA' => {
  if (allRera) {
    return 'RERA';
  }
  if (allOC) {
    return 'OC';
  }
  return 'OC-RERA';
};

const ProjectCreateForm = () => {
  const dispatch: AppDispatch = useDispatch();
  const router = useRouter();
  const panelPaths = useAdminPanelPaths();
  const { id } = useParams();
  const isEditMode = Boolean(id)
  const [project, setProject] = useState<Project>();
  const { cities, brands, phases, companies } = useAppSelector((state) => state.common);

  const [phaseState, setPhaseState] = React.useState<any>(null);
  const [billingEntityName, setBillingEntityName] = React.useState<string>('');

  const [greOptions, setGreOptions] = React.useState<SearchDropdown[]>([]);
  const [greSearchQuery, setGreSearchQuery] = React.useState('');
  const greDebouncedSearch = useDebounce(greSearchQuery, 500);

  const [tlOptions, setTlOptions] = React.useState<SearchDropdown[]>([]);
  const [tlSearchQuery, setTlSearchQuery] = React.useState('');
  const tlDebouncedSearch = useDebounce(tlSearchQuery, 500);

  const [phOptions, setPhOptions] = React.useState<SearchDropdown[]>([]);
  const [phSearchQuery, setPhSearchQuery] = React.useState('');
  const phDebouncedSearch = useDebounce(phSearchQuery, 500);

  const [rshOptions, setRshOptions] = React.useState<SearchDropdown[]>([]);
  const [rshSearchQuery, setRshSearchQuery] = React.useState('');
  const rshDebouncedSearch = useDebounce(rshSearchQuery, 500);

  const [crmOptions, setCrmOptions] = React.useState<SearchDropdown[]>([]);
  const [crmSearchQuery, setCrmSearchQuery] = React.useState('');
  const crmDebouncedSearch = useDebounce(crmSearchQuery, 500);

  const [financeOptions, setFinanceOptions] = React.useState<SearchDropdown[]>([]);
  const [financeSearchQuery, setFinanceSearchQuery] = React.useState('');
  const financeDebouncedSearch = useDebounce(financeSearchQuery, 500);

  const [bisOptions, setBisOptions] = React.useState<SearchDropdown[]>([]);
  const [bisSearchQuery, setBisSearchQuery] = React.useState('');
  const bisDebouncedSearch = useDebounce(bisSearchQuery, 500);

  const [buddyRmOptions, setBuddyRmOptions] = React.useState<SearchDropdown[]>([]);
  const [buddyRmSearchQuery, setBuddyRmSearchQuery] = React.useState('');
  const buddyRmDebouncedSearch = useDebounce(buddyRmSearchQuery, 500);

  const mergedPhases = useMemo(() =>
    [...(phases || []), ...(project?.phases || [])],
    [phases, project?.phases]
  );

  // Memoized Options for Dropdowns
  const brandOptions = useMemo(
    () => (brands?.length ? mapArrayToLabelValue(brands, 'name', 'id') : []),
    [brands]
  );

  const cityOptions = useMemo(
    () => (cities?.length ? mapArrayToLabelValue(cities, 'name', 'id') : []),
    [cities]
  );
  const companyOptions = useMemo(
    () => (companies?.length ? mapArrayToLabelValue(companies, 'name', 'id') : []),
    [companies]
  );

  const phaseOptions = useMemo(
    () => (mergedPhases.length > 0 ? mapArrayToLabelValue(mergedPhases, 'name', 'id') : []),
    [mergedPhases]
  );

  const handleCancel = () => {
    router.push(panelPaths.project.root);
  };

  // Create a dynamic validation schema based on the current phase state
  const validationSchema = useMemo(() => {
    if (phaseState === 'OC') {
      // For OC phase, create a new schema with optional reraRegularization
      return zod.object({
        projectName: projectSchema.shape.projectName,
        city: projectSchema.shape.city,
        companyId: projectSchema.shape.companyId,
        sfdcProjectName: projectSchema.shape.sfdcProjectName,
        codename: projectSchema.shape.codename,
        projectImage: projectSchema.shape.projectImage,
        jvPartnerLogo: projectSchema.shape.jvPartnerLogo,
        brand: projectSchema.shape.brand,
        phases: projectSchema.shape.phases,
        billingEntity: projectSchema.shape.billingEntity,
        reraPayable: projectSchema.shape.reraPayable,
        reraRegularization: projectSchema.shape.reraRegularization,
        rtmPayable: zod
          .string()
          .nonempty('This field is required')
          .regex(
            /^\d+(\.\d{1,3})?$/,
            'Only positive numbers with up to 3 decimal places are allowed'
          )
          .refine((val) => Number.parseFloat(val) <= 100, { message: 'Value cannot be greater than 100' }),
        rtmRegularization: zod
          .string()
          .nonempty('This field is required')
          .regex(
            /^\d+(\.\d{1,3})?$/,
            'Only positive numbers with up to 3 decimal places are allowed'
          )
          .refine((val) => Number.parseFloat(val) <= 100, { message: 'Value cannot be greater than 100' }),
        maxQualificationDays: projectSchema.shape.maxQualificationDays,
        maxQualificationEffectiveFrom: projectSchema.shape.maxQualificationEffectiveFrom,
        greIds: projectSchema.shape.greIds,
        tlIds: projectSchema.shape.tlIds,
        phId: projectSchema.shape.phId,
        rshId: projectSchema.shape.rshId,
        crmIds: projectSchema.shape.crmIds,
        financeIds: projectSchema.shape.financeIds,
        bisIds: projectSchema.shape.bisIds,
        buddyRmIds: projectSchema.shape.buddyRmIds,
        agreementPercentage: projectSchema.shape.agreementPercentage,
        availableGateways: projectSchema.shape.availableGateways,
        razorpayKey: projectSchema.shape.razorpayKey,
        razorpaySecret: projectSchema.shape.razorpaySecret,
        easebuzzBookingSalt: projectSchema.shape.easebuzzBookingSalt,
        easebuzzMilestoneSalt: projectSchema.shape.easebuzzMilestoneSalt,
        easebuzzBookingKey: projectSchema.shape.easebuzzBookingKey,
        easebuzzMilestoneKey: projectSchema.shape.easebuzzMilestoneKey,
        easebuzzBookingmid: projectSchema.shape.easebuzzBookingmid,
        easebuzzMilestonemid: projectSchema.shape.easebuzzMilestonemid,
      });
    }

    if (phaseState === 'RERA') {
      // For RERA phase, create a new schema with optional rtmRegularization
      return zod.object({
        projectName: projectSchema.shape.projectName,
        city: projectSchema.shape.city,
        companyId: projectSchema.shape.companyId,
        sfdcProjectName: projectSchema.shape.sfdcProjectName,
        codename: projectSchema.shape.codename,
        projectImage: projectSchema.shape.projectImage,
        jvPartnerLogo: projectSchema.shape.jvPartnerLogo,
        brand: projectSchema.shape.brand,
        phases: projectSchema.shape.phases,
        billingEntity: projectSchema.shape.billingEntity,
        reraPayable: zod
          .string()
          .nonempty('This field is required')
          .regex(
            /^\d+(\.\d{1,3})?$/,
            'Only positive numbers with up to 3 decimal places are allowed'
          )
          .refine((val) => Number.parseFloat(val) <= 100, { message: 'Value cannot be greater than 100' }),
        reraRegularization: zod
          .string()
          .nonempty('This field is required')
          .regex(
            /^\d+(\.\d{1,3})?$/,
            'Only positive numbers with up to 3 decimal places are allowed'
          )
          .refine((val) => Number.parseFloat(val) <= 100, { message: 'Value cannot be greater than 100' }),
        rtmPayable: projectSchema.shape.rtmPayable,
        rtmRegularization: projectSchema.shape.rtmRegularization,
        maxQualificationDays: projectSchema.shape.maxQualificationDays,
        maxQualificationEffectiveFrom: projectSchema.shape.maxQualificationEffectiveFrom,
        greIds: projectSchema.shape.greIds,
        tlIds: projectSchema.shape.tlIds,
        phId: projectSchema.shape.phId,
        rshId: projectSchema.shape.rshId,
        crmIds: projectSchema.shape.crmIds,
        financeIds: projectSchema.shape.financeIds,
        bisIds: projectSchema.shape.bisIds,
        buddyRmIds: projectSchema.shape.buddyRmIds,
        agreementPercentage: projectSchema.shape.agreementPercentage,
        availableGateways: projectSchema.shape.availableGateways,
        razorpayKey: projectSchema.shape.razorpayKey,
        razorpaySecret: projectSchema.shape.razorpaySecret,
        easebuzzBookingSalt: projectSchema.shape.easebuzzBookingSalt,
        easebuzzMilestoneSalt: projectSchema.shape.easebuzzMilestoneSalt,
        easebuzzBookingKey: projectSchema.shape.easebuzzBookingKey,
        easebuzzMilestoneKey: projectSchema.shape.easebuzzMilestoneKey,
        easebuzzBookingmid: projectSchema.shape.easebuzzBookingmid,
        easebuzzMilestonemid: projectSchema.shape.easebuzzMilestonemid,
      });
    }

    // Default case - use the original schema
    return projectSchema;
  }, [phaseState]);

  const methods = useForm<ProjectFormTypes>({
    resolver: zodResolver(phaseState ? validationSchema : projectSchema),
    mode: 'onBlur',
    defaultValues: {
      projectName: project?.name || '',
      city: project?.city?.id || '',
      companyId: String(project?.companyId || ''),
      sfdcProjectName: project?.sfdcProjectName || '',
      codename: normalizeCodenameForForm(project?.codename),
      projectImage: project?.projectImage || '',
      jvPartnerLogo: coerceOptionalFormString(project?.jvPartnerLogo),
      phases: project?.phases?.map((phase: any) => phase.id.toString()) || [],
      availableGateways: project?.availableGateways || [],
      billingEntity: project?.billingEntity?.id || '',
      brand: project?.brand?.id || '',
      reraPayable: project?.reraPayable || '',
      reraRegularization: project?.reraRegularization || '',
      rtmPayable: project?.rtmPayable || '',
      rtmRegularization: project?.rtmRegularization || '',
      maxQualificationDays: project?.maxQualificationDays
        ? String(project.maxQualificationDays)
        : '60',
      maxQualificationEffectiveFrom: project?.maxQualificationEffectiveFrom || '',
      greIds: project?.gre?.map((greId: any) => ({
        userId: String(greId?.id),
        userName: greId?.name,
      })) || [],
      tlIds: project?.tl?.map((tlId: any) => ({
        userId: String(tlId?.id),
        userName: tlId?.name,
      })) || [],
      phId: project?.ph?.id && project?.ph?.name
        ? {
          userId: String(project?.ph?.id),
          userName: project?.ph?.name,
        } : null,
      rshId: project?.rsh?.id && project?.rsh?.name
        ? {
          userId: String(project?.rsh?.id),
          userName: project?.rsh?.name,
        }
        : null,
      crmIds: project?.crm?.map((crmId: any) => ({
        userId: String(crmId?.id),
        userName: crmId?.name,
      })) || [],
      financeIds: project?.finance?.map((financeId: any) => ({
        userId: String(financeId?.id),
        userName: financeId?.name,
      })) || [],
      bisIds: project?.bis?.map((bisId: any) => ({
        userId: String(bisId?.id),
        userName: bisId?.name,
      })) || [],
      buddyRmIds: project?.buddyRMs?.map((u: any) => ({
        userId: String(u.id),
        userName: u.name,
      })) || [],
      agreementPercentage:
        project?.agreementPercentage != null ? Number(project.agreementPercentage) : undefined,
      razorpayKey: project?.razorpayKey || '',
      razorpaySecret: project?.razorpaySecret || '',
      easebuzzBookingSalt: project?.easebuzzBookingSalt || '',
      easebuzzMilestoneSalt: project?.easebuzzMilestoneSalt || '',
      easebuzzBookingKey: project?.easebuzzBookingKey || '',
      easebuzzMilestoneKey: project?.easebuzzMilestoneKey || '',
      easebuzzBookingmid: project?.easebuzzBookingmid || '',
      easebuzzMilestonemid: project?.easebuzzMilestonemid || '',
    },
  });

  const { watch, handleSubmit, control } = methods;
  const selectedGateways = watch("availableGateways");
  const showEasebuzz = selectedGateways?.includes(PAYMENT_GATEWAY_OPTIONS[0].value)
  const showRazorpay = selectedGateways?.includes(PAYMENT_GATEWAY_OPTIONS[1].value)
  const values = watch();
  useEffect(() => {
    if (values.phases.length > 0 && mergedPhases.length > 0) {
      const selectedPhases = mergedPhases.filter((phase) => values.phases.includes(String(phase.id)));

      // Determine the status based on reraStatus
      const allRera = selectedPhases.every((phase) => phase.reraStatus === 'NO');
      const allOC = selectedPhases.every((phase) => phase.reraStatus === 'OC');

      const newPhaseState = getPhaseState(allRera, allOC);

      if (selectedPhases.length > 0 && selectedPhases[0].billingEntity) {
        const { billingEntity } = selectedPhases[0];
        setBillingEntityName(billingEntity.name);
        methods.setValue('billingEntity', String(billingEntity.id), { shouldValidate: true });
      }

      // Only update if the phase state has changed
      if (newPhaseState !== phaseState) {
        setPhaseState(newPhaseState);

        // Clear the appropriate field based on the new phase state
        if (newPhaseState === 'OC') {
          methods.setValue('reraRegularization', '', { shouldValidate: true });
        } else if (newPhaseState === 'RERA') {
          methods.setValue('rtmRegularization', '', { shouldValidate: true });
        }
      }
    } else {
      setBillingEntityName('');
      methods.setValue('billingEntity', '', { shouldValidate: true });
    }
  }, [values.phases, mergedPhases, phaseState, methods]);

  // When phase state changes, recreate the form with the new validation schema
  useEffect(() => {
    if (phaseState) {
      const currentValues = methods.getValues();

      // For OC phase, set reraRegularization to empty string if it's null
      if (phaseState === 'OC' && currentValues.reraRegularization) {
        currentValues.reraRegularization = '';
      }

      // For RERA phase, set rtmRegularization to empty string if it's null
      if (phaseState === 'RERA' && currentValues.rtmRegularization) {
        currentValues.rtmRegularization = '';
      }

      // Reset the form with current values but apply the new validation rules
      methods.reset(currentValues, {
        keepValues: true,
        keepDirty: true,
        keepTouched: true,
        keepIsSubmitted: true,
        keepSubmitCount: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseState]);

  useEffect(() => {
    if (isEditMode && project) {
      const projectPhases = project?.phases || [];
      if (projectPhases.length > 0) {
        const allRera = projectPhases.every((p: any) => p.reraStatus === 'NO');
        const allOC = projectPhases.every((p: any) => p.reraStatus === 'OC');
        setPhaseState(getPhaseState(allRera, allOC));
      }

      if (project?.billingEntity?.name) {
        setBillingEntityName(project.billingEntity.name);
      }
      if (project?.brand?.id) {
        dispatch(fetchCitiesByBrandId(project.brand.id));
      }
      if (project?.brand?.id && project?.city?.id) {
        dispatch(fetchPhasesByBrandIdAndCityId({
          brand: project.brand.id,
          city: project.city.id,
        }));
      }
      methods.reset({
        projectName: project?.name || '',
        city: String(project?.city?.id) || '',
        companyId: String(project?.companyId) || '',
        sfdcProjectName: project?.sfdcProjectName || '',
        codename: normalizeCodenameForForm(project?.codename),
        projectImage: project?.projectImage || '',
        jvPartnerLogo: coerceOptionalFormString(project?.jvPartnerLogo),
        phases: project?.phases?.map((phase: any) => phase.id.toString()) || [],
        availableGateways: project?.availableGateways || [],
        billingEntity: project?.billingEntity?.id || '',
        brand: String(project?.brand?.id) || '',
        reraPayable: project?.reraPayable || '',
        reraRegularization: project?.reraRegularization || '',
        rtmPayable: project?.rtmPayable || '',
        rtmRegularization: project?.rtmRegularization || '',
        maxQualificationDays: String(project?.maxQualificationDays) || '60',
        maxQualificationEffectiveFrom: project?.maxQualificationEffectiveFrom || '',

        greIds:
          project?.gre?.map((u) => ({
            userId: String(u.id),
            userName: u.name,
          })) || [],

        tlIds:
          project?.tl?.map((u) => ({
            userId: String(u.id),
            userName: u.name,
          })) || [],

        phId: project?.ph
          ? { userId: String(project.ph.id), userName: project.ph.name }
          : null,

        rshId: project?.rsh
          ? { userId: String(project.rsh.id), userName: project.rsh.name }
          : null,

        crmIds:
          project?.crm?.map((u) => ({
            userId: String(u.id),
            userName: u.name,
          })) || [],

        financeIds:
          project?.finance?.map((u) => ({
            userId: String(u.id),
            userName: u.name,
          })) || [],

        bisIds:
          project?.bis?.map((u) => ({
            userId: String(u.id),
            userName: u.name,
          })) || [],

        buddyRmIds:
          project?.buddyRMs?.map((u: any) => ({
            userId: String(u.id),
            userName: u.name,
          })) || [],

        agreementPercentage:
          project?.agreementPercentage != null ? Number(project.agreementPercentage) : undefined,

        razorpayKey: project?.razorpayKey || '',
        razorpaySecret: project?.razorpaySecret || '',
        easebuzzBookingSalt: project?.easebuzzBookingSalt || '',
        easebuzzMilestoneSalt: project?.easebuzzMilestoneSalt || '',
        easebuzzBookingKey: project?.easebuzzBookingKey || '',
        easebuzzMilestoneKey: project?.easebuzzMilestoneKey || '',
        easebuzzBookingmid: project?.easebuzzBookingmid || '',
        easebuzzMilestonemid: project?.easebuzzMilestonemid || '',
      });
    }
  }, [project]);
  // To auto-populate RERA and RTM fields based on selected brand
  useEffect(() => {
    if (isEditMode && project) return;
    if (!values.brand || !brands?.length) return;

    const selectedBrand = brands.find((b: any) => String(b.id) === String(values.brand));

    if (!selectedBrand) return;

    methods.setValue('reraRegularization', String(selectedBrand?.reraRegularization || ''));
    methods.setValue('reraPayable', String(selectedBrand?.reraPayable || ''));
    methods.setValue('rtmRegularization', String(selectedBrand?.rtmRegularization || ''));
    methods.setValue('rtmPayable', String(selectedBrand?.rtmPayable || ''));
  }, [values.brand, brands]);

  useEffect(() => {
    Promise.all([dispatch(fetchBrands())]);
    Promise.all([dispatch(fetchCompanies())]);
  }, [dispatch]);

  useEffect(() => {
    if (values.brand) {
      Promise.all([dispatch(fetchCitiesByBrandId(values.brand))]);
    }
  }, [dispatch, values.brand]);

  useEffect(() => {
    if (values.brand && values.city) {
      Promise.all([
        dispatch(fetchPhasesByBrandIdAndCityId({ brand: values.brand, city: values.city })),
      ]);
    }
  }, [dispatch, values.brand, values.city]);

  const fetchSalesUsers = async (
    query: string,
    role: string,
    setter: React.Dispatch<
      React.SetStateAction<SearchDropdown[]>
    >
  ) => {
    try {
      const res = await dispatch(
        searchSalesTeamDropdown({
          search: query,
          role,
        })
      ).unwrap();

      const users = res?.data?.data?.users ?? [];

      const formatted = users.map((user: any) => ({
        userName: user?.username || user?.userName || 'Unknown User',
        userId: user?.id || user?.userId || '',
      }));

      setter(formatted);
    } catch (error) {
      console.error(error);
      setter([]);
    }
  };

  useEffect(() => {
    if (!greDebouncedSearch?.trim()) {
      return;
    }

    fetchSalesUsers(greDebouncedSearch, ROLES.GRE, setGreOptions);
  }, [greDebouncedSearch]);

  useEffect(() => {
    if (!tlDebouncedSearch?.trim()) {
      return;
    }

    fetchSalesUsers(tlDebouncedSearch, ROLES.SALES_TL, setTlOptions);
  }, [tlDebouncedSearch]);

  useEffect(() => {
    if (!phDebouncedSearch?.trim()) {
      setPhOptions([]);
      return;
    }

    fetchSalesUsers(phDebouncedSearch, ROLES.PROJECT_HEAD, setPhOptions);
  }, [phDebouncedSearch]);

  useEffect(() => {
    if (!rshDebouncedSearch?.trim()) {
      setRshOptions([]);
      return;
    }

    fetchSalesUsers(rshDebouncedSearch, ROLES.SALES_RSH, setRshOptions);
  }, [rshDebouncedSearch]);

  useEffect(() => {
    if (!crmDebouncedSearch?.trim()) {
      return;
    }

    fetchSalesUsers(crmDebouncedSearch, ROLES.CRM, setCrmOptions);
  }, [crmDebouncedSearch]);

  useEffect(() => {
    if (!financeDebouncedSearch?.trim()) return;

    fetchSalesUsers(financeDebouncedSearch, ROLES.FinanceAdmin, setFinanceOptions);
  }, [financeDebouncedSearch]);

  useEffect(() => {
    if (!bisDebouncedSearch?.trim()) return;

    fetchSalesUsers(bisDebouncedSearch, ROLES.BIS, setBisOptions);
  }, [bisDebouncedSearch]);

  useEffect(() => {
    if (!buddyRmDebouncedSearch?.trim()) return;

    fetchSalesUsers(
      buddyRmDebouncedSearch,
      `${ROLES.SALES_RSH},${ROLES.PROJECT_HEAD},${ROLES.RM},${ROLES.SALES_TL}`,
      setBuddyRmOptions
    );
  }, [buddyRmDebouncedSearch]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await getProjectById(Number(id));
      setProject(response);
      return response;
    } catch (error) {
      return error;
    }
  }, [id]);
  useEffect(() => {
    if (isEditMode) {
      fetchProjects();
    }
  }, [fetchProjects, isEditMode]);

  const onSubmit: SubmitHandler<ProjectFormTypes> = (data: any) => {
    const isRazorpay = data?.availableGateways?.includes(PAYMENT_GATEWAY_OPTIONS[1].value);
    const isEasebuzz = data?.availableGateways?.includes(PAYMENT_GATEWAY_OPTIONS[0].value);
    const payload = {
      name: data.projectName,
      cityId: Number(data.city),
      companyId: Number(data.companyId),
      sfdcProjectName: data.sfdcProjectName,
      codename: codenameFormValueToPayload(data.codename ?? ''),
      brandId: data.brand,
      projectImage: data.projectImage,
      jvPartnerLogo: data.jvPartnerLogo,
      phaseIds: data.phases.map((val: any) => Number(val)),
      reraRegularization: data.reraRegularization,
      reraPayable: data.reraPayable,
      rtmRegularization: data.rtmRegularization,
      rtmPayable: data.rtmPayable,
      maxQualificationDays: Number(data.maxQualificationDays),
      maxQualificationEffectiveFrom: data.maxQualificationEffectiveFrom,
      greIds: data?.greIds?.map((user: any) => Number(user.userId)) || [],
      tlIds: data?.tlIds?.map((user: any) => Number(user.userId)) || [],
      phId: Number(data?.phId?.userId) || null,
      rshId: Number(data?.rshId?.userId) || null,
      crmIds: data?.crmIds?.map((user: any) => Number(user.userId)) || [],
      financeIds: data?.financeIds?.map((user: any) => Number(user.userId)) || [],
      bisIds: data?.bisIds?.map((user: any) => Number(user.userId)) || [],
      buddyRMs: data?.buddyRmIds?.map((user: any) => Number(user.userId)) || [],
      agreementPercentage: data.agreementPercentage!,
      availableGateways: data?.availableGateways || null,
      razorpayKey: isRazorpay ? data?.razorpayKey : null,
      razorpaySecret: isRazorpay ? data?.razorpaySecret : null,
      easebuzzBookingSalt: isEasebuzz ? data?.easebuzzBookingSalt : null,
      easebuzzMilestoneSalt: isEasebuzz ? data?.easebuzzMilestoneSalt : null,
      easebuzzBookingKey: isEasebuzz ? data?.easebuzzBookingKey : null,
      easebuzzMilestoneKey: isEasebuzz ? data?.easebuzzMilestoneKey : null,
      easebuzzBookingmid: isEasebuzz ? data?.easebuzzBookingmid : null,
      easebuzzMilestonemid: isEasebuzz ? data?.easebuzzMilestonemid : null,
    };
    if (isEditMode && project) {
      dispatch(editProject({ id: project?.id ?? id, updatedData: payload }))
        .unwrap()
        .then(() => {
          router.push(panelPaths.project?.root);
          toast.success('Project updated successfully');
        })
        .catch((error) => {
          toast.error(error?.message);
        });
    } else {

      dispatch(addProject(payload))
        .unwrap()
        .then(() => {
          toast.success('Project created successfully');
          router.push(panelPaths.project.root);
        })
        .catch((error) => {
          toast.error(error?.message);
        });
    }
  };

  return (
    <Card sx={{ padding: '30px' }}>
      <Form methods={methods} onSubmit={handleSubmit(onSubmit)}>
        {/* Project Details Section */}
        <Section title="Project Details">
          <Grid item xs={12} sm={6}>
            <Controller
              name="brand"
              control={methods.control}
              render={({ field, fieldState }) => (
                <ControlledAutocomplete
                  required
                  label="Brand"
                  options={brandOptions}
                  disabled={isEditMode}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                  }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="city"
              control={methods.control}
              render={({ field, fieldState }) => (
                <ControlledAutocomplete
                  required
                  label="City"
                  options={cityOptions}
                  disabled={isEditMode}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                  }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
          <TextField name="projectName" label="Project Name" />

          <Grid item xs={12} sm={6}>
            <Controller
              name="phases"
              control={methods.control}
              render={({ field, fieldState }) => (
                <ControlledAutocomplete
                  multiple
                  required
                  label="Phases"
                  placeholder="Select Phases"
                  limitTags={2}
                  options={phaseOptions}
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

          <DisabledTextField
            name="billingEntity"
            label="Billing Entity"
            value={billingEntityName}
          />
          <Grid item xs={12} sm={6}>
            <Controller
              name="companyId"
              control={methods.control}
              render={({ field, fieldState }) => (
                <ControlledAutocomplete
                  required
                  label={uiText.projectJson.label.company}
                  options={companyOptions}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                  }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="projectImage"
              control={control}
              render={({ field, fieldState }) => (
                <NewDropzone
                  label={uiText.projectJson.label.projectImage}
                  path={field.value}
                  name="projectImage"
                  fieldName="projectImage"
                  documentType="image"
                  allowSvg
                  uploadText={uiText.projectJson.label.uploadProjectImage}
                  isOther={false}
                  required
                  imgMinWidth={BRAND_ASSET_DROPZONE_BOUNDS.pageBackground.imgMinWidth}
                  imgMaxWidth={BRAND_ASSET_DROPZONE_BOUNDS.pageBackground.imgMaxWidth}
                  imgMinHeight={BRAND_ASSET_DROPZONE_BOUNDS.pageBackground.imgMinHeight}
                  imgMaxHeight={BRAND_ASSET_DROPZONE_BOUNDS.pageBackground.imgMaxHeight}
                  dimensionSpecTooltip={getBrandAssetUploadTooltipContent('pageBackground')}
                  errorMarginLeft={2}
                  formik={{
                    setFieldValue: (_: string, value: string) => field.onChange(value),
                    setFieldError: () => { },
                    errors: {
                      projectImage: fieldState.error?.message || "",
                    },
                    touched: {
                      projectImage: fieldState.isTouched || false,
                    },
                  }}
                  error={fieldState.error?.message}
                  touched={!!fieldState.error}
                  s3UploadFilePath="projects"
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="jvPartnerLogo"
              control={control}
              render={({ field, fieldState }) => (
                <NewDropzone
                  label={uiText.projectJson.label.jvPartnerLogo}
                  path={field.value}
                  name="jvPartnerLogo"
                  fieldName="jvPartnerLogo"
                  documentType="image"
                  allowSvg
                  previewContrastBg
                  uploadText={uiText.projectJson.label.uploadJvPartnerLogo}
                  isOther={false}
                  imgMinWidth={BRAND_ASSET_DROPZONE_BOUNDS.headerPartnerLogo.imgMinWidth}
                  imgMaxWidth={BRAND_ASSET_DROPZONE_BOUNDS.headerPartnerLogo.imgMaxWidth}
                  imgMinHeight={BRAND_ASSET_DROPZONE_BOUNDS.headerPartnerLogo.imgMinHeight}
                  imgMaxHeight={BRAND_ASSET_DROPZONE_BOUNDS.headerPartnerLogo.imgMaxHeight}
                  dimensionSpecTooltip={getBrandAssetUploadTooltipContent('headerPartnerLogo')}
                  errorMarginLeft={2}
                  formik={{
                    setFieldValue: (_: string, value: string) => field.onChange(value),
                    setFieldError: () => { },
                    errors: {
                      jvPartnerLogo: fieldState.error?.message || "",
                    },
                    touched: {
                      jvPartnerLogo: fieldState.isTouched || false,
                    },
                  }}
                  error={fieldState.error?.message}
                  touched={!!fieldState.error}
                  s3UploadFilePath="projects"
                />
              )}
            />
          </Grid>

          <TextField name="sfdcProjectName" label="SFDC Project Name" required={false} />
          <TextField
            name="codename"
            label="Codename"
            required={false}
            placeholder="Comma-separated (e.g. Zenium, Other)"
          />

          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <FormControl fullWidth>
              <Controller
                name="greIds"
                control={control}
                render={({ field }) => (
                  <CustomMultiAutocomplete
                    label={uiText.boosterStructure.form.label.gre}
                    options={greOptions}
                    value={field.value || []}
                    inputValue={greSearchQuery}
                    onChange={(event, newValue) => {
                      field.onChange(newValue);
                      setGreSearchQuery("");
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === "input") {
                        setGreSearchQuery(newInputValue || '');
                      }
                    }}
                    placeholder="Search and select GRE"
                    noOptionsText={
                      greDebouncedSearch
                        ? "No users found"
                        : "Type to search"
                    }
                    height={55}
                  />
                )}
              />
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <FormControl fullWidth>
              <Controller
                name="tlIds"
                control={control}
                render={({ field }) => (
                  <CustomMultiAutocomplete
                    label={uiText.boosterStructure.form.label.tl}
                    options={tlOptions}
                    value={field.value || []}
                    inputValue={tlSearchQuery}
                    onChange={(event, newValue) => {
                      field.onChange(newValue);
                      setTlSearchQuery("");
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === "input") {
                        setTlSearchQuery(newInputValue || '');
                      }
                    }}
                    placeholder="Search and select TL"
                    noOptionsText={
                      tlDebouncedSearch
                        ? "No users found"
                        : "Type to search"
                    }
                    height={55}
                  />
                )}
              />
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <FormControl fullWidth>
              <Controller
                name="phId"
                control={control}
                render={({ field }) => (
                  <CustomAutocomplete
                    label={uiText.boosterStructure.form.label.ph}
                    options={phOptions}
                    value={field.value || null}
                    inputValue={phSearchQuery}
                    onChange={(event, newValue) => {
                      field.onChange(newValue);
                      setPhSearchQuery(newValue?.userName || '');
                    }}
                    onInputChange={(event, newInputValue) => {
                      setPhSearchQuery(newInputValue || '');
                    }}
                    placeholder="Search and select PH"
                    noOptionsText={
                      phDebouncedSearch
                        ? "No users found"
                        : "Type to search"
                    }
                    height={55}
                  />
                )}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <FormControl fullWidth>
              <Controller
                name="rshId"
                control={control}
                render={({ field }) => (
                  <CustomAutocomplete
                    label={uiText.boosterStructure.form.label.rsh}
                    options={rshOptions}
                    value={field.value || null}
                    inputValue={rshSearchQuery}
                    onChange={(event, newValue) => {
                      field.onChange(newValue);
                      setRshSearchQuery(newValue?.userName || '');
                    }}
                    onInputChange={(event, newInputValue) => {
                      setRshSearchQuery(newInputValue || '');
                    }}
                    placeholder="Search and select RSH"
                    noOptionsText={
                      rshDebouncedSearch
                        ? "No users found"
                        : "Type to search"
                    }
                    height={55}
                  />
                )}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <FormControl fullWidth>
              <Controller
                name="crmIds"
                control={control}
                render={({ field }) => (
                  <CustomMultiAutocomplete
                    label={uiText.boosterStructure.form.label.crm}
                    options={crmOptions}
                    value={field.value || []}
                    inputValue={crmSearchQuery}
                    onChange={(event, newValue) => {
                      field.onChange(newValue);
                      setCrmSearchQuery("");
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === "input") {
                        setCrmSearchQuery(newInputValue || '');
                      }
                    }}
                    placeholder="Search and select CRM"
                    noOptionsText={
                      crmDebouncedSearch
                        ? "No users found"
                        : "Type to search"
                    }
                    height={55}
                  />
                )}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <Controller
                name="financeIds"
                control={control}
                render={({ field }) => (
                  <CustomMultiAutocomplete
                    label="Finance"
                    options={financeOptions}
                    value={field.value || []}
                    inputValue={financeSearchQuery}
                    onChange={(event, newValue) => {
                      field.onChange(newValue);
                      setFinanceSearchQuery("");
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === "input") {
                        setFinanceSearchQuery(newInputValue || '');
                      }
                    }}
                    placeholder="Search and select Finance"
                    noOptionsText={
                      financeDebouncedSearch
                        ? "No users found"
                        : "Type to search"
                    }
                    height={55}
                  />
                )}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <Controller
                name="bisIds"
                control={control}
                render={({ field }) => (
                  <CustomMultiAutocomplete
                    label="BIS"
                    options={bisOptions}
                    value={field.value || []}
                    inputValue={bisSearchQuery}
                    onChange={(event, newValue) => {
                      field.onChange(newValue);
                      setBisSearchQuery("");
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === "input") {
                        setBisSearchQuery(newInputValue || '');
                      }
                    }}
                    placeholder="Search and select BIS"
                    noOptionsText={
                      bisDebouncedSearch
                        ? "No users found"
                        : "Type to search"
                    }
                    height={55}
                  />
                )}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <Controller
                name="buddyRmIds"
                control={control}
                render={({ field }) => (
                  <CustomMultiAutocomplete
                    label="Buddy RM"
                    options={buddyRmOptions}
                    value={field.value || []}
                    inputValue={buddyRmSearchQuery}
                    onChange={(event, newValue) => {
                      field.onChange(newValue);
                      setBuddyRmSearchQuery('');
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === 'input') {
                        setBuddyRmSearchQuery(newInputValue || '');
                      }
                    }}
                    placeholder="Search and select Buddy RM"
                    noOptionsText={
                      buddyRmDebouncedSearch ? 'No users found' : 'Type to search'
                    }
                    height={55}
                  />
                )}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="availableGateways"
              control={control}
              render={({ field, fieldState }) => {
                const selectedValues = field.value || [];

                const handleChange = (option: string, checked: boolean) => {
                  const updatedValues = checked
                    ? [...selectedValues, option]
                    : selectedValues.filter((item: string) => item !== option);

                  field.onChange(updatedValues);
                };

                return (
                  <FormControl>
                    <FormLabel
                      sx={{
                        fontWeight: 600,
                        color: '#1C252E',
                        fontSize: '14px',
                        mb: 0.5,
                      }}
                    >
                      {uiText.projectJson.paymentGateway.label}{' '}
                      <span style={{ color: '#FF0000' }}>*</span>
                      <Tooltip title={uiText.projectJson.paymentGateway.tooltip} placement='right'>
                        <IconButton
                          size="small"
                          sx={{
                            padding: 0,
                            marginLeft: '4px',
                          }}
                        >
                          <InfoOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </FormLabel>

                    <FormGroup row sx={{ marginLeft: 1 }}>
                      {PAYMENT_GATEWAY_OPTIONS.map((option) => (
                        <FormControlLabel
                          key={option.value}
                          label={option.label}
                          control={
                            <Checkbox
                              checked={selectedValues.includes(option.value)}
                              onChange={(e) => handleChange(option.value, e.target.checked)}
                              sx={{
                                color: '#637381',
                                '&.Mui-checked': {
                                  color: '#1A407D',
                                },
                              }}
                            />
                          }
                        />
                      ))}
                    </FormGroup>

                    {fieldState.error && (
                      <FormHelperText error>{fieldState.error.message}</FormHelperText>
                    )}
                  </FormControl>
                );
              }}
            />
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
            sx={{
              display: { xs: 'none', sm: 'block', md: 'block' },
            }}
          />
          {showRazorpay && (
            <>
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <FormControl fullWidth>
                  <Field.Text
                    name="razorpayKey"
                    label="Razorpay Merchant ID"
                    inputProps={{ maxLength: 50 }}
                    onChange={(event) => {
                      const { value } = event.target;
                      methods.setValue('razorpayKey', value, { shouldValidate: true });
                    }}
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <FormControl fullWidth>
                  <Field.Text
                    name="razorpaySecret"
                    label="Razorpay Secret Key"
                    inputProps={{ maxLength: 50 }}
                    onChange={(event) => {
                      const { value } = event.target;
                      methods.setValue('razorpaySecret', value, { shouldValidate: true });
                    }}
                  />
                </FormControl>
              </Grid>
            </>
          )}
          {showEasebuzz && (
            <>
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <FormControl fullWidth>
                  <Field.Text
                    name="easebuzzBookingSalt"
                    label="Easebuzz Salt (Booking)"
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
                    name="easebuzzMilestoneSalt"
                    label="Easebuzz Salt (Milestone)"
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
                    name="easebuzzBookingKey"
                    label="Easebuzz Key (Booking)"
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
                    name="easebuzzMilestoneKey"
                    label="Easebuzz Key (Milestone)"
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
                    inputProps={{ maxLength: 50 }}
                    onChange={(event) => {
                      const { value } = event.target;
                      methods.setValue("easebuzzMilestonemid", value, { shouldValidate: true });
                    }}
                  />
                </FormControl>
              </Grid>
            </>
          )}
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <FormControl fullWidth>
              <Field.Text
                type="number"
                inputProps={{ step: 0.001, min: 0, max: 100 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                name="agreementPercentage"
                label={uiText.projectJson.label.agreementPercentage}
                required
              />
            </FormControl>
          </Grid>
        </Section>

        {/* Incentive Criteria         */}
        <>
          <Box mb={3} sx={borderBottomStyle}>
            <Typography variant="h6">Incentive Criteria</Typography>
            <Grid container mt={3} spacing={2}>
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
                        required={phaseState === 'RERA'}
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
                        required={phaseState === 'RERA'}
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
                        required={phaseState === 'OC'}
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
                        required={phaseState === 'OC'}
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
                    required
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <FormControl fullWidth>
                  <Field.Date
                    name="maxQualificationEffectiveFrom"
                    label="Regularization Start Date"
                    placeholder="Select regularization start date"
                    maxDate={dayjs()} // Disable future dates
                    minDate={dayjs().subtract(6, 'month')} // Only show past 6 months
                    showClear
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
              {isEditMode ? uiText.button.save : uiText.button.submit}
            </Button>
          </Box>
        </>
      </Form>
    </Card>
  );
};

export default ProjectCreateForm;
