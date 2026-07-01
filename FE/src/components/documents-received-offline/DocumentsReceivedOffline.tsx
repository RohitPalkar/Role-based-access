import type { UploadDocumentsValues } from 'src/types/rm-panel/user';

import React, { useState } from 'react';

import { ArrowCircleRight } from '@mui/icons-material';
import {
  Box,
  Grid,
  Stack,
  Button,
  Divider,
  InputBase,
  Typography,
} from '@mui/material';

import { useParams } from 'src/routes/hooks';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { getCompressionDimensions } from 'src/utils/upload-utils';

import { setpostBookingStep } from 'src/redux/slices/rm-panel/dashboard-slice';
import { salesUpdateBooking } from 'src/redux/actions/rm-panel/dashboard-actions';
import {
  deleteImage,
  directUploadFile,
  updateDocumentImage,
  compressAndUploadFile,
  type UpdateDocumentImagePayload,
} from 'src/redux/actions/rm-panel/upload-actions';

import { toast } from 'src/components/snackbar';
import { BorderBox } from 'src/components/border-box/BorderBox';

import Dropzone from '../dropzone/Dropzone';
import { FilledButton } from '../buttons/FilledButton';
import UploadAdditionalDocuments from '../upload-additonal-documents/UploadAdditionalDocuments';

type Applicant = { field: string; label: string; displayValue?: string; filepath?: string };
interface ReferrerDetailsProps {
  uploadDocumentsFormik: any;
}

type ApplicantIndex = 1 | 2 | 3 | 4;

type OfflineDocShowFlags = {
  aadhaar: boolean;
  passport: boolean;
  oci: boolean;
  pan: boolean;
  addressProof: boolean;
  image: boolean;
  gst: boolean;
  legalGuardian: boolean;
};

function getOfflineDocShowFlags(applicantData: { data?: any } | null | undefined, n: ApplicantIndex): OfflineDocShowFlags {
  const pd = applicantData?.data?.[`applicant${n}`]?.personalDetails;
  const prof = applicantData?.data?.[`applicant${n}`]?.professionalDetails;
  return {
    aadhaar: !!pd?.isPhysicalAadhaar,
    passport: !!pd?.isPhysicalPassport,
    oci: !!pd?.isPhysicalOCI,
    pan: !!pd?.isPhysicalPan,
    addressProof: !!pd?.isPhysicalAddressProof,
    image: !!pd?.isPhysicalImage,
    gst: !!prof?.isPhysicalGST,
    legalGuardian: !!pd?.isPhysicalLegalGuardianDoc,
  };
}

function getLegalGuardianDisplayName(applicantData: { data?: any } | null | undefined, n: ApplicantIndex): string {
  return applicantData?.data?.[`applicant${n}`]?.personalDetails?.legalGuardian || '-';
}

function buildOfflineApplicantRows(
  prefix: `applicant${ApplicantIndex}`,
  values: any,
  s: OfflineDocShowFlags,
  legalGuardianName: string
): (Applicant | '')[] {
  const v = values;
  return [
    s.aadhaar
      ? { field: `${prefix}aadhaar`, label: 'Aadhaar Number', filepath: v?.[`${prefix}aadhaarImage`] }
      : '',
    s.passport
      ? { field: `${prefix}passport`, label: 'Passport Number', filepath: v?.[`${prefix}passportImage`] }
      : '',
    s.oci
      ? { field: `${prefix}oci`, label: 'OCI Number', filepath: v?.[`${prefix}ociImage`] }
      : '',
    s.pan
      ? { field: `${prefix}pan`, label: 'PAN Number', filepath: v?.[`${prefix}panImage`] }
      : '',
    s.addressProof
      ? {
          field: `${prefix}AddressProof`,
          label: 'Address Proof',
          filepath: v?.[`${prefix}AddressProofImage`],
        }
      : '',
    s.image
      ? {
          field: `${prefix}photo`,
          label: 'Passport Size Photo​',
          filepath: v?.[`${prefix}photoImage`],
        }
      : '',
    s.gst
      ? {
          field: `${prefix}GST`,
          label: 'Upload GST Certificate​',
          filepath: v?.[`${prefix}GSTImage`],
        }
      : '',
    s.legalGuardian
      ? {
          field: `${prefix}LegalGuardian`,
          label: 'Legal Guardian',
          displayValue: legalGuardianName,
          filepath: v?.[`${prefix}LegalGuardianImage`],
        }
      : '',
  ];
}

function applicantRowHasContent(arr: (Applicant | '')[]): boolean {
  return !arr.every((each) => each === '');
}

function shouldShowDocumentsReceivedOfflineSection(
  arrays: [(Applicant | '')[], (Applicant | '')[], (Applicant | '')[], (Applicant | '')[]],
  transactionsLength: number,
  showGSTFields: boolean
): boolean {
  const allApplicantsEmpty = arrays.every((arr) => arr.every((each) => each === ''));
  if (allApplicantsEmpty && transactionsLength === 0 && !showGSTFields) {
    return false;
  }
  return true;
}

function getIsAadhaarVerifiedForApplicant(values: UploadDocumentsValues, applicantId: number): boolean {
  switch (applicantId) {
    case 1:
      return values.applicant1isAadhaarVerified;
    case 2:
      return values.applicant2isAadhaarVerified;
    case 3:
      return values.applicant3isAadhaarVerified;
    case 4:
      return values.applicant4isAadhaarVerified;
    default:
      return false;
  }
}

function createPayloadFromFormik(values: UploadDocumentsValues, saveForLater: boolean) {
  type ValueKeys = keyof UploadDocumentsValues;

  const getValue = (key: string) => values[key as ValueKeys];

  const mapApplicant = (applicantKey: string, showFields: Record<string, any>) => {
    const personalDetails: Record<string, any> = {};
    const professionalDetails: Record<string, any> = {};

    if (showFields.pan) {
      personalDetails.panNumber = String(getValue(`${applicantKey}pan`))?.toUpperCase();
      if (getValue(`${applicantKey}panImage`)) personalDetails.panImage = [getValue(`${applicantKey}panImage`)];
    }

    if (showFields.aadhaar) {
      personalDetails.aadhaarNumber = getValue(`${applicantKey}aadhaar`);
      personalDetails.aadhaarImage = [
        getValue(`${applicantKey}aadhaarImage`) || '',
        getValue(`${applicantKey}aadhaarbackImage`) || '',
      ];
    }

    if (showFields.passport) {
      personalDetails.passportNumber = String(getValue(`${applicantKey}passport`))?.toUpperCase();
      personalDetails.passportImage = [
        getValue(`${applicantKey}passportImage`) || '',
        getValue(`${applicantKey}passportbackImage`) || '',
      ];
    }

    if (showFields.oci) {
      personalDetails.ociNumber = String(getValue(`${applicantKey}oci`))?.toUpperCase();
      if (getValue(`${applicantKey}ociImage`))
        personalDetails.ociImage = [
          getValue(`${applicantKey}ociImage`),
          getValue(`${applicantKey}ocibackImage`) || '',
        ];
    }

    if (showFields.photo) personalDetails.image = [getValue(`${applicantKey}photoImage`)];

    if (showFields.addressproof) {
      personalDetails.addressProofImage = [getValue(`${applicantKey}AddressProofImage`)];
    }

    if (showFields.legalGuardian) {
      personalDetails.legalGuardianDoc = [getValue(`${applicantKey}LegalGuardianImage`)];
    }

    if (showFields.GST) {
      professionalDetails.gstNumber = String(getValue(`${applicantKey}GST`))?.toUpperCase();
      professionalDetails.gstCertificate = [getValue(`${applicantKey}GSTImage`)];
    }

    const applicantPayload: Record<string, any> = {};
    if (Object.keys(personalDetails).length) applicantPayload.personalDetails = personalDetails;
    if (Object.keys(professionalDetails).length)
      applicantPayload.professionalDetails = professionalDetails;

    return Object.keys(applicantPayload).length ? applicantPayload : null;
  };

  const applicantShowMap: Record<string, Record<string, any>> = {
    applicant1: {
      pan: values.isPhysicalApplicant1Pan,
      aadhaar: values.isPhysicalApplicant1Aadhaar,
      passport: values.isPhysicalApplicant1Passport,
      oci: values.isPhysicalApplicant1OCI,
      photo: values.isPhysicalApplicant1Image,
      addressproof: values.isPhysicalApplicant1AddressProof,
      GST: values.isPhysicalApplicant1GST,
      legalGuardian: values.isPhysicalApplicant1LegalGuardianDoc,
    },
    applicant2: {
      pan: values.isPhysicalApplicant2Pan,
      aadhaar: values.isPhysicalApplicant2Aadhaar,
      passport: values.isPhysicalApplicant2Passport,
      oci: values.isPhysicalApplicant2OCI,
      photo: values.isPhysicalApplicant2Image,
      addressproof: values.isPhysicalApplicant2AddressProof,
      GST: values.isPhysicalApplicant2GST,
      legalGuardian: values.isPhysicalApplicant2LegalGuardianDoc,
    },
    applicant3: {
      pan: values.isPhysicalApplicant3Pan,
      aadhaar: values.isPhysicalApplicant3Aadhaar,
      passport: values.isPhysicalApplicant3Passport,
      oci: values.isPhysicalApplicant3OCI,
      photo: values.isPhysicalApplicant3Image,
      addressproof: values.isPhysicalApplicant3AddressProof,
      GST: values.isPhysicalApplicant3GST,
      legalGuardian: values.isPhysicalApplicant3LegalGuardianDoc,
    },
    applicant4: {
      pan: values.isPhysicalApplicant4Pan,
      aadhaar: values.isPhysicalApplicant4Aadhaar,
      passport: values.isPhysicalApplicant4Passport,
      oci: values.isPhysicalApplicant4OCI,
      photo: values.isPhysicalApplicant4Image,
      addressproof: values.isPhysicalApplicant4AddressProof,
      GST: values.isPhysicalApplicant4GST,
      legalGuardian: values.isPhysicalApplicant4LegalGuardianDoc,
    },
  };

  const applicantsPayload = Object.entries(applicantShowMap).reduce<Record<string, any>>(
    (acc, [key, showFields]) => {
      const applicantPayload = mapApplicant(key, showFields);
      if (applicantPayload) {
        acc[key] = applicantPayload;
      }
      return acc;
    },
    {}
  );

  const paymentProofs =
    values.transactions
      ?.filter((tx: any) => tx.paymentProof)
      ?.map((tx: any) => ({
        transactionId: tx.transactionId || '',
        paymentProof: tx.paymentProof ? [tx.paymentProof] : [],
      })) || [];

  const payload: Record<string, any> = {
    ...applicantsPayload,
    ...(paymentProofs.length ? { paymentProofs } : {}),
    saveForLater,
  };

  return payload;
}

const TRANSACTION_FIELD_RE = /^([a-zA-Z]+)(\d+)$/;

function parseTransactionIndexFromFieldName(fieldName: string): number | null {
  const m = TRANSACTION_FIELD_RE.exec(fieldName);
  if (!m?.[2]) {
    return null;
  }
  return Number(m[2]);
}

function presignedUploadSuccessToastMessage(isPDF: boolean, isImage: boolean): string {
  if (isPDF) {
    return 'PDF uploaded successfully.';
  }
  if (isImage) {
    return 'Image compressed and uploaded successfully.';
  }
  return 'File uploaded successfully.';
}

function resolvePresignedUploadErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    if (error.includes('compression')) {
      return 'Image compression failed. Please try with a different image.';
    }
    if (error.includes('presigned')) {
      return 'Failed to prepare upload. Please try again.';
    }
  } else if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Failed to upload file. Please try again.';
}

function applyUploadedFileKeyToFormik(formik: any, fieldName: string, fileKey: string) {
  if (fieldName?.includes('transaction')) {
    const index = parseTransactionIndexFromFieldName(fieldName);
    if (index != null) {
      formik.setFieldValue(`transactions[${index}].paymentProof`, fileKey);
    }
  } else {
    formik.setFieldValue(fieldName, fileKey);
  }
}

function clearFormikFieldAfterPresignedFailure(formik: any, fieldName: string) {
  if (fieldName?.includes('transaction')) {
    const index = parseTransactionIndexFromFieldName(fieldName);
    if (index != null) {
      formik.setFieldValue(`transactions[${index}].paymentProof`, '');
      formik.setFieldError(`transactions[${index}].paymentProof`, undefined);
    }
  } else {
    formik.setFieldValue(fieldName, '');
    formik.setFieldError(fieldName, undefined);
  }
}

function sanitizeOfflineDocumentInput(raw: string, field: string, applicantId: number): string {
  let value = raw.replaceAll(/[^a-zA-Z0-9\s]/g, '');
  if (field === `applicant${applicantId}aadhaar`) {
    value = value.replaceAll(/\D/g, '').slice(0, 12);
  }
  if (field === `applicant${applicantId}passport`) {
    value = value.replaceAll(/[^a-zA-Z0-9]/g, '').slice(0, 9);
  }
  return value;
}

function buildDualUploadPlaceholder(field: string, sideLabel: string): string {
  const m = /(aadhaar|oci|passport)/i.exec(field);
  const raw = m?.[0];
  const docType = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
  return `Click to upload ${docType} ${sideLabel}`;
}

const APPLICANT_IMAGE_FIELD_RE = /(applicant\d+)([A-Za-z]+)/;

function parseApplicantImageFieldParts(
  updatedFieldName: string
): { applicantKey: string; actualField: string } | null {
  const m = APPLICANT_IMAGE_FIELD_RE.exec(updatedFieldName);
  if (!m?.[1] || !m[2]) {
    return null;
  }
  return { applicantKey: m[1], actualField: m[2] };
}

function getOfflineApplicantNode(applicantData: { data?: any } | undefined, applicantKey: string) {
  const applicants = applicantData?.data as
    | Record<'applicant1' | 'applicant2' | 'applicant3' | 'applicant4', any>
    | undefined;
  return applicants?.[applicantKey as keyof typeof applicants] ?? {};
}

function asImageArray(value: unknown): any[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [];
}

function getOfflinePersonalImagesForField(applicant: any, field: string): any[] {
  switch (field) {
    case 'aadhaarImage':
    case 'aadhaarbackImage':
      return asImageArray(applicant?.personalDetails?.aadhaarImage);
    case 'passportImage':
    case 'passportbackImage':
      return asImageArray(applicant?.personalDetails?.passportImage);
    case 'ociImage':
    case 'ocibackImage':
      return asImageArray(applicant?.personalDetails?.ociImage);
    case 'LegalGuardianImage':
      return asImageArray(applicant?.personalDetails?.legalGuardianDoc);
    default:
      return [];
  }
}

function personalDetailsBackendField(baseField: string): string {
  if (baseField === 'LegalGuardianImage') {
    return 'legalGuardianDoc';
  }
  return baseField;
}

function imageArrayAfterFrontBackDelete(images: unknown, isBack: boolean): string[] {
  if (!Array.isArray(images)) {
    return [''];
  }
  if (images.length === 2) {
    return isBack ? [images[0], ''] : ['', images[1]];
  }
  return [''];
}

function paymentProofRowKey(transaction: unknown, index: number): string {
  if (
    transaction != null &&
    typeof transaction === 'object' &&
    'transactionId' in transaction &&
    (transaction as { transactionId?: unknown }).transactionId != null &&
    String((transaction as { transactionId?: unknown }).transactionId) !== ''
  ) {
    return `payment-tx-${String((transaction as { transactionId: string | number }).transactionId)}`;
  }
  return `payment-row-${index}`;
}

type OfflineDualSideDropzonesProps = Readonly<{
  field: string;
  filepath?: string;
  uploadDocumentsFormik: any;
  handleUpload: (fieldName: string, file: File) => void;
  handleDelete: (fieldName: string, file: any, id: any) => Promise<void>;
}>;

function OfflineDualSideDropzones({
  field,
  filepath,
  uploadDocumentsFormik,
  handleUpload,
  handleDelete,
}: OfflineDualSideDropzonesProps) {
  const frontImage = `${field}Image` as keyof UploadDocumentsValues;
  const backImage = `${field}backImage` as keyof UploadDocumentsValues;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <Box className="panUploadRow">
          <Dropzone
            name={`${field}Image`}
            fileValue={uploadDocumentsFormik.values[frontImage] as File | null}
            id={uploadDocumentsFormik.values[frontImage]}
            fieldName={field}
            handleupload={(name, file) => handleUpload(`${name}Image`, file)}
            handledelete={handleDelete}
            placholderforBack={buildDualUploadPlaceholder(field, 'front')}
            path={filepath ? uploadDocumentsFormik.values[frontImage] : undefined}
            action={<Button variant="contained">Upload</Button>}
            formik={uploadDocumentsFormik}
          />
        </Box>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Box className="panUploadRow">
          <Dropzone
            name={`${field}backImage`}
            fileValue={uploadDocumentsFormik.values[backImage] as File | null}
            id={uploadDocumentsFormik.values[backImage]}
            fieldName={`${field}back`}
            handleupload={(name, file) => handleUpload(`${name}Image`, file)}
            handledelete={handleDelete}
            placholderforBack={buildDualUploadPlaceholder(field, 'back')}
            path={filepath ? uploadDocumentsFormik.values[backImage] : undefined}
            action={<Button variant="contained">Upload</Button>}
            formik={uploadDocumentsFormik}
          />
        </Box>
      </Grid>
    </Grid>
  );
}

type OfflineApplicantFieldItemProps = Readonly<{
  applicantId: number;
  row: Applicant;
  uploadDocumentsFormik: any;
  handleUpload: (fieldName: string, file: File) => void;
  handleDelete: (fieldName: string, file: any, id: any) => Promise<void>;
  isDualUploadField: (field: string) => boolean;
}>;

function OfflineApplicantFieldItem({
  applicantId,
  row,
  uploadDocumentsFormik,
  handleUpload,
  handleDelete,
  isDualUploadField,
}: OfflineApplicantFieldItemProps) {
  const { field, label, filepath, displayValue } = row;
  const dual = isDualUploadField(field);

  return (
    <Grid item xs={12} sm={dual ? 12 : 6} key={field}>
      <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
        {label}
        {displayValue && (
          <span style={{ fontWeight: 600 }}>:&nbsp;{displayValue}</span>
        )}
        {!field.includes('back') && <span className="asterisk">*</span>}
      </Typography>

      {field !== `applicant${applicantId}photo` &&
        field !== `applicant${applicantId}LegalGuardian` &&
        !field.includes('back') && (
          <Box className="inputRow">
            <InputBase
              fullWidth
              placeholder={`Enter ${label}`}
              className="InputBaseRow"
              sx={{
                '& input': { textTransform: 'uppercase' },
                '& ::placeholder': { textTransform: 'none' },
              }}
              value={uploadDocumentsFormik.values[field as keyof UploadDocumentsValues] as string}
              inputProps={{ maxLength: 50 }}
              onChange={(e) => {
                uploadDocumentsFormik.setFieldValue(
                  field,
                  sanitizeOfflineDocumentInput(e.target.value, field, applicantId)
                );
              }}
              disabled={
                field.includes('Address') ||
                field.includes('GST') ||
                (field === `applicant${applicantId}aadhaar` &&
                  getIsAadhaarVerifiedForApplicant(uploadDocumentsFormik.values, applicantId))
              }
              onBlur={uploadDocumentsFormik.handleBlur}
              name={field}
            />
            {uploadDocumentsFormik.touched[field as keyof UploadDocumentsValues] &&
              uploadDocumentsFormik.errors[field as keyof UploadDocumentsValues] && (
                <Typography color="red" sx={{ fontSize: '12px', mt: '5px' }}>
                  {uploadDocumentsFormik.errors[field as keyof UploadDocumentsValues]}
                </Typography>
              )}
          </Box>
        )}

      {!dual && (
        <Box className="panUploadRow">
          <Dropzone
            name={`${field}Image`}
            fileValue={
              uploadDocumentsFormik.values[`${field}Image` as keyof UploadDocumentsValues] as File | null
            }
            id={uploadDocumentsFormik.values[`${field}Image` as keyof UploadDocumentsValues]}
            fieldName={field}
            handleupload={(name, file) => handleUpload(`${name}Image`, file)}
            handledelete={handleDelete}
            path={
              filepath
                ? uploadDocumentsFormik.values[`${field}Image` as keyof UploadDocumentsValues]
                : undefined
            }
            action={<Button variant="contained">Upload</Button>}
            formik={uploadDocumentsFormik}
            documentType={field?.includes('GST') ? 'both' : ''}
          />
        </Box>
      )}

      {dual && (
        <OfflineDualSideDropzones
          field={field}
          filepath={filepath}
          uploadDocumentsFormik={uploadDocumentsFormik}
          handleUpload={handleUpload}
          handleDelete={handleDelete}
        />
      )}
    </Grid>
  );
}

type OfflineApplicantDocumentsSectionProps = Readonly<{
  applicantId: number;
  rows: (Applicant | '')[];
  uploadDocumentsFormik: any;
  handleUpload: (fieldName: string, file: File) => void;
  handleDelete: (fieldName: string, file: any, id: any) => Promise<void>;
  isDualUploadField: (field: string) => boolean;
}>;

function OfflineApplicantDocumentsSection({
  applicantId,
  rows,
  uploadDocumentsFormik,
  handleUpload,
  handleDelete,
  isDualUploadField,
}: OfflineApplicantDocumentsSectionProps) {
  const items = rows.filter((item): item is Applicant => item !== '');

  return (
    <>
      <Typography sx={{ fontSize: '14px', fontWeight: '600', mb: 1 }}>
        Applicant {applicantId}
      </Typography>

      <Grid container spacing={3}>
        {items.map((row) => (
          <OfflineApplicantFieldItem
            key={row.field}
            applicantId={applicantId}
            row={row}
            uploadDocumentsFormik={uploadDocumentsFormik}
            handleUpload={handleUpload}
            handleDelete={handleDelete}
            isDualUploadField={isDualUploadField}
          />
        ))}
      </Grid>

      <Divider sx={{ borderStyle: 'dashed', borderColor: '#DADADA', mb: 2 }} />
    </>
  );
}

type OfflinePaymentProofSectionProps = Readonly<{
  uploadDocumentsFormik: any;
  handleUpload: (fieldName: string, file: File) => void;
  handlePaymentDelete: (fieldName: string, file: any, id: any) => Promise<void>;
}>;

function OfflinePaymentProofSection({
  uploadDocumentsFormik,
  handleUpload,
  handlePaymentDelete,
}: OfflinePaymentProofSectionProps) {
  const transactions = uploadDocumentsFormik?.values?.transactions;
  if (!transactions?.length) {
    return null;
  }

  return (
    <>
      <Typography className="typographyTitle" sx={{ fontSize: '14px', fontWeight: '600', mb: 1 }}>
        Payment Proof
      </Typography>
      <Grid container spacing={3}>
        {transactions.map((transaction: unknown, index: number) => (
          <Grid item xs={12} sm={6} key={paymentProofRowKey(transaction, index)}>
            <Typography
              className="typographyLabel"
              sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}
            >
              {`Transaction ${index + 1}`}
              <span className="asterisk">*</span>
            </Typography>

            <Box className="inputRow">
              <InputBase
                fullWidth
                disabled
                className="InputBaseRow"
                sx={{
                  '& input': { textTransform: 'uppercase' },
                  '& ::placeholder': { textTransform: 'none' },
                }}
                value={uploadDocumentsFormik?.values?.transactions[index]?.transactionNumber}
                onBlur={uploadDocumentsFormik.handleBlur}
                name={uploadDocumentsFormik?.values?.transactions[index]?.transactionNumber}
              />
            </Box>

            <Box className="panUploadRow">
              <Dropzone
                name={`transactions${[index]}.paymentProof`}
                fileValue={
                  uploadDocumentsFormik.values[
                    `transactions${[index]}.paymentProof` as keyof UploadDocumentsValues
                  ] as File | null
                }
                id={
                  uploadDocumentsFormik.values[
                    `transactions${[index]}.paymentProof` as keyof UploadDocumentsValues
                  ]
                }
                fieldName={`transactions${[index]}`}
                handleupload={(name, file) => handleUpload(name, file)}
                handledelete={handlePaymentDelete}
                path={uploadDocumentsFormik.values?.transactions[index]?.paymentProof}
                action={<Button variant="contained">Upload</Button>}
                formik={uploadDocumentsFormik}
              />
              <Typography color="red" sx={{ fontSize: '12px', marginTop: '-20px' }}>
                {uploadDocumentsFormik?.touched?.transactions?.[index]?.paymentProof &&
                  uploadDocumentsFormik?.errors?.transactions?.[index]?.paymentProof &&
                  uploadDocumentsFormik?.errors?.transactions?.[index]?.paymentProof}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>{' '}
    </>
  );
}

const DocumentsReceivedOffline: React.FC<ReferrerDetailsProps> = ({ uploadDocumentsFormik }) => {
  // State to store files separately for each dropzone
  const dispatch = useAppDispatch();
  const { applicantData } = useAppSelector((state) => state.dashboard);
  const { oppId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const applicant1Array = buildOfflineApplicantRows(
    'applicant1',
    uploadDocumentsFormik?.values,
    getOfflineDocShowFlags(applicantData, 1),
    getLegalGuardianDisplayName(applicantData, 1)
  );
  const applicant2Array = buildOfflineApplicantRows(
    'applicant2',
    uploadDocumentsFormik?.values,
    getOfflineDocShowFlags(applicantData, 2),
    getLegalGuardianDisplayName(applicantData, 2)
  );
  const applicant3Array = buildOfflineApplicantRows(
    'applicant3',
    uploadDocumentsFormik?.values,
    getOfflineDocShowFlags(applicantData, 3),
    getLegalGuardianDisplayName(applicantData, 3)
  );
  const applicant4Array = buildOfflineApplicantRows(
    'applicant4',
    uploadDocumentsFormik?.values,
    getOfflineDocShowFlags(applicantData, 4),
    getLegalGuardianDisplayName(applicantData, 4)
  );


  
  const handleUpload = (fieldName: string, file: File) => {
    handlepresignedFiles(fieldName, file, oppId);
  };

  const handleSubmit = async (saveForLater: boolean) => {
    // Trigger Formik validation
    const errors = await uploadDocumentsFormik.validateForm();

    // Check if there are any errors
    if (Object.keys(errors).length > 0 && !saveForLater) {
      // Mark all fields as touched to show validation errors
      uploadDocumentsFormik.setTouched(
        Object.keys(uploadDocumentsFormik.values).reduce(
          (acc, key) => {
            acc[key] = true;
            return acc;
          },
          {} as Record<string, boolean>
        ),
        true
      );

      toast.error('Please fix validation errors before submitting.');
      return; // Stop execution if there are errors
    }

    // If no errors, create payload
    const payload = createPayloadFromFormik(uploadDocumentsFormik.values, saveForLater);

    try {
      if (saveForLater) {
        setSaveLoading(true);
      } else {
        setIsLoading(true);
      }
      const response = await handleUploadFiles(payload, oppId);

      if (response?.response?.statusCode === 200) {
        dispatch(setpostBookingStep(1));
      } else {
        toast.error('Unable to submit data. Please try again later.');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      toast.error('Unable to submit data. Please try again later.');
    } finally {
      setIsLoading(false);
      setSaveLoading(false);
    }
  };

  const handleUploadFiles = async (payload: any, opid: string | undefined) => {
    try {
      const response = await dispatch(
        salesUpdateBooking({
          opportunityId: `${opid}`,
          payload,
        })
      ).unwrap();

      return response;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  };

  const handlepresignedFiles = async (
    fieldName: string,
    selectedFile: File,
    opid: string | undefined
  ) => {
    if (!selectedFile) {
      console.warn('No files selected for upload.');
      return;
    }
    if (fieldName == null || String(fieldName).trim() === '') {
      console.warn('No field name for upload.');
      return;
    }

    try {
      const isPDF = selectedFile.type === 'application/pdf';
      const isImage = selectedFile.type.startsWith('image/');
      const { width, height } = getCompressionDimensions(fieldName);

      const fileObjects = {
        folder: `images/${opid}`,
        key: selectedFile.name.replaceAll(/\s+/g, ''),
      };

      let result;
      if (isPDF) {
        result = await dispatch(
          directUploadFile({
            file: selectedFile,
            presignedUrlPayload: fileObjects,
          })
        ).unwrap();
      } else {
        result = await dispatch(
          compressAndUploadFile({
            file: selectedFile,
            width,
            height,
            presignedUrlPayload: fileObjects,
          })
        ).unwrap();
      }

      if (result?.presignedResponse?.statusCode === 201) {
        toast.success(presignedUploadSuccessToastMessage(isPDF, isImage));
        const fileKey = result?.presignedResponse?.data?.key || fileObjects.key;
        applyUploadedFileKeyToFormik(uploadDocumentsFormik, fieldName, fileKey);
        return;
      }

      const errorMsg = 'Upload failed. Please try again.';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    } catch (error) {
      clearFormikFieldAfterPresignedFailure(uploadDocumentsFormik, fieldName);
      toast.error(resolvePresignedUploadErrorMessage(error));
      throw error;
    }
  };
  const handlePaymentDelete = async (fieldName: string, file: any, id: any) => {
    const index = parseTransactionIndexFromFieldName(fieldName);
    if (index == null) {
      return;
    }

    const key = uploadDocumentsFormik?.values?.transactions?.[index]?.paymentProof;
    if (key == null || key === '') {
      return;
    }

    try {
      await dispatch(deleteImage({ key: String(key) }));

      // Clear Formik field (paths use `transactions`, same as applyUploadedFileKeyToFormik)
      uploadDocumentsFormik.setFieldValue(`transactions[${Number(index)}].paymentProof`, '');

      // Construct and dispatch updateDocumentImage payload
      const payload: UpdateDocumentImagePayload = {
        opportunityId: oppId ?? '',
        path: `paymentDetails.paymentProofs.${index}.paymentProof`,
        images: [],
      };

      dispatch(updateDocumentImage(payload));
    } catch (error) {
      console.error('Failed to delete payment proof:', error);
    }
  };

  const handleDelete = async (fieldName: string, file: any, id: any) => {
    try {
      if (fieldName == null || String(fieldName).trim() === '') {
        return;
      }
      if (id == null || id === '') {
        console.error('Delete image: missing storage key (id).');
        return;
      }

      // --- Normalize field name ---
      let updatedFieldName = `${fieldName}Image`;
      uploadDocumentsFormik.setFieldValue(updatedFieldName, '');

      // Normalize photo naming
      if (fieldName.includes('photo')) {
        updatedFieldName = fieldName.replaceAll('photo', 'image');
      }

      // Extract applicant key and actual field (ex: applicant3aadhaarbackImage → applicant3 + aadhaarbackImage)
      const parts = parseApplicantImageFieldParts(updatedFieldName);
      if (!parts) {
        console.error('Invalid fieldName format:', updatedFieldName);
        return;
      }

      const { applicantKey, actualField } = parts;

      const applicantInfo = getOfflineApplicantNode(applicantData, applicantKey);
      const images = getOfflinePersonalImagesForField(applicantInfo, actualField);

      // --- Determine if it's front or back image ---
      const isBack = actualField.includes('back');
      const baseField = actualField.replaceAll(/back/gi, '');

      const imageArray = imageArrayAfterFrontBackDelete(images, isBack);

      // --- Delete from S3 or backend ---
      await dispatch(deleteImage({ key: String(id) }));

      // --- Prepare update payload ---
      const backendField = personalDetailsBackendField(baseField);

      const payload: UpdateDocumentImagePayload = {
        opportunityId: oppId ?? '',
        path: `${applicantKey}.personalDetails.${backendField}`,
        images: imageArray,
      };

      await dispatch(updateDocumentImage(payload));
    } catch (error) {
      console.error('Error updating applicant details:', error);
    }
  };

  const showDocumentReceivedoffline = () =>
    shouldShowDocumentsReceivedOfflineSection(
      [applicant1Array, applicant2Array, applicant3Array, applicant4Array],
      uploadDocumentsFormik?.values?.transactions?.length ?? 0,
      !!uploadDocumentsFormik?.values?.showGSTFields
    );

  const applicants = [
    { id: 1, array: applicant1Array, show: () => applicantRowHasContent(applicant1Array) },
    { id: 2, array: applicant2Array, show: () => applicantRowHasContent(applicant2Array) },
    { id: 3, array: applicant3Array, show: () => applicantRowHasContent(applicant3Array) },
    { id: 4, array: applicant4Array, show: () => applicantRowHasContent(applicant4Array) },
  ];

  const isDualUploadField = (field: string) =>
    ['aadhaar']?.some((doc) => field?.includes(doc));

  return showDocumentReceivedoffline() ? (
    <Stack className="documentsReceivedOffline">
      <form
        onSubmit={uploadDocumentsFormik.handleSubmit}
        onReset={uploadDocumentsFormik.handleReset}
      >
        <BorderBox title="Documents Received Offline">
          <>
            {applicants.map(({ id, array, show }) =>
              show() ? (
                <OfflineApplicantDocumentsSection
                  key={id}
                  applicantId={id}
                  rows={array}
                  uploadDocumentsFormik={uploadDocumentsFormik}
                  handleUpload={handleUpload}
                  handleDelete={handleDelete}
                  isDualUploadField={isDualUploadField}
                />
              ) : null
            )}
          </>
          <OfflinePaymentProofSection
            uploadDocumentsFormik={uploadDocumentsFormik}
            handleUpload={handleUpload}
            handlePaymentDelete={handlePaymentDelete}
          />

          <Divider sx={{ borderStyle: 'dashed', borderColor: '#DADADA', mb: 2, mt: 2 }} />

          <UploadAdditionalDocuments
            type="additional_documents"
            stage="post_booking"
            showBorder={false}
          />

          <div className="filledButtonAll" style={{ display: 'flex', gap: '16px' }}>
            <FilledButton
              type="button"
              onClick={() => {
                handleSubmit(true);
              }}
              isLoading={saveLoading}
              label="Office Use"
              endIcon={<ArrowCircleRight />}
            />
            <FilledButton
              type="submit"
              onClick={() => {
                handleSubmit(false);
              }}
              isLoading={isLoading}
              label="Submit"
            />
          </div>
        </BorderBox>
      </form>
    </Stack>
  ) : (
    <BorderBox>
      <UploadAdditionalDocuments
        type="additional_documents"
        stage="post_booking"
        showBorder={false}
        isOfficeUseButton
        handleNext={() => {
          handleSubmit(false);
        }}
        saveLoading={isLoading}
      />
    </BorderBox>
  );
};

export default DocumentsReceivedOffline;