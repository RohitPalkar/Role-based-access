/* eslint-disable import/no-extraneous-dependencies */
import '../../style.css';

import type { RootState } from 'src/redux/store';

import * as yup from 'yup';
import { useFormik } from 'formik';
import { useDebounce } from 'minimal-shared/hooks';
import React, { useRef, useState, useEffect } from 'react';

import { ArrowCircleLeft } from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { Box, Grid, Button, Switch, Divider, InputBase, TextField, Typography } from '@mui/material';

import { ROOTS } from 'src/routes/paths';
import { useParams, useRouter } from 'src/routes/hooks';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { ROLES, OFFICE_USE, OWNER_TYPE, RESIDING_AS, PRIMARY_SOURCE, BOOKING_REGION, toaster_messages, BOOKING_FORM_STATUS } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { fetchCountries } from 'src/redux/actions/country-list-actions';
import {
  uploadFile,
  deleteImage,
  getPresignedUrl,
  saveBookingDocument,
} from 'src/redux/actions/rm-panel/upload-actions';
import {
  updateOfficeUse,
  searchSFDCUsers,
  officeUseDetails,
  getMasterDataList,
  getApplicantDetails,
  searchSalesTeamDropdown,
} from 'src/redux/actions/rm-panel/dashboard-actions';
import {
  setpreBookingStep,
  clearSearchResults,
  setpostBookingStep,
  type OfficeUseValues,
  clearSalesTeamDropdownResults,
  type ReferrerDetails as ReferrerDetailsInterface,
} from 'src/redux/slices/rm-panel/dashboard-slice';

import { toast } from 'src/components/snackbar';
import { BorderBox } from 'src/components/border-box/BorderBox';

import NewDropzone from '../dropzone/NewDropzone';
import { FilledButton } from '../buttons/FilledButton';
import { CustomAutoSelectSingle } from '../customautocomplete';
import ReferrerDetails from '../referrer-details/ReferrerDetails';
import CustomAutocomplete from '../customautocomplete/CustomAutocomplete';
import FormikAutocomplete from '../formik-autocomplete/FormikAutocomplete';
import UploadMoreDocuments from '../upload-more-documents/UploadMoreDocuments';
import ConditionalRadioField from '../conditional-radio-button/ConditionalRadioField';
import UploadAdditionalDocuments from '../upload-additonal-documents/UploadAdditionalDocuments';

interface UploadPayload {
  presignedUrl: string;
  file: File;
}

interface Errors {
  officeInfo?:{
    businessHeadName?: {
      userName?: string;
    };
    salesTeam?: {
      rmName?: string;
      rmEmployeeId?: string;
      tlName?: string;
      tlEmployeeId?: string;
      rshName?: string;
      rshEmployeeId?: string;
    }[];
  }
}

const jsonValue = uiText.officeUse;

const RADIO_BTN_OPTIONS = [
  { label: jsonValue.options.yes, value: OFFICE_USE.YES },
  { label: jsonValue.options.no, value: OFFICE_USE.NO },
]

function getFirstDocument(doc: File | string | string[] | null | undefined): File | string | null {
  if (Array.isArray(doc)) return doc[0] || null;
  return doc || null;
}

const OfficeUse: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { oppId } = useParams();
  const [corpEmailIdPath, setCorpEmailIdPath] = useState<any>();
  const [isBisMTPApprovalFilePath, setIsBisMTPApprovalFilePath] = useState<any>();
  const [corpIdCardPath, setCorpIdCardPath] = useState<any>();
  const [bisApprovalPath, setBisApprovalPath] = useState<any>();
  const [npvSheetApprovalPath, setNpvSheetApprovalPath] = useState<any>();
  const [leadRegProofPath, setLeadRegProofPath] = useState<any>();
  const [businessHeadApprovalPath, setBusinessHeadApprovalPath] = useState<any>();
  const [remainingPaymentApprovalPath, setRemainingPaymentApprovalPath] = useState<any>();
  const [approvalProofPath, setApprovalProofPath] = useState<any>();
  
  const [countryInputValue, setCountryInputValue] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<any[]>([]);
  const [countryLoading, setCountryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<any>();
  const [salesTeamSearchQuery, setSalesTeamSearchQuery] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [isPostLoading, setIsPostLoading] = useState(false);
  const [isPointsAdjustmentEnabled, setIsPointsAdjustmentEnabled] = useState<boolean>(true);
  const searchKeyNameRef = useRef('');
  const salesTeamSearchKeyNameRef = useRef('');
  const debouncedSearchQuery = useDebounce(searchQuery?.[searchKeyNameRef.current] || '', 500);
  const debouncedSalesTeamSearchQuery = useDebounce(
    salesTeamSearchQuery?.[salesTeamSearchKeyNameRef.current] || '',
    500
  );
  const {
    applicantData,
    officeUseData,
    opportunity,
    preBookingStep,
    postBookingStep,
    searchResults,
    salesTeamDropdownResults,
    masterData
  } = useAppSelector((state) => state.dashboard);
  const { countryList} = useAppSelector((state: RootState) => state.countries);

  const [isCorporateSales, setIsCorporateSales] = useState(
    officeUseData?.data?.officeInfo?.isCorporateSales ??
      opportunity?.data?.Corporate_Sales_Verification ??
      false
  );

  const referrer = applicantData?.data?.referrerDetails;
  const referralList: ReferrerDetailsInterface = {
    city: referrer?.city || '',
    name: referrer?.name || opportunity?.data?.OppName,
    email: referrer?.email || '',
    pinCode: referrer?.pinCode || '',
    relation: referrer?.relation || '',
    unitNumber: referrer?.unitNumber || opportunity?.data?.UnitNumber || '',
    tower: referrer?.tower || opportunity?.data?.tower || '',
    residingAs: referrer?.residingAs || opportunity?.data?.residingAs || '',
    ownerType: referrer?.ownerType || opportunity?.data?.ownerType || '',
    countryCode: referrer?.countryCode || '',
    mobileNumber: referrer?.mobileNumber || '',
    propertyName: referrer?.propertyName || opportunity?.data?.PropoertyName || '',
    address: referrer?.address || '',
    houseNumber: referrer?.houseNumber || '',
    pointsAdjustment:
      referrer?.pointsAdjustment || opportunity?.data?.Privilege_Adjustment || false,
    saleDeedDocument: referrer?.saleDeedDocument || opportunity?.data?.saleDeedDocument || [] as string[],
    rentalAgreement: referrer?.rentalAgreement || opportunity?.data?.rentalAgreement || [] as string[],

  };

  const validate = (values: any): Errors => {
    const errors: Errors = {};

    if (!values?.officeInfo?.businessHeadName?.userName) {
      errors.officeInfo = {
        ...(errors?.officeInfo),
        businessHeadName: { userName: 'Business Head Name is required' },
      };
    }

    const salesTeam = values?.officeInfo?.salesTeam;
    if (Array.isArray(salesTeam) && salesTeam.length > 1) {
      const secondErrors: Record<string, string> = {};
      if (!salesTeam[1]?.rmName?.userName) secondErrors.rmName = 'Closing RM Name is required';
      if (!salesTeam[1]?.rmEmployeeId) secondErrors.rmEmployeeId = 'Closing RM Employee ID is required';

      if (Object.keys(secondErrors).length > 0) {
        const salesTeamErrors: any[] = [undefined]; // ensure index 1 is valid
        salesTeamErrors[1] = secondErrors;
        errors.officeInfo = {
          ...(errors?.officeInfo),
          salesTeam: salesTeamErrors,
        };
      }
    }

    return errors;
  };

  const pickUser = (primary?: any, fallback?: any) => {
    if (primary?.userId) return primary;
    if (fallback?.userId) return fallback;
    return { userName: '', userId: '' };
  };

  const officeUseFormik = useFormik<OfficeUseValues>({
    enableReinitialize: true,
    initialValues: {
      bookingSchemeName: officeUseData?.data?.bookingSchemeName ?? opportunity?.data?.Scheme ?? '',
      bookingRegionAsPerRM: officeUseData?.data?.bookingRegionAsPerRM !== undefined ? officeUseData.data.bookingRegionAsPerRM : '',
      enqRefNo: officeUseData?.data?.enqRefNo ?? opportunity?.data?.EnquiryReferenceNo ?? '',
      primarySource: officeUseData?.data?.primarySource ?? opportunity?.data?.primarySource ?? '',
      cpName: officeUseData?.data?.cpName ?? opportunity?.data?.referredbyChannelPartnerREAPName ?? '',
      isSoldUnderScheme: officeUseData?.data?.isSoldUnderScheme ?? OFFICE_USE.NO,
      isUnitSoldMTP: officeUseData?.data?.isUnitSoldMTP ?? OFFICE_USE.NO,
      isPaymentPlan: officeUseData?.data?.isPaymentPlan ?? OFFICE_USE.NO,
      isPDCCollected: officeUseData?.data?.isPDCCollected ?? OFFICE_USE.NOT_APPLICABLE,
      remarks: officeUseData?.data?.remarks ?? opportunity?.data?.Sales_Co_ordinator_Remarks ?? '',
      nriCountry: officeUseData?.data?.nriCountry || OFFICE_USE.NO,
      bookingAmountLowerThanCostSheet: false,
      documents: {
        leadRegProof: getFirstDocument(officeUseData?.data?.documents?.leadRegProof),
        corporateEmailId: getFirstDocument(officeUseData?.data?.documents?.corporateEmailId),
        corporateIdCard: getFirstDocument(officeUseData?.data?.documents?.corporateIdCard),
        businessHeadApproval: getFirstDocument(officeUseData?.data?.documents?.businessHeadApproval),
        bisPaymentPlanApproval: getFirstDocument(officeUseData?.data?.documents?.bisPaymentPlanApproval),
        npvSheetApproval: getFirstDocument(officeUseData?.data?.documents?.npvSheetApproval),
        bisMTPApproval: getFirstDocument(officeUseData?.data?.documents?.bisMTPApproval),
        remainingPaymentApproval: getFirstDocument(officeUseData?.data?.documents?.remainingPaymentApproval),
        approvalProof: getFirstDocument(officeUseData?.data?.documents?.approvalProof),
        chequeImages: officeUseData?.data?.documents?.chequeImages || [] as string[],
      },
      officeInfo: {
      secondarySource: officeUseData?.data?.officeInfo?.secondarySource ?? opportunity?.data?.secondarySource ?? '',  
      tertiarySource: officeUseData?.data?.officeInfo?.tertiarySource ?? opportunity?.data?.TeritarySource ?? '',
      employeeName: officeUseData?.data?.officeInfo?.employeeName ?? opportunity?.data?.referedEmp ?? '',
      employeeId: officeUseData?.data?.officeInfo?.employeeId ?? opportunity?.data?.Referred_Employee_Id ?? '',
      cpReraNumber: officeUseData?.data?.officeInfo?.cpReraNumber ?? opportunity?.data?.RERANo ?? '',
      companyName: officeUseData?.data?.officeInfo?.companyName ?? '',
      designation: officeUseData?.data?.officeInfo?.designation ?? '',
      // when we need data from opportunity then we use this
      preSales1Name: pickUser(
        officeUseData?.data?.officeInfo?.preSales1Name,
        opportunity?.data?.PreSales1NameEMPNo
      ),

      preSales1EmpId:
        officeUseData?.data?.officeInfo?.preSales1EmpId ?? opportunity?.data?.Presalesuser1EmpCode ?? '',

      preSales2Name: pickUser(
        officeUseData?.data?.officeInfo?.preSales2Name,
        opportunity?.data?.PreSales2Name
      ),

      preSales2EmpId:
        officeUseData?.data?.officeInfo?.preSales2EmpId ?? opportunity?.data?.Presalesuser2EmpCode ?? '',

      preSalesHeadName: pickUser(
        officeUseData?.data?.officeInfo?.preSalesHeadName,
        opportunity?.data?.PreSalesHeadName
      ),

      businessHeadName: pickUser(
        officeUseData?.data?.officeInfo?.businessHeadName,
        opportunity?.data?.businessHeadName
      ),
      
      businessHead2Name: pickUser(
        officeUseData?.data?.officeInfo?.businessHead2Name,
        opportunity?.data?.businessHead2Name
      ),

       loyaltyTeamName: pickUser(
        officeUseData?.data?.officeInfo?.loyaltyTeamName,
        opportunity?.data?.Loyalty_Team
      ),

      loyaltyTeamEmployeeId:
        officeUseData?.data?.officeInfo?.loyaltyTeamEmployeeId ??
        opportunity?.data?.Loyalty_TeamEmployee_Code ??
        '',

      projectHeadName: pickUser(
        officeUseData?.data?.officeInfo?.projectHeadName,
        opportunity?.data?.Project_Head
      ),

      projectHeadEmployeeId:
        officeUseData?.data?.officeInfo?.projectHeadEmployeeId ??
        opportunity?.data?.Project_HeadEmployee_Code ??
        '',

      salesTeam: (officeUseData?.data?.officeInfo?.salesTeam?.some((member) =>
        Object.values(member).some((value) => value)
      )
        ? officeUseData?.data?.officeInfo?.salesTeam
        : (opportunity?.data?.salesTeam ?? [])
      )?.map((member, index) => ({
        rmName:
          member?.rmName && member?.rmName.userName && member?.rmName.userId
            ? {
                id: member?.rmName?.id ? Number(member.rmName.id) : undefined,
                userId: member?.rmName?.userId,
                userName: member?.rmName?.userName,
                // Only include signatureImage for closing RM (index 1)
                ...(index === 1 && { signatureImage: member?.rmName?.signatureImage || '' }),
              }
            : { userName: '', userId: '' },
        rmEmployeeId: member?.rmEmployeeId || '',
        tlName:
          member?.tlName && member?.tlName.userName && member?.tlName.userId
            ? {
                id: member?.tlName?.id ? Number(member.tlName.id) : undefined,
                userId: member?.tlName?.userId,
                userName: member?.tlName?.userName,
              }
            : { userName: '', userId: '' },
        tlEmployeeId: member?.tlEmployeeId || '',
        rshName:
          member?.rshName && member?.rshName.userName && member?.rshName.userId
            ? {
                id: member?.rshName?.id ? Number(member.rshName.id) : undefined,
                userId: member?.rshName?.userId,
                userName: member?.rshName?.userName,
              }
            : { userName: '', userId: '' },
        rshEmployeeId: member?.rshEmployeeId || '',
      })),
    },
    referralList,
    },
    validationSchema: yup.object().shape({
      enqRefNo: yup.string().required('Enquiry Reference number is required'),
      bookingRegionAsPerRM: yup.string().required('Booking Region is required'),

      // Radio button validations
      isSoldUnderScheme: yup.string().required('Please select whether the unit is sold under any scheme'),
      isUnitSoldMTP: yup.string().required('Please select whether the unit is sold below MTP'),
      isPaymentPlan: yup.string().required('Please select whether the unit is sold with customised payment plan'),

      bookingSchemeName: yup.string().when('$isSoldUnderScheme', ([isSoldUnderScheme], schema) =>
        isSoldUnderScheme === OFFICE_USE.YES
          ? schema.required('Booking Scheme is required')
          : schema.notRequired()
      ),
      isPDCCollected: yup.string().required('PDC is required'),
      nriCountry: yup
      .string()
      .when('bookingRegionAsPerRM', (value: any, schema) =>
        (String(value) === BOOKING_REGION.NRI || String(value) === BOOKING_REGION.PIO_OCI)
          ? schema.required('Country of Residence is required')
          : schema.notRequired()
      ),
      primarySource: yup.string().notRequired(),
      cpName: yup.string().notRequired(),
      remarks: yup.string().notRequired(),

      // Documents
      documents: yup.object().shape({
        leadRegProof: yup.mixed().notRequired(),
        corporateEmailId: yup.mixed().when('$primarySource', ([primarySource], schema, options) =>
          primarySource === PRIMARY_SOURCE?.DigitalMarketing ||
          options?.context?.isCorporateSales === true
            ? schema.required('Corporate Email ID Proof is required')
            : schema.notRequired()
        ),
        corporateIdCard: yup.mixed().nullable(),
        bisMTPApproval: yup.mixed().when('$isUnitSoldMTP', ([isUnitSoldMTP], schema) =>
          isUnitSoldMTP === OFFICE_USE.YES
            ? schema.required('BIS team’s approval file is required')
            : schema.notRequired()
        ),
        bisPaymentPlanApproval: yup.mixed().when('$isPaymentPlan', ([isPaymentPlan], schema) =>
          isPaymentPlan === OFFICE_USE.YES
            ? schema.required('BIS team’s approval file is required')
            : schema.notRequired()
        ),
        npvSheetApproval: yup.mixed().when('$isPaymentPlan', ([isPaymentPlan], schema) =>
          isPaymentPlan === OFFICE_USE.YES
            ? schema.required('NPV Calculation file is required')
            : schema.notRequired()
        ),
        businessHeadApproval: yup.mixed().when('$bookingAmountLowerThanCostSheet', ([lower], schema) =>
          lower === true
            ? schema.required('Approval mail from Business Head is required')
            : schema.notRequired()
        ),
        remainingPaymentApproval: yup.mixed().when('$isPDCCollected', ([isPDCCollected], schema) =>
          isPDCCollected === OFFICE_USE.NO
            ? schema.required('Declaration from Customer is required')
            : schema.notRequired()
        ),
        approvalProof: isPointsAdjustmentEnabled
          ? yup.mixed().nullable()
          : yup.mixed().required('Approval Proof is required'),

        chequeImages: yup.array().of(yup.mixed()).when('$isPDCCollected', ([isPDCCollected], schema) =>
          isPDCCollected === OFFICE_USE.YES
            ? schema.min(1, 'Cheque images are required')
            : schema.notRequired()
        ),
        ...(isPointsAdjustmentEnabled
        ? {}
        : { approvalProof: yup.mixed().required('Approval Proof is required') }),
      }),
 
      // Office Info
      officeInfo: yup.object().shape({
        employeeName: yup.string().when('$primarySource', ([val], schema) =>
          val === PRIMARY_SOURCE?.PurvaChampion
            ? schema.required('Employee Name is required')
            : schema.notRequired()
        ),

        employeeId: yup.string().when('$primarySource', ([val], schema) =>
          val === PRIMARY_SOURCE?.PurvaChampion
            ? schema.required('Employee ID is required')
            : schema.notRequired()
        ),
        cpReraNumber: yup.string().notRequired(),
        companyName: yup.string().when('$primarySource', ([primarySource], schema, options) =>
          primarySource === PRIMARY_SOURCE?.DigitalMarketing ||
          options?.context?.isCorporateSales === true
            ? schema.required('Company Name is required')
            : schema.notRequired()
        ),

        designation: yup.string().when('$primarySource', ([primarySource], schema, options) =>
          primarySource === PRIMARY_SOURCE?.DigitalMarketing ||
          options?.context?.isCorporateSales === true
            ? schema.required('Designation is required')
            : schema.notRequired()
        ),
        businessHeadApproval: yup.mixed().when('$bookingAmountLowerThanCostSheet', ([lower], schema) =>
          lower === true
            ? schema.required('Approval mail from Business Head is required')
            : schema.notRequired()
        ),
        secondarySource: yup.string().notRequired(),
        tertiarySource: yup.string().notRequired(),
        preSales1Name: yup.string().notRequired(),
        preSales1EmpId: yup.string().notRequired(),
        preSales2Name: yup.string().notRequired(),
        preSales2EmpId: yup.string().notRequired(),
        preSalesHeadName: yup.string().notRequired(),
        businessHeadName: yup.object().required('Business Head Name Required'),
        businessHead2Name: yup.object().notRequired(),
        projectHeadName: yup.string().notRequired(),
        projectHeadEmployeeId: yup.string().notRequired(),
        loyaltyTeamName: yup.string().notRequired(),
        loyaltyTeamEmployeeId: yup.string().notRequired(),
      }),
      referralList: yup.object().shape({
        name: yup.string().notRequired(),
        relation: yup.string().notRequired(),
        propertyName: yup.string().notRequired(),
        unitNumber: yup.string().notRequired(),
        email: yup.string().notRequired(),
        mobileNumber: yup.string().notRequired(),
        address: yup.string().notRequired(),
        houseNumber: yup.string().notRequired(),
        countryCode: yup.string().notRequired(),
        primarySource: yup.string().notRequired(),
        pointsAdjustment: yup.boolean().notRequired(),
        tower: yup.string().notRequired(),
        residingAs: yup.string().notRequired(),
        rentalAgreement: yup.mixed().when('referralList.residingAs', ([residingAs], schema) =>
          residingAs === RESIDING_AS.TENANT
            ? schema.required('Rental Agreement is required')
            : schema.nullable()
        ),
        saleDeedDocument: yup.mixed().when('referralList.ownerType', ([ownerType], schema) =>
          ownerType === OWNER_TYPE.SECONDARY
            ? schema.required('Sale Deed Document is required')
            : schema.nullable()
        ),
      }),    
  }),
    validateOnMount: true,
    validate,
    onSubmit: (values) => {},
  });

  useEffect(() => {
    if (officeUseFormik.values.nriCountry) {
      setCountryInputValue(officeUseFormik.values.nriCountry);
    }
  }, [officeUseFormik.values.nriCountry]);


  useEffect(() => {
    dispatch(officeUseDetails(`/${oppId}`));
    dispatch(getMasterDataList());
    dispatch(fetchCountries()); 
  }, [applicantData, dispatch, oppId]);

  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      dispatch(searchSFDCUsers({ username: debouncedSearchQuery }));
    } else {
      dispatch(clearSearchResults());
    }
  }, [debouncedSearchQuery, dispatch]);

  useEffect(() => {
    if (debouncedSalesTeamSearchQuery.trim() && salesTeamSearchKeyNameRef.current) {
      const role = getRoleForField(salesTeamSearchKeyNameRef.current);
      
      dispatch(
        searchSalesTeamDropdown({
          search: debouncedSalesTeamSearchQuery,
          role,
        })
      );
    } else {
      dispatch(clearSalesTeamDropdownResults());
    }
  }, [debouncedSalesTeamSearchQuery, dispatch]);

  useEffect(() => {
    setIsPointsAdjustmentEnabled(referrer?.pointsAdjustment ?? true);
  }, [referrer?.pointsAdjustment]);

  useEffect(() => {
    if (officeUseData?.data?.officeInfo?.isCorporateSales !== undefined) {
      setIsCorporateSales(officeUseData?.data?.officeInfo?.isCorporateSales);
    } else if (opportunity?.data?.Corporate_Sales_Verification !== undefined) {
      setIsCorporateSales(opportunity.data.Corporate_Sales_Verification);
    }
  }, [officeUseData?.data?.officeInfo?.isCorporateSales, opportunity?.data?.Corporate_Sales_Verification]);

  useEffect(() => {
  const bookingAmount = Number.parseFloat(opportunity?.data?.BookingAmountAsPerAgreement || "");
  const payments = applicantData?.data?.payments || [];

    const totalPaidAmount = payments.reduce(
      (sum, payment) => sum + Number.parseFloat(payment?.paidAmount),
      0
    );

    if (bookingAmount > totalPaidAmount) {
      officeUseFormik.setFieldValue("bookingAmountLowerThanCostSheet", true);
    } else {
      officeUseFormik.setFieldValue("bookingAmountLowerThanCostSheet", false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunity, applicantData]);
  
  // --- Filter countries with debouncing ---
  useEffect(() => {
    const handler = setTimeout(() => {
      if (!countryInputValue || countryInputValue.length < 2) {
        setFilteredCountries(countryList || []);
        setCountryLoading(false);
        return;
      }
      setCountryLoading(true);
      const filtered = countryList.filter((c) =>
        c.countryName.toLowerCase().includes(countryInputValue.toLowerCase())
      );
      setFilteredCountries(filtered);
      setCountryLoading(false);
    }, 300);

    return () => clearTimeout(handler);
  }, [countryInputValue, countryList]);

  // Helper function to get role based on field name
  const getRoleForField = (fieldName: string): string => {
    if (fieldName.includes('rmName')) return`${ROLES.RM},${ROLES.CHANNEL_SALES}`;
    if (fieldName.includes('tlName')) return ROLES.SALES_TL;
    if (fieldName.includes('rshName')) return ROLES.SALES_RSH;
    if (fieldName.includes('loyaltyTeamName')) return ROLES.LOYALTY_TEAM;
    if (fieldName.includes('preSales')) return ROLES.PRE_SALES_HEAD; // Default to RM for pre-sales
    if (fieldName.includes('projectHeadName')) return `${ROLES.SALES_TL},${ROLES.SALES_RSH}`;
    return ROLES.RM; // Default fallback
  };

  // Helper function to enhance team member data with only basic fields
  const enhanceTeamMemberData = (member: any, fieldType: string, memberIndex?: number) => {
    if (!member) return member;

    const baseData = {
      id: Number(member?.id),
      userId: member?.userId,
      userName: member?.userName,
    };

    // Only include signatureImage for closing RM (index 1, rmName field)
    if (memberIndex === 1 && fieldType === 'rmName') {
      return {
        ...baseData,
        signatureImage: member?.signatureImage || '',
      };
    }

    return baseData;
  };

  // Helper function to format closing RM data (only specific fields)
  const formatClosingRMData = (rmData: any) => {
    if (!rmData) return rmData;

    return {
      id: Number(rmData?.id),
      userId: rmData?.userId,
      userName: rmData?.userName,
      signatureImage: rmData?.signatureImage || '',
    };
  };

  // Helper function to handle empty values for Autocomplete
  const getAutocompleteValue = (value: any) => {
    if (!value?.userId || value.userId === '') {
      return null;
    }
    return value;
  };


  // Options for country - nriCountry
  const filteredCountryOptions = filteredCountries?.map((c) => ({
    userName: c?.countryName,
    userId: c?.isoCode,
  }));

  const nameOptions = searchResults?.data?.map((user) => ({
    userName: user.userName,
    userId: user.userId, // If needed for selection
  })) || [];

  const salesTeamOptions = salesTeamDropdownResults?.data?.map((user) => ({
    id: Number(user?.id), // Using userId as id
    userName: user?.userName,
    userId: user?.userId,
    signatureImage: user?.signatureImage || '',
    empCode: user?.empCode,
  })) || [];

  const primarySource = applicantData?.data?.unitDetails?.primarySource || opportunity?.data?.primarySource || null;
  const digitalMarketing = primarySource === PRIMARY_SOURCE?.DigitalMarketing;
  const purvaChampion = primarySource === PRIMARY_SOURCE?.PurvaChampion;
  const channelPartner = primarySource === PRIMARY_SOURCE?.ChannelPartner;
  const directSources = [
    'Direct Walkin/Site Branding',
    'Exhibition Event',
    'Hoarding',
    'Print Media',
    'Radio',
  ];
  const isDirect = directSources.includes(primarySource);
  

  const handleToggleSwitch = () => {
    setIsPointsAdjustmentEnabled((prev: any) => !prev);
  };

  const handleCorporateSaleToggle = (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    setIsCorporateSales(e.target.checked);
    // Reset values of specific fields

    // Reset touched state for specific fields
    officeUseFormik.setFieldTouched('companyName', false);
    officeUseFormik.setFieldTouched('designation', false);
    officeUseFormik.setFieldTouched('corporateEmailId', false);
    officeUseFormik.setFieldTouched('corporateIdCard', false);

    // Optionally, you can also clear the errors directly
    const newErrors = { ...officeUseFormik.errors };
    delete newErrors.officeInfo?.companyName;
    delete newErrors.officeInfo?.designation;
    if (newErrors.documents) {
      delete newErrors.documents.corporateEmailId;
      delete newErrors.documents.corporateIdCard;
    }
    officeUseFormik.setErrors(newErrors);
  };

  const createOfficeUsePayload = (saveForLater: boolean) => {
    const referrerDetails = {
      ...officeUseFormik?.values?.referralList,
      pointsAdjustment: isPointsAdjustmentEnabled,
    };

    return {
      referrerDetails:
        applicantData?.data?.isCompleted &&
        (primarySource === PRIMARY_SOURCE?.PurvaPrivilege ||
          primarySource === PRIMARY_SOURCE?.ProvidentPremiere)
          ? referrerDetails
          : undefined,
      officeUse: {
        bookingSchemeName: officeUseFormik?.values?.isSoldUnderScheme === OFFICE_USE.YES 
        ? officeUseFormik?.values?.bookingSchemeName
        : "",
        bookingRegionAsPerRM: officeUseFormik?.values?.bookingRegionAsPerRM,
        primarySource: officeUseData?.data?.primarySource || opportunity?.data?.primarySource,
        enqRefNo: officeUseFormik?.values?.enqRefNo,
        // Conditionally include Channel Partner
        ...(channelPartner && {
          cpName:
            officeUseFormik?.values?.cpName ||
            opportunity?.data?.referredbyChannelPartnerREAPName ||
            '',
        }),
        isSoldUnderScheme: officeUseFormik?.values?.isSoldUnderScheme,
        isUnitSoldMTP: officeUseFormik?.values?.isUnitSoldMTP,
        isPaymentPlan: officeUseFormik?.values?.isPaymentPlan,
        isPDCCollected: officeUseFormik?.values?.isPDCCollected,
        remarks: officeUseFormik?.values?.remarks,
        nriCountry: (officeUseFormik?.values?.bookingRegionAsPerRM === BOOKING_REGION?.NRI || officeUseFormik?.values?.bookingRegionAsPerRM === BOOKING_REGION?.PIO_OCI) 
          ?  officeUseFormik?.values?.nriCountry
          : "",
        documents: {
        bisMTPApproval:
          officeUseFormik?.values?.isUnitSoldMTP === OFFICE_USE.YES &&
          officeUseFormik?.values?.documents?.bisMTPApproval
            ? [officeUseFormik?.values?.documents?.bisMTPApproval]
            : [],

        bisPaymentPlanApproval:
          officeUseFormik?.values?.isPaymentPlan === OFFICE_USE.YES &&
          officeUseFormik?.values?.documents?.bisPaymentPlanApproval
            ? [officeUseFormik?.values?.documents?.bisPaymentPlanApproval]
            : [],

        npvSheetApproval:
          officeUseFormik?.values?.isPaymentPlan === OFFICE_USE.YES &&
          officeUseFormik?.values?.documents?.npvSheetApproval
            ? [officeUseFormik?.values?.documents?.npvSheetApproval]
            : [],

        businessHeadApproval:
          officeUseFormik?.values?.bookingAmountLowerThanCostSheet &&
          officeUseFormik?.values?.documents?.businessHeadApproval
            ? [officeUseFormik?.values?.documents?.businessHeadApproval]
            : [],

        chequeImages:
          officeUseFormik?.values?.isPDCCollected === OFFICE_USE.YES &&
          Array.isArray(officeUseFormik?.values?.documents?.chequeImages)
            ? officeUseFormik?.values?.documents?.chequeImages?.filter(Boolean)
            : [],

        leadRegProof:
          officeUseFormik?.values?.documents?.leadRegProof
            ? [officeUseFormik?.values?.documents?.leadRegProof]?.filter(Boolean)
            : [],

        remainingPaymentApproval:
          officeUseFormik?.values?.isPDCCollected === OFFICE_USE.NO &&
          officeUseFormik?.values?.documents?.remainingPaymentApproval
            ? [officeUseFormik?.values?.documents?.remainingPaymentApproval]
            : [],
          
        approvalProof: officeUseFormik?.values?.documents?.approvalProof 
            ? [officeUseFormik?.values?.documents?.approvalProof]
            : [],
      },
        officeInfo: {
          // Conditionally include Digital marketing only
          ...(digitalMarketing && {
            secondarySource:
              officeUseData?.data?.officeInfo?.secondarySource || opportunity?.data?.secondarySource,
            tertiarySource: officeUseData?.data?.officeInfo?.tertiarySource || opportunity?.data?.TeritarySource,
          }),
          // Conditionally include Digital marketing and corporate Sales
          ...(digitalMarketing &&
            isCorporateSales && {
              secondarySource:
                officeUseData?.data?.officeInfo?.secondarySource || opportunity?.data?.secondarySource,
              companyName: officeUseFormik?.values?.officeInfo?.companyName,
              designation: officeUseFormik?.values?.officeInfo?.designation,
              tertiarySource:
                officeUseData?.data?.officeInfo?.tertiarySource || opportunity?.data?.TeritarySource,
            }),
          ...(isDirect && {
            secondarySource:
              officeUseData?.data?.officeInfo?.secondarySource || opportunity?.data?.secondarySource,
            tertiarySource: officeUseData?.data?.officeInfo?.tertiarySource || opportunity?.data?.TeritarySource,
          }),
          // Conditionally include Purva Champion
          ...(purvaChampion && {
            employeeName: officeUseFormik?.values?.officeInfo?.employeeName,
            employeeId: officeUseFormik?.values?.officeInfo?.employeeId,
          }),
          // Conditionally include Channel Partner
          ...(channelPartner && {
            cpName:
              officeUseFormik?.values?.cpName ||
              opportunity?.data?.referredbyChannelPartnerREAPName ||
              '',
            cpReraNumber: officeUseFormik?.values?.officeInfo?.cpReraNumber,
          }),
          salesTeam: officeUseFormik?.values?.officeInfo?.salesTeam.map((team, index) => ({
            // For closing RM (index 1), use formatClosingRMData, for others use enhanceTeamMemberData
            rmName:
              index === 1
                ? formatClosingRMData(team?.rmName)
                : enhanceTeamMemberData(team?.rmName, 'rmName', index),
            rmEmployeeId: team?.rmEmployeeId,
            tlName: enhanceTeamMemberData(team?.tlName, 'tlName', index),
            tlEmployeeId: team?.tlEmployeeId,
            rshName: enhanceTeamMemberData(team?.rshName, 'rshName', index),
            rshEmployeeId: team?.rshEmployeeId,
          })),
          isCorporateSales,
          tertiarySource: officeUseFormik?.values?.officeInfo?.tertiarySource,
            preSales1Name: enhanceTeamMemberData(
            officeUseFormik?.values?.officeInfo?.preSales1Name,
            'officeInfo.preSales1Name'
          ),
          preSales1EmpId: officeUseFormik?.values?.officeInfo?.preSales1EmpId,

          preSales2Name: enhanceTeamMemberData(
            officeUseFormik?.values?.officeInfo?.preSales2Name,
            'officeInfo.preSales2Name'
          ),
          preSales2EmpId: officeUseFormik?.values?.officeInfo?.preSales2EmpId,

          preSalesHeadName: enhanceTeamMemberData(
            officeUseFormik?.values?.officeInfo?.preSalesHeadName,
            'officeInfo.preSalesHeadName'
          ),
          loyaltyTeamName: enhanceTeamMemberData(
            officeUseFormik?.values?.officeInfo?.loyaltyTeamName,
            'officeInfo.loyaltyTeamName'
          ),
          loyaltyTeamEmployeeId: officeUseFormik?.values?.officeInfo?.loyaltyTeamEmployeeId,
          projectHeadName: enhanceTeamMemberData(
            officeUseFormik?.values?.officeInfo?.projectHeadName,
            'officeInfo.projectHeadName'
          ),
          projectHeadEmployeeId: officeUseFormik?.values?.officeInfo?.projectHeadEmployeeId,
          businessHeadName: officeUseFormik?.values?.officeInfo?.businessHeadName,
          businessHead2Name: officeUseFormik?.values?.officeInfo?.businessHead2Name,
        },   
      },
      saveForLater,
    };
  }

  const handleSave = (route: any) => {
    if (!route) {
      setIsPostLoading(true);
    } else {
      setIsSaveLoading(true);
    }
    const payload = createOfficeUsePayload(true); 
    dispatch(updateOfficeUse({ payload, oppId: oppId ?? '' }))
      .then((res) => {
        if (updateOfficeUse?.fulfilled.match(res)) {
          toast.success('Draft saved!');
          if (route) {
            router.push(`${ROOTS.RM_PANEL}/bookings`);
          } else {
            dispatch(getApplicantDetails(`/${oppId}`));
            dispatch(setpostBookingStep(0));
          }
        } else if (updateOfficeUse?.rejected.match(res)) {
          toast.error((res.payload as string) || toaster_messages.errorMessage);
        }
      })
      .catch(() => {
        toast.error(toaster_messages.errorMessage);
      })
      .finally(() => {
        if (!route) {
          setIsPostLoading(false); // Ensure it stops loading after dispatch
        } else {
          setIsSaveLoading(false);
        }
      });
  };

  const handleSubmit = () => { 
    const visibleFields = [
      'enqRefNo',
      'remarks',
      'businessHeadName.userName',
      ...(digitalMarketing ? [''] : []),
      ...(digitalMarketing && isCorporateSales
        ? ['companyName', 'designation', 'corporateEmailId', 'corporateIdCard']
        : []),
      ...(purvaChampion ? ['employeeName', 'employeeId'] : []),
      ...(channelPartner ? ['leadRegProof', 'cpReraNumber'] : []),
      ...(isPointsAdjustmentEnabled ? [] : ['approvalProof']),
    ];
    // Set touched state only for visible fields
    officeUseFormik.setTouched(
      visibleFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
      true
    );

    officeUseFormik.validateForm().then((errors) => {
      const hasSalesTeamErrors =
        !officeUseFormik?.values?.officeInfo?.salesTeam[1]?.rmName?.userName ||
        !officeUseFormik?.values?.officeInfo?.salesTeam[1]?.rmEmployeeId ||
        !officeUseFormik?.values?.officeInfo?.businessHeadName?.userName;

      const hasErrors =
        visibleFields.some((field) => errors[field as keyof typeof errors]) || hasSalesTeamErrors;

    if (!hasErrors && !hasSalesTeamErrors) {
      setIsLoading(true);    
      const payload = createOfficeUsePayload(false); 
        dispatch(updateOfficeUse({ payload, oppId: oppId ?? '' }))
          .then((res) => {
            if (updateOfficeUse?.fulfilled.match(res)) {
              setIsLoading(false);
              router.push(`${ROOTS.RM_PANEL}/bookings`);
            } else if (updateOfficeUse?.rejected.match(res)) {
              setIsLoading(false);
              toast.error((res.payload as string) || toaster_messages.errorMessage);
            }
          })
          .catch((error) => {
            setIsLoading(false);
            toast.error(toaster_messages.errorMessage);
          });
      } else {
        /* empty */
      }
    });
  };
  
  useEffect(() => {
    const docs = officeUseData?.data?.documents;
    if (!docs) return;

    const setterMap: Record<string, React.Dispatch<React.SetStateAction<any>>> = {
      leadRegProof: setLeadRegProofPath,
      corporateEmailId: setCorpEmailIdPath,
      corporateIdCard: setCorpIdCardPath,
      businessHeadApproval: setBusinessHeadApprovalPath,
      bisPaymentPlanApproval: setBisApprovalPath,
      npvSheetApproval: setNpvSheetApprovalPath,  
      bisMTPApproval: setIsBisMTPApprovalFilePath,
      remainingPaymentApproval: setRemainingPaymentApprovalPath,
      approvalProof: setApprovalProofPath,
    };

    Object.entries(docs).forEach(([key, value]) => {
      if (value && setterMap[key]) {
        setterMap[key]({ id: null, path: value?.[0] }); // id is null because your new data doesn’t have it
      }
    });
  }, [officeUseData?.data?.documents]);

  const handleUpload = async (fieldName: string, selectedFile: any, isOther?: any, id?: any) => {
    if (!selectedFile) {
      return;
    }
    try {
      const fileObjects = {
        folder: `documents/${oppId}`,
        key: selectedFile.name.replaceAll(/\s+/g, ''),
      };
      const res = await dispatch(getPresignedUrl(fileObjects)).unwrap();
      if (res?.statusCode === 201) {
        const payload: UploadPayload = {
          presignedUrl: res?.data?.signedUrl,
          file: selectedFile,
        };
        dispatch(uploadFile(payload))
          .unwrap()
          .then((uploadResponse: { status: number }) => {
            if (uploadResponse?.status === 200) {
              // Handle successful upload, maybe update the formik value
              officeUseFormik.setFieldValue(`documents.${fieldName}`, `${res.data.s3Basepath}${res.data.key}`);
            }
          });
        const savePayload = {
          opportunityId: oppId as string,
          name: fieldName,
          path: `${res?.data?.key}`,
          type: 'office_use', // Changed to match your required payload
          stage: 'post_booking',
          isOtherDoc: true,
        };
        const saveResponse = await dispatch(saveBookingDocument(savePayload)).unwrap();
        const fetchedResponse = saveResponse?.data;    
        if (fieldName === 'corporateEmailId' && fetchedResponse?.stage === 'post_booking') {
          setCorpEmailIdPath((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path, // Optional update
          }));
        }
        if (fieldName === 'corporateIdCard' && fetchedResponse?.stage === 'post_booking') {
          setCorpIdCardPath((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path, // Optional update
          }));
        }
        if (fieldName === 'bisMTPApproval' && fetchedResponse?.stage === 'post_booking') {
          setIsBisMTPApprovalFilePath((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path, 
          }));
        }
        if (fieldName === 'bisPaymentPlanApproval' && fetchedResponse?.stage === 'post_booking') {
          setBisApprovalPath((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path,
          }));
        }
        if (fieldName === 'npvSheetApproval' && fetchedResponse?.stage === 'post_booking') {
          setNpvSheetApprovalPath((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path,
          }));
        }
        if (fieldName === 'leadRegProof' && fetchedResponse?.stage === 'post_booking') {
          setLeadRegProofPath((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path, // Optional update
          }));
        }
        if (fieldName === 'businessHeadApproval' && fetchedResponse?.stage === 'post_booking') {
          setBusinessHeadApprovalPath((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path, // Optional update
          }));
        }
        if (fieldName === 'remainingPaymentApproval' && fetchedResponse?.stage === 'post_booking') {
          setRemainingPaymentApprovalPath((prev: any) => ({
            ...prev,
            id: fetchedResponse?.id,
            path: fetchedResponse?.path, // Optional update
          }));
        }
      }
    } catch (error) {
      console.error(error, "error")
    }
  };

  const handledelete = async (fieldName: string, selectedFile: any, id: any) => {
    if(selectedFile){
      dispatch(deleteImage({ key: selectedFile }));
    }
    officeUseFormik.setFieldValue(`documents.${fieldName}`, ''); // Reset the Formik field when file is deleted
  };

  return (
    <BorderBox>
      <form onSubmit={officeUseFormik.handleSubmit} onReset={officeUseFormik.handleReset}>
      <Typography sx={{ fontSize: '16px', fontWeight: 600, textAlign: 'center', mb: 5 }}>
        Booking Details
      </Typography>
      
        <Grid container spacing={2} sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
            <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
              Enquiry Reference Number <span className="asteriskColor"> *</span>
            </Typography>
            <InputBase
              fullWidth
              placeholder="Enter enquiry reference number"
              sx={{
                pl: 1.5,
                height: '44px',
                borderRadius: 1,
                border: '1px solid #D0D5DD',
                mt: 1,
                fontSize: '14px', // Ensure font size for the outer input
                '& input': {
                  fontSize: '14px', // Ensure font size inside the input field
                },
              }}
              {...officeUseFormik.getFieldProps('enqRefNo')}
              inputProps={{ maxLength: 8 }}
              onChange={(e) => {
                const sanitizedValue = e.target.value.replaceAll(/\D/g, '');
                officeUseFormik.setFieldValue('enqRefNo', sanitizedValue);
              }}
            />
            {officeUseFormik?.touched?.enqRefNo &&
            officeUseFormik?.errors?.enqRefNo ? (
              <Typography color="red" fontSize="12px">
                {officeUseFormik?.errors?.enqRefNo}
              </Typography>
            ) : null}
          </Grid>
          <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
            <Box sx={{
              '& .MuiInputBase-input': {
                height: '8.5px !important',
              },
            }}>
              <Typography sx={{ fontSize: '14px', mb: 1, fontWeight: 600 }}>
                {jsonValue.labels.bookingRegion}
                <span style={{ color: '#d32f2f' }}>*</span>
              </Typography>
              <FormikAutocomplete
                name="bookingRegionAsPerRM"
                required
                options={masterData?.data?.Resident_Status?.map((opt) => ({
                  value: String(opt.value),
                  label: opt.name,
                })) ?? []}
                placeholder="Select Booking Region"
                formik={officeUseFormik}
              />
            </Box>

          </Grid>
        
        {(officeUseFormik?.values?.bookingRegionAsPerRM === BOOKING_REGION.NRI || officeUseFormik?.values?.bookingRegionAsPerRM === BOOKING_REGION.PIO_OCI) ? (
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <CustomAutoSelectSingle
              options={filteredCountryOptions}
              value={
                filteredCountryOptions?.find(
                  (c) => c?.userName === officeUseFormik?.values?.nriCountry
                ) || undefined
              }
              inputValue={countryInputValue}
              onChange={(_, newValue) => {
                officeUseFormik.setFieldValue(
                  "nriCountry",
                  newValue ? newValue?.userName : ""
                );
                setCountryInputValue(newValue ? newValue?.userName : "");
              }}
              onInputChange={(_, newInputValue) => setCountryInputValue(newInputValue)}  
              onClear={() => {
                officeUseFormik.setFieldValue('nriCountry', '');
                setCountryInputValue('');
                setFilteredCountries(countryList || []);
              }}
              officeUseLabel="Country of Residence"
              placeholder="Select a country"
              loading={countryLoading}
              required
              customSx
              error={Boolean(officeUseFormik.touched.nriCountry && officeUseFormik.errors.nriCountry)}
              helperText={officeUseFormik.touched.nriCountry && officeUseFormik.errors.nriCountry}
            />
        </Grid>
        ): null}
        </Grid>

    <Grid container spacing={2} sx={{ alignItems: 'flex-start', mt: 2 }}>
      <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
        <ConditionalRadioField
          name="isSoldUnderScheme"
          label="Is the unit sold under any scheme?"
          value={officeUseFormik.values.isSoldUnderScheme || ""}
          onChange={(e) => officeUseFormik.setFieldValue("isSoldUnderScheme", e.target.value)}
          required
          options={RADIO_BTN_OPTIONS}
          error={officeUseFormik.errors.isSoldUnderScheme}
          touched={officeUseFormik.touched.isSoldUnderScheme}
        />
      </Grid>

      <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
        {officeUseFormik.values.isSoldUnderScheme === OFFICE_USE.YES ? (
          <>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, mb: 1 }}>
              Booking Scheme <span className="asteriskColor">*</span>
            </Typography>
            <InputBase
              fullWidth
              placeholder="Enter scheme details"
              sx={{
                pl: 1.5,
                height: '44px',
                borderRadius: 1,
                border: '1px solid #D0D5DD',
                fontSize: '14px',
              }}
              {...officeUseFormik.getFieldProps('bookingSchemeName')}
              inputProps={{ maxLength: 50 }}
            />
            {officeUseFormik.touched.bookingSchemeName &&
              officeUseFormik.errors.bookingSchemeName && (
                <Typography color="red" fontSize="12px" sx={{ mt: 0.5 }}>
                  {officeUseFormik.errors.bookingSchemeName}
                </Typography>
              )}
          </>
        ) : (
          <Box sx={{ height: '65px', visibility: 'hidden' }} />
        )}
      </Grid>
    </Grid>

    {/* --- Sold below MTP --- */}
    <Grid container spacing={2} sx={{ alignItems: 'flex-start', my: 2 }}>
      <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
        <ConditionalRadioField
          name="isUnitSoldMTP"
          label="Is the unit sold below MTP?"
          value={officeUseFormik.values.isUnitSoldMTP || ""}
          onChange={(e) => officeUseFormik.setFieldValue("isUnitSoldMTP", e.target.value)}
          required
          options={RADIO_BTN_OPTIONS}
          error={officeUseFormik.errors.isUnitSoldMTP}
          touched={officeUseFormik.touched.isUnitSoldMTP}
        />
      </Grid>

      <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
        {officeUseFormik.values.isUnitSoldMTP === OFFICE_USE.YES ? (         
          <NewDropzone
            name="documents.bisMTPApproval"
            id={isBisMTPApprovalFilePath?.id || 'bisMTPApproval'}
            fileValue={officeUseFormik.values.documents?.bisMTPApproval}
            fieldName="documents.bisMTPApproval"
            label="BIS team's approval in consent with CEO"
            placholderforBack="Select File"
            handledelete={()=>{handledelete('bisMTPApproval',officeUseFormik.values.documents?.bisMTPApproval,'bisMTPApproval')}}
            handleupload={handleUpload}
            documentType="both"
            path={isBisMTPApprovalFilePath?.path}
            formik={officeUseFormik}
            required
            customSx
            error={officeUseFormik.errors.documents?.bisMTPApproval}
            touched={officeUseFormik.touched.documents?.bisMTPApproval}
            s3UploadFilePath={`documents/${oppId}`}
          />
        ) : (
          <Box sx={{ height: '80px', visibility: 'hidden' }} />
        )}
      </Grid>
    </Grid>

    {/* --- Custom Payment Plan --- */}
    <Grid item xs={12} sm={12} md={6} lg={6} xl={6} my={1}>
      <ConditionalRadioField
        name="isPaymentPlan"
        label="Is the unit sold with customised payment plan?"
        value={officeUseFormik.values.isPaymentPlan || OFFICE_USE.NO}
        onChange={(e) => officeUseFormik.setFieldValue("isPaymentPlan", e.target.value)}
        required
        options={RADIO_BTN_OPTIONS}
        error={officeUseFormik.errors.isPaymentPlan}
        touched={officeUseFormik.touched.isPaymentPlan}
      />
    </Grid>

        <Grid container spacing={2} sx={{ alignItems: 'flex-start', mt:1 }}>
          {/* First Dropzone */}
            {officeUseFormik.values.isPaymentPlan === OFFICE_USE.YES && (
          <>
            <Grid item xs={12} sm={12} md={6}>
              <NewDropzone
                name="documents.bisPaymentPlanApproval"
                id={bisApprovalPath?.id ? bisApprovalPath?.id : 'bisPaymentPlanApproval'}
                fileValue={officeUseFormik?.values?.documents?.bisPaymentPlanApproval}
                fieldName="bisPaymentPlanApproval"
                label="Bis team's approval in consent with CEO"
                placholderforBack='Select File'
                handledelete={()=>{handledelete('bisPaymentPlanApproval',officeUseFormik.values.documents?.bisPaymentPlanApproval,'bisPaymentPlanApproval')}}
                handleupload={handleUpload}
                documentType="both"
                path={bisApprovalPath?.path}
                formik={officeUseFormik}
                required
                customSx
                error={officeUseFormik.errors.documents?.bisPaymentPlanApproval}
                touched={officeUseFormik.touched.documents?.bisPaymentPlanApproval}
                s3UploadFilePath={`documents/${oppId}`}
              />
            </Grid>
          
            {/* Second Dropzone */}
            <Grid item xs={12} sm={12} md={6}>
              <NewDropzone
                name="documents.npvSheetApproval"
                id={npvSheetApprovalPath?.id ? npvSheetApprovalPath?.id : 'npvSheetApproval'}
                fileValue={officeUseFormik?.values?.documents?.npvSheetApproval}
                fieldName="npvSheetApproval"
                label="NPV Calculation sheet with approval from BIS"
                placholderforBack='Select File'
                handledelete={()=>{handledelete('npvSheetApproval',officeUseFormik.values.documents?.npvSheetApproval,'npvSheetApproval')}}
                handleupload={handleUpload}
                documentType="both"
                path={npvSheetApprovalPath?.path}
                formik={officeUseFormik}
                required
                customSx
                error={officeUseFormik.errors.documents?.npvSheetApproval}
                touched={officeUseFormik.touched.documents?.npvSheetApproval}
                s3UploadFilePath={`documents/${oppId}`}
              />
            </Grid>
          </>
          )}
          {officeUseFormik?.values?.bookingAmountLowerThanCostSheet ? (
            <>
            <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, mt: 2 }}>
                The booking amount is lower than that on the cost sheet
              </Typography>
            </Grid>
            <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
            <NewDropzone
                name="documents.businessHeadApproval"
                fieldName="businessHeadApproval"
                id={businessHeadApprovalPath?.id ? businessHeadApprovalPath?.id : 'businessHeadApproval'}
                label="Approval mail from Business Head"
                required
                fileValue={officeUseFormik?.values?.documents?.businessHeadApproval}
                formik={officeUseFormik}
                handleupload={handleUpload}
                path={businessHeadApprovalPath?.path}
                documentType='both'
                handledelete={()=>{handledelete('businessHeadApproval',officeUseFormik.values.documents?.businessHeadApproval,'businessHeadApproval')}}
                customSx
                error={officeUseFormik.errors.documents?.businessHeadApproval}
                touched={officeUseFormik.touched.documents?.businessHeadApproval}
                s3UploadFilePath={`documents/${oppId}`}
              />
              </Grid>
              </>
          ) : null}
          <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
            <ConditionalRadioField
              name="isPDCCollected"
              label="Is PDC of 9.5% or 15% of the sale value collected?"
              value={officeUseFormik.values.isPDCCollected}
              onChange={(e) => officeUseFormik.setFieldValue("isPDCCollected", e.target.value)}
              required
              options={[
                ...RADIO_BTN_OPTIONS,
                { value: OFFICE_USE.NOT_APPLICABLE, label: jsonValue.options.notApplicable },
              ]}
              error={officeUseFormik.errors.isPDCCollected}
              touched={officeUseFormik.touched.isPDCCollected}
            />          
          </Grid>

          {officeUseFormik.values.isPDCCollected === OFFICE_USE.YES && (
            <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
              <UploadMoreDocuments 
                formik={officeUseFormik}
              />
            </Grid>
          )}

          {officeUseFormik.values.isPDCCollected === OFFICE_USE.NO && (
            <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
              <NewDropzone
                name="documents.remainingPaymentApproval"
                fieldName="remainingPaymentApproval"
                id={remainingPaymentApprovalPath?.id ? remainingPaymentApprovalPath?.id : 'remainingPaymentApproval'}
                label="Declaration from Customer on when the date for payment of the remaining amount or approval from the Business Head"
                required
                fileValue={officeUseFormik?.values?.documents?.remainingPaymentApproval}
                formik={officeUseFormik}
                handleupload={handleUpload}
                path={remainingPaymentApprovalPath?.path}
                documentType="pdf"
                handledelete={()=>{handledelete('remainingPaymentApproval',officeUseFormik.values.documents?.remainingPaymentApproval,'remainingPaymentApproval')}}
                customSx
                error={officeUseFormik.errors.documents?.remainingPaymentApproval}
                touched={officeUseFormik.touched.documents?.remainingPaymentApproval}
                s3UploadFilePath={`documents/${oppId}`}
              />
            </Grid>
          )}
        </Grid>

        <Typography sx={{ fontSize: '16px', fontWeight: 600, textAlign: 'center', mt: 5 }}>
          Booking Source
        </Typography>
        <Box
          sx={{
            display: 'flex',

            gap: 3,
            mt: 2,
            mb: 2,
            alignItems: {
              xs: 'left',
              sm: 'center',
            },
            flexDirection: {
              xs: 'column',
              sm: 'row',
            },
          }}
        >
          <Box sx={{ display: 'flex' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
              Primary Source &nbsp;
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#00368C' }}>
              {opportunity?.data?.primarySource}
            </Typography>
          </Box>

          {(channelPartner || isDirect || digitalMarketing) && (
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#212B36',
                display: {
                  xs: 'none',
                  sm: 'block',
                },
              }}
            >
              |
            </Typography>
          )}

          {channelPartner && (
            <Box sx={{ display: 'flex' }}>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
                Channel Partner Name &nbsp;
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#00368C' }}>
                {opportunity?.data?.referredbyChannelPartnerREAPName}
              </Typography>
            </Box>
          )}

          {(isDirect || digitalMarketing) && (
            <>
              <Box sx={{ display: 'flex' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
                  Secondary Source &nbsp;
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#00368C' }}>
                  {opportunity?.data?.secondarySource}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#212B36',
                  display: {
                    xs: 'none',
                    sm: 'block',
                  },
                }}
              >
                |
              </Typography>
              <Box sx={{ display: 'flex' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
                  Tertiary Source &nbsp;
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#00368C' }}>
                  {opportunity?.data?.TeritarySource}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        {primarySource === PRIMARY_SOURCE?.DigitalMarketing && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
              Corporate Sale &nbsp;
            </Typography>
            <Switch
              checked={isCorporateSales}
              onChange={handleCorporateSaleToggle}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#4caf50', // Checked thumb color
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#00368C', // Checked track color
                },
                '& .MuiSwitch-switchBase': {
                  color: 'green', // Unchecked thumb color
                },
                '& .MuiSwitch-switchBase + .MuiSwitch-track': {
                  backgroundColor: '#D0D5DD', // Unchecked track color
                },
              }}
            />
          </Box>
        )}

        {primarySource === PRIMARY_SOURCE?.PurvaChampion && (
          <Grid container spacing={2} sx={{ display: 'flex', alignItems: 'center' }}>
            <Grid item xs={6}>
              <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                Employee Name<span className="asteriskColor"> *</span>
              </Typography>{' '}
              <InputBase
                fullWidth
                placeholder="Enter Employee Name"
                sx={{
                  pl: 1.5,
                  height: '44px',
                  borderRadius: 1,
                  border: '1px solid #D0D5DD',
                  mt: 1,
                  fontSize: '14px', // Ensure font size for the outer input
                  '& input': {
                    fontSize: '14px', // Ensure font size inside the input field
                  },
                }}
                {...officeUseFormik.getFieldProps('officeInfo.employeeName')}
              />
              {officeUseFormik?.touched?.officeInfo?.employeeName && officeUseFormik?.errors?.officeInfo?.employeeName ? (
                <Typography color="red" fontSize="12px">
                  {officeUseFormik?.errors?.officeInfo?.employeeName}
                </Typography>
              ) : null}
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                Employee ID<span className="asteriskColor"> *</span>
              </Typography>
              <InputBase
                fullWidth
                placeholder="Enter employee id"
                sx={{
                  pl: 1.5,
                  height: '44px',
                  borderRadius: 1,
                  border: '1px solid #D0D5DD',
                  mt: 1,
                  fontSize: '14px', // Ensure font size for the outer input
                  '& input': {
                    fontSize: '14px', // Ensure font size inside the input field
                  },
                }}
                {...officeUseFormik.getFieldProps('officeInfo.employeeId')}
                inputProps={{ maxLength: 10 }}
                onChange={(e) => {
                  const sanitizedValue = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                  officeUseFormik.setFieldValue('officeInfo.employeeId', sanitizedValue);
                }}
              />
              {officeUseFormik?.touched?.officeInfo?.employeeId && officeUseFormik?.errors?.officeInfo?.employeeId ? (
                <Typography color="red" fontSize="12px">
                  {officeUseFormik?.errors?.officeInfo?.employeeId}
                </Typography>
              ) : null}
            </Grid>
          </Grid>
        )}

        {primarySource === PRIMARY_SOURCE?.ChannelPartner && (
          <Grid container spacing={2} sx={{ display: 'flex', alignItems: 'center' }}>
            <Grid item xs={12} sm={12} md={12} lg={6} xl={6}>
              {/* <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>Lead Registration Proof</Typography> */}
              <Box className="leadRegistrationProof">
                <NewDropzone
                  name="documents.leadRegProof"
                  fieldName="leadRegProof"
                  id={leadRegProofPath?.id ? leadRegProofPath?.id : 'leadRegProof'}
                  label="Lead Registration Proof"
                  fileValue={officeUseFormik?.values?.documents?.leadRegProof}
                  formik={officeUseFormik}
                  handleupload={handleUpload}
                  path={leadRegProofPath?.path}
                  documentType="pdf"
                  handledelete={()=>{handledelete('leadRegProof',officeUseFormik.values.documents?.leadRegProof,'leadRegProof')}}
                  customSx
                  error={officeUseFormik.errors.documents?.leadRegProof}
                  touched={officeUseFormik.touched.documents?.leadRegProof}
                  s3UploadFilePath={`documents/${oppId}`}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={12} lg={6} xl={6} >
              <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                Channel Partner RERA Number
              </Typography>
              <InputBase
                fullWidth
                placeholder="Enter Channel Partner RERA Number"
                sx={{
                  pl: 1.5,
                  height: '44px',
                  borderRadius: 1,
                  border: '1px solid #D0D5DD',
                  mt: 1,
                  fontSize: '14px', // Ensure font size for the outer input
                  '& input': {
                    fontSize: '14px', // Ensure font size inside the input field
                  },
                }}
                {...officeUseFormik.getFieldProps('officeInfo.cpReraNumber')}
              />
              {officeUseFormik?.touched?.officeInfo?.cpReraNumber && officeUseFormik?.errors?.officeInfo?.cpReraNumber ? (
                <Typography color="red" fontSize="12px">
                  {officeUseFormik?.errors?.officeInfo?.cpReraNumber}
                </Typography>
              ) : null}
            </Grid>
          </Grid>
        )}

        {primarySource === PRIMARY_SOURCE?.DigitalMarketing && isCorporateSales && (
          <Grid container spacing={2} sx={{ display: 'flex', alignItems: 'center' }}>
            <Grid item xs={12} sm={12} md={12} lg={6} xl={6}>
              <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                Company Name<span className="asteriskColor"> *</span>
              </Typography>
              <InputBase
                fullWidth
                placeholder="Enter Company name"
                sx={{
                  pl: 1.5,
                  height: '44px',
                  borderRadius: 1,
                  border: '1px solid #D0D5DD',
                  mt: 1,
                  fontSize: '14px', // Ensure font size for the outer input
                  '& input': {
                    fontSize: '14px', // Ensure font size inside the input field
                  },
                }}
                {...officeUseFormik.getFieldProps('companyName')}
                inputProps={{ maxLength: 60 }}
                onChange={(e) => {
                  const sanitizedValue = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                  officeUseFormik.setFieldValue('companyName', sanitizedValue);
                }}
              />
              {officeUseFormik?.touched?.officeInfo?.companyName && officeUseFormik?.errors?.officeInfo?.companyName ? (
                <Typography color="red" fontSize="12px">
                  {officeUseFormik?.errors?.officeInfo?.companyName}
                </Typography>
              ) : null}
            </Grid>
            <Grid item xs={12} sm={12} md={12} lg={6} xl={6}>
              <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
                Designation <span className="asteriskColor"> *</span>
              </Typography>
              <InputBase
                fullWidth
                placeholder="Enter Designation"
                sx={{
                  pl: 1.5,
                  height: '44px',
                  borderRadius: 1,
                  border: '1px solid #D0D5DD',
                  mt: 1,
                  fontSize: '14px', // Ensure font size for the outer input
                  '& input': {
                    fontSize: '14px', // Ensure font size inside the input field
                  },
                }}
                {...officeUseFormik.getFieldProps('designation')}
                inputProps={{ maxLength: 30 }}
                onChange={(e) => {
                  const sanitizedValue = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                  officeUseFormik.setFieldValue('designation', sanitizedValue);
                }}
              />
              {officeUseFormik?.touched?.officeInfo?.designation && officeUseFormik?.errors?.officeInfo?.designation ? (
                <Typography color="red" fontSize="12px">
                  {officeUseFormik?.errors?.officeInfo?.designation}
                </Typography>
              ) : null}
            </Grid>

            <Grid item xs={12}>
              <NewDropzone
                name="documents.corporateEmailId"
                fieldName="corporateEmailId"
                id={corpEmailIdPath?.id ? corpEmailIdPath?.id : 'corporateEmailId'}
                label="Corporate Email ID Proof"
                required
                fileValue={officeUseFormik?.values?.documents?.corporateEmailId}
                formik={officeUseFormik}
                handleupload={handleUpload}
                path={corpEmailIdPath?.path}
                documentType="pdf"
                handledelete={()=>{handledelete('corporateEmailId',officeUseFormik.values.documents?.corporateEmailId,'corporateEmailId')}}
                customSx
                error={officeUseFormik.errors.documents?.corporateEmailId}
                touched={officeUseFormik.touched.documents?.corporateEmailId}
                s3UploadFilePath={`documents/${oppId}`}
              />
            </Grid>

            <Grid item xs={12}>
              <NewDropzone
                name="documents.corporateIdCard"
                id={corpIdCardPath?.id ? corpIdCardPath?.id : 'corporateIdCard'}
                fieldName="corporateIdCard"
                label="Corporate ID Card (Optional)"
                fileValue={officeUseFormik?.values?.documents?.corporateIdCard}
                formik={officeUseFormik}
                handleupload={handleUpload}
                path={corpIdCardPath?.path}
                documentType="pdf"
                handledelete={()=>{handledelete('corporateIdCard',officeUseFormik.values.documents?.corporateIdCard,'corporateIdCard')}}
                customSx
                error={officeUseFormik.errors.documents?.corporateIdCard}
                touched={officeUseFormik.touched.documents?.corporateIdCard}
                s3UploadFilePath={`documents/${oppId}`}
              />
            </Grid>
          </Grid>
        )}

        <Divider sx={{ mt: 2, borderStyle: 'dashed', borderColor: '#DADADA' }} />

        {(primarySource === PRIMARY_SOURCE?.PurvaPrivilege ||
          primarySource === PRIMARY_SOURCE?.ProvidentPremiere) && (
          <ReferrerDetails
            primarySource={primarySource || ''}
            isPointsAdjustmentEnabled={isPointsAdjustmentEnabled}
            handleToggleSwitch={handleToggleSwitch}
            formik={officeUseFormik}
            handledelete={handledelete}
            approvalProofPath={approvalProofPath}
            setApprovalProofPath={setApprovalProofPath}
          />
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {officeUseFormik?.values?.officeInfo?.salesTeam?.map((teamMember, index) => {
            let suffix = '';
            if (index === 0) {
              suffix = 'Sourcing';
            } else if (index === 1) {
              suffix = 'Closing';
            }

            return (
              <React.Fragment key={index}>
                {/* RM */}
                <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                  <Box className="referrerInputRow flexColumn">
                    <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                      {suffix} RM{index === 2 ? ' 3' : ''} Name{' '}
                      {index === 1 && <span className="asteriskColor"> *</span>}
                    </Typography>
                    <CustomAutocomplete
                      options={salesTeamOptions?.map((option) => option) || []}
                      value={getAutocompleteValue(
                        officeUseFormik?.values?.officeInfo?.salesTeam?.[index]?.rmName
                      )}
                      inputValue={salesTeamSearchQuery?.[`officeInfo.salesTeam.${index}.rmName`] || ''}
                      onChange={(event, newValue) => {
                        const enhancedValue = newValue
                          ? enhanceTeamMemberData(newValue, 'rmName', index)
                          : { userName: '', userId: '' };
                        officeUseFormik.setFieldValue(`officeInfo.salesTeam.${index}.rmName`, enhancedValue);
                        officeUseFormik.setFieldValue(`officeInfo.salesTeam.${index}.rmEmployeeId`, newValue?.empCode || '');
                      }}
                      onInputChange={(event, newInputValue) => {
                        const sanitizedValue = newInputValue?.replaceAll(/[^a-zA-Z\s]/g, '');
                        const keyName = `officeInfo.salesTeam.${index}.rmName`;
                        salesTeamSearchKeyNameRef.current = keyName;
                        setSalesTeamSearchQuery((prev: any) => {
                          if (!sanitizedValue) {
                            // If value is empty, remove the key entirely or set to undefined
                            const newState = { ...prev };
                            delete newState[keyName];
                            return newState;
                          }
                          return {
                            ...prev,
                            [keyName]: sanitizedValue,
                          };
                        });
                      }}
                      placeholder={`${suffix} RM${index === 2 ? ' 3' : ''} Name`}
                    />
                  </Box>
                  {typeof officeUseFormik.errors?.officeInfo?.salesTeam?.[index] === 'object' &&
                  officeUseFormik.touched?.officeInfo?.salesTeam?.[index]?.rmName &&
                  officeUseFormik.errors?.officeInfo?.salesTeam?.[index]?.rmName ? (
                    <Typography color="red" fontSize="12px">
                      {officeUseFormik?.errors?.officeInfo?.salesTeam?.[index]?.rmName as string}
                    </Typography>
                  ) : null}
                </Grid>

                <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                  <Box className="referrerInputRow flexColumn">
                    <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                      {suffix} RM{index === 2 ? ' 3' : ''} Employee ID
                      {index === 1 && <span className="asteriskColor"> *</span>}
                    </Typography>
                    <InputBase
                      fullWidth
                      className="inputReferrer"
                      placeholder={`${suffix} RM${index === 2 ? ' 3' : ''} Employee ID`}
                      {...officeUseFormik.getFieldProps(`officeInfo.salesTeam.${index}.rmEmployeeId`)}
                      inputProps={{ maxLength: 10 }}
                      onChange={(e) => {
                        const sanitizedValue = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                        officeUseFormik.setFieldValue(
                          `officeInfo.salesTeam.${index}.rmEmployeeId`,
                          sanitizedValue
                        );
                      }}
                    />
                  </Box>
                  {typeof officeUseFormik.errors?.officeInfo?.salesTeam?.[index] === 'object' &&
                  officeUseFormik.touched?.officeInfo?.salesTeam?.[index]?.rmEmployeeId &&
                  officeUseFormik.errors?.officeInfo?.salesTeam?.[index]?.rmEmployeeId ? (
                    <Typography color="red" fontSize="12px">
                      {officeUseFormik?.errors?.officeInfo?.salesTeam?.[index]?.rmEmployeeId as string}
                    </Typography>
                  ) : null}
                </Grid>

                <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                  <Box
                    className="referrerInputRow flexColumn"
                    sx={{ height: '100%', justifyContent: 'end' }}
                  >
                    <Typography
                      className="typographyLabel"
                      style={{
                        marginBottom: '0px',
                        width: '100%',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      {suffix} RM{index === 2 ? ' 3' : ''} Signature
                    </Typography>
                  </Box>
                </Grid>

                {/* TL */}
                <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                  <Box className="referrerInputRow flexColumn">
                    <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                      {suffix} TL{index === 2 ? ' 3' : ''} Name
                    </Typography>
                    <CustomAutocomplete
                      options={salesTeamOptions?.map((option) => option) || []}
                      value={getAutocompleteValue(officeUseFormik?.values?.officeInfo?.salesTeam[index].tlName)}
                      inputValue={salesTeamSearchQuery?.[`officeInfo.salesTeam.${index}.tlName`] || ''}
                      onChange={(event, newValue) => {
                        const enhancedValue = newValue
                          ? enhanceTeamMemberData(newValue, 'tlName', index)
                          : { userName: '', userId: '' };
                        officeUseFormik.setFieldValue(`officeInfo.salesTeam.${index}.tlName`, enhancedValue);
                        officeUseFormik.setFieldValue(`officeInfo.salesTeam.${index}.tlEmployeeId`, newValue?.empCode || '');
                      }}
                      onInputChange={(event, newInputValue) => {
                        const sanitizedValue = newInputValue?.replaceAll(/[^a-zA-Z\s]/g, '');
                        const keyName = `officeInfo.salesTeam.${index}.tlName`;
                        salesTeamSearchKeyNameRef.current = keyName;
                        setSalesTeamSearchQuery((prev: any) => {
                          if (!sanitizedValue) {
                            // If value is empty, remove the key entirely or set to undefined
                            const newState = { ...prev };
                            delete newState[keyName];
                            return newState;
                          }
                          return {
                            ...prev,
                            [keyName]: sanitizedValue,
                          };
                        });
                      }}
                      placeholder={`${suffix} TL${index === 2 ? ' 3' : ''} Name`}
                    />
                  </Box>
                  {typeof officeUseFormik.errors?.officeInfo?.salesTeam?.[index] === 'object' &&
                  officeUseFormik.touched?.officeInfo?.salesTeam?.[index]?.tlName &&
                  officeUseFormik.errors?.officeInfo?.salesTeam?.[index]?.tlName ? (
                    <Typography color="red" fontSize="12px">
                      {officeUseFormik?.errors?.officeInfo?.salesTeam?.[index]?.tlName as string}
                    </Typography>
                  ) : null}
                </Grid>

                <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                  <Box className="referrerInputRow flexColumn">
                    <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                      {suffix} TL{index === 2 ? ' 3' : ''} Employee ID
                    </Typography>
                    <InputBase
                      fullWidth
                      className="inputReferrer"
                      placeholder={`${suffix} TL${index === 2 ? ' 3' : ''} Employee ID`}
                      {...officeUseFormik.getFieldProps(`officeInfo.salesTeam.${index}.tlEmployeeId`)}
                      inputProps={{ maxLength: 10 }}
                      onChange={(e) => {
                        const sanitizedValue = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                        officeUseFormik.setFieldValue(
                          `officeInfo.salesTeam.${index}.tlEmployeeId`,
                          sanitizedValue
                        );
                      }}
                    />
                  </Box>
                  {typeof officeUseFormik.errors?.officeInfo?.salesTeam?.[index] === 'object' &&
                  officeUseFormik.touched?.officeInfo?.salesTeam?.[index]?.tlEmployeeId &&
                  officeUseFormik.errors?.officeInfo?.salesTeam?.[index]?.tlEmployeeId ? (
                    <Typography color="red" fontSize="12px">
                      {officeUseFormik?.errors?.officeInfo?.salesTeam?.[index]?.tlEmployeeId as string}
                    </Typography>
                  ) : null}
                </Grid>

                <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                  <Box
                    className="referrerInputRow flexColumn"
                    sx={{ height: '100%', justifyContent: 'end', mb: 0 }}
                  >
                    <Typography
                      className="typographyLabel"
                      style={{
                        marginBottom: '0px',
                        width: '100%',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      {suffix} TL{index === 2 ? ' 3' : ''} Signature
                    </Typography>
                  </Box>
                </Grid>

                {/* RSH */}
                <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                  <Box className="referrerInputRow flexColumn">
                    <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                      {suffix} RSH{index === 2 ? ' 3' : ''} Name
                    </Typography>
                    <CustomAutocomplete
                      options={salesTeamOptions?.map((option) => option) || []}
                      value={getAutocompleteValue(
                        officeUseFormik?.values?.officeInfo?.salesTeam[index].rshName
                      )}
                      inputValue={salesTeamSearchQuery?.[`officeInfo.salesTeam.${index}.rshName`] || ''}
                      onChange={(event, newValue) => {
                        const enhancedValue = newValue
                          ? enhanceTeamMemberData(newValue, 'rshName', index)
                          : { userName: '', userId: '' };
                        officeUseFormik.setFieldValue(`officeInfo.salesTeam.${index}.rshName`, enhancedValue);
                        officeUseFormik.setFieldValue(`officeInfo.salesTeam.${index}.rshEmployeeId`, newValue?.empCode || '');
                      }}
                      onInputChange={(event, newInputValue) => {
                        const sanitizedValue = newInputValue?.replaceAll(/[^a-zA-Z\s]/g, '');
                        const keyName = `officeInfo.salesTeam.${index}.rshName`;
                        salesTeamSearchKeyNameRef.current = keyName;
                        setSalesTeamSearchQuery((prev: any) => {
                          if (!sanitizedValue) {
                            // If value is empty, remove the key entirely or set to undefined
                            const newState = { ...prev };
                            delete newState[keyName];
                            return newState;
                          }
                          return {
                            ...prev,
                            [keyName]: sanitizedValue,
                          };
                        });
                      }}
                      placeholder={`${suffix} RSH${index === 2 ? ' 3' : ''} Name`}
                    />
                  </Box>
                  {typeof officeUseFormik.errors?.officeInfo?.salesTeam?.[index] === 'object' &&
                  officeUseFormik.touched?.officeInfo?.salesTeam?.[index]?.rshName &&
                  officeUseFormik.errors?.officeInfo?.salesTeam?.[index]?.rshName ? (
                    <Typography color="red" fontSize="12px">
                      {officeUseFormik?.errors?.officeInfo?.salesTeam?.[index]?.rshName as string}
                    </Typography>
                  ) : null}
                </Grid>

                <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                  <Box className="referrerInputRow flexColumn">
                    <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                      {suffix} RSH{index === 2 ? ' 3' : ''} Employee ID
                    </Typography>
                    <InputBase
                      fullWidth
                      className="inputReferrer"
                      placeholder={`${suffix} Regional Head${index === 2 ? ' 3' : ''} Employee ID`}
                      {...officeUseFormik.getFieldProps(`officeInfo.salesTeam.${index}.rshEmployeeId`)}
                      inputProps={{ maxLength: 10 }}
                      onChange={(e) => {
                        const sanitizedValue = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                        officeUseFormik.setFieldValue(
                          `officeInfo.salesTeam.${index}.rshEmployeeId`,
                          sanitizedValue
                        );
                      }}
                    />
                  </Box>
                  {typeof officeUseFormik.errors?.officeInfo?.salesTeam?.[index] === 'object' &&
                  officeUseFormik.touched?.officeInfo?.salesTeam?.[index]?.rshEmployeeId &&
                  officeUseFormik.errors?.officeInfo?.salesTeam?.[index]?.rshEmployeeId ? (
                    <Typography color="red" fontSize="12px">
                      {officeUseFormik?.errors?.officeInfo?.salesTeam?.[index]?.rshEmployeeId as string}
                    </Typography>
                  ) : null}
                </Grid>

                <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                  <Box
                    className="referrerInputRow flexColumn"
                    sx={{ height: '100%', justifyContent: 'end', alignItems: 'center' }}
                  >
                    <Typography
                      className="typographyLabel"
                      style={{
                        marginBottom: '0px',
                        width: '100%',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      {suffix} RSH{index === 2 ? ' 3' : ''} Signature
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                  <Divider sx={{ mt: 2, borderStyle: 'dashed', borderColor: '#DADADA' }} />
                </Grid>
              </React.Fragment>
            );
          })}

          {(primarySource?.includes('Privilege') ||
            primarySource === PRIMARY_SOURCE?.ProvidentPremiere) && (
            <>
              <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                <Box className="referrerInputRow flexColumn">
                  <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                    Loyalty Team Name
                  </Typography>
                  <CustomAutocomplete
                    options={salesTeamOptions?.map((option) => option) || []}
                    value={getAutocompleteValue(officeUseFormik?.values?.officeInfo?.loyaltyTeamName)}
                    inputValue={salesTeamSearchQuery?.loyaltyTeamName || ''}
                    onChange={(event, newValue) => {
                      const enhancedValue = newValue
                        ? enhanceTeamMemberData(newValue, 'officeInfo.loyaltyTeamName')
                        : { userName: '', userId: '' };
                      officeUseFormik.setFieldValue('officeInfo.loyaltyTeamName', enhancedValue);
                      officeUseFormik.setFieldValue(`officeInfo.loyaltyTeamEmployeeId`, newValue?.empCode || '');
                    }}
                    onInputChange={(event, newInputValue) => {
                      // Sanitize the input value to allow only alphabets and spaces
                      const sanitizedValue = newInputValue?.replaceAll(/[^a-zA-Z\s]/g, '');
                      const keyName = 'loyaltyTeamName';
                      salesTeamSearchKeyNameRef.current = keyName;
                      setSalesTeamSearchQuery((prev: any) => {
                        if (!sanitizedValue) {
                          // If value is empty, remove the key entirely or set to undefined
                          const newState = { ...prev };
                          delete newState[keyName];
                          return newState;
                        }
                        return {
                          ...prev,
                          [keyName]: sanitizedValue,
                        };
                      });
                    }}
                    placeholder="Loyalty Team Name"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                <Box className="referrerInputRow flexColumn">
                  <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                    Loyalty Team Employee ID
                  </Typography>
                  <InputBase
                    fullWidth
                    className="inputReferrer"
                    placeholder="Loyalty Team Employee ID"
                    {...officeUseFormik.getFieldProps(`officeInfo.loyaltyTeamEmployeeId`)}
                    inputProps={{ maxLength: 10 }}
                    onChange={(e) => {
                      const sanitizedValue = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                      officeUseFormik.setFieldValue('officeInfo.loyaltyTeamEmployeeId', sanitizedValue);
                    }}
                  />
                </Box>
                {officeUseFormik?.touched?.officeInfo?.loyaltyTeamEmployeeId &&
                officeUseFormik?.errors?.officeInfo?.loyaltyTeamEmployeeId ? (
                  <Typography color="red" fontSize="12px">
                    {officeUseFormik?.errors?.officeInfo?.loyaltyTeamEmployeeId}
                  </Typography>
                ) : null}
              </Grid>
              <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                <Box
                  className="referrerInputRow flexColumn"
                  sx={{ height: '100%', justifyContent: 'end' }}
                >
                  <Typography
                    className="typographyLabel"
                    style={{
                      marginBottom: '0px',
                      width: '100%',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Loyalty Team Signature
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                <Divider sx={{ mt: 2, borderStyle: 'dashed', borderColor: '#DADADA' }} />
              </Grid>
            </>
          )}

          {(digitalMarketing || isDirect) && (
            <>
              <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                <Box className="referrerInputRow flexColumn">
                  <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                    Pre Sales 1 Name
                  </Typography>
                  <CustomAutocomplete
                    options={salesTeamOptions?.map((option) => option) || []}
                    value={getAutocompleteValue(officeUseFormik?.values?.officeInfo?.preSales1Name)}
                    inputValue={salesTeamSearchQuery?.preSales1Name || ''}
                    onChange={(event, newValue) => {
                      const enhancedValue = newValue
                        ? enhanceTeamMemberData(newValue, 'officeInfo.preSales1Name')
                        : { userName: '', userId: '' };
                      officeUseFormik.setFieldValue('officeInfo.preSales1Name', enhancedValue);
                      officeUseFormik.setFieldValue(`officeInfo.preSales1EmpId`, newValue?.empCode || '');
                    }}
                    onInputChange={(event, newInputValue) => {
                      // Sanitize the input value to allow only alphabets and spaces
                      const sanitizedValue = newInputValue?.replaceAll(/[^a-zA-Z\s]/g, '');
                      const keyName = 'officeInfo.preSales1Name';
                      salesTeamSearchKeyNameRef.current = keyName;
                      setSalesTeamSearchQuery((prev: any) => {
                        if (!sanitizedValue) {
                          // If value is empty, remove the key entirely or set to undefined
                          const newState = { ...prev };
                          delete newState[keyName];
                          return newState;
                        }
                        return {
                          ...prev,
                          [keyName]: sanitizedValue,
                        };
                      });
                    }}
                    placeholder="Pre Sales 1 Name"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                <Box className="referrerInputRow flexColumn">
                  <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                    Pre Sales 1 Employee ID
                  </Typography>
                  <InputBase
                    fullWidth
                    className="inputReferrer"
                    placeholder="Pre Sales  1 Employee ID"
                    {...officeUseFormik.getFieldProps(`officeInfo.preSales1EmpId`)}
                    inputProps={{ maxLength: 10 }}
                    onChange={(e) => {
                      const sanitizedValue = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                      officeUseFormik.setFieldValue('officeInfo.preSales1EmpId', sanitizedValue);
                    }}
                  />
                </Box>
                {officeUseFormik?.touched?.officeInfo?.preSales1EmpId &&
                officeUseFormik?.errors?.officeInfo?.preSales1EmpId ? (
                  <Typography color="red" fontSize="12px">
                    {officeUseFormik?.errors?.officeInfo?.preSales1EmpId}
                  </Typography>
                ) : null}
              </Grid>

              {!isDirect && (
                <>
                  <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                    <Box className="referrerInputRow flexColumn">
                      <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                        Pre Sales 2 Name
                      </Typography>
                      <CustomAutocomplete
                        options={salesTeamOptions?.map((option) => option) || []}
                        value={getAutocompleteValue(officeUseFormik?.values?.officeInfo?.preSales2Name)}
                        inputValue={salesTeamSearchQuery?.preSales2Name || ''}
                        onChange={(event, newValue) => {
                          const enhancedValue = newValue
                            ? enhanceTeamMemberData(newValue, 'officeInfo.preSales2Name')
                            : { userName: '', userId: '' };
                          officeUseFormik.setFieldValue('officeInfo.preSales2Name', enhancedValue);
                          officeUseFormik.setFieldValue(`officeInfo.preSales2EmpId`, newValue?.empCode || '');
                        }}
                        onInputChange={(event, newInputValue) => {
                          // Sanitize the input value to allow only alphabets and spaces
                          const sanitizedValue = newInputValue?.replaceAll(/[^a-zA-Z\s]/g, '');
                          const keyName = 'officeInfo.preSales2Name';
                          salesTeamSearchKeyNameRef.current = keyName;
                          setSalesTeamSearchQuery((prev: any) => {
                            if (!sanitizedValue) {
                              // If value is empty, remove the key entirely or set to undefined
                              const newState = { ...prev };
                              delete newState[keyName];
                              return newState;
                            }
                            return {
                              ...prev,
                              [keyName]: sanitizedValue,
                            };
                          });
                        }}
                        placeholder="Pre Sales 2 Name"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                    <Box className="referrerInputRow flexColumn">
                      <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                        Pre Sales 2 Employee ID
                      </Typography>
                      <InputBase
                        fullWidth
                        className="inputReferrer"
                        placeholder="Pre Sales  2 Employee ID"
                        {...officeUseFormik.getFieldProps(`officeInfo.preSales2EmpId`)}
                        inputProps={{ maxLength: 10 }}
                        onChange={(e) => {
                          const sanitizedValue = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                          officeUseFormik.setFieldValue('officeInfo.preSales2EmpId', sanitizedValue);
                        }}
                      />
                    </Box>
                    {officeUseFormik?.touched?.officeInfo?.preSales2EmpId &&
                    officeUseFormik?.errors?.officeInfo?.preSales2EmpId ? (
                      <Typography color="red" fontSize="12px">
                        {officeUseFormik?.errors?.officeInfo?.preSales2EmpId}
                      </Typography>
                    ) : null}
                  </Grid>
                </>
              )}

              <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                <Box className="referrerInputRow flexColumn">
                  <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                    Pre Sales Head Name
                  </Typography>
                  <CustomAutocomplete
                    options={salesTeamOptions?.map((option) => option) || []}
                    value={getAutocompleteValue(officeUseFormik?.values?.officeInfo?.preSalesHeadName)}
                    inputValue={salesTeamSearchQuery?.preSalesHeadName || ''}
                    onChange={(event, newValue) => {
                      const enhancedValue = newValue
                        ? enhanceTeamMemberData(newValue, 'officeInfo.preSalesHeadName')
                        : { userName: '', userId: '' };
                      officeUseFormik.setFieldValue('officeInfo.preSalesHeadName', enhancedValue);
                    }}
                    onInputChange={(event, newInputValue) => {
                      // Sanitize the input value to allow only alphabets and spaces
                      const sanitizedValue = newInputValue?.replaceAll(/[^a-zA-Z\s]/g, '');
                      const keyName = 'officeInfo.preSalesHeadName';
                      salesTeamSearchKeyNameRef.current = keyName;
                      setSalesTeamSearchQuery((prev: any) => {
                        if (!sanitizedValue) {
                          // If value is empty, remove the key entirely or set to undefined
                          const newState = { ...prev };
                          delete newState[keyName];
                          return newState;
                        }
                        return {
                          ...prev,
                          [keyName]: sanitizedValue,
                        };
                      });
                    }}
                    placeholder="Pre Sales Head Name"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={12} md={4} lg={4} xl={4} />
              <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                <Box
                  className="referrerInputRow flexColumn"
                  sx={{ height: '100%', justifyContent: 'end' }}
                >
                  <Typography
                    className="typographyLabel"
                    style={{
                      marginBottom: '0px',
                      width: '100%',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Pre Sales Head Signature
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={12} sm={12} md={12} lg={12} xl={12}>
                <Divider sx={{ mt: 2, borderStyle: 'dashed', borderColor: '#DADADA' }} />
              </Grid>
            </>
          )}
          <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
            <Box className="referrerInputRow flexColumn">
              <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                Project Head Name
              </Typography>
              <CustomAutocomplete
                options={salesTeamOptions?.map((option) => option) || []}
                value={getAutocompleteValue(officeUseFormik?.values?.officeInfo?.projectHeadName)}
                // inputValue={salesTeamSearchQuery?.projectHeadName || ''}
                inputValue={salesTeamSearchQuery?.['officeInfo.projectHeadName'] || ''}
                onChange={(event, newValue) => {
                  const enhancedValue = newValue
                    ? enhanceTeamMemberData(newValue, 'officeInfo.projectHeadName')
                    : { userName: '', userId: '' };
                  officeUseFormik.setFieldValue('officeInfo.projectHeadName', enhancedValue);
                  officeUseFormik.setFieldValue(`officeInfo.projectHeadEmployeeId`, newValue?.empCode || '');
                }}
                onInputChange={(event, newInputValue) => {
                  // Sanitize the input value to allow only alphabets and spaces
                  const sanitizedValue = newInputValue?.replaceAll(/[^a-zA-Z\s]/g, '');
                  const keyName = 'officeInfo.projectHeadName';
                  salesTeamSearchKeyNameRef.current = keyName;
                  setSalesTeamSearchQuery((prev: any) => {
                    if (!sanitizedValue) {
                      // If value is empty, remove the key entirely or set to undefined
                      const newState = { ...prev };
                      delete newState[keyName];
                      return newState;
                    }
                    return {
                      ...prev,
                      [keyName]: sanitizedValue,
                    };
                  });
                }}
                placeholder="Project Head Name"
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
            <Box className="referrerInputRow flexColumn">
              <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                Project Head Employee ID
              </Typography>
              <InputBase
                fullWidth
                className="inputReferrer"
                placeholder="Project Head Employee ID"
                {...officeUseFormik.getFieldProps(`officeInfo.projectHeadEmployeeId`)}
                inputProps={{ maxLength: 10 }}
                onChange={(e) => {
                  const sanitizedValue = e.target.value.replaceAll(/[^a-zA-Z0-9\s]/g, '');
                  officeUseFormik.setFieldValue('officeInfo.projectHeadEmployeeId', sanitizedValue);
                }}
              />
            </Box>
            {officeUseFormik?.touched?.officeInfo?.projectHeadEmployeeId &&
            officeUseFormik?.errors?.officeInfo?.projectHeadEmployeeId ? (
              <Typography color="red" fontSize="12px">
                {officeUseFormik?.errors?.officeInfo?.projectHeadEmployeeId}
              </Typography>
            ) : null}
          </Grid>
          <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
            <Box
              className="referrerInputRow flexColumn"
              sx={{ height: '100%', justifyContent: 'end' }}
            >
              <Typography
                className="typographyLabel"
                style={{
                  marginBottom: '0px',
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Project Head Signature
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
            <Box className="referrerInputRow flexColumn">
              <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                Business Head Name<span className="asteriskColor"> *</span>
              </Typography>
              <CustomAutocomplete
                options={nameOptions?.map((option) => option) || []}
                value={getAutocompleteValue(officeUseFormik?.values?.officeInfo?.businessHeadName)}
                inputValue={searchQuery?.['officeInfo.businessHeadName']  || ''}
                onChange={(event, newValue) => {
                  officeUseFormik.setFieldValue('officeInfo.businessHeadName', newValue);
                }}
                onInputChange={(event, newInputValue) => {
                  // Sanitize the input value to allow only alphabets and spaces
                  const sanitizedValue = newInputValue?.replaceAll(/[^a-zA-Z\s]/g, '');
                  const keyName = 'officeInfo.businessHeadName';
                  searchKeyNameRef.current = keyName;
                  setSearchQuery((prev: any) => ({
                    ...prev,
                    [keyName]: sanitizedValue || '', // Store the sanitized value
                  }));
                }}
                placeholder="Business Head Name"
              />
            </Box>
            {officeUseFormik?.touched?.officeInfo?.businessHeadName &&
            officeUseFormik?.errors?.officeInfo?.businessHeadName?.userName ? (
              <Typography color="red" fontSize="12px">
                {officeUseFormik?.errors?.officeInfo?.businessHeadName?.userName}
              </Typography>
            ) : null}
          </Grid>

          <Grid item xs={12} sm={12} md={4} lg={4} xl={4} />

          <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
            <Box
              className="referrerInputRow flexColumn"
              sx={{ height: '100%', justifyContent: 'end' }}
            >
              <Typography
                className="typographyLabel"
                style={{
                  marginBottom: '0px',
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Business Head Signature
              </Typography>
            </Box>
          </Grid>

          {opportunity?.data?.primarySource === PRIMARY_SOURCE?.ChannelPartner && (
            <>
              <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                <Box className="referrerInputRow flexColumn">
                  <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>
                    Business Head 2 Name
                  </Typography>
                  <CustomAutocomplete
                    options={nameOptions?.map((option : any) => option) || []}
                    value={getAutocompleteValue(officeUseFormik?.values?.officeInfo?.businessHead2Name)}
                    inputValue={searchQuery?.businessHead2Name || ''}
                    onChange={(event, newValue) => {
                      officeUseFormik.setFieldValue('officeInfo.businessHead2Name', newValue);
                    }}
                    onInputChange={(event, newInputValue) => {
                      // Sanitize the input value to allow only alphabets and spaces
                      const sanitizedValue = newInputValue?.replaceAll(/[^a-zA-Z\s]/g, '');
                      const keyName = 'officeInfo.businessHead2Name';
                      searchKeyNameRef.current = keyName;
                      setSearchQuery((prev: any) => ({
                        ...prev,
                        [keyName]: sanitizedValue || '', // Store the sanitized value
                      }));
                    }}
                    placeholder="Business Head 2 Name"
                  />
                </Box>
                {officeUseFormik?.touched?.officeInfo?.businessHead2Name &&
                officeUseFormik?.errors?.officeInfo?.businessHead2Name?.userName ? (
                  <Typography color="red" fontSize="12px">
                    {officeUseFormik?.errors?.officeInfo?.businessHead2Name?.userName}
                  </Typography>
                ) : null}
              </Grid>

              <Grid item xs={12} sm={12} md={4} lg={4} xl={4} />

              <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
                <Box
                  className="referrerInputRow flexColumn"
                  sx={{ height: '100%', justifyContent: 'end' }}
                >
                  <Typography
                    className="typographyLabel"
                    style={{
                      marginBottom: '0px',
                      width: '100%',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Business Head 2 Signature
                  </Typography>
                </Box>
              </Grid>
            </>
          )}

          {/* RM Remarks */}
          <Grid item xs={12}>
            <Typography sx={{ fontSize: '14px', fontWeight: '500', mb: 1 }}>RM Remarks</Typography>
            <TextField
              placeholder="Enter Remarks"
              multiline
              rows={4}
              variant="outlined"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  border: '1px solid #D0D5DD',
                  minHeight: '91px', // Use minHeight instead of height
                  padding: '0',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  padding: '14px', // Adjust padding to ensure proper spacing
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'black',
                },
              }}
              {...officeUseFormik.getFieldProps('remarks')}
              inputProps={{ maxLength: 500 }}
              helperText={`${officeUseFormik?.values?.remarks?.length || 0}/500 characters`}
            />
          </Grid>

          <Grid item xs={12}>
            <Box
              sx={{
                border: '1px solid #1A407D4D',
                borderRadius: '8px',         
              }}
            >
              <UploadAdditionalDocuments
                type="additional_documents"
                stage="office_use"
                showBorder={false}
              />
            </Box>
          </Grid>
        </Grid>

        <Grid container>
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <Box
              component="div"
              className="filledButtonAll gap-16"
              sx={{ justifyContent: 'flex-start' }}
            >
              {postBookingStep === 1 && (
                <FilledButton
                  isLoading={isPostLoading}
                  onClick={() => {
                    handleSave(false);
                  }}
                  label="Post Booking"
                  width="100%"
                  icon={<ArrowCircleLeft />}
                />
              )}
              {preBookingStep === 1 && (
                <FilledButton
                  onClick={() => dispatch(setpreBookingStep(0))}
                  label="Pre Booking"
                  width="100%"
                  icon={<ArrowCircleLeft />}
                />
              )}
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <Box
              component="div"
              className="filledButtonAll  gap-16"
              sx={{ justifyContent: 'flex-end' }}
            >
              <Button
                className="noCustomStyle"
                startIcon={
                  <BookmarkBorderIcon
                    sx={{
                      fontSize: '20px', // Adjust size for minimal look
                    }}
                  />
                }
                sx={{
                  width: {
                    xs: '200px',
                    sm: '200px',
                    md: '200px',
                    lg: '175px',
                  },
                  height: '48px',
                  borderRadius: '8px',
                  background: '#fff',
                  color: '#1A407D',
                  fontSize: '16px',
                  fontWeight: '600',
                  lineHeight: '24px',
                  textTransform: 'capitalize',
                  border: '1px solid #D0D5DD',
                  '&:hover': {
                    backgroundColor: '#092552',
                    color: '#fff',
                  },
                  mb: {
                    xs: '24px',
                    sm: '0px',
                    md: '0px',
                    lg: '0px',
                  },
                }}
                onClick={() => handleSave(true)}
              >
                {isSaveLoading ? (
                  <CircularProgress size={24} sx={{ color: '#1A407D' }} />
                ) : (
                  'Save as draft'
                )}
              </Button>
              {postBookingStep === 1 &&
                applicantData?.data?.bookingFormStatus === BOOKING_FORM_STATUS.SIGNED_RM_UPLOAD && (
                  <FilledButton
                    type="submit"
                    isLoading={isLoading}
                    onClick={handleSubmit}
                    label="Submit"
                    width="100%"
                  />
                )}
            </Box>
          </Grid>
        </Grid>
      </form>
    </BorderBox>
  );
};

export default OfficeUse;