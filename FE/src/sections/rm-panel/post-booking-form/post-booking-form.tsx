import { useEffect } from 'react';
import { useFormik } from 'formik';

import InfoIcon from '@mui/icons-material/Info';
import {
  Box,
  Grid,
  Stack,
  Divider,
  Tooltip,
  debounce,
  Typography,
  IconButton,
} from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux'; // Import Formik
import type { UploadDocumentsValues } from 'src/types/rm-panel/user';

import * as yup from 'yup';

import { ROOTS } from 'src/routes/paths';
import { useParams, useRouter } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';
import { uploadFile, getPresignedUrl } from 'src/redux/actions/rm-panel/upload-actions';
import {
  salesSignedPdf,
  getMasterDataList,
  getApplicantDetails,
  getOpportunityDetails,
} from 'src/redux/actions/rm-panel/dashboard-actions';

import { AnimateLogo1 } from 'src/components/animate';
import Dropzone from 'src/components/dropzone/Dropzone';
import OfficeUse from 'src/components/office-use/OfficeUse';
import { BorderBox } from 'src/components/border-box/BorderBox';
import { FilledButton } from 'src/components/buttons/FilledButton';
import { HeaderWidget } from 'src/components/header-cards/HeaderWidget';
import DocumentsReceivedOffline from 'src/components/documents-received-offline/DocumentsReceivedOffline';

interface UploadPayload {
  presignedUrl: string;
  file: File;
}

export default function PostBookingForm() {
  const dispatch = useAppDispatch();
  const { oppId } = useParams();
  const router = useRouter();
  interface ApplicantDetailsResponse {
    response: any;
    errors: any;
    isCompleted: boolean;
  }
  const { opportunity, applicantData, postBookingStep } = useAppSelector(
    (state) => state.dashboard
  );

  useEffect(() => {
    dispatch(getOpportunityDetails(`/${oppId}`));
    dispatch(getMasterDataList());
    const fetchApplicantDetails = async () => {
      const response = await dispatch(getApplicantDetails(`/${oppId}`));
      const payload = response?.payload as ApplicantDetailsResponse;
      if (
        payload?.errors?.statusCode !== 200 &&
        (payload?.isCompleted === false || payload?.isCompleted === undefined)
      ) {
        router.push(`${ROOTS.RM_PANEL}/bookings`);
      }
    };
    fetchApplicantDetails();
  }, [dispatch, oppId, router, postBookingStep]);

  const uploadDocumentsFormik = useFormik<UploadDocumentsValues>({
    initialValues: {
      // Applicant 1
      applicant1pan: '',
      applicant1panImage: '',
      applicant1aadhaar: '',
      applicant1aadhaarImage: '',
      applicant1aadhaarbackImage: '',
      applicant1passport: '',
      applicant1passportImage: '',
      applicant1passportbackImage: '',
      applicant1oci: '',
      applicant1ociImage: '',
      applicant1ocibackImage: '',
      applicant1photoImage: '',
      applicant1AddressProof: '',
      applicant1AddressProofImage: '',
      applicant1GST: '',
      applicant1GSTImage: '',
      applicant1LegalGuardianImage: '',

      // Applicant 1 Physical Flags
      isPhysicalApplicant1Aadhaar: false,
      isPhysicalApplicant1Pan: false,
      isPhysicalApplicant1Passport: false,
      isPhysicalApplicant1OCI: false,
      isPhysicalApplicant1Image: false,
      isPhysicalApplicant1AddressProof: false,
      isPhysicalApplicant1GST: false,
      isPhysicalApplicant1LegalGuardianDoc: false,

      // Applicant 2
      applicant2pan: '',
      applicant2panImage: '',
      applicant2aadhaar: '',
      applicant2aadhaarImage: '',
      applicant2aadhaarbackImage: '',
      applicant2passport: '',
      applicant2passportImage: '',
      applicant2passportbackImage: '',
      applicant2oci: '',
      applicant2ociImage: '',
      applicant2ocibackImage: '',
      applicant2photoImage: '',
      applicant2AddressProof: '',
      applicant2AddressProofImage: '',
      applicant2GST: '',
      applicant2GSTImage: '',
      applicant2LegalGuardianImage: '',

      // Applicant 2 Physical Flags
      isPhysicalApplicant2Aadhaar: false,
      isPhysicalApplicant2Pan: false,
      isPhysicalApplicant2Passport: false,
      isPhysicalApplicant2OCI: false,
      isPhysicalApplicant2Image: false,
      isPhysicalApplicant2AddressProof: false,
      isPhysicalApplicant2GST: false,
      isPhysicalApplicant2LegalGuardianDoc: false,

      // Applicant 3
      applicant3pan: '',
      applicant3panImage: '',
      applicant3aadhaar: '',
      applicant3aadhaarImage: '',
      applicant3aadhaarbackImage: '',
      applicant3passport: '',
      applicant3passportImage: '',
      applicant3passportbackImage: '',
      applicant3oci: '',
      applicant3ociImage: '',
      applicant3ocibackImage: '',
      applicant3photoImage: '',
      applicant3AddressProof: '',
      applicant3AddressProofImage: '',
      applicant3GST: '',
      applicant3GSTImage: '',
      applicant3LegalGuardianImage: '',

      // Applicant 3 Physical Flags
      isPhysicalApplicant3Aadhaar: false,
      isPhysicalApplicant3Pan: false,
      isPhysicalApplicant3Passport: false,
      isPhysicalApplicant3OCI: false,
      isPhysicalApplicant3Image: false,
      isPhysicalApplicant3AddressProof: false,
      isPhysicalApplicant3GST: false,
      isPhysicalApplicant3LegalGuardianDoc: false,

      // Applicant 4
      applicant4pan: '',
      applicant4panImage: '',
      applicant4aadhaar: '',
      applicant4aadhaarImage: '',
      applicant4aadhaarbackImage: '',
      applicant4passport: '',
      applicant4passportImage: '',
      applicant4passportbackImage: '',
      applicant4oci: '',
      applicant4ociImage: '',
      applicant4ocibackImage: '',
      applicant4photoImage: '',
      applicant4AddressProof: '',
      applicant4AddressProofImage: '',
      applicant4GST: '',
      applicant4GSTImage: '',
      applicant4LegalGuardianImage: '',

      // Applicant 4 Physical Flags
      isPhysicalApplicant4Aadhaar: false,
      isPhysicalApplicant4Pan: false,
      isPhysicalApplicant4Passport: false,
      isPhysicalApplicant4OCI: false,
      isPhysicalApplicant4Image: false,
      isPhysicalApplicant4AddressProof: false,
      isPhysicalApplicant4GST: false,
      isPhysicalApplicant4LegalGuardianDoc: false,

      applicant1isAadhaarVerified: false,
      applicant2isAadhaarVerified: false,
      applicant3isAadhaarVerified: false,
      applicant4isAadhaarVerified: false,

      // Common Fields
      signedPdf: '',
      transactions: [],
    },

    validationSchema: yup.object().shape({
      // ---------- Applicant 1 ----------
      applicant1pan: yup
        .string()
        .matches(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, 'PAN number must be in the format ABCDE1234F')
        .when('isPhysicalApplicant1Pan', ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 1 PAN is required')
            : schema.notRequired()
        ),

      applicant1panImage: yup.mixed().when('isPhysicalApplicant1Pan', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 1 PAN Image is required')
          : schema.notRequired()
      ),

      applicant1aadhaar: yup
        .string()
        .when(['isPhysicalApplicant1Aadhaar', 'applicant1isAadhaarVerified'], ([isPhysical, isVerified], schema) =>
          isPhysical === true && isVerified === false
            ? schema
                .matches(
                  /^[2-9]\d{11}$/,
                  'Aadhaar number must be a 12-digit number starting from 2-9'
                )
                .required('Applicant 1 Aadhaar is required')
            : schema.notRequired()
        ),

      applicant1aadhaarImage: yup.mixed().when('isPhysicalApplicant1Aadhaar', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 1 Aadhaar Image is required')
          : schema.notRequired()
      ),

      applicant1passport: yup.string().when('isPhysicalApplicant1Passport', ([isPhysical], schema) =>
        isPhysical === true
          ? schema
              .matches(/^[A-Za-z0-9]{6,9}$/, 'Please enter valid Passport Number')
              .required('Applicant 1 Passport is required')
          : schema.notRequired()
      ),

      applicant1passportImage: yup.mixed().when('isPhysicalApplicant1Passport', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 1 Passport Image is required')
          : schema.notRequired()
      ),

      applicant1oci: yup.string().when('isPhysicalApplicant1OCI', ([isPhysical], schema) =>
        isPhysical === true
          ? schema
              .matches(/^[A-Z]\d{7}$/, 'OCI Number must be in format A1234567	')
              .required('Applicant 1 OCI is required')
          : schema.notRequired()
      ),

      applicant1ociImage: yup.mixed().when('isPhysicalApplicant1OCI', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 1 OCI Image is required')
          : schema.notRequired()
      ),

      applicant1photoImage: yup.mixed().when('isPhysicalApplicant1Image', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 1 Photo Image is required')
          : schema.notRequired()
      ),

      applicant1AddressProof: yup.mixed().when('isPhysicalApplicant1AddressProof', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 1 Other Document is required')
          : schema.notRequired()
      ),

      applicant1AddressProofImage: yup.mixed().when(
        'isPhysicalApplicant1AddressProof',
        ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 1 Other Document Image is required')
            : schema.notRequired()
      ),

      applicant1LegalGuardianImage: yup.mixed().when(
        'isPhysicalApplicant1LegalGuardianDoc',
        ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 1 Legal Guardian Document is required')
            : schema.notRequired()
      ),

      // ---------- Applicant 2 ----------
      applicant2pan: yup
        .string()
        .matches(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, 'PAN number must be in the format ABCDE1234F')
        .when('isPhysicalApplicant2Pan', ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 2 PAN is required')
            : schema.notRequired()
        ),

      applicant2panImage: yup.mixed().when('isPhysicalApplicant2Pan', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 2 PAN Image is required')
          : schema.notRequired()
      ),

      applicant2aadhaar: yup
        .string()
        .when(['isPhysicalApplicant2Aadhaar', 'applicant2isAadhaarVerified'], ([isPhysical, isVerified], schema) =>
          isPhysical === true && isVerified === false
            ? schema
                .matches(
                  /^[2-9]\d{11}$/,
                  'Aadhaar number must be a 12-digit number starting from 2-9'
                )
                .required('Applicant 2 Aadhaar is required')
            : schema.notRequired()
        ),
      applicant2aadhaarImage: yup.mixed().when('isPhysicalApplicant2Aadhaar', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 2 Aadhaar Image is required')
          : schema.notRequired()
      ),

      applicant2passport: yup.string().when('isPhysicalApplicant2Passport', ([isPhysical], schema) =>
        isPhysical === true
          ? schema
              .matches(/^[A-Za-z0-9]{6,9}$/, 'Please enter valid Passport Number')
              .required('Applicant 2 Passport is required')
          : schema.notRequired()
      ),

      applicant2passportImage: yup.mixed().when('isPhysicalApplicant2Passport', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 2 Passport Image is required')
          : schema.notRequired()
      ),

      applicant2oci: yup.string().when('isPhysicalApplicant2OCI', ([isPhysical], schema) =>
        isPhysical === true
          ? schema
              .matches(/^[A-Z]\d{7}$/, 'OCI Number must be in format A1234567	')
              .required('Applicant 2 OCI is required')
          : schema.notRequired()
      ),

      applicant2ociImage: yup.mixed().when('isPhysicalApplicant2OCI', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 2 OCI Image is required')
          : schema.notRequired()
      ),

      applicant2photoImage: yup.mixed().when('isPhysicalApplicant2Image', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 2 Photo Image is required')
          : schema.notRequired()
      ),

      applicant2AddressProof: yup.mixed().when('isPhysicalApplicant2AddressProof', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 2 Other Document is required')
          : schema.notRequired()
      ),

      applicant2AddressProofImage: yup.mixed().when(
        'isPhysicalApplicant2AddressProof',
        ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 2 Other Document Image is required')
            : schema.notRequired()
      ),

      applicant2LegalGuardianImage: yup.mixed().when(
        'isPhysicalApplicant2LegalGuardianDoc',
        ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 2 Legal Guardian Document is required')
            : schema.notRequired()
      ),

      // ---------- Applicant 3 ----------
      applicant3pan: yup
        .string()
        .matches(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, 'PAN number must be in the format ABCDE1234F')
        .when('isPhysicalApplicant3Pan', ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 3 PAN is required')
            : schema.notRequired()
        ),

      applicant3panImage: yup.mixed().when('isPhysicalApplicant3Pan', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 3 PAN Image is required')
          : schema.notRequired()
      ),

      applicant3aadhaar: yup
        .string()
        .when(['isPhysicalApplicant3Aadhaar', 'applicant3isAadhaarVerified'], ([isPhysical, isVerified], schema) =>
          isPhysical === true && isVerified === false
            ? schema
                .matches(
                  /^[2-9]\d{11}$/,
                  'Aadhaar number must be a 12-digit number starting from 2-9'
                )
                .required('Applicant 3 Aadhaar is required')
            : schema.notRequired()
        ),

      applicant3aadhaarImage: yup.mixed().when('isPhysicalApplicant3Aadhaar', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 3 Aadhaar Image is required')
          : schema.notRequired()
      ),

      applicant3passport: yup.string().when('isPhysicalApplicant3Passport', ([isPhysical], schema) =>
        isPhysical === true
          ? schema
              .matches(/^[A-Za-z0-9]{6,9}$/, 'Please enter valid Passport Number')
              .required('Applicant 3 Passport is required')
          : schema.notRequired()
      ),

      applicant3passportImage: yup.mixed().when('isPhysicalApplicant3Passport', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 3 Passport Image is required')
          : schema.notRequired()
      ),

      applicant3oci: yup.string().when('isPhysicalApplicant3OCI', ([isPhysical], schema) =>
        isPhysical === true
          ? schema
              .matches(/^[A-Z]\d{7}$/, 'OCI Number must be in format A1234567	')
              .required('Applicant 3 OCI is required')
          : schema.notRequired()
      ),

      applicant3ociImage: yup.mixed().when('isPhysicalApplicant3OCI', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 3 OCI Image is required')
          : schema.notRequired()
      ),

      applicant3photoImage: yup.mixed().when('isPhysicalApplicant3Image', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 3 Photo Image is required')
          : schema.notRequired()
      ),

      applicant3AddressProof: yup.mixed().when('isPhysicalApplicant3AddressProof', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 3 Other Document is required')
          : schema.notRequired()
      ),

      applicant3AddressProofImage: yup.mixed().when(
        'isPhysicalApplicant3AddressProof',
        ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 3 Other Document Image is required')
            : schema.notRequired()
      ),

      applicant3LegalGuardianImage: yup.mixed().when(
        'isPhysicalApplicant3LegalGuardianDoc',
        ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 3 Legal Guardian Document is required')
            : schema.notRequired()
      ),

      // ---------- Applicant 4 ----------
      applicant4pan: yup
        .string()
        .matches(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, 'PAN number must be in the format ABCDE1234F')
        .when('isPhysicalApplicant4Pan', ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 4 PAN is required')
            : schema.notRequired()
        ),

      applicant4panImage: yup.mixed().when('isPhysicalApplicant4Pan', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 4 PAN Image is required')
          : schema.notRequired()
      ),
      applicant4aadhaar: yup
        .string()
        .when(['isPhysicalApplicant4Aadhaar', 'applicant4isAadhaarVerified'], ([isPhysical, isVerified], schema) =>
          isPhysical === true && isVerified === false
            ? schema
                .matches(
                  /^[2-9]\d{11}$/,
                  'Aadhaar number must be a 12-digit number starting from 2-9'
                )
                .required('Applicant 4 Aadhaar is required')
            : schema.notRequired()
        ),
      applicant4aadhaarImage: yup.mixed().when('isPhysicalApplicant4Aadhaar', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 4 Aadhaar Image is required')
          : schema.notRequired()
      ),

      applicant4passport: yup.string().when('isPhysicalApplicant4Passport', ([isPhysical], schema) =>
        isPhysical === true
          ? schema
              .matches(/^[A-Za-z0-9]{6,9}$/, 'Please enter valid Passport Number')
              .required('Applicant 4 Passport is required')
          : schema.notRequired()
      ),

      applicant4passportImage: yup.mixed().when('isPhysicalApplicant4Passport', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 4 Passport Image is required')
          : schema.notRequired()
      ),

      applicant4oci: yup.string().when('isPhysicalApplicant4OCI', ([isPhysical], schema) =>
        isPhysical === true
          ? schema
              .matches(/^[A-Z]\d{7}$/, 'OCI Number must be in format A1234567	')
              .required('Applicant 4 OCI is required')
          : schema.notRequired()
      ),

      applicant4ociImage: yup.mixed().when('isPhysicalApplicant4OCI', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 4 OCI Image is required')
          : schema.notRequired()
      ),

      applicant4photoImage: yup.mixed().when('isPhysicalApplicant4Image', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 4 Photo Image is required')
          : schema.notRequired()
      ),

      applicant4AddressProof: yup.mixed().when('isPhysicalApplicant4AddressProof', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 4 Other Document is required')
          : schema.notRequired()
      ),

      applicant4AddressProofImage: yup.mixed().when(
        'isPhysicalApplicant4AddressProof',
        ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 4 Other Document Image is required')
            : schema.notRequired()
      ),

      applicant4LegalGuardianImage: yup.mixed().when(
        'isPhysicalApplicant4LegalGuardianDoc',
        ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 4 Legal Guardian Document is required')
            : schema.notRequired()
      ),

      // ---------- Common Fields ----------
      signedPdf: yup.string().required('Booking Form is required'),

      applicant1GST: yup
        .string()
        .matches(
          /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/,
          'Applicant 1 GST number must be in the format 22AAAAA0000A1Z5'
        )
        .when('isPhysicalApplicant1GST', ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 1 GST is required')
            : schema.notRequired()
        ),

      applicant1GSTImage: yup.mixed().when('isPhysicalApplicant1GST', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 1 GST Image is required')
          : schema.notRequired()
      ),

      applicant2GST: yup
        .string()
        .matches(
          /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/,
          'Applicant 2 GST number must be in the format 22AAAAA0000A1Z5'
        )
        .when('isPhysicalApplicant2GST', ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 2 GST is required')
            : schema.notRequired()
        ),

      applicant2GSTImage: yup.mixed().when('isPhysicalApplicant2GST', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 2 GST Image is required')
          : schema.notRequired()
      ),

      applicant3GST: yup
        .string()
        .matches(
          /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/,
          'Applicant 3 GST number must be in the format 22AAAAA0000A1Z5'
        )
        .when('isPhysicalApplicant3GST', ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 3 GST is required')
            : schema.notRequired()
        ),

      applicant3GSTImage: yup.mixed().when('isPhysicalApplicant3GST', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 3 GST Image is required')
          : schema.notRequired()
      ),

      applicant4GST: yup
        .string()
        .matches(
          /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/,
          'Applicant 4 GST number must be in the format 22AAAAA0000A1Z5'
        )
        .when('isPhysicalApplicant4GST', ([isPhysical], schema) =>
          isPhysical === true
            ? schema.required('Applicant 4 GST is required')
            : schema.notRequired()
        ),

      applicant4GSTImage: yup.mixed().when('isPhysicalApplicant4GST', ([isPhysical], schema) =>
        isPhysical === true
          ? schema.required('Applicant 4 GST Image is required')
          : schema.notRequired()
      ),

      transactions: yup.array().of(
        yup.object().shape({
          isPhysicalPaymentProof: yup.string().notRequired(),
          paymentProof: yup.mixed().required('Payment Proof is required'),
          transactionId: yup.string().notRequired(),
        })
      ),
    }),

    onSubmit: (values) => {},
  });

  const debouncedValidate = debounce(() => {
    uploadDocumentsFormik.validateForm();
  }, 300);


  useEffect(() => {
    if (!applicantData?.data) return;

    const { applicant1, applicant2, applicant3, applicant4, payments, signedPdf } =
      applicantData?.data || {};

    // Helper to normalize any image field (handles string or array safely)
    const normalizeImage = (img: any) => {
      if (!img) return [null, null];

      if (typeof img === 'string') return [img, null];

      if (Array.isArray(img)) {
        const valid = img.filter((v) => typeof v === 'string' && v.trim() !== '');
        return [valid[0] || null, valid[1] || null];
      }

      return [null, null];
    };

    const extractApplicantValues = (applicantKey: string, applicantDataObj?: any) => {
      if (!applicantDataObj?.personalDetails) return {};

      const p = applicantDataObj?.personalDetails || {};
      const prof = applicantDataObj?.professionalDetails || {};

      const [panImg] = normalizeImage(p?.panImage);
      const [aadhaarFront, aadhaarBack] = normalizeImage(p?.aadhaarImage);
      const [passportFront, passportBack] = normalizeImage(p?.passportImage);
      const [ociFront, ociBack] = normalizeImage(p?.ociImage);
      const [photo] = normalizeImage(p?.image);
      const [addressProof] = normalizeImage(p?.addressProofImage);
      const [gstCert] = normalizeImage(prof?.gstCertificate);
      const [legalGuardianDocImg] = normalizeImage(p?.legalGuardianDoc);

      const keyCap = applicantKey.charAt(0).toUpperCase() + applicantKey.slice(1);

      return {
        // Document values
        [`${applicantKey}pan`]: p?.panNumber || '',
        [`${applicantKey}panImage`]: panImg,
        [`${applicantKey}aadhaar`]: p?.aadhaarNumber || '',
        [`${applicantKey}aadhaarImage`]: aadhaarFront,
        [`${applicantKey}aadhaarbackImage`]: aadhaarBack,
        [`${applicantKey}passport`]: p?.passportNumber || '',
        [`${applicantKey}passportImage`]: passportFront,
        [`${applicantKey}passportbackImage`]: passportBack,
        [`${applicantKey}oci`]: p?.ociNumber || '',
        [`${applicantKey}ociImage`]: ociFront,
        [`${applicantKey}ocibackImage`]: ociBack,
        [`${applicantKey}photoImage`]: photo,
        [`${applicantKey}AddressProof`]: p?.addressProofType || null,
        [`${applicantKey}AddressProofImage`]: addressProof,
        [`${applicantKey}GST`]: prof?.gstNumber || null,
        [`${applicantKey}GSTImage`]: gstCert,
        [`${applicantKey}isAadhaarVerified`]: p?.isAadhaarVerified,
        [`${applicantKey}Name`]:
          p?.firstName || p?.lastName ? `${p?.firstName || ''} ${p?.lastName || ''}`.trim() : '',
        [`${applicantKey}LegalGuardianImage`]: legalGuardianDocImg,

        // Physical flags
        [`isPhysical${keyCap}Pan`]: p?.isPhysicalPan || false,
        [`isPhysical${keyCap}Aadhaar`]: p?.isPhysicalAadhaar || false,
        [`isPhysical${keyCap}Passport`]: p?.isPhysicalPassport || false,
        [`isPhysical${keyCap}OCI`]: p?.isPhysicalOCI || false,
        [`isPhysical${keyCap}Image`]: p?.isPhysicalImage || false,
        [`isPhysical${keyCap}AddressProof`]: p?.isPhysicalAddressProof || false,
        [`isPhysical${keyCap}GST`]: prof?.isPhysicalGST || false,
        [`isPhysical${keyCap}LegalGuardianDoc`]: p?.isPhysicalLegalGuardianDoc || false,
      };
    };

    const applicantsData = {
      ...extractApplicantValues('applicant1', applicant1),
      ...extractApplicantValues('applicant2', applicant2),
      ...extractApplicantValues('applicant3', applicant3),
      ...extractApplicantValues('applicant4', applicant4),
    };

    // Safely map payment details (excluding nested or invalid proofs)
    const transactions =
      payments
        ?.filter((tx) => tx?.paymentDetails?.isPhysicalPaymentProof)
        ?.map((tx) => {
          const [paymentProof] = normalizeImage(tx?.paymentDetails?.paymentProof);
          return {
            isPhysicalPaymentProof: tx?.paymentDetails?.isPhysicalPaymentProof || false,
            paymentProof: paymentProof || null,
            transactionNumber:
              tx?.paymentDetails?.gatewayPaymentId ||
              tx?.paymentDetails?.transactionNumber ||
              tx?.paymentDetails?.chequeNumber ||
              '',
            transactionId: tx?.id,
            fieldName: 'paymentProof',
          };
        }) || [];

    uploadDocumentsFormik.setValues({
      ...uploadDocumentsFormik.values,
      ...applicantsData,
      signedPdf: signedPdf || '',
      transactions,
    });

    debouncedValidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicantData]);

  const handleUpload = async (fieldName: string, selectedFile: File) => {
    if (!selectedFile) {
      console.warn('No files selected for upload.');
      return;
    }
    try {
      const fileObjects = {
        folder: `signed-pdf/${oppId}`,
        key: selectedFile.name.replaceAll(/\s+/g, ''),
      };
      const res = await dispatch(getPresignedUrl(fileObjects)).unwrap();
      if (res?.statusCode === 201) {
        const payload: UploadPayload = {
          presignedUrl: res?.data?.signedUrl,
          file: selectedFile,
        };
        (async () => {
          const uploadResponse = await dispatch(uploadFile(payload)).unwrap();
          if (uploadResponse?.status === 200) {
            uploadDocumentsFormik.setFieldValue(
              'signedPdf',
              `${res.data.s3Basepath}${res.data.key}`
            );
          }
        })().catch((uploadErr) => {
          console.error('Error during signed PDF upload:', uploadErr);
        });
        const savePayload = `${res.data.key}`;
        dispatch(
          salesSignedPdf({
            opid: oppId as string,
            signedPdf: savePayload,
          })
        );
      }
    } catch (error) {
      console.error('❌ Error during file upload or document save:', error);
    }
  };

  const handledelete = async (fieldName: string, selectedFile: File) => {
    uploadDocumentsFormik.setFieldValue('signedPdf', ''); // Reset the Formik field when file is deleted
    dispatch(
      salesSignedPdf({
        opid: oppId as string,
        signedPdf: '', // Remove the signed PDF
      })
    );
  };

  const signedPdfUrl = applicantData.data?.signedPdf
    ? `${CONFIG.site.s3BasePath}/${applicantData.data?.signedPdf}`
    : '';

  const headerCardData = [
    { headingName: 'Opportunity ID', value: opportunity?.data?.OppId ?? '' },
    {
      headingName: 'Opportunity Name',
      value:
        [opportunity?.data?.Cname, opportunity?.data?.X1st_Applicant_Last_Name]
          .filter(Boolean)
          .join(' ') || '',
    },
    { headingName: 'Project', value: opportunity?.data?.ProjectName || '' },
    {
      headingName: 'Unit',
      value:
        [opportunity?.data?.Project_Name, opportunity?.data?.Block, opportunity?.data?.UnitNo]
          .filter(Boolean)
          .join(' / ') || '',
    },
  ];

  return (
    <>
      {applicantData?.loading || opportunity?.loading ? (
        <Box
          sx={{
            width: '100%',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimateLogo1 />
        </Box>
      ) : (
        <Stack className="dashboard-page-wrapper secondPage">
          <Box className="box-width-p-l-r">
            <Typography
              sx={{
                fontSize: { xs: '14px', sm: '16px' },
                fontWeight: 600,
                mb: 3,
                mt: 3,
                textAlign: 'center',
                wordBreak: 'break-word',
              }}
            >
              {postBookingStep === 0 ? 'Post Booking Form' : 'Office use section'}
            </Typography>
            <Grid container spacing={3}>
              {headerCardData.map((card) => (
                <Grid item xs={12} sm={6} md={3} key={card.headingName}>
                  <HeaderWidget headingName={card.headingName} value={card?.value} />
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ mt: 2, borderStyle: 'dashed', borderColor: '#DADADA' }} />
            {postBookingStep === 0 && (
              <BorderBox
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0',
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: '14px', sm: '16px' },
                    fontWeight: 600,
                    textAlign: 'center',
                    mb: 3,
                    wordBreak: 'break-word',
                  }}
                >
                  Booking Form
                  {!signedPdfUrl && (
                    <Tooltip
                      enterTouchDelay={0}
                      title="Please upload booking form along with Cost Sheet and other documents."
                      placement="bottom"
                    >
                      <IconButton sx={{ ml: 1 }}>
                        {' '}
                        <InfoIcon />{' '}
                      </IconButton>
                    </Tooltip>
                  )}
                </Typography>
                {signedPdfUrl && (
                  <FilledButton
                    label="View"
                    onClick={() => {
                      if (typeof signedPdfUrl === 'string' && signedPdfUrl !== '') {
                        window.open(signedPdfUrl, '_blank');
                      } else {
                        alert('No signed PDF available');
                      }
                    }}
                    width="20%"
                  />
                )}
                {postBookingStep === 0 && !signedPdfUrl && (
                  <Grid xs={12} className="UploadinputBookingform">
                    <Dropzone
                      name="signedPdf"
                      fileValue={uploadDocumentsFormik.values.signedPdf}
                      required
                      documentType="pdf"
                      // Allow up to 10MB specifically for Booking Form PDF
                      maxPdfSizeBytes={10 * 1024 * 1024}
                      handleupload={handleUpload}
                      handledelete={handledelete}
                      formik={uploadDocumentsFormik}
                    />
                  </Grid>
                )}
              </BorderBox>
            )}
            {postBookingStep === 0 && (
              <DocumentsReceivedOffline uploadDocumentsFormik={uploadDocumentsFormik} />
            )}
            {postBookingStep === 1 && <OfficeUse />}
          </Box>
        </Stack>
      )}
    </>
  );
}