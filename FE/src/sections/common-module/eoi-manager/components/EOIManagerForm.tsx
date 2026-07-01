import type { AppDispatch } from 'src/redux/store';
import type { SearchDropdown } from 'src/sections/admin/project/component/project-create-form';
import type { AddressDetails } from 'src/components/google-maps-autocomplete/GoogleMapsAutocomplete';

import dayjs from 'dayjs';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import React, { useMemo, useEffect } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import { InfoOutlined } from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {
  Box,
  Grid,
  Radio,
  Paper,
  Stack,
  Button,
  Divider,
  Tooltip,
  Checkbox,
  FormLabel,
  TextField,
  FormGroup,
  RadioGroup,
  Typography,
  IconButton,
  FormControl,
  InputAdornment,
  FormHelperText,
  FormControlLabel,
} from '@mui/material';

import { useParams, useRouter } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { mapArrayToLabelValue } from 'src/utils/helper';
import { PAYMENT_GATEWAY_OPTIONS } from 'src/utils/payment';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';
import { ROLES, VoucherAmountType, generateRoleBasedRoute, INVENTORY_SOURCE_OPTIONS, DISPLAY_UNIT_TYPE_OPTIONS, SHOW_AGREEMENT_VALUE_OPTIONS } from 'src/utils/constant';

import { DashboardContent } from 'src/layouts/dashboard';
import { searchSalesTeamDropdown } from 'src/redux/actions/rm-panel/dashboard-actions';
import {
  resetInventoryTypes,
  resetCampaignDetails,
} from 'src/redux/slices/admin/eoi-manager-slice';
import { fetchBrands, fetchCitiesByBrandId, fetchUnmappedProjectByBrandIdAndCityId } from 'src/redux/actions/admin/common-actions';
import {
  createCampaign,
  updateCampaign,
  getEOICampaignById,
  fetchInventoryTypes,
  fetchDevelopmentTypes,
} from 'src/redux/actions/admin/eoi-manager-actions';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { AnimateLogo1 } from 'src/components/animate';
import { RHFEditor } from 'src/components/hook-form/rhf-editor';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { CustomAutocomplete } from 'src/components/customautocomplete';
import FormikAutocomplete from 'src/components/formik-autocomplete/FormikAutocomplete';
import CustomMultiAutocomplete from 'src/components/customautocomplete/CustomMultiAutocomplete';
import GoogleMapsAutocomplete from 'src/components/google-maps-autocomplete/GoogleMapsAutocomplete';

import EOIAmountBlock from './EOIAmountBlock';
import uiText from '../../../../locales/langs/en/common.json';

type VoucherAmountTypeValue = (typeof VoucherAmountType)[keyof typeof VoucherAmountType];

interface InventoryDetail {
  type: string;
  minSBA: string;
  maxSBA: string;
  minPrice: string;
  maxPrice: string;
  voucherAmt: string;
  standardEOIAmt: string;
  preferentialEOIAmt: string;
}

// form values interface
interface FormValues {
  brandId: string;
  projectId: string;  
  thresholdAmount: string;  
  unitBlockDuration: string;  
  timerExtension: string;  
  approvalWindowHours: string;  
  displayUnitType: string;  
  showAgreementValue: boolean;
  unitApproverId: SearchDropdown | null;  
  additionalApprovers: SearchDropdown[] | null;  
  cityIds: [];
  campaignName: string;
  pushToSfdc: string;
  sfdcProjectName: string;
  developmentTypeIds: string;
  inventoryTypeIds: [];
  inventoryDetails: InventoryDetail[];
  enquiryInitials: string;
  voucherIdInitials: string;
  voucherIdCounter:string;
  indicativeBasePrice: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode: string;
  phase: string[];
  availableGateways: string[];
  stage: string;
  razorpayKey: string;
  razorpaySecret: string;
  easebuzzSalt: string;
  easebuzzKey: string;
  subMerchantId: string;
  enableEOIsAllRms: boolean;
  unitSourceType: string | null;
  voucherFormType: string;
  voucherAmount: string;
  voucherStartDate: string | null;
  voucherEndDate: string | null;
  voucherTermsAndCondition: string;
  eoiStartDate: string | null;
  eoiEndDate: string | null;
  eoiFormType: string;
  eoiType: string[];
  stdEoiAmount: string;
  preEoiAmount: string;
  stdEoiInitials: string;
  stdEoiCounter: string;
  preEoiInitials: string;
  preEoiCounter: string;
  eoiTermsAndCondition: string;
  enquiryCounter:string;
  generateQueueId:boolean;
  displayQueueId:string;
  unitPrefStaticContent:string;
  isInventoryMapped:boolean;
  voucherAmountType: VoucherAmountTypeValue | null;
  stdEoiAmountType: VoucherAmountTypeValue | null;
  preEoiAmountType: VoucherAmountTypeValue | null;
  venueName: string;
  venueMapLink: string;
  agreementDocLink: string;
}

type SeriesPrefixFields = {
  voucherIdInitials?: string;
  stdEoiInitials?: string;
  preEoiInitials?: string;
  enquiryInitials?: string;
};

function EOIManagerForm() {
  const { userRole } = useRoleBasedPermissions({ module: 'eoiManager' });
  const router = useRouter();
  const dispatch: AppDispatch = useDispatch();
  const { id } = useParams();
  const { cities, brands, unMappedProjects } = useAppSelector((state) => state.common);
  const { loading, developmentTypes, inventoryTypes, campaignDetails } = useAppSelector(
    (state) => state.eoiManager
  );
  const { fields } = uiText.eoiManager;
  const isEditMode = useMemo(() => Boolean(id), [id]);

  const [unitApproverOptions, setUnitApproverOptions] = React.useState<SearchDropdown[]>([]);
  const [unitApproverSearchQuery, setUnitApproverSearchQuery] = React.useState('');
  const unitApproverDebouncedSearch = useDebounce(unitApproverSearchQuery, 500);

  const [extendedAccessOptions, setExtendedAccessOptions] = React.useState<SearchDropdown[]>([]);
  const [extendedAccessSearchQuery, setExtendedAccessSearchQuery] = React.useState('');
  const extendedAccessDebouncedSearch = useDebounce(extendedAccessSearchQuery, 500);
  
  // validate unique series prefix/initials
  const validateUniqueInitials = (values: FormValues) => {
    const errors: Partial<Record<keyof FormValues, string>> = {};

    const seriesPrefixFields: (keyof SeriesPrefixFields)[] = [
      'voucherIdInitials',
      'stdEoiInitials',
      'preEoiInitials',
      'enquiryInitials',
    ];

    const map: Record<string, keyof SeriesPrefixFields> = {};

    seriesPrefixFields.forEach((field) => {
      if (field === 'preEoiInitials' && !values.eoiType?.includes(fields.eoiType.options[1]))
        return;
      if (field === 'stdEoiInitials' && !values.eoiType?.includes(fields.eoiType.options[0]))
        return;

      const value = values[field]?.trim();

      if (!value) return;

      if (map[value]) {
        errors[field] = fields.stdEoiInitials.uniqueSeriesPrefix;
        errors[map[value]] = fields.stdEoiInitials.uniqueSeriesPrefix;
      } else {
        map[value] = field;
      }
    });

    return errors;
  };

  // formik initialization and validations
  const formik = useFormik<FormValues>({
    initialValues: {
      brandId: '',
      cityIds: [],
      projectId: '',
      thresholdAmount: '',
      unitBlockDuration: '',
      timerExtension: '',
      approvalWindowHours: '',
      displayUnitType: '',
      showAgreementValue: false,
      unitApproverId: null,
      additionalApprovers: [],
      campaignName: '',
      pushToSfdc: fields.pushToSfdc.options[0],
      sfdcProjectName: '',
      developmentTypeIds: '',
      inventoryTypeIds: [],
      inventoryDetails: [],
      enquiryInitials: '',
      voucherIdInitials: '',
      voucherIdCounter: '',
      indicativeBasePrice: '',
      accountName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      swiftCode: '',
      razorpayKey: '',
      razorpaySecret: '',
      easebuzzSalt: '',
      easebuzzKey: '',
      subMerchantId: '',
      phase: [],
      availableGateways: [],
      stage: fields.stage.options[0].value,
      venueName: '',
      venueMapLink: '',
      agreementDocLink: '',
      enableEOIsAllRms: false,
      unitSourceType:'SFDC',
      voucherFormType: fields.voucherFormType.options[0],
      voucherAmount: '',
      voucherStartDate: null,
      voucherEndDate: null,
      voucherTermsAndCondition: '',
      eoiStartDate: null,
      eoiEndDate: null,
      eoiFormType: fields.eoiFormType.options[0],
      eoiType: [],
      stdEoiAmount: '',
      stdEoiInitials: '',
      stdEoiCounter: '',
      preEoiInitials: '',
      preEoiCounter: '',
      preEoiAmount: '',
      eoiTermsAndCondition: '',
      unitPrefStaticContent: '',
      enquiryCounter: '',
      generateQueueId: fields.generateQueueId.options[0].value,
      displayQueueId: fields.displayQueueId.options[0].value,
      isInventoryMapped:false,
      voucherAmountType: VoucherAmountType.FIXED,
      stdEoiAmountType: VoucherAmountType.FIXED,
      preEoiAmountType: VoucherAmountType.FIXED,
    },
    validate : validateUniqueInitials,
    validationSchema: Yup.object().shape({
      brandId: Yup.string().required(fields.brandId.validations.required),
      cityIds: Yup.array()
        .of(Yup.string())
        .min(1, fields.cityIds.validations.required)
        .required(fields.cityIds.validations.required),
      projectId: Yup.string().required(fields.projectId.validations.required),
      thresholdAmount: Yup.string().when('eoiType', ([eoiType], schema) =>
        Array.isArray(eoiType) && eoiType.includes(fields.eoiType.options[1])
          ? schema.required(fields.thresholdAmount.validations.required)
          : schema.nullable().notRequired()
      ),
      unitBlockDuration: Yup.string().when('eoiType', ([eoiType], schema) =>
        Array.isArray(eoiType) && eoiType.includes(fields.eoiType.options[1])
          ? schema.required(fields.unitBlockDuration.validations.required)
          : schema.nullable().notRequired()
      ),
      displayUnitType: Yup.string().when('eoiType', ([eoiType], schema) =>
        Array.isArray(eoiType) && eoiType.includes(fields.eoiType.options[1])
          ? schema.required(fields.displayUnitType.validations.required)
          : schema.nullable().notRequired()
      ),
      showAgreementValue: Yup.boolean().when('eoiType', ([eoiType], schema) =>
        Array.isArray(eoiType) && eoiType.includes(fields.eoiType.options[1])
          ? schema.required(fields.showAgreementValue.validations.required)
          : schema.nullable()
      ),
      unitApproverId: Yup.mixed().when('eoiType', ([eoiType]) =>
        Array.isArray(eoiType) && eoiType.includes(fields.eoiType.options[1])
          ? Yup.object()
              .nullable()
              .required(fields.unitApproverId.validations.required)
          : Yup.mixed().nullable().notRequired()
      ),
      approvalWindowHours: Yup.string().when('eoiType', ([eoiType], schema) =>
        Array.isArray(eoiType) && eoiType.includes(fields.eoiType.options[1])
          ? schema.required(fields.approvalWindowHours.validations.required)
          : schema.nullable().notRequired()
      ),
      campaignName: Yup.string()
        .matches(/^[A-Za-z ]*$/, fields.campaignName.validations.pattern)
        .max(100, fields.campaignName.validations.max)
        .required(fields.campaignName.validations.required),
      pushToSfdc: Yup.string().oneOf(fields.pushToSfdc.options).nullable(),
      sfdcProjectName: Yup.string()
        .matches(/^[A-Za-z ]*$/, fields.sfdcProjectName.validations.pattern)
        .max(100, fields.sfdcProjectName.validations.max)
        .when('pushToSfdc', ([pushToSfdc], schema) =>
          pushToSfdc === fields.pushToSfdc.options[0]
            ? schema.required(fields.sfdcProjectName.validations.required)
            : schema.nullable()
        ),
      developmentTypeIds: Yup.string().required(fields.developmentTypeIds.validations.required),
      inventoryTypeIds: Yup.array()
        .of(Yup.string())
        .min(1, fields.inventoryTypeIds.validations.required)
        .required(fields.inventoryTypeIds.validations.required),
      inventoryDetails: Yup.array().of(
        Yup.object({
          type: Yup.string().nullable(),
          minSBA: Yup.number()
            .typeError(fields.minSBA.validations.pattern)
            .max(9999999999, fields.minSBA.validations.max)
            .nullable()
            .notRequired(),
          maxSBA: Yup.number()
            .typeError(fields.maxSBA.validations.pattern)
            .max(9999999999, fields.maxSBA.validations.max)
            .nullable()
            .notRequired()
            .when('minSBA', (minSBA: unknown, schema) => {
              const min = typeof minSBA === 'number' ? minSBA : Number(minSBA);
              if (!minSBA || Number.isNaN(min)) {
                return schema;
              }
              return schema.min(min, fields.maxSBA.validations.min);
            }),
          minPrice: Yup.number()
            .typeError(fields.minPrice.validations.pattern)
            .max(9999999999, fields.minPrice.validations.max)
            .nullable(),
          maxPrice: Yup.number()
            .typeError(fields.maxPrice.validations.pattern)
            .max(9999999999, fields.maxPrice.validations.max)
            .nullable()
            .min(Yup.ref('minPrice'), fields.maxPrice.validations.min),
          voucherAmt: Yup.number()
            .nullable()
            .when('$voucherAmountType', ([voucherAmountType], schema) =>
              voucherAmountType === VoucherAmountType.BHK_WISE
                ? schema.required(fields.voucherAmt.validations.required)
                : schema.nullable()
            ),

          standardEOIAmt: Yup.number()
            .nullable()
            .when('$stdEoiAmountType', ([stdEoiAmountType], schema) =>
              stdEoiAmountType === VoucherAmountType.BHK_WISE
                ? schema.required(fields.standardEOIAmt.validations.required)
                : schema.nullable()
            ),

          preferentialEOIAmt: Yup.number()
            .nullable()
            .when('$preEoiAmountType', ([preEoiAmountType], schema) =>
              preEoiAmountType === VoucherAmountType.BHK_WISE
                ? schema.required(fields.preferentialEOIAmt.validations.required)
                : schema.nullable()
            ),
        })
      ),
      enquiryInitials: Yup.string()
        .matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, fields.enquiryInitials.validations.pattern)
        .min(2, fields.enquiryInitials.validations.min)
        .max(50, fields.enquiryInitials.validations.max)
        .required(fields.enquiryInitials.validations.required),
      voucherIdInitials: Yup.string().when('phase', ([phases], schema) =>
        Array.isArray(phases) && phases.includes(fields.phase.options[0])
          ? schema
              .matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, fields.enquiryInitials.validations.pattern)
              .min(2, fields.enquiryInitials.validations.min)
              .max(50, fields.enquiryInitials.validations.max)
              .required(fields.voucherIdInitials.validations.required)
          : schema.nullable().notRequired()
      ),


      enquiryCounter: Yup.string()
        .matches(/^\d+$/, fields.enquiryCounter.validations.pattern)
        .min(1, fields.enquiryCounter.validations.min)
        .max(10, fields.enquiryCounter.validations.max)
        .required(fields.enquiryCounter.validations.required)
        .test(
          'greater-than-zero',
          fields.enquiryCounter.validations.greaterThanZero,
          (value) => Number(value) > 0
        ),
      voucherIdCounter: Yup.string().when('phase', ([phases], schema) =>
        Array.isArray(phases) && phases.includes(fields.phase.options[0])
          ? schema
              .matches(/^\d+$/, fields.enquiryCounter.validations.pattern)
              .min(1, fields.enquiryCounter.validations.min)
              .max(10, fields.enquiryCounter.validations.max)
              .required(fields.voucherIdCounter.validations.required)
              .test(
                'greater-than-zero',
                fields.enquiryCounter.validations.greaterThanZero,
                (value) => !value || Number(value) > 0
              )
          : schema.nullable().notRequired()
      ),

      indicativeBasePrice: Yup.string()
        .matches(/^[A-Za-z0-9 ]+$/, fields.indicativeBasePrice.validations.pattern)
        .max(10, fields.indicativeBasePrice.validations.max)
        .required(fields.indicativeBasePrice.validations.required)
        .nullable()
        .notRequired(),
      accountName: Yup.string()
        .matches(/^[A-Za-z ]*$/, fields.accountName.validations.pattern)
        .max(100, fields.accountName.validations.max)
        .required(fields.accountName.validations.required),
      bankName: Yup.string()
        .matches(/^[A-Za-z ]*$/, fields.bankName.validations.pattern)
        .max(100, fields.bankName.validations.max)
        .required(fields.bankName.validations.required),
      accountNumber: Yup.string()
        .matches(/^\d*$/, fields.accountNumber.validations.pattern)
        .min(9, fields.accountNumber.validations.min)
        .max(18, fields.accountNumber.validations.max)
        .required(fields.accountNumber.validations.required),
      ifscCode: Yup.string()
        .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, fields.ifscCode.validations.pattern)
        .max(11, fields.ifscCode.validations.max)
        .required(fields.ifscCode.validations.required),
      swiftCode: Yup.string()
        .matches(
          /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
          fields.swiftCode.validations.pattern
        )
        .min(8, fields.swiftCode.validations.min)
        .max(11, fields.swiftCode.validations.max)
        .nullable(),
      razorpaySecret: Yup.string()
        .nullable()
        .notRequired(),
      razorpayKey: Yup.string()
        .nullable()
        .notRequired(),
      easebuzzSalt: Yup.string()
        .matches(/^[A-Za-z0-9]*$/, fields.easebuzzSalt.validations.pattern)
        .max(50, fields.easebuzzSalt.validations.max)
        .nullable()
        .notRequired(),

      easebuzzKey: Yup.string()
        .matches(/^[A-Za-z0-9]*$/, fields.easebuzzKey.validations.pattern)
        .max(50, fields.easebuzzKey.validations.max)
        .nullable()
        .notRequired(),

      subMerchantId: Yup.string()
        .matches(/^[A-Za-z0-9]*$/, fields.subMerchantId.validations.pattern)
        .max(50, fields.subMerchantId.validations.max)
        .nullable()
        .notRequired(),
      phase: Yup.array()
        .of(
          Yup.string()
            .oneOf(fields.phase.options)
            .transform((val) => {
              if (val == null || val === '') return val;
              const lower = String(val).toLowerCase();
              if (fields.phase.options[0]?.toLowerCase() === lower) return fields.phase.options[0];
              if (fields.phase.options[1]?.toLowerCase() === lower) return fields.phase.options[1];
              return val;
            })
        )
        .min(1, fields.phase.validations.required)
        .required(fields.phase.validations.required),
      stage: Yup.string().oneOf(fields.stage.options.map((opt) => opt.value)).required(fields.stage.validations.required),
      venueName: Yup.string().required(fields.venueName.validations.required),
      venueMapLink: Yup.string()
        .transform((value) => (value === '' ? undefined : value))
        .url(fields.venueMapLink.validations.validUrl)
        .nullable()
        .notRequired(),
      agreementDocLink: Yup.string().when('stage', ([stage], schema) =>
        stage === LAUNCH_STAGE
          ? schema
            .transform((value) => (value === '' ? undefined : value))
            .url(fields.agreementDocLink.validations.validUrl)
            .nullable()
            .notRequired()
          : schema.nullable().notRequired()
      ),
      unitSourceType: Yup.string().when('isInventoryMapped', ([isInventoryMapped], schema) =>
        isInventoryMapped === true
          ? schema
              .oneOf(INVENTORY_SOURCE_OPTIONS.map((opt) => opt.value))
              .required(fields.unitSourceType.validations.required)
          : schema.nullable()
      ),
      generateQueueId: Yup.boolean()
        .oneOf(
          fields.generateQueueId.options.map((opt) => opt.value),
          fields.generateQueueId.validations.required
        )
        .required(fields.generateQueueId.validations.required),
      displayQueueId: Yup.string()
        .oneOf(
          fields.displayQueueId.options.map((opt) => opt.value),
          fields.displayQueueId.validations.required
        )
        .required(fields.displayQueueId.validations.required),
      voucherFormType: Yup.string()
        .oneOf(fields.voucherFormType.options)
        .when('phase', ([phases], schema) =>
          Array.isArray(phases) && phases.includes(fields.phase.options[0])
            ? schema.required(fields.voucherFormType.validations.required)
            : schema.nullable()
        ),
      voucherAmount: Yup.string()
        .matches(/^\d*$/, fields.voucherAmount.validations.pattern)
        .max(10, fields.voucherAmount.validations.max)
        .when(['phase', 'voucherAmountType'], ([phases, voucherAmountType], schema) =>
          Array.isArray(phases) &&
          phases.includes(fields.phase.options[0]) &&
          voucherAmountType === VoucherAmountType.FIXED
            ? schema
                .test('is-greater-than-zero', fields.voucherAmount.validations.min, (value) => {
                  if (!value) return true;
                  return Number(value) > 0;
                })
                .required(fields.voucherAmount.validations.required)
            : schema.nullable()
        ),

      voucherStartDate: Yup.date().when('phase', ([phases], schema) =>
        Array.isArray(phases) && phases.includes(fields.phase.options[0])
          ? schema.required(fields.voucherDuration.fields.voucherStartDate.validations.required)
          : schema.nullable()
      ),
      voucherEndDate: Yup.date().when('phase', ([phases], schema) =>
        Array.isArray(phases) && phases.includes(fields.phase.options[0])
          ? schema
              .min(
                Yup.ref('voucherStartDate'),
                fields.voucherDuration.fields.voucherEndDate.validations.min
              )
              .required(fields.voucherDuration.fields.voucherEndDate.validations.required)
          : schema.nullable()
      ),
      voucherTermsAndCondition: Yup.string()
        // .test(
        //   'max-visible-length',
        //   fields.voucherTermsAndCondition.validations.max,
        //   (value) => (value?.replaceAll(/<[^>]+>/g, '').trim().length ?? 0) <= 2000
        // )
        .when('phase', ([phases], schema) =>
          Array.isArray(phases) && phases.includes(fields.phase.options[0])
            ? schema.test(
                'required-rich-text',
                fields.voucherTermsAndCondition.validations.required,
                (value) => {
                  const text = value
                    ? new DOMParser().parseFromString(value, 'text/html').body.textContent?.trim() ??
                      ''
                    : ''.trim();
                  return !!text;
                }
              )
            : schema.nullable()
        ),
      eoiStartDate: Yup.date().when('phase', ([phases], schema) =>
        Array.isArray(phases) && phases.includes(fields.phase.options[1])
          ? schema.required(fields.eoiDuration.fields.eoiStartDate.validations.required)
          : schema.nullable()
      ),

      eoiEndDate: Yup.date().when('phase', ([phases], schema) =>
        Array.isArray(phases) && phases.includes(fields.phase.options[1])
          ? schema
              .min(Yup.ref('eoiStartDate'), fields.eoiDuration.fields.eoiEndDate.validations.min)
              .required(fields.eoiDuration.fields.eoiEndDate.validations.required)
          : schema.nullable()
      ),
      eoiFormType: Yup.string()
        .oneOf(fields.eoiFormType.options)
        .when('phase', ([phases], schema) =>
          Array.isArray(phases) && phases.includes(fields.phase.options[1])
            ? schema.required(fields.eoiFormType.validations.required)
            : schema.nullable()
        ),
      eoiType: Yup.array()
        .of(Yup.string())
        .when('phase', ([phases], schema) =>
          Array.isArray(phases) && phases.includes(fields.phase.options[1])
            ? schema
                .min(1, fields.eoiType.validations.required)
                .required(fields.eoiType.validations.required)
            : schema.nullable()
        ),
      stdEoiAmount: Yup.string()
        .matches(/^\d*$/, fields.stdEoiAmount.validations.pattern)
        .max(10, fields.stdEoiAmount.validations.max)
        .when(['phase', 'eoiType', 'stdEoiAmountType'], ([phases, types, stdEoiAmountType], schema) =>
          Array.isArray(phases) &&
          phases.includes(fields.phase.options[1]) &&
          Array.isArray(types) &&
          types.includes(fields.eoiType.options[0]) &&
          stdEoiAmountType === VoucherAmountType.FIXED
            ? schema
                .test('is-greater-than-zero', fields.stdEoiAmount.validations.min, (value) => {
                  if (!value) return true;
                  return Number(value) > 0;
                })
                .required(fields.stdEoiAmount.validations.required)
            : schema.nullable()
        ),
      preEoiAmount: Yup.string()
        .matches(/^\d*$/, fields.preEoiAmount.validations.pattern)
        .max(10, fields.preEoiAmount.validations.max)
        .when(['phase', 'eoiType', 'preEoiAmountType'], ([phases, types, preEoiAmountType], schema) =>
          Array.isArray(phases) &&
          phases.includes(fields.phase.options[1]) &&
          Array.isArray(types) &&
          types.includes(fields.eoiType.options[1]) &&
          preEoiAmountType === VoucherAmountType.FIXED
            ? schema
                .test('is-greater-than-zero', fields.preEoiAmount.validations.min, (value) => {
                  if (!value) return true;
                  return Number(value) > 0;
                })
                .required(fields.preEoiAmount.validations.required)
            : schema.nullable()
        ),
      stdEoiInitials: Yup.string()
        .matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, fields.enquiryInitials.validations.pattern)
        .min(2, fields.enquiryInitials.validations.min)
        .max(50, fields.enquiryInitials.validations.max)
        .when(['phase', 'eoiType'], ([phases, types], schema) =>
          Array.isArray(phases) &&
          phases.includes(fields.phase.options[1]) &&
          Array.isArray(types) &&
          types.includes(fields.eoiType.options[0])
            ? schema.required(fields.stdEoiInitials.validations.required)
            : schema.nullable()
        ),

      stdEoiCounter: Yup.string()
        .matches(/^\d+$/, fields.enquiryCounter.validations.pattern)
        .min(1, fields.enquiryCounter.validations.min)
        .max(10, fields.enquiryCounter.validations.max)
        .when(['phase', 'eoiType'], ([phases, types], schema) =>
          Array.isArray(phases) &&
          phases.includes(fields.phase.options[1]) &&
          Array.isArray(types) &&
          types.includes(fields.eoiType.options[0])
            ? schema
                .required(fields.voucherIdCounter.validations.requiredStandardEoiId)
                .test(
                  'greater-than-zero',
                  fields.enquiryCounter.validations.greaterThanZero,
                  (value) => !value || Number(value) > 0
                )
            : schema.notRequired().nullable()
        ),

      preEoiInitials: Yup.string()
        .matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, fields.enquiryInitials.validations.pattern)
        .min(2, fields.enquiryInitials.validations.min)
        .max(50, fields.enquiryInitials.validations.max)
        .when(['phase', 'eoiType'], ([phases, types], schema) =>
          Array.isArray(phases) &&
          phases.includes(fields.phase.options[1]) &&
          Array.isArray(types) &&
          types.includes(fields.eoiType.options[1])
            ? schema.required(fields.preEoiInitials.validations.required)
            : schema.nullable()
        ),

      preEoiCounter: Yup.string()
        .matches(/^\d+$/, fields.enquiryCounter.validations.pattern)
        .min(1, fields.enquiryCounter.validations.min)
        .max(10, fields.enquiryCounter.validations.max)
        .when(['phase', 'eoiType'], ([phases, types], schema) =>
          Array.isArray(phases) &&
          phases.includes(fields.phase.options[1]) &&
          Array.isArray(types) &&
          types.includes(fields.eoiType.options[1])
            ? schema
                .required(fields.voucherIdCounter.validations.requiredPreferentialEoiId)
                .test(
                  'greater-than-zero',
                  fields.enquiryCounter.validations.greaterThanZero,
                  (value) => !value || Number(value) > 0
                )
            : schema.notRequired().nullable()
        ),
      eoiTermsAndCondition: Yup.string()
        // .test(
        //   'max-visible-length',
        //   fields.eoiTermsAndCondition.validations.max,
        //   (value) => (value?.replaceAll(/<[^>]+>/g, '').trim().length ?? 0) <= 2000
        // )
        .when('phase', ([phases], schema) =>
          Array.isArray(phases) && phases.includes(fields.phase.options[1])
            ? schema.test(
                'required-rich-text',
                fields.eoiTermsAndCondition.validations.required,
                (value) => {
                  const text = value
                    ? new DOMParser().parseFromString(value, 'text/html').body.textContent?.trim() ??
                      ''
                    : ''.trim();
                  return !!text;
                }
              )
            : schema.nullable()
        ),
      // unit preference validation ( always required)
      unitPrefStaticContent: Yup.string().notRequired(),
      availableGateways: Yup
        .array()
        .required(fields.paymentGateway.validations.required)
        .test("not-empty", fields.paymentGateway.validations.required, (value) => value?.length > 0)
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(true);
      await dispatch(
        isEditMode && id
          ? updateCampaign({ payload: buildPayload(values), id })
          : createCampaign(buildPayload(values))
      )
        .unwrap()
        .then((response) => {
          toast.success(response);
          handleRedirect();
        })
        .catch((error) => {
          const message = 'Oops! Something went wrong.';
          if (Array.isArray(error)) {
            error.forEach((err) => {
              toast.error(err || message);
            });
          } else if (typeof error === 'string') {
            toast.error(error);
          } else {
            toast.error(message);
          }
        });
      setSubmitting(false);
    },
  });
  
  
  const showSFDCProjectName = formik.values?.pushToSfdc === fields.pushToSfdc.options[0];
  const showVoucherFields =
    formik.values?.phase?.includes(fields.phase.options[0]);
  const showUnitSourceType = formik.values?.isInventoryMapped ?? false;
  const showEOIFields = formik.values?.phase?.includes(fields.phase.options[1]);
  const showStandardEOIAmount = formik.values?.eoiType?.includes(fields.eoiType.options[0]);
  const showPreferentialEOIAmount = formik.values?.eoiType?.includes(fields.eoiType.options[1]);
  const isVoucherAmountTypeBHK = formik.values?.voucherAmountType === VoucherAmountType.BHK_WISE;
  const isStdEoiAmountTypeBHK = formik.values?.stdEoiAmountType === VoucherAmountType.BHK_WISE;
  const isPreEoiAmountTypeBHK = formik.values?.preEoiAmountType === VoucherAmountType.BHK_WISE;

  const LAUNCH_STAGE = fields.stage.options[1].value;

  const isEasebuzz = formik.values.availableGateways?.includes(PAYMENT_GATEWAY_OPTIONS[0].value)
  const isRazorpay = formik.values.availableGateways?.includes(PAYMENT_GATEWAY_OPTIONS[1].value)

  useEffect(() => {
    if (inventoryTypeOptions?.length) {
      const selectedIds: string[] = formik.values?.inventoryTypeIds || [];

      const existing = formik.values?.inventoryDetails || [];

      const selectedNames = selectedIds
        .map((invId) => inventoryTypeOptions.find((opt) => opt.value === invId)?.label)
        .filter(Boolean) as string[];

      const updated = existing.filter((d) => selectedNames.includes(d.type));

      selectedNames.forEach((name) => {
        if (!updated.some((d) => d.type === name)) {
          updated.push({
            type: name,
            minSBA: '',
            maxSBA: '',
            minPrice: '',
            maxPrice: '',
            voucherAmt: '',
            standardEOIAmt: '',
            preferentialEOIAmt: '',
          });
        }
      });

      formik.setFieldValue('inventoryDetails', updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.inventoryTypeIds]);

  useEffect(() => {
    Promise.all([dispatch(fetchBrands())]);
    dispatch(fetchDevelopmentTypes());
  }, [dispatch]);

  useEffect(() => {
    if (formik?.values?.brandId) {
      Promise.all([dispatch(fetchCitiesByBrandId(formik?.values?.brandId))]);
    }
  }, [dispatch, formik?.values?.brandId]);

  useEffect(() => {
    if (formik?.values?.developmentTypeIds) {
      Promise.all([dispatch(fetchInventoryTypes({ departmentIds: formik?.values?.developmentTypeIds }))]);
    }
    return () => {
      dispatch(resetInventoryTypes());
    };
  }, [dispatch, formik?.values?.developmentTypeIds]);

  useEffect(() => {
    if (isEditMode && id) {
      dispatch(getEOICampaignById(Number(id)));
    }

    return () => {
      dispatch(resetCampaignDetails());
    };
  }, [isEditMode, id, dispatch]);

  // populate form with campaign details in edit modes
  useEffect(() => {
    if (isEditMode && campaignDetails) {
      const { accountDetails, cityIds, brandId, project, developmentTypeIds, inventoryTypeIds, ...rest } =
        campaignDetails;
      Object.entries(rest).forEach(([key, value]) => {
        if (key.includes('Date') && value) {
          formik.setFieldValue(
            key,
            dayjs(value as string, 'DD-MM-YYYY').format('YYYY-MM-DD') ?? null
          );
        } else if (key.toLowerCase().includes('amount') && value) {
          formik.setFieldValue(key, Number(value) || '');
        } else if (key === 'pushToSfdc') {
          formik.setFieldValue(key, value ? 'Yes' : 'No');
        } else if (key === 'phase') {
          const normalizePhaseValue = (v: string) =>
            String(v).toLowerCase() === fields.phase.options[0]?.toLowerCase()
              ? fields.phase.options[0]
              : fields.phase.options[1];
          const raw = Array.isArray(value) ? value : [];
          const normalized = raw
            .map((v) => (typeof v === 'string' ? normalizePhaseValue(v) : null))
            .filter((v): v is string => v != null);
          formik.setFieldValue(key, normalized);
        } else if (key === 'eoiFormType') {
          const eoiFormTypeVal = value && fields.eoiFormType.options.includes(value as string) ? value : fields.eoiFormType.options[0];
          formik.setFieldValue(key, eoiFormTypeVal);
        } else {
          formik.setFieldValue(key, value ?? '');
        }
      });
      if (campaignDetails?.enquiryCounter) {
        formik.setFieldValue('enquiryCounter', String(campaignDetails?.enquiryCounter));
      }
      if (campaignDetails?.voucherIdCounter) {
        formik.setFieldValue('voucherIdCounter', String(campaignDetails?.voucherIdCounter));
      }
      formik.setFieldValue('generateQueueId', Boolean(campaignDetails?.queueAfterVerified));

      if (campaignDetails?.displayQueueId) {
        formik.setFieldValue('displayQueueId', campaignDetails?.displayQueueId);
      }

      if (campaignDetails?.voucherAmountType) {
        formik.setFieldValue('voucherAmountType', campaignDetails.voucherAmountType);
      }
      if (campaignDetails?.stdEoiAmountType) {
        formik.setFieldValue('stdEoiAmountType', campaignDetails.stdEoiAmountType);
      }
      if (campaignDetails?.preEoiAmountType) {
        formik.setFieldValue('preEoiAmountType', campaignDetails.preEoiAmountType);
      }

      if (accountDetails) {
        formik.setFieldValue('accountName', accountDetails.accountName || '');
        formik.setFieldValue('bankName', accountDetails.bankName || '');
        formik.setFieldValue('accountNumber', accountDetails.accountNumber || '');
        formik.setFieldValue('ifscCode', accountDetails.ifscCode || '');
        formik.setFieldValue('swiftCode', accountDetails.swiftCode || '');
      }

      if (brandId) {
        formik.setFieldValue('brandId', brandId.id);
      }

      if (Array.isArray(cityIds)) {
        const cityValues = cityIds.map((c) => (typeof c === 'object' ? String(c.id) : String(c)));
        formik.setFieldValue('cityIds', cityValues);
      }

      if (Array.isArray(developmentTypeIds)) {
        const devValues = developmentTypeIds.map((d) => (typeof d === 'object' ? d.id : d));
        formik.setFieldValue('developmentTypeIds', devValues[0] ?? '');
      }

      if (Array.isArray(inventoryTypeIds)) {
        const invValues = inventoryTypeIds.map((i) =>
          typeof i === 'object' ? String(i.id) : String(i)
        );

        formik.setFieldValue('inventoryTypeIds', invValues);
      }
      
      if(campaignDetails?.stdEoiInitials){
        formik.setFieldValue('stdEoiInitials', campaignDetails?.stdEoiInitials ?? '');
        formik.setFieldValue('stdEoiAmount', campaignDetails?.stdEoiAmount ? Number(campaignDetails?.stdEoiAmount) : '');
        formik.setFieldValue('stdEoiCounter', campaignDetails?.stdEoiCounter ?? '');
      }

      if(campaignDetails?.preEoiInitials){
        formik.setFieldValue('preEoiInitials', campaignDetails?.preEoiInitials ?? '');
        formik.setFieldValue('preEoiAmount', campaignDetails?.preEoiAmount ? Number(campaignDetails?.preEoiAmount) : '');
        formik.setFieldValue('preEoiCounter', campaignDetails?.preEoiCounter ?? '');
      }
      if(campaignDetails?.unitPrefStaticContent){
        formik.setFieldValue('unitPrefStaticContent', campaignDetails?.unitPrefStaticContent ?? '');
      }

      if (project) {
        formik.setFieldValue('projectId', String(project?.id));
      }

      if (campaignDetails?.unitApproverId?.id && campaignDetails?.unitApproverId?.name) {
        formik.setFieldValue('unitApproverId', { userId: String(campaignDetails?.unitApproverId?.id), userName: campaignDetails?.unitApproverId?.name })
      }
      if (campaignDetails?.additionalApprovers.length > 0) {
       const val = campaignDetails?.additionalApprovers?.map((item:any)=> ({
        userId: String(item?.id),
        userName: item?.name
       }))
        formik.setFieldValue('additionalApprovers', val);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, campaignDetails]);

  const brandOptions = useMemo(
    () => brands?.map((brand) => ({ value: brand?.id, label: brand?.name })),
    [brands]
  );
  
  const cityOptions = useMemo(
    () =>
      cities?.map((city) => ({
        value: String(city?.id),
        label: city?.name,
      })),
      [cities]
    );

  const projectOptions = useMemo(() => {

    if (!formik.values.cityIds?.length) {
      return []; 
    }
    return mapArrayToLabelValue(unMappedProjects, 'name', 'id') || [];
  }, [
    unMappedProjects,
    formik.values.cityIds
  ]);

  const developmentTypeOptions = useMemo(
    () =>
      developmentTypes?.map((item) => ({
        value: item?.id,
        label: item?.name,
      })),
    [developmentTypes]
  );

  const inventoryTypeOptions = useMemo(
    () =>
      inventoryTypes?.map((inventory) => ({
        value: String(inventory?.id),
        label: inventory?.name,
      })),
    [inventoryTypes]
  );

  const handleRedirect = () => {
    router.push(generateRoleBasedRoute(userRole, 'eoi-manager'));
  };

  // handle select checkbox
  const handleCheckboxChange = <K extends keyof FormValues>(key: K, option: string) => {
    const current = (formik.values[key] as string[]) ?? [];
    const updated = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];

    formik.setFieldValue(key, updated);
  };

  // handle phase multi select
  const handlePhaseCheckboxChange = (option: string) => {
    const current = formik.values?.phase ?? [];
    const isUnchecking = current.includes(option);

    const updated = isUnchecking
      ? current.filter((item) => item !== option)
      : [...current, option];

    formik.setFieldValue('phase', updated);

    if (!isUnchecking && option === fields.phase.options[1]) {
      formik.setFieldValue('eoiFormType', fields.eoiFormType.options[0]);
    }

    // if (isUnchecking) {
      // -----------------------------
      // 🔴 When Voucher is unchecked
      // -----------------------------
      if (option === fields.phase.options[0]) {
        formik.setFieldValue('voucherFormType', fields.voucherFormType.options[0]);
        formik.setFieldValue('voucherAmount', '');
        formik.setFieldValue('voucherStartDate', null);
        formik.setFieldValue('voucherEndDate', null);
        formik.setFieldValue('voucherTermsAndCondition', '');
        formik.setFieldValue('voucherIdInitials', '');
        formik.setFieldValue('voucherIdCounter', '');
        formik.setFieldValue('voucherAmountType', VoucherAmountType.FIXED);

        formik.setFieldTouched('voucherIdInitials', false);
        formik.setFieldTouched('voucherIdCounter', false);
      }

      // -----------------------------
      // 🔵 When EOI is unchecked
      // -----------------------------
      if (option === fields.phase.options[1]) {
        formik.setFieldValue('eoiStartDate', null);
        formik.setFieldValue('eoiEndDate', null);
        formik.setFieldValue('eoiFormType', fields.eoiFormType.options[0]);
        formik.setFieldValue('eoiType', []);
        formik.setFieldValue('stdEoiAmount', '');
        formik.setFieldValue('preEoiAmount', '');
        formik.setFieldValue('stdEoiInitials', '');
        formik.setFieldValue('preEoiInitials', '');
        formik.setFieldValue('stdEoiCounter', '');
        formik.setFieldValue('preEoiCounter', '');
        formik.setFieldValue('eoiTermsAndCondition', '');
        formik.setFieldValue('stdEoiAmountType', VoucherAmountType.FIXED);
        formik.setFieldValue('preEoiAmountType', VoucherAmountType.FIXED);
        formik.setFieldValue('thresholdAmount', '');
        formik.setFieldValue('unitBlockDuration', '');
        formik.setFieldValue('timerExtension', '');
        formik.setFieldValue('approvalWindowHours', '');
        formik.setFieldValue('displayUnitType', '');
        formik.setFieldValue('unitApproverId', null);
        formik.setFieldValue('additionalApprovers', []);
        
        formik.setFieldTouched('stdEoiInitials', false);
        formik.setFieldTouched('preEoiInitials', false);
        formik.setFieldTouched('unitApproverId', false);
      }
    // }
  };


  // create or update payload
  const buildPayload = (values: FormValues, saveAsDraft = false) => {
    const payload: Record<string, any> = {
      saveForLater: saveAsDraft,
      brandId: values?.brandId || null,
      cityIds: Array.isArray(values?.cityIds) ? values?.cityIds?.map((i) => Number(i)) : null,
      projectId: values?.projectId || null,
      campaignName: values?.campaignName || null,
      pushToSfdc: values?.pushToSfdc === fields.pushToSfdc.options[0],
      developmentTypeIds: values?.developmentTypeIds ? [values?.developmentTypeIds] : null,
      inventoryTypeIds: Array.isArray(values?.inventoryTypeIds)
        ? values?.inventoryTypeIds?.map((i) => Number(i))
        : null,
      inventoryDetails: values?.inventoryDetails || null,
      enquiryInitials: values?.enquiryInitials || null,
      voucherIdInitials: values?.voucherIdInitials || null,
      indicativeBasePrice: values?.indicativeBasePrice || null,
      accountDetails: {
        accountName: values?.accountName || null,
        bankName: values?.bankName || null,
        accountNumber: values?.accountNumber || null,
        ifscCode: values?.ifscCode || null,
        swiftCode: values?.swiftCode || null,
      },
      availableGateways: values?.availableGateways || null,
      razorpayKey: isRazorpay ? values?.razorpayKey : null,
      razorpaySecret: isRazorpay ? values?.razorpaySecret : null,
      easebuzzSalt: isEasebuzz ? values?.easebuzzSalt : null,
      easebuzzKey: isEasebuzz ? values?.easebuzzKey : null,
      subMerchantId: isEasebuzz ? values?.subMerchantId : null,
      phase:
        Array.isArray(values?.phase) && values.phase.length
          ? values.phase.map((p) => p?.toUpperCase?.() ?? p)
          : null,
      stage: values?.stage || null,
      venueName: values?.venueName || null,
      venueMapLink: values?.venueMapLink || null,
      agreementDocLink: values?.agreementDocLink || null,
      enableEOIsAllRms: values?.enableEOIsAllRms ?? false,
      unitSourceType: values?.unitSourceType || 'SFDC',
      enquiryCounter: Number(values?.enquiryCounter) || null,
      voucherIdCounter: Number(values?.voucherIdCounter) || null,
      queueAfterVerified: String(values?.generateQueueId) === "true",
      displayQueueId: values?.displayQueueId || null,
      unitPrefStaticContent: values?.unitPrefStaticContent || null,
      isInventoryMapped: values?.isInventoryMapped ?? false,
    };
   
  
    if (values?.pushToSfdc === fields.pushToSfdc.options[0]) {
      payload.sfdcProjectName = values?.sfdcProjectName || null;
    }

    // send Voucher related values only when launch phase contains Voucher
    if (values?.phase?.includes(fields.phase.options[0])) {
      payload.voucherFormType = values?.voucherFormType || null;
      payload.voucherStartDate = values?.voucherStartDate || null;
      payload.voucherEndDate = values?.voucherEndDate || null;
      payload.voucherTermsAndCondition = values?.voucherTermsAndCondition || null;
      payload.voucherAmountType = values?.voucherAmountType;
      // send voucherAmount only when voucherAmountType is Fixed
      if (values?.voucherAmountType === fields.voucherAmountType.options[0]) {
        payload.voucherAmount = values?.voucherAmount || null;
      }
    }

    // send EOI related values only when launch phase contains EOI
    if (values?.phase?.includes(fields.phase.options[1])) {
      payload.eoiFormType = values?.eoiFormType || null;
      payload.eoiType = values?.eoiType ?? [];
      payload.eoiStartDate = values?.eoiStartDate || null;
      payload.eoiEndDate = values?.eoiEndDate || null;
      payload.eoiTermsAndCondition = values?.eoiTermsAndCondition || null;

      // send data related to Standard EOI type only when its selected
      if (values?.eoiType?.includes(fields.eoiType.options[0])) {
        payload.stdEoiInitials = values?.stdEoiInitials ?? null;
        payload.stdEoiCounter = values?.stdEoiCounter ?? null;
        payload.stdEoiAmountType = values?.stdEoiAmountType ?? null;

        // send stdEoiAmount only when stdEoiAmountType is Fixed
        if (values?.stdEoiAmountType === VoucherAmountType.FIXED) {
          payload.stdEoiAmount = values?.stdEoiAmount ? Number(values?.stdEoiAmount) : null;;
        }
      }

      // send data related to Pre EOI type only when its selected
      if (values?.eoiType?.includes(fields.eoiType.options[1])) {
        payload.preEoiInitials = values?.preEoiInitials ?? null;
        payload.preEoiCounter = values?.preEoiCounter ?? null;
        payload.preEoiAmountType = values?.preEoiAmountType ?? null;
        payload.thresholdAmount = values?.thresholdAmount === '' ? null : Number(values.thresholdAmount);
        payload.unitBlockDuration = values?.unitBlockDuration === '' ? null : Number(values.unitBlockDuration);
        payload.timerExtension = values?.timerExtension === '' ? null : Number(values.timerExtension);
        payload.displayUnitType = values?.displayUnitType ?? null;
        payload.showAgreementValue = values?.showAgreementValue ?? false;
        payload.approvalWindowHours = values?.approvalWindowHours === '' ? null : Number(values.approvalWindowHours);
        payload.unitApproverId = values?.unitApproverId?.userId ? Number(values.unitApproverId.userId) : null;
        payload.additionalApprovers = values?.additionalApprovers?.map((user: any) => Number(user?.userId)) || [];
        
        // send preEoiAmount only when preEoiAmountType is Fixed
        if (values?.preEoiAmountType === VoucherAmountType.FIXED) {
          payload.preEoiAmount = values?.preEoiAmount ? Number(values?.preEoiAmount) : null;
        }
      }
    }
    
    return payload;
  };

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

  // reset respective amount types  to default value if its null while editing
  useEffect(()=>{
    if(isEditMode){
      if(!formik.values?.preEoiAmountType){
        formik.setFieldValue('preEoiAmountType', VoucherAmountType.FIXED)
      }
      if(!formik.values?.stdEoiAmountType){
        formik.setFieldValue('stdEoiAmountType', VoucherAmountType.FIXED)
      }
      if(!formik.values?.voucherAmountType){
        formik.setFieldValue('voucherAmountType', VoucherAmountType.FIXED)
      }
    }
  }, [formik, isEditMode])

  useEffect(() => {
    if (!unitApproverDebouncedSearch?.trim()) {
      setUnitApproverOptions([]);
      return;
    }
    const roles = `${ROLES.SALES_RSH},${ROLES.PROJECT_HEAD},${ROLES.SALES_BH},${ROLES.SuperAdmin},${ROLES.Admin}`;
    fetchSalesUsers(unitApproverDebouncedSearch, roles, setUnitApproverOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitApproverDebouncedSearch]);

  useEffect(() => {
    if (!extendedAccessDebouncedSearch?.trim()) {
      return;
    }
    const roles = `${ROLES.SALES_RSH},${ROLES.PROJECT_HEAD},${ROLES.SALES_BH},${ROLES.SuperAdmin},${ROLES.Admin}`;

    fetchSalesUsers(extendedAccessDebouncedSearch, roles, setExtendedAccessOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extendedAccessDebouncedSearch]);

  useEffect(() => {
    const { brandId, cityIds } = formik.values;
    if (brandId && Array.isArray(cityIds) && cityIds.length > 0) {
      dispatch(
        fetchUnmappedProjectByBrandIdAndCityId({
          brandId: String(brandId),
          cityIds
        })
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, formik.values.brandId, formik.values.cityIds]);

  const handlePaymentGatewayChange = (option: string, checked: boolean) => {
    const currentValues = formik.values.availableGateways || [];
    let updatedValues: string[];
    if (checked) {
      updatedValues = [...currentValues, option];
    }
    else {
      updatedValues = currentValues.filter((item: string) => item !== option);
    }
    formik.setFieldValue("availableGateways", updatedValues)
  }

  const handleVenueNameSelect = (locationData: AddressDetails) => {
    formik.setFieldValue(
      'venueName',
      locationData?.areaName || ''
    );

    formik.setFieldValue(
      'venueMapLink',
      locationData?.mapLink || ''
    );
  }

  let submitButtonText = uiText.eoiManager.buttons.create;
  if (formik.isSubmitting) {
    submitButtonText = uiText.eoiManager.buttons.submitting;
  } else if (isEditMode) {
    submitButtonText = uiText.eoiManager.buttons.update;
  }

  return loading ? (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        height: '80vh',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimateLogo1 />
    </Box>
  ) : (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={isEditMode ? uiText.eoiManager.editTitle : uiText.eoiManager.title}
        />
      </Box>
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={formik.handleSubmit} autoComplete="off">
          <Grid container spacing={3}>
            {/* Brand , City,  Project Name and Payment Ref Id and EOI ID Series prefix */}
            <Grid item xs={12}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  {/* Brand */}
                  <FormikAutocomplete
                    name="brandId"
                    label={fields.brandId.label}
                    required
                    options={brandOptions}
                    formik={formik}
                    disabled={isEditMode}
                    externalOnChange={(value) => {
                      formik.setFieldValue('cityIds', []);
                      if (!value && !isEditMode) {
                        formik.setFieldValue('brandId', '');
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {/* City */}
                  <FormikAutocomplete
                    name="cityIds"
                    label={fields.cityIds.label}
                    required
                    options={cityOptions}
                    formik={formik}
                    multiple
                    disabled={!formik.values.brandId}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {/* Campaign Name */}
                  <TextField
                    fullWidth
                    label={
                      <>
                        {fields.campaignName.label} <span style={{ color: '#FF0000' }}>*</span>
                      </>
                    }
                    name="campaignName"
                    value={formik.values?.campaignName}
                    onChange={(e) =>
                      formik.setFieldValue(
                        'campaignName',
                        e.target.value.replaceAll(/[^A-Za-z ]/g, '').slice(0, 100)
                      )
                    }
                    onBlur={formik.handleBlur}
                    error={formik.touched?.campaignName && Boolean(formik.errors?.campaignName)}
                    helperText={formik.touched?.campaignName && formik.errors?.campaignName}
                    placeholder={fields.campaignName.placeholder}
                  />
                </Grid>
                  <Grid item xs={12} sm={6}>
                    {/* Project */}
                    <FormikAutocomplete
                      name="projectId"
                      label={fields.projectId.label}
                      required
                      options={projectOptions}
                      formik={formik}
                    />
                  </Grid>
                   <Grid item xs={12} sm={6}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        {/* Payment Ref Id Prefix */}
                        <TextField
                          fullWidth
                          label={
                            <>
                              {fields.enquiryInitials.label}{' '}
                              <span style={{ color: '#FF0000' }}>*</span>
                            </>
                          }
                          name="enquiryInitials"
                          value={formik.values?.enquiryInitials}
                          onChange={(e) =>
                            formik.setFieldValue(
                              'enquiryInitials',
                              e.target.value
                                .toUpperCase()
                                .replaceAll(/[^A-Z0-9-]/g, '')
                                .slice(0, 50)
                            )
                          }
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched?.enquiryInitials && Boolean(formik.errors?.enquiryInitials)
                          }
                          helperText={
                            formik.touched?.enquiryInitials && formik.errors?.enquiryInitials
                          }
                          placeholder={fields.enquiryInitials.placeholder}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        {/* Series Starting */}
                        <TextField
                          fullWidth
                          label={
                            <>
                              {fields.enquiryCounter.label}{' '}
                              <span style={{ color: '#FF0000' }}>*</span>
                            </>
                          }
                          name="enquiryCounter"
                          value={formik.values?.enquiryCounter}
                          onChange={(e) =>
                            formik.setFieldValue(
                              'enquiryCounter',
                              e.target.value.replaceAll(/\D/g, '')
                            )
                          }
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched?.enquiryCounter && Boolean(formik.errors?.enquiryCounter)
                          }
                          helperText={formik.touched?.enquiryCounter && formik.errors?.enquiryCounter}
                          placeholder={fields.enquiryCounter.placeholder}
                        />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        {/* EOI ID Series Prefix */}
                        <TextField
                          sx={{ backgroundColor: '#f7f7f9' }}
                          fullWidth
                          disabled
                          label={<>{fields.enquiryInitials.finalLabel} </>}
                          name="enquiryInitials"
                          value={
                            formik.values?.enquiryInitials && formik.values?.enquiryCounter
                              ? `${formik.values?.enquiryInitials}-${formik.values?.enquiryCounter}`
                              : ''
                          }
                          placeholder={fields.enquiryInitials.placeholder}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
              </Grid>

            </Grid>

            {/* Lead Push to SFDC and Show Project Name */}
            <Grid item xs={12}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      {/* Lead Push to SFDC */}
                      <FormControl component="fieldset">
                        <FormLabel
                          component="legend"
                          sx={{
                            fontWeight: 600,
                            color: '#1C252E',
                            fontSize: '14px',
                            lineHeight: '12px',
                            letterSpacing: '0px',
                            mb: 0.5,
                          }}
                        >
                          {fields.pushToSfdc.label}
                        </FormLabel>
                        <RadioGroup
                          row
                          name="pushToSfdc"
                          value={formik.values?.pushToSfdc}
                          onChange={(e) => {
                            formik.setFieldValue('sfdcProjectName', '');
                            formik.setFieldValue('pushToSfdc', e.target.value);
                          }}
                          sx={{ marginLeft: 1 }}
                        >
                          {fields.pushToSfdc.options.map((i) => (
                            <FormControlLabel
                              key={i}
                              value={i}
                              control={
                                <Radio
                                  sx={{
                                    color: '#637381',
                                    '&.Mui-checked': {
                                      color: '#1A407D',
                                    },
                                  }}
                                />
                              }
                              label={i}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                    {showSFDCProjectName && (
                      <Grid item xs={12} sm={6}>
                        {/* SFDC Project Name */}
                        <TextField
                          fullWidth
                          label={
                            <>
                              {fields.sfdcProjectName.label}{' '}
                              <span style={{ color: '#FF0000' }}>*</span>
                            </>
                          }
                          name="sfdcProjectName"
                          value={formik.values?.sfdcProjectName}
                          onChange={(e) =>
                            formik.setFieldValue(
                              'sfdcProjectName',
                              e.target.value.replaceAll(/[^A-Za-z ]/g, '').slice(0, 100)
                            )
                          }
                          onBlur={formik.handleBlur}
                          error={
                            formik.touched?.sfdcProjectName &&
                            Boolean(formik.errors?.sfdcProjectName)
                          }
                          helperText={
                            formik.touched?.sfdcProjectName && formik.errors?.sfdcProjectName
                          }
                          placeholder={fields.sfdcProjectName.placeholder}
                        />
                      </Grid>
                    )}
                  </Grid>
                </Grid>            
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={3}>
                {/* Map inventory and inventory source */}
                 <Grid item xs={12} sx={{display:'flex', alignItems:'center', flexDirection:'row'}}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!formik.values.isInventoryMapped || false}
                          onChange={(e) =>{
                            formik.setFieldValue('unitSourceType', 'SFDC')
                            formik.setFieldValue('isInventoryMapped', e.target.checked )
                          }
                          }
                        />
                      }
                      label="Map Inventory"
                    />
                  </Grid>
                  {/* Inventory source */}
                 {showUnitSourceType && ( <Grid item xs={12} sm={6}>
                    <FormControl component="fieldset">
                      <FormLabel
                        component="legend"
                        sx={{
                          fontWeight: 600,
                          color: '#1C252E',
                          fontSize: '14px',
                          lineHeight: '12px',
                          letterSpacing: '0px',
                          mb: 0.5,
                        }}
                      >
                        {fields.unitSourceType.label} <span style={{ color: '#FF0000' }}>*</span>
                      </FormLabel>

                      <RadioGroup
                        row
                        name="unitSourceType"
                        value={formik.values.unitSourceType}
                        onChange={(e) => formik.setFieldValue('unitSourceType', e.target.value)}
                        sx={{ marginLeft: 1 }}
                      >
                        {INVENTORY_SOURCE_OPTIONS.map((opt) => (
                          <FormControlLabel
                            key={opt.value}
                            value={opt.value}
                            control={
                              <Radio
                                sx={{
                                  color: '#637381',
                                  '&.Mui-checked': {
                                    color: '#1A407D',
                                  },
                                }}
                              />
                            }
                            label={opt.label}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                    {formik.touched?.unitSourceType && formik.errors?.unitSourceType && (
                      <FormHelperText error>{formik.errors.unitSourceType}</FormHelperText>
                    )}
                  </Grid>)}
                </Grid>
                {/* Company Bank Account Details */}
                <Grid item xs={12}>
                      <Typography
                        sx={{
                          fontWeight: '600',
                          fontSize: '14px',
                          lineHeight: '22px',
                          letterSpacing: '0px',
                          color: '#1C252E',
                        }}
                      >
                        {uiText.eoiManager.sections.companyBankAccountDetails}
                      </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>      
                  {/* Account Holder Name */}
                  <TextField
                    fullWidth
                    label={
                      <>
                        {fields.accountName.label} <span style={{ color: '#FF0000' }}>*</span>
                      </>
                    }
                    name="accountName"
                    value={formik.values?.accountName}
                    onChange={(e) =>
                      formik.setFieldValue(
                        'accountName',
                        e.target.value.replaceAll(/[^A-Za-z ]/g, '').slice(0, 100)
                      )
                    }
                    onBlur={formik.handleBlur}
                    error={formik.touched?.accountName && Boolean(formik.errors?.accountName)}
                    helperText={formik.touched?.accountName && formik.errors?.accountName}
                    placeholder={fields.accountName.placeholder}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {/* Bank Name */}
                  <TextField
                    fullWidth
                    label={
                      <>
                        {fields.bankName.label} <span style={{ color: '#FF0000' }}>*</span>
                      </>
                    }
                    name="bankName"
                    value={formik.values?.bankName}
                    onChange={(e) =>
                      formik.setFieldValue(
                        'bankName',
                        e.target.value.replaceAll(/[^A-Za-z ]/g, '').slice(0, 100)
                      )
                    }
                    onBlur={formik.handleBlur}
                    error={formik.touched?.bankName && Boolean(formik.errors?.bankName)}
                    helperText={formik.touched?.bankName && formik.errors?.bankName}
                    placeholder={fields.bankName.placeholder}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {/* Account Number */}
                  <TextField
                    fullWidth
                    label={
                      <>
                        {fields.accountNumber.label} <span style={{ color: '#FF0000' }}>*</span>
                      </>
                    }
                    name="accountNumber"
                    value={formik.values?.accountNumber}
                    onChange={(e) =>
                      formik.setFieldValue(
                        'accountNumber',
                        e.target.value.replaceAll(/\D/g, '').slice(0, 18)
                      )
                    }
                    onBlur={formik.handleBlur}
                    error={formik.touched?.accountNumber && Boolean(formik.errors?.accountNumber)}
                    helperText={formik.touched?.accountNumber && formik.errors?.accountNumber}
                    placeholder={fields.accountNumber.placeholder}
                    inputProps={{
                      inputMode: 'numeric',
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {/* IFSC Code */}
                  <TextField
                    fullWidth
                    label={
                      <>
                        {fields.ifscCode.label} <span style={{ color: '#FF0000' }}>*</span>
                      </>
                    }
                    name="ifscCode"
                    value={formik.values?.ifscCode}
                    onChange={(e) => {
                      const value = e.target.value
                        .toUpperCase()
                        .replaceAll(/[^A-Z0-9]/g, '')
                        .slice(0, 11);
                      formik.setFieldValue('ifscCode', value);
                    }}
                    onBlur={formik.handleBlur}
                    error={formik.touched?.ifscCode && Boolean(formik.errors?.ifscCode)}
                    helperText={formik.touched?.ifscCode && formik.errors?.ifscCode}
                    placeholder={fields.ifscCode.placeholder}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {/* Swift Code */}
                  <TextField
                    fullWidth
                    label={fields.swiftCode.label}
                    name="swiftCode"
                    value={formik.values?.swiftCode}
                    onChange={(e) => {
                      const value = e.target.value
                        .toUpperCase()
                        .replaceAll(/[^A-Z0-9]/g, '')
                        .slice(0, 11);
                      formik.setFieldValue('swiftCode', value);
                    }}
                    onBlur={formik.handleBlur}
                    error={formik.touched?.swiftCode && Boolean(formik.errors?.swiftCode)}
                    helperText={formik.touched?.swiftCode && formik.errors?.swiftCode}
                    placeholder={fields.swiftCode.placeholder}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ border: '1px dotted #DADADA' }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              {/* Gateway Selection */}
              <FormControl component="fieldset">
                <FormLabel
                  component="legend"
                  sx={{
                    fontWeight: 600,
                    color: '#1C252E',
                    fontSize: '14px',
                    lineHeight: '12px',
                    letterSpacing: '0px',
                    mb: 0.5,
                    }}
                  >
                    {fields.paymentGateway.label} <span style={{ color: '#FF0000' }}>*</span>
                    <Tooltip title={fields.paymentGateway.tooltip} placement='right'>
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
                          checked={formik.values?.availableGateways?.includes(option.value)}
                          onChange={(e) => {
                            handlePaymentGatewayChange(option.value, e.target.checked)
                          }}
                          onBlur={() => formik.setFieldTouched('availableGateways', true)}
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
              </FormControl>
              {formik.touched?.availableGateways && formik.errors?.availableGateways && (
                <FormHelperText error>{formik.errors?.availableGateways}</FormHelperText>
              )}
            </Grid>
            <Grid
              item
              xs={12}
              sm={6}
              sx={{
                display: { xs: 'none', sm: 'block', md: 'block' },
              }}
              />
              { isRazorpay && (
                <>
                  {/* Razorpay merchant id */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={fields.razorpayKey.label}
                      name="razorpayKey"
                      value={formik.values?.razorpayKey}
                      onChange={(e) =>
                        formik.setFieldValue(
                          'razorpayKey',
                          e.target.value.replaceAll(/[^A-Za-z0-9]/g, '').slice(0, 50)
                        )
                      }
                      onBlur={formik.handleBlur}
                      error={formik.touched?.razorpayKey && Boolean(formik.errors?.razorpayKey)}
                      helperText={formik.touched?.razorpayKey && formik.errors?.razorpayKey}
                      placeholder={fields.razorpayKey.placeholder}
                    />
                  </Grid>
                  {/* Razorpay secret key */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={fields.razorpaySecret.label}
                      name="razorpaySecret"
                      value={formik.values?.razorpaySecret}
                      onChange={(e) =>
                        formik.setFieldValue(
                          'razorpaySecret',
                          e.target.value.replaceAll(/\W/g, '').slice(0, 50)
                        )
                      }
                      onBlur={formik.handleBlur}
                      error={formik.touched?.razorpaySecret && Boolean(formik.errors?.razorpaySecret)}
                      helperText={formik.touched?.razorpaySecret && formik.errors?.razorpaySecret}
                      placeholder={fields.razorpaySecret.placeholder}
                    />
                  </Grid>
                </>
              )}

              { isEasebuzz && (
                <>
                  {/* Easebuzz Salt */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={fields.easebuzzSalt.label}
                      name="easebuzzSalt"
                      value={formik.values?.easebuzzSalt}
                      onChange={(e) =>
                        formik.setFieldValue(
                          'easebuzzSalt',
                          e.target.value.replaceAll(/[^A-Za-z0-9]/g, '').slice(0, 50)
                        )
                      }
                      onBlur={formik.handleBlur}
                      error={formik.touched?.easebuzzSalt && Boolean(formik.errors?.easebuzzSalt)}
                      helperText={formik.touched?.easebuzzSalt && formik.errors?.easebuzzSalt}
                      placeholder={fields.easebuzzSalt.placeholder}
                    />
                  </Grid>

                  {/* Easebuzz Key */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={fields.easebuzzKey.label}
                      name="easebuzzKey"
                      value={formik.values?.easebuzzKey}
                      onChange={(e) =>
                        formik.setFieldValue(
                          'easebuzzKey',
                          e.target.value.replaceAll(/[^A-Za-z0-9]/g, '').slice(0, 50)
                        )
                      }
                      onBlur={formik.handleBlur}
                      error={formik.touched?.easebuzzKey && Boolean(formik.errors?.easebuzzKey)}
                      helperText={formik.touched?.easebuzzKey && formik.errors?.easebuzzKey}
                      placeholder={fields.easebuzzKey.placeholder}
                    />
                  </Grid>

                  {/* Easebuzz Sub - Merchant ID */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={fields.subMerchantId.label}
                      name="subMerchantId"
                      value={formik.values?.subMerchantId}
                      onChange={(e) =>
                        formik.setFieldValue(
                          'subMerchantId',
                          e.target.value.replaceAll(/[^A-Za-z0-9]/g, '').slice(0, 50)
                        )
                      }
                      onBlur={formik.handleBlur}
                      error={formik.touched?.subMerchantId && Boolean(formik.errors?.subMerchantId)}
                      helperText={formik.touched?.subMerchantId && formik.errors?.subMerchantId}
                      placeholder={fields.subMerchantId.placeholder}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} />
                </>
              )}

            {/* Generate and Display Queue ID */}
            <Grid item xs={6}>
              {/* Generate Queue ID */}
              <FormControl component="fieldset">
                <FormLabel
                  component="legend"
                  sx={{
                    fontWeight: 600,
                    color: '#1C252E',
                    fontSize: '14px',
                    lineHeight: '12px',
                    letterSpacing: '0px',
                    mb: 0.5,
                  }}
                >
                  {fields.generateQueueId.label} <span style={{ color: '#FF0000' }}>*</span>
                </FormLabel>
                <RadioGroup
                  row
                  name="generateQueueId"
                  value={formik.values.generateQueueId}
                  onChange={(e) => formik.setFieldValue('generateQueueId', e.target.value)}
                  sx={{ marginLeft: 1 }}
                >
                  {fields.generateQueueId.options.map((i) => (
                    <FormControlLabel
                      key={i.label}
                      value={i.value}
                      control={
                        <Radio
                          sx={{
                            color: '#637381',
                            '&.Mui-checked': {
                              color: '#1A407D',
                            },
                          }}
                        />
                      }
                      label={i.label}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              {formik.touched?.generateQueueId && formik.errors?.generateQueueId && (
                <FormHelperText error>{formik.errors?.generateQueueId}</FormHelperText>
              )}
            </Grid>
   
            <Grid item xs={6}>
              {/* Display Queue ID */}
              <FormControl component="fieldset">
                <FormLabel
                  component="legend"
                  sx={{
                    fontWeight: 600,
                    color: '#1C252E',
                    fontSize: '14px',
                    lineHeight: '12px',
                    letterSpacing: '0px',
                    mb: 0.5,
                  }}
                >
                  {fields.displayQueueId.label} <span style={{ color: '#FF0000' }}>*</span>
                </FormLabel>
                <RadioGroup
                  row
                  name="displayQueueId"
                  value={formik.values.displayQueueId}
                  onChange={(e) => formik.setFieldValue('displayQueueId', e.target.value)}
                  sx={{
                    marginLeft: 1,
                    '& .MuiFormControlLabel-root': {
                      alignItems: { xs: 'flex-start', sm: 'center'},
                    },
                  }}
                >
                  {fields.displayQueueId.options.map((i) => (
                    <FormControlLabel
                      key={i.value}
                      value={i.value}
                      control={
                        <Radio
                          sx={{
                            color: '#637381',
                            '&.Mui-checked': {
                              color: '#1A407D',
                            },
                          }}
                        />
                      }
                      label={i.label}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              {formik.touched?.displayQueueId && formik.errors?.displayQueueId && (
                <FormHelperText error>{formik.errors?.displayQueueId}</FormHelperText>
              )}
            </Grid>

            {/* Launch Phase and Stage Selection */}
            <Grid item xs={12}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  {/* Launch Phase */}
                  <FormControl component="fieldset">
                    <FormLabel
                      component="legend"
                      sx={{
                        fontWeight: 600,
                        color: '#1C252E',
                        fontSize: '14px',
                        lineHeight: '12px',
                        letterSpacing: '0px',
                        mb: 0.5,
                      }}
                    >
                      {fields.phase.label} <span style={{ color: '#FF0000' }}>*</span>
                    </FormLabel>
                    <FormGroup row sx={{ marginLeft: 1 }}>
                      {fields.phase.options.map((option) => (
                        <FormControlLabel
                          key={option}
                          label={option}
                          control={
                            <Checkbox
                              checked={formik.values?.phase?.includes(option)}
                              onChange={() => handlePhaseCheckboxChange(option)}
                              onBlur={() => formik.setFieldTouched('phase', true)}
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
                  </FormControl>
                  {formik.touched?.phase && formik.errors?.phase && (
                    <FormHelperText error>{formik.errors?.phase}</FormHelperText>
                  )}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {/* Stage */}
                  <FormControl component="fieldset">
                    <FormLabel
                      component="legend"
                      sx={{
                        fontWeight: 600,
                        color: '#1C252E',
                        fontSize: '14px',
                        lineHeight: '12px',
                        letterSpacing: '0px',
                        mb: 0.5,
                      }}
                    >
                      {fields.stage.label} <span style={{ color: '#FF0000' }}>*</span>
                    </FormLabel>

                    <RadioGroup
                      row
                      name="stage"
                      value={formik.values.stage}
                      onChange={(e) => {
                        const { value } = e.target;
                        formik.setFieldValue('stage', value);

                        if (value !== LAUNCH_STAGE) {
                          formik.setFieldValue('enableEOIsAllRms', false);
                          formik.setFieldValue('agreementDocLink', '');
                        }
                      }}
                      sx={{ marginLeft: 1 }}
                    >
                      {fields.stage.options.map((opt) => (
                        <FormControlLabel
                          key={opt.value}
                          value={opt.value}
                          control={
                            <Radio
                              sx={{
                                color: '#637381',
                                '&.Mui-checked': {
                                  color: '#1A407D',
                                },
                              }}
                            />
                          }
                          label={opt.label}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                  {formik.touched?.stage && formik.errors?.stage && (
                    <FormHelperText error>{formik.errors.stage}</FormHelperText>
                  )}
                  {formik.values.stage === LAUNCH_STAGE && (
                    <FormGroup sx={{ ml: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formik.values.enableEOIsAllRms}
                            onChange={(e) =>
                              formik.setFieldValue('enableEOIsAllRms', e.target.checked)
                            }
                          />
                        }
                        label="Enable EOI Records for all Buddy RMs"
                      />
                    </FormGroup>
                  )}
                </Grid>
                
                {/* venue name */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <GoogleMapsAutocomplete
                        name="venueName"
                        formik={formik}
                        label={fields.venueName.label}
                        placeholder={fields.venueName.placeholder}
                        required
                        variant="outlined"
                        TextFieldProps={{ className: 'requiredField custom-input' }}
                        onSelect={(locationData) => handleVenueNameSelect(locationData)}
                      />
                      <Tooltip
                        title={fields.venueName.tooltip}
                        placement="right"
                      >
                        <IconButton size="small" sx={{
                          mt: 1.5,
                        }}>
                          <InfoOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>

                {/* Venue Link */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        fullWidth
                        label={
                          <>
                            {fields.venueMapLink.label}
                          </>
                        }
                        name="venueMapLink"
                        value={formik.values?.venueMapLink}
                        onChange={(e) =>
                          formik.setFieldValue(
                            'venueMapLink',
                            e.target.value.slice(0, 100)
                          )
                        }
                        onBlur={formik.handleBlur}
                        error={formik.touched?.venueMapLink && Boolean(formik.errors?.venueMapLink)}
                        helperText={formik.touched?.venueMapLink && formik.errors?.venueMapLink}
                        placeholder={fields.venueMapLink.placeholder}
                      />
                      <Tooltip
                        title={fields.venueMapLink.tooltip}
                        placement="right"
                      >
                        <IconButton size="small">
                          <InfoOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                {/* Agreement Doc Link */}
                {formik.values.stage === LAUNCH_STAGE && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      fullWidth
                        label={
                          <>
                            {fields.agreementDocLink.label}
                          </>
                        }
                      name="agreementDocLink"
                      value={formik.values?.agreementDocLink}
                      onChange={(e) =>
                        formik.setFieldValue(
                          'agreementDocLink',
                          e.target.value.slice(0, 100)
                        )
                      }
                          onBlur={formik.handleBlur}
                          error={formik.touched?.agreementDocLink && Boolean(formik.errors?.agreementDocLink)}
                          helperText={formik.touched?.agreementDocLink && formik.errors?.agreementDocLink}
                          placeholder={fields.agreementDocLink.placeholder}
                        />

                        <Tooltip
                          title={fields.agreementDocLink.tooltip}
                          placement="right"
                        >
                          <IconButton size="small">
                            <InfoOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Grid>
                  )}
                </Grid>
            </Grid>

            {/* Voucher Form Type  and Voucher Duration */}
            {showVoucherFields && (
              <>
                <Grid item xs={12} sm={6}>
                  {/* Voucher Form Type */}
                  <FormControl component="fieldset">
                    <FormLabel
                      component="legend"
                      sx={{
                        fontWeight: 600,
                        color: '#1C252E',
                        fontSize: '14px',
                        lineHeight: '12px',
                        letterSpacing: '0px',
                        mb: 0.5,
                      }}
                    >
                      {fields.voucherFormType.label} <span style={{ color: '#FF0000' }}>*</span>
                    </FormLabel>
                    <RadioGroup
                      row
                      name="voucherFormType"
                      value={formik.values?.voucherFormType}
                      onChange={(e) => formik.setFieldValue('voucherFormType', e.target.value)}
                      sx={{ marginLeft: 1 }}
                    >
                      {fields.voucherFormType.options.map((i) => (
                        <FormControlLabel
                          key={i}
                          value={i}
                          control={
                            <Radio
                              sx={{
                                color: '#637381',
                                '&.Mui-checked': {
                                  color: '#1A407D',
                                },
                              }}
                            />
                          }
                          label={i}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                   <EOIAmountBlock
                      title="Voucher"
                      amountTypeFieldName="voucherAmountType"
                      amountFieldName="voucherAmount"
                      initialsFieldName="voucherIdInitials"
                      counterFieldName="voucherIdCounter"
                      amountLabel={fields.voucherAmount.label}
                      amountPlaceholder={fields.voucherAmount.placeholder}
                      initialsLabel={fields.voucherIdInitials.label}
                      initialsPlaceholder={fields.enquiryInitials.placeholder}
                      counterLabel={fields.enquiryCounter.label}
                      counterPlaceholder={fields.voucherIdCounter.placeholder}
                      finalLabel={fields.voucherIdInitials.finalLabel}
                      formik={formik}
                      fields={fields}
                    />
                </Grid>
                <Grid item xs={12}>
                  <Grid container columnSpacing={3} rowSpacing={{ xs: 3, sm: 0 }}>
                    <Grid item xs={12}>
                      <Typography
                        sx={{
                          fontWeight: '600',
                          fontSize: '14px',
                          lineHeight: '12px',
                          letterSpacing: '0px',
                          color: '#1C252E',
                          mb: { xs: 0, sm: 1.5 },
                        }}
                      >
                        {fields.voucherDuration.label}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {/* Voucher Duration - Start Date */}
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                          <DatePicker
                            label={
                              <>
                                {fields.voucherDuration.fields.voucherStartDate.label}{' '}
                                <span style={{ color: '#FF0000' }}>*</span>
                              </>
                            }
                            minDate={
                              formik.values?.voucherStartDate
                                ? dayjs(formik.values?.voucherStartDate)
                                : dayjs() // 🔥 default today
                            }
                            maxDate={
                              formik.values?.voucherEndDate
                                ? dayjs(formik.values?.voucherEndDate)
                                : undefined
                            }
                            value={
                              formik.values?.voucherStartDate
                                ? dayjs(formik.values?.voucherStartDate)
                                : null
                            }
                            onChange={(value) =>
                              formik.setFieldValue(
                                'voucherStartDate',
                                value?.isValid() ? value.format('YYYY-MM-DD') : null
                              )
                            }
                            format="DD/MM/YYYY"
                            slotProps={{
                              textField: (params) => ({
                                ...params,
                                fullWidth: true,
                                onBlur: () => {
                                  formik.setFieldTouched('voucherStartDate', true, true);
                                },
                                error: Boolean(
                                  formik.touched.voucherStartDate &&
                                  formik.errors.voucherStartDate
                                ),
                                helperText: formik.touched.voucherStartDate
                                  ? formik.errors.voucherStartDate
                                  : '',
                              }),
                            }}
                          />

                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {/* Voucher Duration - End Date */}
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          label={
                            <>
                              {fields.voucherDuration.fields.voucherEndDate.label}{' '}
                              <span style={{ color: '#FF0000' }}>*</span>
                            </>
                          }
                          minDate={
                            formik.values?.voucherStartDate
                              ? dayjs(formik.values?.voucherStartDate)
                              : undefined
                          }
                          value={
                            formik.values?.voucherEndDate
                              ? dayjs(formik.values?.voucherEndDate)
                              : null
                          }
                          onChange={(value) =>
                            formik.setFieldValue(
                              'voucherEndDate',
                              value?.isValid() ? value.format('YYYY-MM-DD') : null
                            )
                          }
                          format="DD/MM/YYYY"
                          slotProps={{
                            textField: (params) => ({
                              ...params,
                              fullWidth: true,
                              onBlur: () => {
                                formik.setFieldTouched('voucherEndDate', true, true);
                              },
                              error: Boolean(
                                formik.touched.voucherEndDate && formik.errors.voucherEndDate
                              ),
                              helperText: formik.touched.voucherEndDate
                                ? formik.errors.voucherEndDate
                                : '',
                            }),
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                  </Grid>
                </Grid>
              </>
            )}
            {showVoucherFields && showEOIFields && (
              <Grid item xs={12}>
                <Divider sx={{ border: '1px dotted #DADADA' }} />
              </Grid>
            )}

            {/* EOI Duration, EOI form type , EOI Types */}
            {showEOIFields && (
              <Grid item xs={12}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Grid container columnSpacing={3} rowSpacing={{ xs: 3, sm: 0 }}>
                      <Grid item xs={12}>
                        <Typography
                          sx={{
                            fontWeight: '600',
                            fontSize: '14px',
                            lineHeight: '12px',
                            letterSpacing: '0px',
                            color: '#1C252E',
                            mb: { xs: 0, sm: 1.5 },
                          }}
                        >
                          {fields.eoiDuration.label}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        {/* EOI Duration - Start Date */}
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              label={
                                <>
                                  {fields.eoiDuration.fields.eoiStartDate.label}{' '}
                                  <span style={{ color: '#FF0000' }}>*</span>
                                </>
                              }
                              minDate={
                                formik.values?.eoiStartDate
                                  ? dayjs(formik.values?.eoiStartDate)
                                  : dayjs() // optional: if you want today restriction
                              }
                              maxDate={
                                formik.values?.eoiEndDate
                                  ? dayjs(formik.values?.eoiEndDate)
                                  : undefined
                              }
                              value={
                                formik.values?.eoiStartDate
                                  ? dayjs(formik.values?.eoiStartDate)
                                  : null
                              }
                              onChange={(value) =>
                                formik.setFieldValue(
                                  'eoiStartDate',
                                  value?.isValid() ? value.format('YYYY-MM-DD') : null
                                )
                              }
                              format="DD/MM/YYYY"
                              slotProps={{
                                textField: (params) => ({
                                  ...params,
                                  fullWidth: true,
                                  onBlur: () => {
                                    formik.setFieldTouched('eoiStartDate', true, true);
                                  },
                                  error: Boolean(
                                    formik.touched.eoiStartDate &&
                                    formik.errors.eoiStartDate
                                  ),
                                  helperText: formik.touched.eoiStartDate
                                    ? formik.errors.eoiStartDate
                                    : '',
                                }),
                              }}
                            />

                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        {/* EOI Duration - End Date */}
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                          <DatePicker
                            label={
                              <>
                                {fields.eoiDuration.fields.eoiEndDate.label}{' '}
                                <span style={{ color: '#FF0000' }}>*</span>
                              </>
                            }
                            minDate={
                              formik.values?.eoiStartDate
                                ? dayjs(formik.values?.eoiStartDate)
                                : undefined
                            }
                            value={
                              formik.values?.eoiEndDate ? dayjs(formik.values?.eoiEndDate) : null
                            }
                            onChange={(value) =>
                              formik.setFieldValue(
                                'eoiEndDate',
                                value?.isValid() ? value.format('YYYY-MM-DD') : null
                              )
                            }
                            format="DD/MM/YYYY"
                            slotProps={{
                              textField: (params) => ({
                                ...params,
                                fullWidth: true,
                                onBlur: () => {
                                  formik.setFieldTouched('eoiEndDate', true, true);
                                },
                                error: Boolean(
                                  formik.touched.eoiEndDate && formik.errors.eoiEndDate
                                ),
                                helperText: formik.touched.eoiEndDate
                                  ? formik.errors.eoiEndDate
                                  : '',
                              }),
                            }}
                          />
                        </LocalizationProvider>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12} spacing={3}>
                    {/* EOI Form Type */}
                    <FormControl component="fieldset">
                      <FormLabel
                        component="legend"
                        sx={{
                          fontWeight: 600,
                          color: '#1C252E',
                          fontSize: '14px',
                          lineHeight: '12px',
                          letterSpacing: '0px',
                          mb: 0.5,
                        }}
                      >
                        {fields.eoiFormType.label} <span style={{ color: '#FF0000' }}>*</span>
                      </FormLabel>
                      <RadioGroup
                        row
                        name="eoiFormType"
                        value={formik.values?.eoiFormType}
                        onChange={(e) => formik.setFieldValue('eoiFormType', e.target.value)}
                        sx={{ marginLeft: 1 }}
                      >
                        {fields.eoiFormType.options.map((i) => (
                          <FormControlLabel
                            key={i}
                            value={i}
                            control={
                              <Radio
                                sx={{
                                  color: '#637381',
                                  '&.Mui-checked': {
                                    color: '#1A407D',
                                  },
                                }}
                              />
                            }
                            label={i}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                {/* EOI Types – Standard then Preferential; each has its own Fixed/BHK Wise */}
                  <Grid item xs={12}>
                    <FormLabel
                      component="legend"
                      sx={{
                        fontWeight: 600,
                        color: '#1C252E',
                        mb: 1,
                        fontSize: '14px',
                        lineHeight: '12px',
                      }}
                    >
                      {fields.eoiType.label} <span style={{ color: '#FF0000' }}>*</span>
                    </FormLabel>

                    {/* Standard EOI block */}
                    <Box sx={{ mb: 0.5 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formik.values?.eoiType?.includes(fields.eoiType.options[0])}
                            onChange={() => {
                              handleCheckboxChange('eoiType', fields.eoiType.options[0]);
                              formik.setFieldValue('stdEoiAmount', '');
                            }}
                            onBlur={() => formik.setFieldTouched('eoiType', true)}
                            sx={{
                              color: '#637381',
                              '&.Mui-checked': { color: '#1A407D' },
                            }}
                          />
                        }
                        label={fields.eoiType.options[0]}
                        sx={{ mb: 0.5 }}
                      />
                      {showStandardEOIAmount && (
                        <EOIAmountBlock
                          title="Standard EOI"
                          amountTypeFieldName="stdEoiAmountType"
                          amountFieldName="stdEoiAmount"
                          initialsFieldName="stdEoiInitials"
                          counterFieldName="stdEoiCounter"
                          amountLabel={fields.stdEoiAmount.label}
                          amountPlaceholder={fields.stdEoiAmount.placeholder}
                          initialsLabel={fields.stdEoiInitials.label}
                          initialsPlaceholder={fields.enquiryInitials.placeholder}
                          counterLabel={fields.enquiryCounter.label}
                          counterPlaceholder={fields.voucherIdCounter.placeholder}
                          finalLabel={fields.voucherIdInitials.finalLabelStandard}
                          formik={formik}
                          fields={fields}
                        />
                      )}
                    </Box>

                    {/* Preferential EOI block */}
                    <Box sx={{ mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formik.values?.eoiType?.includes(fields.eoiType.options[1])}
                            onChange={() => {
                              handleCheckboxChange('eoiType', fields.eoiType.options[1]);
                              formik.setFieldValue('preEoiAmount', '');
                            }}
                            onBlur={() => formik.setFieldTouched('eoiType', true)}
                            sx={{
                              color: '#637381',
                              '&.Mui-checked': { color: '#1A407D' },
                            }}
                          />
                        }
                        label={fields.eoiType.options[1]}
                        sx={{ mb: 0.5 }}
                      />
                      {showPreferentialEOIAmount && (
                        <>
                        <EOIAmountBlock
                          title="Preferential EOI"
                          amountTypeFieldName="preEoiAmountType"
                          amountFieldName="preEoiAmount"
                          initialsFieldName="preEoiInitials"
                          counterFieldName="preEoiCounter"
                          amountLabel={fields.preEoiAmount.label}
                          amountPlaceholder={fields.preEoiAmount.placeholder}
                          initialsLabel={fields.preEoiInitials.label}
                          initialsPlaceholder={fields.enquiryInitials.placeholder}
                          counterLabel={fields.enquiryCounter.label}
                          counterPlaceholder={fields.voucherIdCounter.placeholder}
                          finalLabel={fields.voucherIdInitials.finalLabelPreferential}
                          formik={formik}
                          fields={fields}
                        />

                          <Grid item xs={12}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 3,
                                pb: 4,
                                border: '1px solid #e0e0e0',
                                borderRadius: 2,
                                mt: 3,
                              }}
                            >
                              <Stack spacing={3}>
                                <Grid container spacing={3} alignItems="flex-start">
                                  <Grid item xs={12} >

                                    <FormControl component="fieldset" fullWidth>
                                      <FormLabel
                                        component="legend"
                                        sx={{
                                          fontWeight: 600,
                                          fontSize: '14px',
                                          color: '#1C252E',
                                          mb: 1,
                                          }}
                                        >
                                          {fields.thresholdAmount.title}
                                        </FormLabel>
                                      </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4}>
                                      {/* Threshold amount */}
                                      <TextField
                                        fullWidth
                                        label={
                                          <>
                                            {fields.thresholdAmount.label} <span style={{ color: '#FF0000' }}>*</span>
                                          </>
                                        }
                                        name="thresholdAmount"
                                        value={formik.values?.thresholdAmount ? Number(formik.values?.thresholdAmount).toLocaleString('en-IN') : ''}
                                        onChange={(e) =>
                                          formik.setFieldValue(
                                            'thresholdAmount',
                                            e.target.value.replaceAll(/\D/g, '').slice(0, 18)
                                          )
                                        }
                                        onBlur={formik.handleBlur}
                                        error={formik.touched?.thresholdAmount && Boolean(formik.errors?.thresholdAmount)}
                                        helperText={
                                          formik.touched?.thresholdAmount &&
                                            formik.errors?.thresholdAmount ? (
                                            formik.errors?.thresholdAmount
                                          ) : (
                                            <Box
                                              sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 0.5,
                                                color: '#637381',
                                              }}
                                            >
                                              <Iconify
                                                icon="solar:info-circle-bold"
                                                width={16}
                                                sx={{
                                                  color: '#637381',
                                                  mt: '2px',
                                                  flexShrink: 0,
                                                }}
                                              />

                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  color: '#637381',
                                                }}
                                              >
                                                {fields.thresholdAmount.helperText}
                                              </Typography>
                                            </Box>
                                          )
                                        }
                                        placeholder={fields.thresholdAmount.placeholder}
                                        inputProps={{
                                          inputMode: 'numeric',
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={4}>
                                      {/* Unit block number */}
                                      <TextField
                                        fullWidth
                                        label={
                                          <>
                                            {fields.unitBlockDuration.label} <span style={{ color: '#FF0000' }}>*</span>
                                          </>
                                        }
                                        name="unitBlockDuration"
                                        value={formik.values?.unitBlockDuration}
                                        onChange={(e) =>
                                          formik.setFieldValue(
                                            'unitBlockDuration',
                                            e.target.value.replaceAll(/\D/g, '').slice(0, 18)
                                          )
                                        }
                                        onBlur={formik.handleBlur}
                                        error={formik.touched?.unitBlockDuration && Boolean(formik.errors?.unitBlockDuration)}
                                        helperText={
                                          formik.touched?.unitBlockDuration &&
                                          formik.errors?.unitBlockDuration
                                        }
                                        placeholder={fields.unitBlockDuration.placeholder}
                                        InputProps={{
                                          endAdornment: formik.values.unitBlockDuration ? (
                                            <InputAdornment position="end">
                                              minutes
                                            </InputAdornment>
                                          ) : null,
                                        }}
                                        inputProps={{
                                          inputMode: 'numeric',
                                        }}
                                      />
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={4}>
                                      {/* Extended Duration */}
                                      <TextField
                                        fullWidth
                                        label={
                                          <>
                                            {fields.timerExtension.label}
                                          </>
                                        }
                                        name="timerExtension"
                                        value={formik.values?.timerExtension}
                                        onChange={(e) =>
                                          formik.setFieldValue(
                                            'timerExtension',
                                            e.target.value.replaceAll(/\D/g, '').slice(0, 18)
                                          )
                                        }
                                        onBlur={formik.handleBlur}
                                        error={formik.touched?.timerExtension && Boolean(formik.errors?.timerExtension)}
                                        helperText={
                                          formik.touched?.timerExtension &&
                                          formik.errors?.timerExtension
                                        }
                                        placeholder={fields.timerExtension.placeholder}
                                        InputProps={{
                                          endAdornment: formik.values.timerExtension ? (
                                            <InputAdornment position="end">
                                              minutes
                                            </InputAdornment>
                                          ) : null,
                                        }}
                                        inputProps={{
                                          inputMode: 'numeric',
                                        }}
                                      />
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={4}>
                                      {/* Approval Window */}
                                      <TextField
                                        fullWidth
                                        label={
                                          <>
                                            {fields.approvalWindowHours.label} <span style={{ color: '#FF0000' }}>*</span>
                                          </>
                                        }
                                        name="approvalWindowHours"
                                        value={formik.values?.approvalWindowHours}
                                        onChange={(e) =>
                                          formik.setFieldValue(
                                            'approvalWindowHours',
                                            e.target.value.replaceAll(/\D/g, '').slice(0, 18)
                                          )
                                        }
                                        onBlur={formik.handleBlur}
                                        error={formik.touched?.approvalWindowHours && Boolean(formik.errors?.approvalWindowHours)}
                                        helperText={
                                          formik.touched?.approvalWindowHours &&
                                          formik.errors?.approvalWindowHours
                                        }
                                        placeholder={fields.approvalWindowHours.placeholder}
                                        InputProps={{
                                          endAdornment: formik.values.approvalWindowHours ? (
                                            <InputAdornment position="end">
                                              hours
                                            </InputAdornment>
                                          ) : null,
                                        }}
                                        inputProps={{
                                          inputMode: 'numeric',
                                        }}
                                      />
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={4}>
                                      {/* Unit details */}
                                      <FormControl component="fieldset">
                                        <FormLabel
                                          component="legend"
                                          sx={{
                                            fontWeight: 500,
                                            color: '#1C252E',
                                            fontSize: '14px',
                                            lineHeight: '12px',
                                            letterSpacing: '0px',
                                            mb: 0.5,
                                          }}
                                        >
                                          {fields.displayUnitType.label} <span style={{ color: '#FF0000' }}>*</span>
                                        </FormLabel>
                                        <RadioGroup
                                          row
                                          name="displayUnitType"
                                          value={formik.values?.displayUnitType}
                                          onChange={(e) => {
                                            formik.setFieldValue('displayUnitType', e.target.value);
                                          }}
                                          sx={{ marginLeft: 1 }}
                                        >
                                          {DISPLAY_UNIT_TYPE_OPTIONS.map((item) => (
                                            <FormControlLabel
                                              key={item.value}
                                              value={item.value}
                                              control={
                                                <Radio
                                                  sx={{
                                                    color: '#637381',
                                                    '&.Mui-checked': {
                                                      color: '#1A407D',
                                                    },
                                                  }}
                                                />
                                              }
                                              label={item.label}
                                            />
                                          ))}
                                        </RadioGroup>
                                        {formik.touched?.displayUnitType &&
                                          formik.errors?.displayUnitType && (
                                            <FormHelperText error>
                                              {formik.errors.displayUnitType}
                                            </FormHelperText>
                                          )}
                                      </FormControl>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={4}>
                                      {/* Show Agreement Value */}
                                      <FormControl component="fieldset">
                                        <FormLabel
                                          component="legend"
                                          sx={{
                                            fontWeight: 500,
                                            color: '#1C252E',
                                            fontSize: '14px',
                                            lineHeight: '12px',
                                            letterSpacing: '0px',
                                            mb: 0.5,
                                          }}
                                        >
                                          {fields.showAgreementValue.label} <span style={{ color: '#FF0000' }}>*</span>
                                        </FormLabel>
                                        <RadioGroup
                                          row
                                          name="showAgreementValue"
                                          value={formik.values?.showAgreementValue}
                                          onChange={(e) => {
                                            formik.setFieldValue('showAgreementValue', e.target.value === 'true');
                                          }}
                                          sx={{ marginLeft: 1 }}
                                        >
                                          {SHOW_AGREEMENT_VALUE_OPTIONS.map((item) => (
                                            <FormControlLabel
                                              key={String(item.value)}
                                              value={String(item.value)}
                                              control={
                                                <Radio
                                                  sx={{
                                                    color: '#637381',
                                                    '&.Mui-checked': {
                                                      color: '#1A407D',
                                                    },
                                                  }}
                                                />
                                              }
                                              label={item.label}
                                            />
                                          ))}
                                        </RadioGroup>
                                        {formik.touched?.showAgreementValue &&
                                          formik.errors?.showAgreementValue && (
                                            <FormHelperText error>
                                              {formik.errors.showAgreementValue}
                                            </FormHelperText>
                                          )}
                                      </FormControl>
                                    </Grid>
                                    
                                    <Grid item xs={12} sm={6}>
                                      <Box>
                                      <Typography
                                        sx={{
                                          fontWeight: '600',
                                          fontSize: '14px',
                                          lineHeight: '12px',
                                          letterSpacing: '0px',
                                          color: '#1C252E',
                                          mb: 2,
                                          }}
                                        >
                                          {fields.unitApproverId.title} <span style={{ color: '#FF0000' }}>*</span>
                                        </Typography>
                                        <CustomAutocomplete
                                          label= {fields.unitApproverId.label}
                                          options={unitApproverOptions}

                                          value={formik.values.unitApproverId || null}

                                          inputValue={unitApproverSearchQuery}

                                          onChange={(event, newValue) => {
                                            formik.setFieldValue('unitApproverId', newValue);
                                            setUnitApproverSearchQuery("");
                                          }}

                                          onInputChange={(event, newInputValue) => {
                                            setUnitApproverSearchQuery(newInputValue || '');
                                          }}

                                          placeholder="Search and select"

                                          noOptionsText={
                                            unitApproverDebouncedSearch
                                              ? "No approvers found"
                                              : "Type to search"
                                          }

                                          height={55}
                                          error={
                                            formik.touched.unitApproverId &&
                                            Boolean(formik.errors.unitApproverId)
                                          }

                                          helperText={
                                            formik.touched.unitApproverId &&
                                              typeof formik.errors.unitApproverId === 'string'
                                              ? formik.errors.unitApproverId
                                              : ''
                                          }
                                        />
                                      </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <Box>
                                      <Typography
                                        sx={{
                                          fontWeight: '600',
                                          fontSize: '14px',
                                          lineHeight: '12px',
                                          letterSpacing: '0px',
                                          color: '#1C252E',
                                          mb: 2,
                                          }}
                                        >
                                          {fields.additionalApprovers.title}
                                        </Typography>
                                        <CustomMultiAutocomplete
                                          label={fields.additionalApprovers.label}
                                          options={extendedAccessOptions}

                                          value={formik.values.additionalApprovers || []}

                                          inputValue={extendedAccessSearchQuery}
                                          onChange={(event, newValue) => {
                                            formik.setFieldValue('additionalApprovers', newValue);
                                            setExtendedAccessSearchQuery("");
                                          }}

                                          onInputChange={(event, newInputValue, reason) => {
                                            if (reason === "input") {
                                              setExtendedAccessSearchQuery(newInputValue || '');
                                            }
                                          }}

                                          placeholder="Search and select"

                                          noOptionsText={
                                            extendedAccessDebouncedSearch
                                              ? "No approvers found"
                                              : "Type to search"
                                          }
                                          height={55}
                                        />
                                      </Box>
                                    </Grid>
                                  </Grid>
                                </Stack>
                              </Paper>
                            </Grid>
                        </>
                      )}
                    </Box>

                    {formik.touched?.eoiType && formik.errors?.eoiType && (
                      <FormHelperText error sx={{ mt: 0.5 }}>{formik.errors?.eoiType}</FormHelperText>
                    )}
                  </Grid>

                </Grid>
              </Grid>
            )}

             <Grid item xs={12}>
              <Divider sx={{ border: '1px dotted #DADADA' }} />
            </Grid>

            {/* Deveopment and Inventory Type */}
            <Grid item xs={12} sm={6}>
              {/* Development Type */}
              <FormikAutocomplete
                name="developmentTypeIds"
                label={fields.developmentTypeIds.label}
                required
                options={developmentTypeOptions}
                formik={formik}
                externalOnChange={(value) => {
                  formik.setFieldValue('inventoryTypeIds', []);
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              {/* Inventory Type */}
              <FormikAutocomplete
                name="inventoryTypeIds"
                label={fields.inventoryTypeIds.label}
                required
                options={inventoryTypeOptions}
                formik={formik}
                multiple
                disabled={!formik.values.developmentTypeIds}
              />
            </Grid>
            {formik.values?.inventoryDetails?.map((inv, index) => (
              <Grid item xs={12} key={inv?.type}>
                <Grid container columnSpacing={3} rowSpacing={{ xs: 3, sm: 3, md: 2 }}>
                  <Grid item xs={12}>
                    <Typography
                      sx={{
                        fontWeight: '500',
                        fontSize: '14px',
                        lineHeight: '12px',
                        letterSpacing: '0px',
                        color: '#1C252E',
                        mb: { xs: 0, md: 1.5 },
                      }}
                    >
                      {inv?.type}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label={
                        <>
                          {fields.minSBA.label}
                        </>
                      }
                      name={`inventoryDetails[${index}].minSBA`}
                      value={formik.values.inventoryDetails?.[index]?.minSBA}
                      onChange={(e) => {
                        const rawValue = e.target.value.replaceAll(/\D/g, '').slice(0, 10);
                        formik.setFieldValue(`inventoryDetails[${index}].minSBA`, rawValue);
                      }}
                      onBlur={formik.handleBlur}
                      error={
                        !!(
                          formik.touched.inventoryDetails?.[index]?.minSBA &&
                          typeof formik.errors.inventoryDetails?.[index] === 'object' &&
                          formik.errors.inventoryDetails[index]?.minSBA
                        )
                      }
                      helperText={
                        formik.touched.inventoryDetails?.[index]?.minSBA &&
                        typeof formik.errors.inventoryDetails?.[index] === 'object'
                          ? (formik.errors.inventoryDetails[index]?.minSBA as string)
                          : ''
                      }
                      placeholder={fields.minSBA.placeholder}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Typography sx={{ fontSize: '14px' }}>Sq. ft.</Typography>
                          </InputAdornment>
                        ),
                        inputMode: 'numeric',
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label={
                        <>
                          {fields.maxSBA.label}
                        </>
                      }
                      name={`inventoryDetails[${index}].maxSBA`}
                      value={formik.values.inventoryDetails?.[index]?.maxSBA}
                      onChange={(e) => {
                        const rawValue = e.target.value.replaceAll(/\D/g, '').slice(0, 10);
                        formik.setFieldValue(`inventoryDetails[${index}].maxSBA`, rawValue);
                      }}
                      onBlur={formik.handleBlur}
                      error={
                        !!(
                          formik.touched.inventoryDetails?.[index]?.maxSBA &&
                          typeof formik.errors.inventoryDetails?.[index] === 'object' &&
                          formik.errors.inventoryDetails[index]?.maxSBA
                        )
                      }
                      helperText={
                        formik.touched.inventoryDetails?.[index]?.maxSBA &&
                          typeof formik.errors.inventoryDetails?.[index] === 'object'
                          ? (formik.errors.inventoryDetails[index]?.maxSBA as string)
                          : ''
                      }
                      placeholder={fields.maxSBA.placeholder}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Typography sx={{ fontSize: '14px' }}>Sq. ft.</Typography>
                          </InputAdornment>
                        ),
                        inputMode: 'numeric',
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label={fields.minPrice.label}
                      name={`inventoryDetails[${index}].minPrice`}
                      value={
                        formik.values.inventoryDetails?.[index]?.minPrice
                          ? Number(
                            formik.values.inventoryDetails[index].minPrice
                          ).toLocaleString('en-IN')
                          : ''
                      }
                      onChange={(e) => {
                        const rawValue = e.target.value.replaceAll(/\D/g, '').slice(0, 10);
                        formik.setFieldValue(`inventoryDetails[${index}].minPrice`, rawValue);
                      }}
                      onBlur={formik.handleBlur}
                      error={
                        !!(
                          formik.touched.inventoryDetails?.[index]?.minPrice &&
                          typeof formik.errors.inventoryDetails?.[index] === 'object' &&
                          formik.errors.inventoryDetails[index]?.minPrice
                        )
                      }
                      helperText={
                        formik.touched.inventoryDetails?.[index]?.minPrice &&
                          typeof formik.errors.inventoryDetails?.[index] === 'object'
                          ? (formik.errors.inventoryDetails[index]?.minPrice as string)
                          : ''
                      }
                      placeholder={fields.minPrice.placeholder}
                      inputProps={{
                        inputMode: 'numeric',
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label={fields.maxPrice.label}
                      name={`inventoryDetails[${index}].maxPrice`}
                      value={
                        formik.values.inventoryDetails?.[index]?.maxPrice
                          ? Number(
                            formik.values.inventoryDetails[index].maxPrice
                          ).toLocaleString('en-IN')
                          : ''
                      }
                      onChange={(e) => {
                        const rawValue = e.target.value.replaceAll(/\D/g, '').slice(0, 10);
                        formik.setFieldValue(`inventoryDetails[${index}].maxPrice`, rawValue);
                      }}
                      onBlur={formik.handleBlur}
                      error={
                        !!(
                          formik.touched.inventoryDetails?.[index]?.maxPrice &&
                          typeof formik.errors.inventoryDetails?.[index] === 'object' &&
                          formik.errors.inventoryDetails[index]?.maxPrice
                        )
                      }
                      helperText={
                        formik.touched.inventoryDetails?.[index]?.maxPrice &&
                          typeof formik.errors.inventoryDetails?.[index] === 'object'
                          ? (formik.errors.inventoryDetails[index]?.maxPrice as string)
                          : ''
                      }
                      placeholder={fields.maxPrice.placeholder}
                      inputProps={{
                        inputMode: 'numeric',
                      }}
                    />
                  {/* new fields - BHK Wise: show voucher / std / pre amount per selection */}
                   </Grid>
                   {(isVoucherAmountTypeBHK || (showStandardEOIAmount && isStdEoiAmountTypeBHK) || (showPreferentialEOIAmount && isPreEoiAmountTypeBHK)) && (
                    <>
                      {showVoucherFields && isVoucherAmountTypeBHK && (
                        <Grid item xs={12} sm={6} md={4}>
                          <TextField
                            fullWidth
                            label={<>{fields.voucherAmt.label} <span style={{ color: '#FF0000' }}>*</span></>}
                            name={`inventoryDetails[${index}].voucherAmt`}
                            value={
                              formik.values.inventoryDetails?.[index]?.voucherAmt
                                ? Number(
                                  formik.values.inventoryDetails?.[index]?.voucherAmt
                                ).toLocaleString('en-IN')
                                : ''
                            }
                            onChange={(e) => {
                              const rawValue = e.target.value.replaceAll(/\D/g, '').slice(0, 10);
                              formik.setFieldValue(
                                `inventoryDetails[${index}].voucherAmt`,
                                rawValue ? Number(rawValue) : ''
                              );
                            }}
                            onBlur={formik.handleBlur}
                            error={
                              !!(
                                formik.touched.inventoryDetails?.[index]?.voucherAmt &&
                                typeof formik.errors.inventoryDetails?.[index] === 'object' &&
                                formik.errors.inventoryDetails[index]?.voucherAmt
                              )
                            }
                            helperText={
                              formik.touched.inventoryDetails?.[index]?.voucherAmt &&
                              typeof formik.errors.inventoryDetails?.[index] === 'object'
                                ? (formik.errors.inventoryDetails[index]?.voucherAmt as string)
                                : ''
                            }
                            placeholder={fields.voucherAmt.placeholder}
                            InputProps={{
                              inputMode: 'numeric',
                            }}
                          />
                        </Grid>
                      )}
                      {showStandardEOIAmount && isStdEoiAmountTypeBHK && (
                        <Grid item xs={12} sm={6} md={4}>
                          <TextField
                            fullWidth
                            label={<>{fields.standardEOIAmt.label} <span style={{ color: '#FF0000' }}>*</span></>}
                            name={`inventoryDetails[${index}].standardEOIAmt`}
                            value={
                              formik.values.inventoryDetails?.[index]?.standardEOIAmt
                                ? Number(
                                  formik.values.inventoryDetails?.[index]?.standardEOIAmt
                                ).toLocaleString('en-IN')
                                : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replaceAll(/\D/g, '').slice(0, 10);
                              formik.setFieldValue(`inventoryDetails[${index}].standardEOIAmt`, rawValue);
                            }}
                            onBlur={formik.handleBlur}
                            error={
                              !!(
                                formik.touched.inventoryDetails?.[index]?.standardEOIAmt &&
                                typeof formik.errors.inventoryDetails?.[index] === 'object' &&
                                formik.errors.inventoryDetails[index]?.standardEOIAmt
                              )
                            }
                            helperText={
                              formik.touched.inventoryDetails?.[index]?.standardEOIAmt &&
                              typeof formik.errors.inventoryDetails?.[index] === 'object'
                                ? (formik.errors.inventoryDetails[index]?.standardEOIAmt as string)
                                : ''
                            }
                            placeholder={fields.standardEOIAmt.placeholder}
                            InputProps={{
                              inputMode: 'numeric',
                            }}
                          />
                        </Grid>
                      )}
                      {showPreferentialEOIAmount && isPreEoiAmountTypeBHK && (
                        <Grid item xs={12} sm={6} md={4}>
                          <TextField
                            fullWidth
                            label={<>{fields.preferentialEOIAmt.label} <span style={{ color: '#FF0000' }}>*</span></>}
                            name={`inventoryDetails[${index}].preferentialEOIAmt`}
                            value={
                              formik.values.inventoryDetails?.[index]?.preferentialEOIAmt
                                ? Number(
                                  formik.values.inventoryDetails?.[index]?.preferentialEOIAmt
                                ).toLocaleString('en-IN')
                                : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replaceAll(/\D/g, '').slice(0, 10);
                              formik.setFieldValue(`inventoryDetails[${index}].preferentialEOIAmt`, rawValue);
                            }}
                            onBlur={formik.handleBlur}
                            error={
                              !!(
                                formik.touched.inventoryDetails?.[index]?.preferentialEOIAmt &&
                                typeof formik.errors.inventoryDetails?.[index] === 'object' &&
                                formik.errors.inventoryDetails[index]?.preferentialEOIAmt
                              )
                            }
                            helperText={
                              formik.touched.inventoryDetails?.[index]?.preferentialEOIAmt &&
                              typeof formik.errors.inventoryDetails?.[index] === 'object'
                                ? (formik.errors.inventoryDetails[index]?.preferentialEOIAmt as string)
                                : ''
                            }
                            placeholder={fields.preferentialEOIAmt.placeholder}
                            InputProps={{
                              inputMode: 'numeric',
                            }}
                          />
                        </Grid>
                      )}
                    </>
                  )}
                  </Grid>
              </Grid>
            ))}

            {/* Indicative Base Price */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={
                  <>
                    {fields.indicativeBasePrice.label}
                  </>
                }
                name="indicativeBasePrice"
                value={formik.values?.indicativeBasePrice}
                onChange={(e) =>
                  formik.setFieldValue(
                    'indicativeBasePrice',
                    e.target.value.replaceAll(/[^A-Za-z0-9 ]/g, '').slice(0, 10)
                  )
                }
                onBlur={formik.handleBlur}
                error={
                  formik.touched?.indicativeBasePrice &&
                  Boolean(formik.errors?.indicativeBasePrice)
                }
                helperText={
                  formik.touched?.indicativeBasePrice && formik.errors?.indicativeBasePrice
                }
                placeholder={fields.indicativeBasePrice.placeholder}
              />
            </Grid>

            {/* unit preference text  */}
            <Grid item xs={12}>
              <Typography
                sx={{
                  fontWeight: '600',
                  fontSize: '14px',
                  lineHeight: '12px',
                  letterSpacing: '0px',
                  color: '#1C252E',
                  mb: 1.5,
                }}
              >
                {fields.unitPrefStaticContent.label}{' '}
              </Typography>
              <RHFEditor
                name="unitPrefStaticContent"
                placeholder={fields.unitPrefStaticContent.placeholder}
                value={formik.values?.unitPrefStaticContent}
                onChange={(value: string) =>
                  formik.setFieldValue('unitPrefStaticContent', value)
                }
                onBlur={() => formik.setFieldTouched('unitPrefStaticContent', true)}
                helperText={
                  formik.touched?.unitPrefStaticContent && formik.errors?.unitPrefStaticContent
                    ? formik.errors?.unitPrefStaticContent
                    : ''
                }
                sx={{ maxHeight: 400 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ border: '1px dotted #DADADA' }} />
            </Grid>

            {/* Voucher Terms and Conditions */}
            {showVoucherFields && (
              <Grid item xs={12}>
                  <Typography
                    sx={{
                      fontWeight: '600',
                      fontSize: '14px',
                      lineHeight: '12px',
                      letterSpacing: '0px',
                      color: '#1C252E',
                      mb: 1.5,
                    }}
                  >
                    {fields.voucherTermsAndCondition.label}{' '}
                    <span style={{ color: '#FF0000' }}>*</span>
                  </Typography>
                  <RHFEditor
                    name="voucherTermsAndCondition"
                    placeholder={fields.voucherTermsAndCondition.placeholder}
                    value={formik.values?.voucherTermsAndCondition}
                    onChange={(value: string) =>
                      formik.setFieldValue('voucherTermsAndCondition', value)
                    }
                    onBlur={() => formik.setFieldTouched('voucherTermsAndCondition', true)}
                    helperText={
                      formik.touched?.voucherTermsAndCondition &&
                        formik.errors?.voucherTermsAndCondition
                        ? formik.errors?.voucherTermsAndCondition
                        : ''
                    }
                    sx={{ maxHeight: 400 }}
                  />
              </Grid>
            )}

            {/* EOI Terms and Conditions * */}
            {showEOIFields && (
              <Grid item xs={12}>
                <Typography
                  sx={{
                    fontWeight: '600',
                    fontSize: '14px',
                    lineHeight: '12px',
                    letterSpacing: '0px',
                    color: '#1C252E',
                    mb: 1.5,
                  }}
                >
                  {fields.eoiTermsAndCondition.label}{' '}
                  <span style={{ color: '#FF0000' }}>*</span>
                </Typography>
                <RHFEditor
                  name="eoiTermsAndCondition"
                  placeholder={fields.eoiTermsAndCondition.placeholder}
                  value={formik.values?.eoiTermsAndCondition}
                  onChange={(value: string) =>
                    formik.setFieldValue('eoiTermsAndCondition', value)
                  }
                  onBlur={() => formik.setFieldTouched('eoiTermsAndCondition', true)}
                  helperText={
                    formik.touched?.eoiTermsAndCondition && formik.errors?.eoiTermsAndCondition
                      ? formik.errors?.eoiTermsAndCondition
                      : ''
                  }
                  sx={{ maxHeight: 400 }}
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Divider sx={{ border: '1px dotted #DADADA' }} />
            </Grid>
            {/* Cancel and Create Buttons */}
            <Grid
              item
              xs={12}
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Button
                type="button"
                variant="outlined"
                size="large"
                color="inherit"
                onClick={handleRedirect}
                sx={{ width: '132px' }}
              >
                {uiText.eoiManager.buttons.cancel}
              </Button>
              <Button
                type="submit"
                size="large"
                className="primaryBtn"
                sx={{ color: '#fff', width: '132px' }}
                disabled={formik.isSubmitting}
              >
                {submitButtonText}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </DashboardContent>
  );
}

export default EOIManagerForm;
