import type {
  AgreementDetail,
  UpdateInviteesPayload,
  UpdateAgreementPayload,
} from 'src/types/crm/agreement';

import * as Yup from 'yup';
import { toast } from 'sonner';
import { useParams } from 'react-router';
import { useMemo, useState, useEffect } from 'react';
import {
  getIn,
  useFormik,
  FieldArray,
  FormikProvider,
  type FormikProps,
  type FormikTouched,
} from 'formik';

import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { ArrowBackIosNew, RemoveCircleOutline } from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  Radio,
  Button,
  Divider,
  Tooltip,
  Typography,
  IconButton,
  RadioGroup,
  InputAdornment,
  FormControlLabel,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';
import { ROLES, generateRoleBasedRoute } from 'src/utils/constant';
import { normalizePhoneFromApi, validatePhoneByCountry } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import plusCircle from 'src/assets/images/plus-circle.svg';
import { setTitleAsync } from 'src/redux/slices/admin/title-slice';
import { deleteImage } from 'src/redux/actions/rm-panel/upload-actions';
import { clearOpportunityDetails } from 'src/redux/slices/rm-panel/dashboard-slice';
import { getOpportunityDetails } from 'src/redux/actions/rm-panel/dashboard-actions';
import {
  updateInvitees,
  createAgreement,
  fetchAgreementByID,
  updateAgreementForm,
  clearAgreementDetail,
  getInternalIviteeOptions,
} from 'src/redux/slices/crm/agreement-slice';

import NewDropzone from 'src/components/dropzone/NewDropzone';
import { FilledButton } from 'src/components/buttons/FilledButton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';
import { agreementSanitizedChange } from 'src/components/formik-textfield/agreement-sanitized-change';

import InternalInviteesFieldArray from 'src/sections/crm/agreement-management-dashboard/components/internal-invitees-field-array';

const AS = uiText.agreementESignature;

/** Matches pre-booking additional-doc options (Dropzone) plus Agreement for this form. */
export const getAgreementDocumentTypeOptions = (userRole: string | null) => [
  ...(userRole === ROLES.CRM
    ? [
        AS.documentTypes.agreement,
        AS.documentTypes.indemnity,
        AS.documentTypes.possessionDocument,
      ]
    : []),
  AS.documentTypes.allotmentLetter,
  AS.documentTypes.consentLetter,
  AS.documentTypes.costSheet,
  AS.documentTypes.othersCustom,
];

const MAX_APPROVAL_DOCUMENTS = 10;

/** Matches applicant1–4 payload slots. */
const MAX_MANUAL_SIGNATORY_ROWS = 4;

const EMPTY_SIGNATORY_ROW: SignatoryRow = {
  name: '',
  email: '',
  phone: '',
  countryCode: '+91',
};

const AGREEMENT_YES_NO_RADIO_SX = {
  color: '#919EAB',
  '&:hover': { backgroundColor: 'rgba(26, 64, 125, 0.06)' },
  '&.Mui-checked': { color: '#1A407D' },
} as const;

/** Section title — align with “Upload Documents” weight/color. */
const AGREEMENT_OPTION_SECTION_TITLE_SX = {
  fontWeight: 600,
  color: '#1C252E',
  fontSize: '14px',
  lineHeight: '20px',
  mb: 1,
} as const;

const AGREEMENT_YES_NO_LABEL_SX = {
  '& .MuiFormControlLabel-label': {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1C252E',
  },
} as const;

/** Maps signatoryRows → applicantName1–4, numberOfApplicants (max 4). Clears unused slots. */
function syncSignatoryRowsToApplicantSlots(values: FormValues): Partial<FormValues> {
  const rows = values.signatoryRows ?? [];
  const n = Math.min(Math.max(rows.length, 1), MAX_MANUAL_SIGNATORY_ROWS);
  const base: Partial<FormValues> = { numberOfApplicants: n };

  const fromSlots = APPLICANT_SLOT_INDICES.map((slot) => {
    const i = slot - 1;
    const r = rows[i];
    const filled = Boolean(i < n && r);
    return {
      [`applicantName${slot}`]: filled ? (r!.name ?? '') : '',
      [`emailID${slot}`]: filled ? (r!.email ?? '') : '',
      [`phoneNumber${slot}`]: filled ? (r!.phone ?? '') : '',
      [`countryCode${slot}`]: filled ? (r!.countryCode || '+91') : '+91',
    } as Partial<FormValues>;
  }).reduce((acc, cur) => ({ ...acc, ...cur }), {} as Partial<FormValues>);

  return { ...base, ...fromSlots };
}

/** Build touched flags from Yup error tree so nested fields (e.g. signatoryRows[0].name) show errors. */
function touchedShapeFromErrors(err: unknown): unknown {
  if (err == null) return {};
  if (typeof err === 'string') return true;
  if (Array.isArray(err)) {
    return err.map((item) => touchedShapeFromErrors(item));
  }
  if (typeof err === 'object') {
    return Object.fromEntries(
      Object.entries(err).map(([k, v]) => [k, touchedShapeFromErrors(v)])
    );
  }
  return true;
}

function mergeTouched<T>(current: T, patch: unknown): T {
  if (patch === true) return patch as T;
  if (patch == null) return current;
  if (Array.isArray(patch)) {
    const c = Array.isArray(current) ? current : [];
    return patch.map((p, i) => mergeTouched((c as unknown[])[i], p)) as T;
  }
  if (typeof patch === 'object') {
    const c =
      typeof current === 'object' && current !== null ? (current as Record<string, unknown>) : {};
    const keys = Object.keys(patch as object);
    return keys.reduce((out, k) => {
      out[k] = mergeTouched(c[k], (patch as Record<string, unknown>)[k]);
      return out;
    }, { ...c } as Record<string, unknown>) as T;
  }
  return current;
}

/** Collect agreement row ids from create/update API (single object or array of rows). */
function agreementIdsFromCreateUpdateResponse(res: unknown): number[] {
  if (Array.isArray(res)) {
    return res
      .map((row: { id?: unknown }) => row?.id)
      .filter((id): id is number => typeof id === 'number');
  }
  if (
    res &&
    typeof res === 'object' &&
    'id' in res &&
    typeof (res as { id: unknown }).id === 'number'
  ) {
    return [(res as { id: number }).id];
  }
  return [];
}

export interface Invitee {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  id: number;
}

/** Editable signatory row (edit flow without opportunity data). Synced to applicant1–4 for API. */
export interface SignatoryRow {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}

export interface FormValues {
  opportunityId: string;
  salesOrderId: string;
  projectName: string;
  enquiryReferenceNo: string;
  unitNo: string;
  id: number;
  /** DB row ids for all agreement documents returned by create/update (used for update-invitees POST). */
  agreementIds: number[];
  numberOfApplicants: number;

  applicantName1: string;
  emailID1: string;
  phoneNumber1: string;
  countryCode1: string;

  applicantName2: string;
  emailID2: string;
  phoneNumber2: string;
  countryCode2: string;

  applicantName3: string;
  emailID3: string;
  phoneNumber3: string;
  countryCode3: string;

  applicantName4: string;
  emailID4: string;
  phoneNumber4: string;
  countryCode4: string;

  approvalProof: { url: string; name: string; type: string }[];

  /**
   * When true, Next goes to internal signatories step; when false, skip to dashboard after save.
   * Step 1 UI label: "Inventory required".
   */
  internalSignatoryRequired: boolean;

  /** Shown first in step 0 as "Merge PDF" Yes/No; sent on create/update payload. */
  mergeDocs: boolean;

  mergeDocumentName: string;

  internalInvitees: Invitee[];

  /**
   * Edit flow without opportunity data: dynamic signatory rows (synced to applicant slots before save).
   */
  signatoryRows: SignatoryRow[];
}

// Indian: strip +91/+0. NRI: remove + and spaces. No format validation for NRI.
const normalizePhone = (phone?: string) => normalizePhoneFromApi(phone);

/** Reset: keep rows with an uploaded file; remove added-but-empty rows. If nothing uploaded, one row remains. */
function pruneApprovalProofOnReset(
  rows: FormValues['approvalProof'] | undefined,
  defaultDocType: string
): NonNullable<FormValues['approvalProof']> {
  const list = rows ?? [];
  const uploaded = list
    .filter((r) => (r.url ?? '').trim() !== '')
    .map((r) => ({ ...r }));

  if (uploaded.length > 0) {
    return uploaded;
  }

  const notUploaded = list.filter((r) => (r.url ?? '').trim() === '');
  const first = notUploaded[0];
  if (first && ((first.type ?? '').trim() || (first.name ?? '').trim())) {
    const dt = (first.type ?? '').trim();
    const nm = (first.name ?? '').trim();
    const others = AS.documentTypes.othersCustom;
    const agreement = defaultDocType;
    return [
      {
        type: dt || agreement,
        name: nm || (dt && dt !== others ? dt : agreement),
        url: '',
      },
    ];
  }

  return [{ type: defaultDocType, name: defaultDocType, url: '' }];
}

const APPLICANT_SLOT_INDICES = [1, 2, 3, 4] as const;
type ApplicantSlotIndex = (typeof APPLICANT_SLOT_INDICES)[number];

function AgreementOpportunityApplicantFields({
  slotIndex,
  formik,
  loading,
  fetchDisabled,
  disabledFields,
}: {
  slotIndex: ApplicantSlotIndex;
  formik: FormikProps<FormValues>;
  loading: boolean;
  fetchDisabled: boolean;
  disabledFields: Record<string, boolean>;
}) {
  const busyLabel = loading ? AS.fields.fetchingDetails : undefined;
  const applicantNameId = `applicantName${slotIndex}`;
  const emailId = `emailID${slotIndex}`;
  const phoneId = `phoneNumber${slotIndex}`;
  const applicantHeading = AS.fields.applicantLabel.replace('{{n}}', String(slotIndex));

  return (
    <>
      <Grid item xs={12}>
        <Typography sx={{ fontSize: '14px', fontWeight: '600', mb: 1 }}>{applicantHeading}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormikTextField
          formik={formik}
          name={applicantNameId}
          label={busyLabel ?? AS.fields.applicantName}
          placeholder={AS.fields.enterApplicantName}
          onChange={agreementSanitizedChange(formik, applicantNameId, 'alphanumeric')}
          loading={loading}
          disabled
          noGrid
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <FormikTextField
          formik={formik}
          name={emailId}
          label={busyLabel ?? AS.fields.emailId}
          placeholder={AS.fields.enterEmailId}
          textFieldType="email"
          loading={loading}
          disabled={Boolean(disabledFields[emailId]) || !fetchDisabled}
          noGrid
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <FormikTextField
          formik={formik}
          name={phoneId}
          label={busyLabel ?? AS.fields.phoneIndianMobile}
          placeholder={AS.fields.optionalNonIndia}
          onChange={agreementSanitizedChange(formik, phoneId, 'numeric')}
          loading={loading}
          disabled={Boolean(disabledFields[phoneId]) || !fetchDisabled}
          required={false}
          noGrid
        />
      </Grid>
    </>
  );
}

function ManualSignatoryRowsFieldArray({
  formik,
  loading,
}: {
  formik: FormikProps<FormValues>;
  loading: boolean;
}) {
  const busyLabel = loading ? AS.fields.fetchingDetails : undefined;
  const rows = formik.values.signatoryRows ?? [];

  return (
    <FieldArray
      name="signatoryRows"
      render={(arrayHelpers) => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            width: '100%',
            gap: 2,
          }}
        >
          {rows.map((_, index) => {
            const signatoryHeading = AS.fields.applicantLabel.replace(
              '{{n}}',
              String(index + 1)
            );
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  gap: 2,
                }}
              >
                <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                  {signatoryHeading}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'flex-start' },
                    gap: '16px',
                    width: '100%',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: { xs: '1 1 auto', md: '0 0 48px' },
                      width: { md: 48 },
                      minHeight: { xs: 'auto', md: 48 },
                    }}
                  >
                    {index > 0 ? (
                      <IconButton
                        color="error"
                        aria-label={AS.removeSignatoryRowAria}
                        onClick={() => arrayHelpers.remove(index)}
                        sx={{ p: 0.5 }}
                      >
                        <RemoveCircleOutline />
                      </IconButton>
                    ) : (
                      <Box aria-hidden sx={{ width: 40, height: 40 }} />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: { md: 200 } }}>
                    <FormikTextField
                      formik={formik}
                      name={`signatoryRows[${index}].name`}
                      label={busyLabel ?? AS.fields.applicantName}
                      placeholder={AS.fields.enterApplicantName}
                      onChange={agreementSanitizedChange(
                        formik,
                        `signatoryRows[${index}].name`,
                        'alphanumeric'
                      )}
                      loading={loading}
                      noGrid
                      required
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: { md: 200 } }}>
                    <FormikTextField
                      formik={formik}
                      name={`signatoryRows[${index}].email`}
                      label={busyLabel ?? AS.fields.emailId}
                      placeholder={AS.fields.enterEmailId}
                      textFieldType="email"
                      loading={loading}
                      noGrid
                      required
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: { md: 200 } }}>
                    <FormikTextField
                      formik={formik}
                      name={`signatoryRows[${index}].phone`}
                      label={busyLabel ?? AS.fields.phoneIndianMobile}
                      placeholder={AS.fields.optionalNonIndia}
                      onChange={agreementSanitizedChange(
                        formik,
                        `signatoryRows[${index}].phone`,
                        'numeric'
                      )}
                      loading={loading}
                      required={false}
                      noGrid
                    />
                  </Box>
                </Box>
              </Box>
            );
          })}
          <Button
            type="button"
            onClick={() => {
              if (rows.length >= MAX_MANUAL_SIGNATORY_ROWS) {
                toast.error(AS.toast.maxSignatories);
                return;
              }
              arrayHelpers.push({ ...EMPTY_SIGNATORY_ROW });
            }}
            disabled={rows.length >= MAX_MANUAL_SIGNATORY_ROWS}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '10px auto 0',
              color: '#1A407D',
              fontWeight: '600',
              fontSize: '14px',
              gap: 1,
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
          >
            <img src={plusCircle} alt="" /> {AS.addSignatory}
          </Button>
        </Box>
      )}
    />
  );
}

export default function AgreementESignatureEdit() {
  const dispatch = useAppDispatch();
  const { agreementId } = useParams();
  const { opportunity } = useAppSelector((state) => state.dashboard);
  const route = useRouter();
  const [fetchDisabled, setFetchDisabled] = useState(false);
  const [steps, setSteps] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nextLoading, setNextLoading] = useState(true);
  const { agreementDetail } = useAppSelector((state) => state.agreements);
  const [disabledFields, setDisabledFields] = useState<Record<string, boolean>>({});
  const { userRole } = useRoleBasedPermissions({ module: 'agreementManagement' });
  const isCRM = userRole === ROLES.CRM;
  const defaultDocType = userRole === ROLES.CRM ? AS.documentTypes.agreement : AS.documentTypes.costSheet;

  const AGREEMENT_DOCUMENT_TYPE_OPTIONS = getAgreementDocumentTypeOptions(userRole);

  const AGREEMENT_DOCUMENT_TYPE_AUTOCOMPLETE_OPTIONS = AGREEMENT_DOCUMENT_TYPE_OPTIONS.map((opt) => ({
    label: opt,
    value: opt,
  }));

  /** Until CRM opportunity is loaded in redux (`Fetch` success), show manual signatory rows and hide project/unit. After `opportunity.data` exists, show project/unit + fixed signatory slots. */
  const hasOpportunityData = Boolean(opportunity?.data);
  const useManualSignatoryLayout = !hasOpportunityData;
  /** Create (`new`): Merge PDF stays interactive without fetch. Edit without CRM data: force no merge (product rule). */
  const isEditAgreement = Boolean(agreementId && agreementId !== 'new');

  const validationSchema = useMemo(
    () =>
      Yup.object({
      opportunityId: Yup.string().notRequired(),
      salesOrderId: Yup.string().notRequired(),
      projectName: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().required(AS.validation.projectName),
      unitNo: Yup.string().notRequired(),
      applicantName1: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().required(AS.validation.inviteeName),
      emailID1: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string()
            .trim()
            .required(AS.validation.inviteeEmail)
            .email(AS.validation.invalidEmail)
            .matches(/^[^\s@]{1,256}@[^\s@]{1,256}\.[^\s@]{2,256}$/, AS.validation.invalidEmail),
      phoneNumber1: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().test(
            'phone-indian-10',
            AS.validation.phoneIndian10,
            (value, options) =>
              validatePhoneByCountry(value ?? '', (options.parent as FormValues)?.countryCode1)
          ),

      applicantName2: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().when('numberOfApplicants', ([val], schema) =>
            Number(val) > 1
              ? schema.required(AS.validation.inviteeName)
              : schema.notRequired()
          ),
      emailID2: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().when('numberOfApplicants', ([val], schema) =>
            Number(val) > 1
              ? schema
                  .trim()
                  .required(AS.validation.inviteeEmail)
                  .email(AS.validation.invalidEmail)
                  .matches(/^[^\s@]{1,256}@[^\s@]{1,256}\.[^\s@]{2,256}$/, AS.validation.invalidEmail)
              : schema.notRequired()
          ),
      phoneNumber2: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().test(
            'phone-indian-10',
            AS.validation.phoneIndian10,
            (value, options) =>
              validatePhoneByCountry(value ?? '', (options.parent as FormValues)?.countryCode2)
          ),

      applicantName3: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().when('numberOfApplicants', ([val], schema) =>
            Number(val) > 2
              ? schema.required(AS.validation.inviteeName)
              : schema.notRequired()
          ),
      emailID3: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().when('numberOfApplicants', ([val], schema) =>
            Number(val) > 2
              ? schema
                  .trim()
                  .required(AS.validation.inviteeEmail)
                  .email(AS.validation.invalidEmail)
                  .matches(/^[^\s@]{1,256}@[^\s@]{1,256}\.[^\s@]{2,256}$/, AS.validation.invalidEmail)
              : schema.notRequired()
          ),
      phoneNumber3: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().test(
            'phone-indian-10',
            AS.validation.phoneIndian10,
            (value, options) =>
              validatePhoneByCountry(value ?? '', (options.parent as FormValues)?.countryCode3)
          ),

      applicantName4: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().when('numberOfApplicants', ([val], schema) =>
            Number(val) > 3
              ? schema.required(AS.validation.inviteeName)
              : schema.notRequired()
          ),
      emailID4: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().when('numberOfApplicants', ([val], schema) =>
            Number(val) > 3
              ? schema
                  .trim()
                  .required(AS.validation.inviteeEmail)
                  .email(AS.validation.invalidEmail)
                  .matches(/^[^\s@]{1,256}@[^\s@]{1,256}\.[^\s@]{2,256}$/, AS.validation.invalidEmail)
              : schema.notRequired()
          ),
      phoneNumber4: useManualSignatoryLayout
        ? Yup.string().notRequired()
        : Yup.string().test(
            'phone-indian-10',
            AS.validation.phoneIndian10,
            (value, options) =>
              validatePhoneByCountry(value ?? '', (options.parent as FormValues)?.countryCode4)
          ),

      signatoryRows: useManualSignatoryLayout
        ? Yup.array()
            .of(
              Yup.object().shape({
                name: Yup.string().trim().required(AS.validation.inviteeName),
                email: Yup.string()
                  .trim()
                  .required(AS.validation.inviteeEmail)
                  .email(AS.validation.invalidEmail)
                  .matches(
                    /^[^\s@]{1,256}@[^\s@]{1,256}\.[^\s@]{2,256}$/,
                    AS.validation.invalidEmail
                  ),
                phone: Yup.string().test(
                  'phone-indian-10',
                  AS.validation.phoneIndian10,
                  (value, options) =>
                    validatePhoneByCountry(
                      value ?? '',
                      (options.parent as SignatoryRow)?.countryCode ?? '+91'
                    )
                ),
                countryCode: Yup.string().notRequired(),
              })
            )
            .min(1, AS.validation.atLeastOneSignatory)
            .max(MAX_MANUAL_SIGNATORY_ROWS)
        : Yup.array().notRequired(),

      internalInvitees: Yup.array()
        .of(
          Yup.object().shape({
            name: Yup.string().required(AS.validation.inviteeName),
            email: Yup.string()
              .trim()
              .required(AS.validation.inviteeEmail)
              .email(AS.validation.invalidEmail)
              .matches(
                /^[^\s@]{1,256}@[^\s@]{1,256}\.[^\s@]{2,256}$/,
                AS.validation.invalidEmail
              ),
            phone: Yup.string()
              .required(AS.validation.inviteePhone)
              .test(
                'phone-indian-10',
                AS.validation.phoneIndian10,
                (value, options) =>
                  validatePhoneByCountry(
                    value ?? '',
                    (options.parent as { countryCode?: string })?.countryCode
                  )
              ),
            countryCode: Yup.string().required(AS.validation.countryCode),
          })
        )
        .min(1, AS.validation.atLeastOneSignatory),
      approvalProof: Yup.array()
        .of(
          Yup.object().shape({
            type: Yup.string().trim().required(AS.validation.documentType),
            name: Yup.string().trim().required(AS.validation.documentName),
            url: Yup.string().trim().required(AS.validation.fileRequired),
          })
        )
        .min(1, AS.validation.atLeastOneDocument)
        .max(MAX_APPROVAL_DOCUMENTS, AS.validation.maxTenDocuments)
        .required(AS.validation.approvalProofRequired),
      mergeDocumentName: Yup.string().when('mergeDocs', {
          is: true,
          then: (schema) => schema.trim().required(AS.validation.mergeDocumentName),
          otherwise: (schema) => schema.notRequired(),
        }),
      }),
    [useManualSignatoryLayout]
  );

  useEffect(() => {
    dispatch(setTitleAsync(AS.pageTitle));
  }, [dispatch]);

  const formik = useFormik<FormValues>({
    initialValues: {
      id: 0,
      agreementIds: [],
      enquiryReferenceNo: '',
      opportunityId: '',
      numberOfApplicants: 0,
      salesOrderId: '',
      projectName: '',
      unitNo: '',
      applicantName1: '',
      emailID1: '',
      phoneNumber1: '',
      countryCode1: '+91',
      applicantName2: '',
      emailID2: '',
      phoneNumber2: '',
      countryCode2: '+91',
      applicantName3: '',
      emailID3: '',
      phoneNumber3: '',
      countryCode3: '+91',
      applicantName4: '',
      emailID4: '',
      phoneNumber4: '',
      countryCode4: '+91',
      internalSignatoryRequired: isCRM,
      mergeDocs: false,
      mergeDocumentName: '',
      // 👇 new array for invitees
      internalInvitees: [
        {
          name: '',
          email: '',
          phone: '',
          countryCode: '+91',
          id: 0,
        },
      ],
      approvalProof: [
        {
          type: defaultDocType,
          name: defaultDocType,
          url: '',
        },
      ],
      signatoryRows: [{ ...EMPTY_SIGNATORY_ROW }],
    },

    validationSchema,

    onSubmit: (values) => {},
  });
  const isMultipleDoc = formik.values.approvalProof.length > 1 
  const hasMergeDoc = formik.values.mergeDocs
  useEffect(() => {
    if (formik.values.approvalProof) {
      if (!isMultipleDoc && hasMergeDoc) {
        // Single doc: always set mergeDocs to false
        formik.setFieldValue('mergeDocs', false);
      } else if (isMultipleDoc && !hasMergeDoc && isEditAgreement) {
        // Multiple docs in edit mode: auto-enable merge
        formik.setFieldValue('mergeDocs', true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.approvalProof.length, isEditAgreement, hasMergeDoc]);

  const handledelete = async (fieldName: any, index: any, deleteKey?: any) => {
    try {
      await dispatch(deleteImage({ key: deleteKey }));
      toast?.success(AS.toast.fileDeleted);
    } catch (error) {
      toast.error(AS.toast.deleteFileError);
      console.error('Error deleting file:', error);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      if (agreementId && agreementId !== 'new') {
        try {
          await dispatch(fetchAgreementByID(Number(agreementId))).unwrap();
        } catch (error) {
          toast.error(String(error ?? AS.toast.fetchAgreementFailed));
        }
      }
    };

    fetchData();
    dispatch(getInternalIviteeOptions());

    // Cleanup on unmount
    return () => {
      dispatch(clearAgreementDetail());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function calculateApplicantsCount(
    data: Partial<FormValues & AgreementDetail>
  ): number {
    // Prefer Formik values first
    if (data.applicantName4?.trim()) return 4;
    if (data.applicantName3?.trim()) return 3;
    if (data.applicantName2?.trim()) return 2;

    // Fallback to API shape
    if (data.applicant4?.name) return 4;
    if (data.applicant3?.name) return 3;
    if (data.applicant2?.name) return 2;

    return 1;
  }

  function buildSignatoryRowsFromAgreement(agreementDetails: AgreementDetail): SignatoryRow[] {
    const n = calculateApplicantsCount(agreementDetails as AgreementDetail & Partial<FormValues>);
    const apps = [
      agreementDetails.applicant1,
      agreementDetails.applicant2,
      agreementDetails.applicant3,
      agreementDetails.applicant4,
    ];
    const rows = apps.slice(0, n).map((a) => ({
      name: a?.name || '',
      email: a?.email || '',
      phone: normalizePhone(a?.contactNumber) || '',
      countryCode: a?.countryCode || '+91',
    }));
    return rows.length > 0 ? rows : [{ ...EMPTY_SIGNATORY_ROW }];
  }

  const adaptOpportunityToApplicantShape = (data: any) => ({
    applicantName2: data?.C2name,
    applicantName3: data?.Applicant_Name_3rd ,
    applicantName4: data?.Applicant_Name_4th ,
  });

  const mapAgreementToFormikValues = (
    agreementDetails: AgreementDetail
  ): FormValues => {
    const calculatedApplicants = calculateApplicantsCount(agreementDetails as any);

    return {
    id: agreementDetails?.id ?? 0,
    agreementIds: agreementDetails?.id != null ? [agreementDetails.id] : [],
    enquiryReferenceNo: agreementDetails?.enquiryReferenceNumber,
    numberOfApplicants: calculatedApplicants,
    opportunityId: agreementDetails?.opportunityId,
    salesOrderId: agreementDetails?.salesOrderId || '',
    projectName: agreementDetails?.projectName || '',
    unitNo: agreementDetails?.unitNo || '',
    applicantName1: agreementDetails?.applicant1?.name || '',
    emailID1: agreementDetails?.applicant1?.email || '',
    phoneNumber1: normalizePhone(agreementDetails?.applicant1?.contactNumber) || '',
    countryCode1: agreementDetails?.applicant1?.countryCode || '+91',
    applicantName2: agreementDetails?.applicant2?.name || '',
    emailID2: agreementDetails?.applicant2?.email || '',
    phoneNumber2:  normalizePhone(agreementDetails?.applicant2?.contactNumber) || '',
    countryCode2: agreementDetails?.applicant2?.countryCode || '+91',
    applicantName3: agreementDetails?.applicant3?.name || '',
    emailID3: agreementDetails?.applicant3?.email || '',
    phoneNumber3: normalizePhone(agreementDetails?.applicant3?.contactNumber) || '',
    countryCode3: agreementDetails?.applicant3?.countryCode || '+91',
    applicantName4: agreementDetails?.applicant4?.name || '',
    emailID4: agreementDetails?.applicant4?.email || '',
    phoneNumber4: normalizePhone(agreementDetails?.applicant4?.contactNumber) || '',
    countryCode4: agreementDetails?.applicant4?.countryCode || '+91',
    approvalProof: (agreementDetails?.documents?.length
      ? agreementDetails.documents
      : [{ name: '', url: '' }]
    ).map((doc: { name: string; url: string; type?: string }) => ({
      type: (doc.type && String(doc.type).trim()) || '',
      name: doc.name || '',
      url: doc.url || '',
    })),
    internalSignatoryRequired:
      (agreementDetails as AgreementDetail & { internalSignatoryRequired?: boolean })?.internalSignatoryRequired !==
      false,
    mergeDocs:
      (agreementDetails as AgreementDetail & { mergeDocs?: boolean })?.mergeDocs !== false,
    mergeDocumentName: ((agreementDetails as AgreementDetail & { documentName?: string })?.documentName || '').replace(/^MD-/i, ''),
    internalInvitees: agreementDetails?.invitees?.internal?.map((invitee: any) => ({
      name: invitee.name || '',
      email: invitee.email || '',
      phone: invitee.contactNumber || invitee.phone || '',
      countryCode: invitee.countryCode || '+91',
      id: invitee.id ?? '',
    })) || [{ name: '', email: '', phone: '', countryCode: '+91', id: '' }],
    signatoryRows: buildSignatoryRowsFromAgreement(agreementDetails),

  };
};
  useEffect(() => {
    if (agreementDetail) {
      const formikValues = mapAgreementToFormikValues(agreementDetail);
      const data = opportunity?.data as any;
      if (data) {
        formikValues.phoneNumber1 = normalizePhone(data?.Cmob) ?? formikValues.phoneNumber1;
        formikValues.countryCode1 = (data?.Cmob ?? '')?.toString().startsWith('+91') ? '+91' : (formikValues.countryCode1 ?? '+91');
        formikValues.phoneNumber2 = normalizePhone(data?.C2mob) ?? formikValues.phoneNumber2;
        formikValues.countryCode2 = (data?.C2mob ?? '')?.toString().startsWith('+91') ? '+91' : (formikValues.countryCode2 ?? '+91');
        formikValues.phoneNumber3 = normalizePhone(data?.X3rd_Applicant_Mobile) ?? formikValues.phoneNumber3;
        formikValues.countryCode3 = (data?.X3rd_Applicant_Mobile ?? '')?.toString().startsWith('+91') ? '+91' : (formikValues.countryCode3 ?? '+91');
        formikValues.phoneNumber4 = normalizePhone(data?.X4th_Applicant_Mobile) ?? formikValues.phoneNumber4;
        formikValues.countryCode4 = (data?.X4th_Applicant_Mobile ?? '')?.toString().startsWith('+91') ? '+91' : (formikValues.countryCode4 ?? '+91');
      }
      if (!data && agreementId && agreementId !== 'new') {
        formikValues.mergeDocs = false;
      }
      setFetchDisabled(true);
      formik.setValues(formikValues);
      setDisabledFields((prev) => ({
        ...prev,
        emailID1: !!formikValues.emailID1,
        phoneNumber1: false,
        emailID2: !!formikValues.emailID2,
        phoneNumber2: false,
        emailID3: !!formikValues.emailID3,
        phoneNumber3: false,
        emailID4: !!formikValues.emailID4,
        phoneNumber4: false,
      }));
    }

    // Usage example:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementDetail, opportunity?.data]);

  function createPayload(values: FormValues): UpdateAgreementPayload {
    const resolved: FormValues = useManualSignatoryLayout
      ? { ...values, ...syncSignatoryRowsToApplicantSlots(values) }
      : values;
    const calculatedApplicants = calculateApplicantsCount(resolved);
    return {
      enquiryReferenceNumber: resolved.enquiryReferenceNo,
      opportunityId: resolved?.opportunityId ?? '',
      projectName: resolved.projectName,
      unitNo: resolved.unitNo,
      numberOfApplicants: calculatedApplicants,
      applicant1: {
        name: resolved.applicantName1,
        email: resolved.emailID1,
        contactNumber: resolved.phoneNumber1 ?? '',
      },
      ...(calculatedApplicants > 1 && {
        applicant2: {
          name: resolved.applicantName2,
          email: resolved.emailID2,
          contactNumber: resolved.phoneNumber2 ?? '',
        },
      }),
      ...(calculatedApplicants > 2 && {
        applicant3: {
          name: resolved.applicantName3,
          email: resolved.emailID3,
          contactNumber: resolved.phoneNumber3 ?? '',
        },
      }),
      ...(calculatedApplicants > 3 && {
        applicant4: {
          name: resolved.applicantName4,
          email: resolved.emailID4,
          contactNumber: resolved.phoneNumber4 ?? '',
        },
      }),

      documents: resolved?.approvalProof
        ? resolved.approvalProof?.map((doc) => ({
            name: doc.name,
            url: doc.url,
            type: doc.type ?? '',
          }))
        : [],
      mergeDocs: resolved.mergeDocs,
      internalSignatoryRequired: resolved.internalSignatoryRequired,
      ...(values.mergeDocumentName && values.mergeDocs && {
        documentName: `MD-${values.mergeDocumentName}`
      })
    };
  }

  const handleNext = async () => {
    const valuesForStep = useManualSignatoryLayout
      ? { ...formik.values, ...syncSignatoryRowsToApplicantSlots(formik.values) }
      : formik.values;
    const errors = await formik.validateForm(valuesForStep);

    // 🔎 Remove internalInvitees & customerInvitees errors from check
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { internalInvitees, ...otherErrors } = errors;

    if (Object.keys(otherErrors).length > 0) {
      const touchedPatch = touchedShapeFromErrors(otherErrors);
      formik.setTouched(
        mergeTouched(formik.touched, touchedPatch) as FormikTouched<FormValues>
      );
      console.warn('⚠️ Validation errors:', otherErrors);
      return; // ⛔ prevent API call
    }
    const payload = createPayload(formik.values);

    /** Treat null/undefined/'' as “no row yet” so create runs; avoid truthy checks (0 is valid “unsaved”). */
    const rawId = formik.values.id as number | string | undefined | null;
    const numericAgreementId =
      rawId == null || rawId === '' ? 0 : Number(rawId);
    const hasSavedAgreement =
      Number.isFinite(numericAgreementId) && numericAgreementId > 0;

    if (steps === 0 && agreementId === 'new' && !hasSavedAgreement) {
      dispatch(
        createAgreement({
          payload,
        })
      )
        .unwrap()
        .then((res) => {
          const ids = agreementIdsFromCreateUpdateResponse(res);
          if (ids.length > 0) {
            formik.setFieldValue('agreementIds', ids);
            formik.setFieldValue('id', ids[0]);
          }
          toast.success(AS.toast.createdSuccess);

          formik.setErrors({});
          formik.setTouched({});
          if (formik.values.internalSignatoryRequired) {
            setSteps(1);
          } else {
            route.push(generateRoleBasedRoute(userRole, `/dashboard`));
          }
        })
        .catch((err) => {
          console.error('❌ Create failed:', err);
          toast.error(AS.toast.createFailed.replace('{{error}}', String(err)));
        });
    } else if (steps === 0 && hasSavedAgreement) {
      dispatch(
        updateAgreementForm({
          id: numericAgreementId,
          payload,
        })
      )
        .unwrap()
        .then((res) => {
          toast.success(AS.toast.updatedSuccess);
          const ids = agreementIdsFromCreateUpdateResponse(res);
          if (ids.length > 0) {
            formik.setFieldValue('agreementIds', ids);
            formik.setFieldValue('id', ids[0]);
          }
          formik.setErrors({});
          formik.setTouched({});
          if (formik.values.internalSignatoryRequired) {
            setSteps(1);
          } else {
            route.push(generateRoleBasedRoute(userRole, `/dashboard`));
          }
        })
        .catch((err) => {
          toast.error(AS.toast.updateFailed.replace('{{error}}', String(err)));

          console.error('❌ Update failed:', err);
        });
    }
  };

  const createUpdateInviteesPayload = (values: typeof formik.values): UpdateInviteesPayload => {
    const fromArray = Array.isArray(values.agreementIds) ? values.agreementIds : [];
    const rawId = values.id as number | string | undefined | null;
    const numericId = rawId == null || rawId === '' ? 0 : Number(rawId);
    const fromSingleId =
      Number.isFinite(numericId) && numericId > 0 ? [numericId] : [];
    const agreementIds =
      fromArray.length > 0 ? fromArray.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0) : fromSingleId;

    return {
      agreementIds,
      internal: values.internalInvitees.map((invitee) => ({
        name: invitee.name,
        email: invitee.email,
        contactNumber: invitee.phone,
        countryCode: invitee.countryCode,
        id: invitee?.id,
      })),
    };
  };
  const handleSecondUpdate = async () => {
    const errors = await formik.validateForm();

    // ✅ check for invitee-related errors
    if (errors.internalInvitees) {
      formik.setErrors(errors); // show errors on UI
      return; // stop execution, don't call API
    }
    setNextLoading(true);

    const payload = createUpdateInviteesPayload(formik.values);
    if (!payload.agreementIds.length) {
      setNextLoading(false);
      toast.error(AS.toast.updateFailed.replace('{{error}}', 'Missing agreement id(s)'));
      return;
    }
    dispatch(
      updateInvitees({
        payload,
      })
    )
      .unwrap()
      .then((res) => {
        setNextLoading(false);
        toast.success(AS.toast.updatedSuccess);
        route.push(generateRoleBasedRoute(userRole, `/dashboard`));
      })
      .catch((err) => {
        setNextLoading(false);
        toast.error(AS.toast.updateFailed.replace('{{error}}', String(err)));
        console.error('❌ Update failed:', err);
      });
  };

  useEffect(() => {
    setNextLoading(false);
  }, [steps]);

  const handleFetch = async () => {
    setLoading(true);
    setFetchDisabled(true);

    try {
      const res: any = await dispatch(getOpportunityDetails(`/${formik?.values?.opportunityId}`));

      if (res?.payload?.error) {
        console.error('❌ Failed to fetch opportunity details:', res.payload.error);
        toast.error(AS.toast.opportunityFetchFailed.replace('{{error}}', String(res.payload.error)));
        setLoading(false);
        setFetchDisabled(false);
        return;
      }

      toast.success(AS.toast.opportunityFetched);
      // 👉 set formik values here if needed

      setLoading(false);
      setFetchDisabled(true);
    } catch (err) {
      // This catch will only run if dispatch itself fails (rare case)
      console.error('❌ Unexpected error in handleFetch:', err);
      toast.error(AS.toast.unexpectedFetchError);
      setLoading(false);
      setFetchDisabled(false);
    }
  };

  useEffect(() => {
    if (opportunity?.data) {
      const data: any = opportunity?.data;
      const calculatedApplicants = calculateApplicantsCount(
        adaptOpportunityToApplicantShape(data)
      );

      setDisabledFields((prev) => ({
        ...prev,
        emailID1: !!data?.Cmail,
        phoneNumber1: false,
        emailID2: !!data?.C2mail,
        phoneNumber2: false,
        emailID3: !!data?.X3rd_Applicant_Email,
        phoneNumber3: false,
        emailID4: !!data?.X4th_Applicant_Email,
        phoneNumber4: false,
      }));

      const crmApplicantValues = {
        enquiryReferenceNo: data?.EnquiryReferenceNo ?? '',
        opportunityId: data?.OppId ?? '',
        numberOfApplicants: calculatedApplicants ?? 0,
        salesOrderId: data?.OppId ?? '',
        projectName: data?.ProjectName ?? '',
        unitNo: data?.UnitNo ?? '',

        applicantName1:
          `${data?.X1st_Applicant_Salutation ?? ''} ${data?.Cname ?? ''} ${data?.X1st_Applicant_Last_Name ?? ''}`?.trim(),
        emailID1: data?.Cmail ?? '',
        phoneNumber1: normalizePhone(data?.Cmob) ?? '',
        countryCode1: (data?.Cmob ?? '')?.startsWith('+91') ? '+91' : '',

        applicantName2:
          `${data?.X2nd_Applicant_Salutation ?? ''} ${data?.C2name ?? ''} ${data?.c2LastName ?? ''}`?.trim(),
        emailID2: data?.C2mail ?? '',
        phoneNumber2: normalizePhone(data?.C2mob) ?? '',
        countryCode2: (data?.C2mob ?? '')?.startsWith('+91') ? '+91' : '',

        applicantName3: data?.Applicant_Name_3rd,
        emailID3: data?.X3rd_Applicant_Email ?? '',
        phoneNumber3: normalizePhone(data?.X3rd_Applicant_Mobile) ?? '',
        countryCode3: (data?.X3rd_Applicant_Mobile ?? '')?.startsWith('+91') ? '+91' : '',

        applicantName4: data?.Applicant_Name_4th,

        emailID4: data?.X4th_Applicant_Email ?? '',
        phoneNumber4: normalizePhone(data?.X4th_Applicant_Mobile) ?? '',
        countryCode4: (data?.X4th_Applicant_Mobile ?? '')?.startsWith('+91') ? '+91' : '',
      };

      /** Editing an existing agreement: CRM hydrate must not wipe loaded documents or agreement id. */
      const isEditExistingAgreement = Boolean(agreementId && agreementId !== 'new');

      if (isEditExistingAgreement) {
        formik.setValues({
          ...formik.values,
          ...crmApplicantValues,
        });
        return;
      }

      /** Create flow: do not wipe uploaded documents when CRM opportunity hydrates (upload → Fetch, or Reset → new OppId → Fetch). */
      const prevProof = Array.isArray(formik.values.approvalProof)
        ? formik.values.approvalProof
        : [];
      const keepUploadedDocuments = prevProof.some((p) => (p?.url ?? '').trim() !== '');
      const approvalProofForCrmHydrate = keepUploadedDocuments
        ? prevProof.map((p) => ({ ...p }))
        : [
            {
              type: defaultDocType,
              name: defaultDocType,
              url: '',
            },
          ];

      /** After create/update, CRM data can load late — do not wipe agreement row ids or step-2 invitees. */
      const hasSavedAgreementRows =
        Number(formik.values.id) > 0 ||
        (Array.isArray(formik.values.agreementIds) && formik.values.agreementIds.length > 0);

      formik.setValues({
        ...formik.values,
        ...crmApplicantValues,
        approvalProof: approvalProofForCrmHydrate,
        internalSignatoryRequired: isCRM,
        mergeDocs: true,
        ...(hasSavedAgreementRows
          ? {}
          : {
              id: 0,
              agreementIds: [],
              internalInvitees: [
                {
                  name: '',
                  email: '',
                  phone: '',
                  countryCode: '+91',
                  id: 0,
                },
              ],
              signatoryRows: [{ ...EMPTY_SIGNATORY_ROW }],
            }),
      });
      if (keepUploadedDocuments) {
        const restErrors = { ...formik.errors };
        delete restErrors.approvalProof;
        formik.setErrors(restErrors);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunity?.data]);

  useEffect(() => {
    formik?.resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementId]);

  const handleReset = () => {
    dispatch(clearOpportunityDetails());

    const preservedApprovalProof = pruneApprovalProofOnReset(formik.values.approvalProof, defaultDocType);
    const preservedInternalInvitees = formik.values.internalInvitees.map((row) => ({ ...row }));

    formik.setValues({
      ...formik.initialValues,
      approvalProof: preservedApprovalProof,
      internalSignatoryRequired: formik.values.internalSignatoryRequired,
      mergeDocs: formik.values.mergeDocs,
      mergeDocumentName: formik.values.mergeDocumentName,
      internalInvitees: preservedInternalInvitees,
      signatoryRows: [{ ...EMPTY_SIGNATORY_ROW }],
    });
    formik.setTouched({});
    formik.setErrors({});
    setFetchDisabled(false);
    setDisabledFields({});
  };

  const handleApprovalDocumentTypeChange = (index: number, type: string) => {
    const currentProofs = Array.isArray(formik.values.approvalProof)
      ? [...formik.values.approvalProof]
      : [];
    const prev = currentProofs[index] ?? { type: '', name: '', url: '' };
    currentProofs[index] = {
      ...prev,
      type,
      name: type === AS.documentTypes.othersCustom ? '' : type,
    };
    formik.setFieldValue('approvalProof', currentProofs);
  };

  const handleAddApprovalDocument = () => {
    const list = formik.values.approvalProof ?? [];
    if (list.length >= MAX_APPROVAL_DOCUMENTS) {
      toast.error(AS.toast.maxDocuments);
      return;
    }
    formik.setFieldValue('approvalProof', [
      ...list,
      { type: '', name: '', url: '' },
    ]);
  };

  /** Merge PDF = No + internal signatory step: block going back to avoid inconsistent edits. */
  const disablePreviousOnInviteStep =
    steps === 1 && !formik.values.mergeDocs && formik.values.internalSignatoryRequired;

  let buttonLabel = AS.actions.send;
  if (steps === 0) {
    if (formik.values.internalSignatoryRequired) {
      buttonLabel = AS.actions.next;
    } else {
      buttonLabel = AS.actions.finish;
    }
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs heading={AS.pageHeading} sx={stickyBreadcrumbsStyles} />
      <FormikProvider value={formik}>
        <form onSubmit={formik.handleSubmit} noValidate>
        {/* Form Container */}
        {steps === 0 && (
          <Box
            mb={3}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: { xs: 2, sm: 3, md: 4 },
              flexDirection: 'column',
              gap: 3,
            }}
          >
              <Card sx={{ padding: '20px', boxShadow: '0px -1px 2px rgba(0,0,0,0.05), 0px 2px 6px rgba(0,0,0,0.08)' }}>
                {/* Sales Order Section */}
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: '16px', fontWeight: '600' }}>{AS.opportunityIdSection}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4} md={8}>
                    <FormikTextField
                      formik={formik}
                      name="opportunityId"
                      label={AS.fields.opportunityId}
                      placeholder={AS.fields.enterOpportunityId}
                      onChange={agreementSanitizedChange(formik, 'opportunityId', 'alphanumeric')}
                      disabled={fetchDisabled}
                      required={false}
                      noGrid
                    />
                  </Grid>
                  <Grid item xs={12} sm={4} md={2}>
                    <FilledButton
                      type="button"
                      onClick={handleFetch}
                      label={uiText.button.fetch}
                      height="54px"
                      width="100%"
                      disabled={fetchDisabled || !formik?.values?.opportunityId}
                      isLoading={loading}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4} md={2}>
                    <FilledButton
                      type="button"
                      onClick={handleReset}
                      label={uiText.button.reset}
                      height="54px"
                      width="100%"
                      disabled={formik?.values?.id > 0 || agreementId !== 'new'}
                      icon={<RefreshIcon />}
                    />
                  </Grid>
                </Grid>
              </Card>

            {/* Opportunity Details */}
              <Card sx={{ padding: '20px', boxShadow: '0px -1px 2px rgba(0,0,0,0.05), 0px 2px 6px rgba(0,0,0,0.08)' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography sx={{ fontSize: '16px', fontWeight: '600' }}>{AS.opportunityDetails}</Typography>
                    </Grid>

                    {!useManualSignatoryLayout && (
                      <>
                        <Grid item xs={12} sm={6}>
                          <FormikTextField
                            formik={formik}
                            name="projectName"
                            label={loading ? AS.fields.fetchingDetails : AS.fields.projectName}
                            placeholder={AS.fields.enterProjectName}
                            onChange={agreementSanitizedChange(formik, 'projectName', 'alphanumeric')}
                            loading={loading}
                            disabled
                            noGrid
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormikTextField
                            formik={formik}
                            name="unitNo"
                            label={loading ? AS.fields.fetchingDetails : AS.fields.unitNumber}
                            placeholder={AS.fields.enterUnitNumber}
                            onChange={agreementSanitizedChange(formik, 'unitNo', 'alphanumeric')}
                            loading={loading}
                            required={false}
                            disabled
                            noGrid
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Divider sx={{ borderStyle: 'dashed', borderColor: '#DADADA', mb: 0 }} />
                        </Grid>
                      </>
                    )}

                    {useManualSignatoryLayout ? (
                      <Grid item xs={12}>
                        <ManualSignatoryRowsFieldArray formik={formik} loading={loading} />
                      </Grid>
                    ) : (
                      APPLICANT_SLOT_INDICES.map((slot) =>
                        slot === 1 || formik.values.numberOfApplicants >= slot ? (
                          <AgreementOpportunityApplicantFields
                            key={slot}
                            slotIndex={slot}
                            formik={formik}
                            loading={loading}
                            fetchDisabled={fetchDisabled}
                            disabledFields={disabledFields}
                          />
                        ) : null
                      )
                    )}


                  </Grid>
                </Box>
              </Card>

              <Card sx={{ padding: '20px', boxShadow: '0px -1px 2px rgba(0,0,0,0.05), 0px 2px 6px rgba(0,0,0,0.08)' }}>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'flex-start',
                    gap: 2,
                  }}
                >
                  <Typography sx={{ fontSize: '16px', fontWeight: 600, width: '100%' }}>{AS.uploadDocuments}</Typography>
                  {(Array.isArray(formik.values.approvalProof) ? formik.values.approvalProof : []).map(
                    (proof, index) => {

                      const docTypeError = getIn(formik.errors, `approvalProof[${index}].type`);
                      const docTypeTouched = getIn(
                        formik.touched,
                        `approvalProof[${index}].type`
                      );

                      return (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            alignItems: { xs: 'stretch', md: 'flex-start' },
                            gap: '16px',
                            width: '100%',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 0.5,
                              // Icon (48) + gap + select must match prior layout: select had md 220px in its own column.
                              flex: { xs: '1 1 auto', md: '0 1 272px' },
                              minWidth: { md: 272 },
                            }}
                          >
                            <Box
                              sx={{
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 48,
                                height: 48,
                              }}
                            >
                              {Array.isArray(formik.values.approvalProof) &&
                                (index > 0 ? (
                                  <IconButton
                                    color="error"
                                    aria-label={AS.removeDocumentRowAria}
                                    onClick={() => {
                                      const currentProofs = Array.isArray(formik.values.approvalProof)
                                        ? [...formik.values.approvalProof]
                                        : [];
                                      currentProofs.splice(index, 1);
                                      formik.setFieldValue('approvalProof', currentProofs);
                                    }}
                                    sx={{ p: 0.5 }}
                                  >
                                    <RemoveCircleOutline />
                                  </IconButton>
                                ) : (
                                  <Box aria-hidden sx={{ width: 40, height: 40 }} />
                                ))}
                            </Box>

                            <Box sx={{ flex: 1, minWidth: { md: 200 } }}>
                              <ControlledAutocomplete
                                label={AS.fields.documentType}
                                required
                                options={AGREEMENT_DOCUMENT_TYPE_AUTOCOMPLETE_OPTIONS}
                                value={proof.type ?? ''}
                                onChange={(val) =>
                                  handleApprovalDocumentTypeChange(
                                    index,
                                    typeof val === 'string' ? val : ''
                                  )
                                }
                                onBlur={() =>
                                  formik.setFieldTouched(
                                    `approvalProof[${index}].type`,
                                    true
                                  )
                                }
                                placeholder={AS.fields.selectDocumentType}
                                error={Boolean(docTypeTouched && docTypeError)}
                                helperText={
                                  docTypeTouched && docTypeError ? String(docTypeError) : ''
                                }
                              />
                            </Box>
                          </Box>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <FormikTextField
                              formik={formik}
                              name={`approvalProof[${index}].name`}
                              label={AS.fields.documentName}
                              placeholder={AS.fields.enterDocumentName}
                              onChange={(e) => formik.setFieldValue(`approvalProof[${index}].name`, e.target.value)}
                              noGrid
                            />
                          </Box>

                          <Box sx={{ flex: 1, maxWidth: { md: '50%' }, minWidth: 0 }}>
                            <NewDropzone
                              name={`approvalProof[${index}].url`}
                              file
                              required
                              fieldName={proof.name ?? ''}
                              fileValue={typeof proof?.url === 'string' ? proof.url : ''}
                              handleupload={(_field, fileKey) => {
                                const currentProofs = Array.isArray(formik.values.approvalProof)
                                  ? [...formik.values.approvalProof]
                                  : [];
                                currentProofs[index] = {
                                  ...currentProofs[index],
                                  url:
                                    typeof fileKey === 'string'
                                      ? fileKey
                                      : (fileKey?.url ?? ''),
                                };
                                formik.setFieldValue('approvalProof', currentProofs);
                              }}
                              documentType="pdf"
                              isOther={false}
                              path={typeof proof?.url === 'string' ? proof.url : ''}
                              id={index}
                              showAsterik
                              formik={formik}
                              error=""
                              pdfMaxSize10MB
                              handledelete={(key) => {
                                handledelete('', '', key).catch(() => { });
                                const currentProofs = Array.isArray(formik.values.approvalProof)
                                  ? [...formik.values.approvalProof]
                                  : [];
                                if (currentProofs[index]) {
                                  currentProofs[index] = {
                                    ...currentProofs[index],
                                    url: '',
                                  };
                                  formik.setFieldValue('approvalProof', currentProofs);
                                }
                              }}
                              errorMarginLeft={2}
                            />

                          </Box>
                        </Box>
                      );
                    }
                  )}
                  <Button
                    type="button"
                    onClick={handleAddApprovalDocument}
                    disabled={(formik.values.approvalProof?.length ?? 0) >= MAX_APPROVAL_DOCUMENTS}
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      margin: '10px auto 0',
                      color: '#1A407D',
                      fontWeight: '600',
                      fontSize: '14px',
                      gap: 1,
                      '&:hover': {
                        backgroundColor: 'transparent',
                      },
                    }}
                  >
                    <img src={plusCircle} alt="" /> {AS.addDocuments}
                  </Button>
                </Box>
              </Card>
              <Card sx={{ padding: '20px', boxShadow: '0px -1px 2px rgba(0,0,0,0.05), 0px 2px 6px rgba(0,0,0,0.08)' }}>
                <Grid container spacing={2}>
                  {(!isEditAgreement && isMultipleDoc) &&
                    <Grid item xs={12} sm={6}>
                      <Typography component="div" sx={AGREEMENT_OPTION_SECTION_TITLE_SX}>
                        {AS.mergePdf}
                      </Typography>
                      <RadioGroup
                        row
                        name="mergeDocs"
                        value={hasMergeDoc ? 'yes' : 'no'}
                        onChange={(e) => formik.setFieldValue('mergeDocs', e.target.value === 'yes')}
                        sx={{ flexDirection: 'row', gap: 2, flexWrap: 'nowrap' }}
                      >
                        <FormControlLabel
                          value="yes"
                          disabled={isEditAgreement}
                          control={<Radio size="small" sx={AGREEMENT_YES_NO_RADIO_SX} />}
                          label={uiText.button.yes}
                          sx={AGREEMENT_YES_NO_LABEL_SX}
                        />
                        <FormControlLabel
                          value="no"
                          disabled={isEditAgreement}
                          control={<Radio size="small" sx={AGREEMENT_YES_NO_RADIO_SX} />}
                          label={uiText.button.no}
                          sx={AGREEMENT_YES_NO_LABEL_SX}
                        />
                      </RadioGroup>
                    </Grid>
                  }

                  {(hasMergeDoc && isMultipleDoc) && (
                    <Grid item xs={12} sm={6} marginBottom={2}>
                      <FormikTextField
                        formik={formik}
                        name="mergeDocumentName"
                        label={AS.fields.mergeDocumentName}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              MD -
                            </InputAdornment>
                          ),
                        }}
                        onChange={(e) => {
                          let { value } = e.target;

                          // If user pastes "MD-123", remove prefix
                          value = value.replace(/^MD-/i, '');

                          formik.setFieldValue(
                            'mergeDocumentName',
                            value
                          );
                        }}
                        noGrid
                        required
                      />
                    </Grid>
                  )}
                </Grid>

                  <Box sx={{ flex: '0 0 auto', width: '100%'}}>
                    <Typography component="div" sx={AGREEMENT_OPTION_SECTION_TITLE_SX}>
                      {AS.internalSignatoryRequired}
                    </Typography>
                    <RadioGroup
                      row
                      name="internalSignatoryRequired"
                      value={formik.values.internalSignatoryRequired ? 'yes' : 'no'}
                      onChange={(e) =>
                        formik.setFieldValue('internalSignatoryRequired', e.target.value === 'yes')
                      }
                      sx={{ flexDirection: 'row', gap: 2, flexWrap: 'nowrap' }}
                    >
                      <FormControlLabel
                        value="yes"
                        disabled={!isCRM}
                        control={<Radio size="small" sx={AGREEMENT_YES_NO_RADIO_SX} />}
                        label={uiText.button.yes}
                        sx={AGREEMENT_YES_NO_LABEL_SX}
                      />
                      <FormControlLabel
                        value="no"
                        control={<Radio size="small" sx={AGREEMENT_YES_NO_RADIO_SX} />}
                        label={uiText.button.no}
                        sx={AGREEMENT_YES_NO_LABEL_SX}
                      />
                    </RadioGroup>
                  </Box>
              </Card>
          </Box>
        )}
        {steps === 1 && (
          <InternalInviteesFieldArray formik={formik} />
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem' }}>
          {steps !== 0 &&
            (disablePreviousOnInviteStep ? (
              <Tooltip
                title={AS.actions.previousDisabledMergePdfNoTooltip}
                placement="top"
                arrow
                describeChild
              >
                <span style={{ display: 'inline-block' }}>
                  <Button
                    type="button"
                    disabled
                    startIcon={<ArrowBackIosNew />}
                    sx={{
                      height: '54px',
                      width: '157px',
                      border: '1px solid #1A407D',
                      color: '#1A407D',
                    }}
                  >
                    {AS.actions.previous}
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  if (steps === 1) {
                    setSteps(steps - 1);
                  }
                  if (steps === 0) {
                    route.push(generateRoleBasedRoute(userRole, `/dashboard`));
                  }
                }}
                startIcon={<ArrowBackIosNew />}
                sx={{
                  height: '54px',
                  width: '157px',
                  border: '1px solid #1A407D',
                  color: '#1A407D',
                }}
              >
                {AS.actions.previous}
              </Button>
            ))}

          <FilledButton
            type="submit"
            onClick={steps === 0 ? handleNext : handleSecondUpdate}
            label={buttonLabel}
            isLoading={nextLoading}
            height="54px"
            width="157px"
            endIcon={
              <ArrowForwardIosIcon sx={{ fontSize: '16px', width: '16px', height: '16px' }} />
            }
          />
        </Box>
      </form>
      </FormikProvider>
    </DashboardContent>
  );
}
