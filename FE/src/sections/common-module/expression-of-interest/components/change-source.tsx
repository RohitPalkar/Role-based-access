import type { CreateSourceChangeRequestPayload } from 'src/services/rm-panel/eoi-service';

import * as yup from 'yup';
import { toast } from 'sonner';
import { useFormik } from 'formik';
import React, { useRef, useState, useEffect } from 'react';

import {
  Box,
  Card,
  Grid,
  Radio,
  Button,
  TextField,
  RadioGroup,
  Typography,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';

import { useParams, useRouter } from 'src/routes/hooks';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';
import { mapArrayToLabelValue, isValidPhoneNumberWithRules, transformChangeSourceHistory } from 'src/utils/helper';
import {
  ROLES,
  PRIMARY_SOURCE,
  SECONDARY_SOURCE,
  SourceChangeStatus,
  SHOW_REFERRER_OPTIONS,
  REFERRER_RADIO_OPTIONS,
  generateRoleBasedRoute,
  SHOW_REFERRAL_AT_EOI_OPTIONS,
  SOURCE_CHANGE_REQUEST_OPTIONS,
} from 'src/utils/constant';

import swapIcon from 'src/assets/icons/swapIcon.svg';
import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { resetVoucherData } from 'src/redux/slices/rm-panel/eoi-slice';
import {
  fetchEOIProjects,
  getVoucherEOIById,
  fetchCPNameAction,
  fetchEOIPrimarySource,
  addSourceChangeRequest,
  fetchEOICampaignsAction,
  getVoucherByEnquiryAction,
  fetchReferredVoucherAction,
  getVoucherByPaymentRefIdAction,
  fetchSourceChangeRequestByIdThunk,
  approveOrRejectSourceChangeRequestThunk,
} from 'src/redux/actions/rm-panel/eoi-actions';

import { Field } from 'src/components/hook-form';
import NewDropzone from 'src/components/dropzone/NewDropzone';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import ReadOnlyField from 'src/components/read-only-field/read-only-field';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';
import FormikAutocomplete from 'src/components/formik-autocomplete/FormikAutocomplete';

import { removeEmpty } from 'src/auth/context/jwt';

import SwapFieldDialog from './swap-field-dialog';
import ChangeSourceRecentHistory from '../changeSourceRecentHistory';
import PrimarySourceConditionalFields from '../../../../components/primary-source-conditional-fields/primary-source-conditional-fields';

type Mode = 'edit' | 'view' | 'create';
const ChangeSource = () => {
  const {
    voucherData,
    primarySource: primarySourceList,
    cpName,
    campaigns,
    projectOptions,
    sourceChangeRequestData,
    sourceChangeRequestId
  } = useAppSelector((state) => state.expressonOfInterest);
  
  const cpOptions = mapArrayToLabelValue(cpName, 'label', 'value');
  const { id } = useParams();
  const pathParts = window.location.pathname.split('/');
  const mode = pathParts[4];

  // get camoagn name by id
  function getCampaignName(value:number) {
    const campaign = campaigns.find(c => c.value === value);
    return campaign ? campaign.name : null;
  }
  const campaignId = voucherData?.campaignId || '';
  const dispatch = useAppDispatch();
  const rolePermissions = useRoleBasedPermissions({ module: 'eoi' });
  const { userRole } = rolePermissions;
  const isRM = userRole === ROLES.RM;
  const route = useRouter();
  const { changeSource } = uiText.EOIJson;
  const { basicDetails } = uiText.EOIJson.createEOI.form;
  const [enquiryDataFetched, setEnquiryDataFetched] = useState(false);
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [isVoucherFetched, setIsVoucherFetched] = useState<boolean>(false);
  const [openSwapDialog, setOpenSwapDialog] = useState(false);
  const [selectedSwapFields, setSelectedSwapFields] = useState<string[]>([]);
  const isInitializedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [isRejectLoading, setIsRejectLoading] = useState(false);

// get referrer id
const getReferrerType = (secondarySources: string) => {
  if ([SECONDARY_SOURCE.Referral, 'referredByCustomer'].includes(secondarySources)) {
    return REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER;
  }

  if (['referralOthers', SECONDARY_SOURCE.referralOthers].includes(secondarySources)) {
    return REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS;
  }

  if(['buyingForSelf',SECONDARY_SOURCE.Loyalty ].includes(secondarySources)) {
    return REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF;
  }

  return '';
};

  const primarySourceOptions = primarySourceList?.map((src) => ({
    value: src?.value,
    label: src?.value,
  }));
  const requiredCustomerDetails = (primarySource: string, referrer?: string) =>
    (SHOW_REFERRER_OPTIONS.includes(primarySource) ||
      SHOW_REFERRAL_AT_EOI_OPTIONS.includes(primarySource)) &&
    referrer !== REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS;
  const isEditOrViewMode = mode === 'edit' || mode === 'view';

  // Heading
  const headingMap: Record<Mode, string> = {
    edit: changeSource.headingEdit,
    view: changeSource.headingPreview,
    create: changeSource.headingCreate,
  };

  const safeMode: Mode = mode === 'edit' || mode === 'view' || mode === 'create' ? mode : 'create';

  const heading = headingMap[safeMode];

  // formik initilization
  const formik = useFormik({
    initialValues: {
      currentData: {
        countryCode: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.countryCode || '+91'
          : voucherData?.applicant1?.personalDetails?.countryCode || '+91',
        contactNumber: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.contactNumber || ''
          : voucherData?.applicant1?.personalDetails?.contactNumber || '',
        uniqueReferenceId: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.uniqueReferenceId || ''
          : voucherData?.uniqueReferenceId || '',
        firstName: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.firstName || ''
          : voucherData?.applicant1?.personalDetails?.firstName || '',
        lastName: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.lastName || ''
          : voucherData?.applicant1?.personalDetails?.lastName || '',
        emailId: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.emailId || ''
          : voucherData?.applicant1?.personalDetails?.emailAddress || '',
        primarySource: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.primarySource || ''
          : voucherData?.primarySource || '',
        amountPaid: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.amountPaid || 0
          : voucherData?.paymentDetails?.totalAmountPaid || 0,
        channelPartner:  isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.sourceDetails?.channelPartner || '': voucherData?.sourceDetails?.channelPartner || '',
        cp_link_id: voucherData?.cpLinkId || '',
        sourceData: {
          customerName: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.sourceDetails?.name || '': voucherData?.sourceDetails?.name || '',
          referrer: isEditOrViewMode
          ? getReferrerType(sourceChangeRequestData?.currentData?.secondarySource) || '': getReferrerType(voucherData?.secondarySource) || '',
          customerEmail: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.sourceDetails?.email || '': voucherData?.sourceDetails?.email || '',
          countryCode: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.sourceDetails?.countryCode || '' : voucherData?.sourceDetails?.countryCode || '',
          contactNumber: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.sourceDetails?.contactNumber || '' : voucherData?.sourceDetails?.contactNumber || '',
          project: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.sourceDetails?.project || '' :voucherData?.sourceDetails?.project || '',
          unitNumber: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.sourceDetails?.unit || '' :voucherData?.sourceDetails?.unit || '',
          referredBy: isEditOrViewMode
          ? sourceChangeRequestData?.newData?.sourceDetails?.referredBy || '' :voucherData?.sourceDetails?.referredBy || '',
          activityName: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.sourceDetails?.activityName || '' :voucherData?.sourceDetails?.activityName || '',
          employeeName: isEditOrViewMode
          ? sourceChangeRequestData?.newData?.sourceDetails?.employeeName || '' :voucherData?.sourceDetails?.employeeName || '',
          employeeId: isEditOrViewMode
          ? sourceChangeRequestData?.newData?.sourceDetails?.employeeId || '' :voucherData?.sourceDetails?.employeeId || '',
          campaignName: isEditOrViewMode
          ?  getCampaignName(sourceChangeRequestData?.currentData?.sourceDetails?.campaignId) || '' :voucherData?.sourceDetails?.campaignName || '',
          uniqueRefId: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.sourceDetails?.uniqueRefId || '' :voucherData?.sourceDetails?.uniqueRefId || '',
          referralCampaign: isEditOrViewMode
          ? sourceChangeRequestData?.currentData?.sourceDetails?.campaignId?.toString() || '' :voucherData?.sourceDetails?.campaignId || '',
        },
      },
      newData: {
        countryCode: isEditOrViewMode ? sourceChangeRequestData?.newData?.countryCode ?? '+91' :  '+91',
        contactNumber: isEditOrViewMode ? sourceChangeRequestData?.newData?.contactNumber ?? '' :  '',
        uniqueReferenceId: isEditOrViewMode ? sourceChangeRequestData?.targetPRID ?? '' :  '',
        sfdcEnquiryId: isEditOrViewMode ? sourceChangeRequestData?.targetEnquiryId ??  '' :  '',
        firstName: isEditOrViewMode ? sourceChangeRequestData?.newData?.firstName ?? '' : '',
        lastName: isEditOrViewMode ? sourceChangeRequestData?.newData?.lastName ?? '' :  '',
        emailId: isEditOrViewMode ? sourceChangeRequestData?.newData?.emailId ?? '' :  '',
        amountPaid: isEditOrViewMode ? sourceChangeRequestData?.newData?.amountPaid ?? 0 :  0,
      },
      changeSource: isEditOrViewMode  ? sourceChangeRequestData?.changeSource : SOURCE_CHANGE_REQUEST_OPTIONS[0].value,
      reason: sourceChangeRequestData?.reason || '',
      reviewerRemark: sourceChangeRequestData?.reviewerRemark || '',
      approvalProof: isEditOrViewMode  ? sourceChangeRequestData?.approvalProof ?? '' : '',
      status: isEditOrViewMode  ? sourceChangeRequestData?.status : SourceChangeStatus.REQUESTED,

      // conditional primarysource fields
      primarySource: isEditOrViewMode  ? sourceChangeRequestData?.newData?.primarySource ?? '' : '',
      channelPartner: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.cp_link_id ?? '' : '',
      referrer: isEditOrViewMode  ? getReferrerType(sourceChangeRequestData?.newData?.secondarySource) ?? '' : '',
      customerName: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.name ?? '' : '',
      customerMobileNumber: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.contactNumber ?? '' : '',
      customerCountryCode: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.countryCode ?? '' : '',
      customerEmail: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.email ?? '' : '',
      project: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.project?.toString() ?? '' : '',
      unitNumber: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.unit ?? '' : '',
      referredBy:  isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.referredBy ?? '' : '',
      activityName: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.activityName ?? '' : '',
      employeeName: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.employeeName ?? '' : '',
      employeeId: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.employeeId ?? '' : '',
      referralCampaign: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.campaignId?.toString() ?? '' : '',
      uniqueRefId: isEditOrViewMode  ? sourceChangeRequestData?.newData?.sourceDetails?.uniqueRefId ?? '' : '',
    },
    validationSchema: yup.object({
      newData: yup.object({
        firstName: yup.string().required(basicDetails.validations.firstName),
        lastName: yup.string().required(basicDetails.validations.lastName),
        countryCode: yup.string().required(basicDetails.validations.countryCode),
        contactNumber: yup
          .string()
          .required(basicDetails.validations.contactNumber)
          .test(
            'is-valid-phone',
            basicDetails.validations.invalidContactNumber,
            (value, context) => {
              const { countryCode } = context.parent;
              return isValidPhoneNumberWithRules(countryCode, value);
            }
          ),
        emailId: yup
          .string()
          .matches(
            /^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
            basicDetails.validations.invalidEmail
          )
          .required(basicDetails.validations.email),
        amountPaid: yup
          .number()
          .transform((value, originalValue) => {
            // If empty string → treat as undefined
            if (originalValue === '') return undefined;
            // If null or undefined → default to 0
            if (originalValue == null) return 0;
            return value;
          })
          .min(0, changeSource.validation.negativeAmt) // allows 0
          .when('..changeSource', ([changeSourceValue], schema) => {
            const isPaymentRefId =
              changeSourceValue === SOURCE_CHANGE_REQUEST_OPTIONS[1].value;
            if (isPaymentRefId) {
              return schema.required(changeSource.validation.amount);
            }
            return schema.notRequired();
          }),
        sfdcEnquiryId: yup.string().when('changeSource', ([value], schema) =>
          value === SOURCE_CHANGE_REQUEST_OPTIONS[0].value
            ? schema.required(changeSource.validation.sfdcEnquiryId)
            : schema.notRequired()
        ),
        uniqueReferenceId: yup.string().when('changeSource', ([value], schema) =>
          value === SOURCE_CHANGE_REQUEST_OPTIONS[1].value
            ? schema.required(changeSource.validation.paymentRefId)
            : schema.notRequired()
        ),
      }),
      primarySource: yup.string().required(basicDetails.validations.primarySource),
      channelPartner: yup.string().when('primarySource', ([value], schema) =>
        PRIMARY_SOURCE.ChannelPartner === value
          ? schema.required(basicDetails.validations.cpName)
          : schema.notRequired()
      ),
      referrer: yup.string().when('primarySource', ([value], schema) =>
        SHOW_REFERRER_OPTIONS.includes(value)
          ? schema.required(basicDetails.validations.referrer)
          : schema.notRequired()
      ),
      customerName: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          requiredCustomerDetails(primarySource, referrer)
            ? schema.required(basicDetails.validations.customerName)
            : schema.notRequired()
      ),
      customerCountryCode: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          requiredCustomerDetails(primarySource, referrer)
            ? schema.required(basicDetails.validations.countryCode)
            : schema.notRequired()
      ),
      customerMobileNumber: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          requiredCustomerDetails(primarySource, referrer)
            ? schema
                .required(basicDetails.validations.contactNumber)
                .test(
                  'is-valid-phone',
                  basicDetails.validations.invalidContactNumber,
                  (value, context) => {
                    const { customerCountryCode } = context.parent;
                    return isValidPhoneNumberWithRules(customerCountryCode, value);
                  }
                )
            : schema.notRequired()
      ),
      customerEmail: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          requiredCustomerDetails(primarySource, referrer)
            ? schema
                .matches(
                  /^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                  basicDetails.validations.invalidEmail
                )
                .required(basicDetails.validations.email)
            : schema.notRequired()
      ),
      project: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          SHOW_REFERRER_OPTIONS.includes(primarySource) &&
          referrer !== REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS
            ? schema.required(basicDetails.validations.project)
            : schema.notRequired()
      ),
      unitNumber: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          SHOW_REFERRER_OPTIONS.includes(primarySource) &&
          referrer !== REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS
            ? schema.required(basicDetails.validations.unitNumber)
            : schema.notRequired()
      ),
      referredBy: yup.string().when('referrer', ([value], schema) =>
        value === REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER
          ? schema.required(basicDetails.validations.referredBy)
          : schema.notRequired()
      ),
      employeeName: yup.string().when('primarySource', ([value], schema) =>
        value === PRIMARY_SOURCE.PurvaChampion
          ? schema.required(basicDetails.validations.employeeName)
          : schema.notRequired()
      ),
      employeeId: yup.string().notRequired(),
      referralCampaign: yup.string().when('primarySource', ([val], schema) =>
        SHOW_REFERRAL_AT_EOI_OPTIONS.includes(val)
          ? schema.required(basicDetails.validations.referralCampaign)
          : schema.notRequired()
      ),
      uniqueRefId: yup.string().when('primarySource', ([val], schema) =>
        SHOW_REFERRAL_AT_EOI_OPTIONS.includes(val)
          ? schema.required(basicDetails.validations.uniqueRefId)
          : schema.notRequired()
      ),
      activityName: yup.string().when('referrer', ([value], schema) =>
        value === REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS
          ? schema.required(basicDetails.validations.activityName)
          : schema.notRequired()
      ),
      reason: yup.string().required(changeSource.validation.reason),
      approvalProof: isRM
        ? yup.string().notRequired()
        : yup.string().required(changeSource.validation.approvalProof),
      reviewerRemark: isRM
        ? yup.string().notRequired()
        : yup.string().required(changeSource.validation.reviewerRemark),
    }),
    validateOnChange: true,
    validateOnBlur: true,
    enableReinitialize: true,
    onSubmit: (values) => {},
  });

  // Check Conditions
  const isSfdcEnquiryId = formik.values.changeSource === SOURCE_CHANGE_REQUEST_OPTIONS[0].value;
  const isPurvaPrivilege = voucherData?.primarySource === PRIMARY_SOURCE.PurvaPrivilege;
  const referralFormVisible = SHOW_REFERRAL_AT_EOI_OPTIONS?.includes(voucherData?.primarySource);
  const isReferralOthers =
    voucherData?.secondarySource === SECONDARY_SOURCE.referralOthers
      ? REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS
      : REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF;

  const referrerValue = formik.values.currentData.sourceData.referrer;
 
  const isBuyingOrReferred =
    referrerValue === REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF ||
    referrerValue === REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER;
  const isReferralOther = referrerValue === REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS;
  const isSwapSelected = selectedSwapFields.length > 0;
  // Change to options conditions
  const isRecordDoesNotExist = formik.values.changeSource === SOURCE_CHANGE_REQUEST_OPTIONS[2].value;
  const isPaymentRefId = formik.values.changeSource === SOURCE_CHANGE_REQUEST_OPTIONS[1].value;
  const areAllNewValuesPresent = [
    formik.values.newData.firstName,
    formik.values.newData.lastName,
    formik.values.newData.emailId,
    formik.values.newData.contactNumber,
    ...(isPaymentRefId ? [formik.values.newData.amountPaid] : []),
    formik.values.primarySource,
  ].every((value) => value !== undefined && value !== null && String(value).trim() !== '');

   
  // Swap Data Object(hold current and new values)
  const swapData = {
    firstName: {
      current: formik.values.currentData.firstName || '',
      new: formik.values.newData.firstName || '',
    },
    lastName: {
      current: formik.values.currentData.lastName || '',
      new: formik.values.newData.lastName || '',
    },
    emailId: {
      current: formik.values.currentData.emailId || '',
      new: formik.values.newData.emailId || '',
    },
    contactNumber: {
      current: formik.values.currentData.contactNumber || '',
      new: formik.values.newData?.contactNumber || '',
    },
    countryCode: {
      current: formik.values.currentData.countryCode || '',
      new: formik.values.newData?.countryCode || '',
    },
    primarySource: {
      current: formik.values.currentData.primarySource || '',
      new: formik.values.primarySource || '',
    },
    amountPaid: {
      current: formik.values.currentData.amountPaid || 0,
      new: formik.values.newData.amountPaid || 0,
    },
  };
  
  // Dropdown and voucher api
  useEffect(() => {
    dispatch(fetchEOIPrimarySource());
    dispatch(fetchEOIProjects());
    dispatch(fetchCPNameAction({ campaignId }));
    dispatch(fetchEOICampaignsAction({showAll: true}));

    if (id) {
      dispatch(getVoucherEOIById({ id: Number(id) }));
    } else {
      dispatch(resetVoucherData());
    }
  }, [campaignId, dispatch, id]);

  // fetch get source change details by id 
 useEffect(() => {
  const fetchData = async () => {
    try {

      if (mode === 'view' || mode === 'edit') {
          await dispatch(
          fetchSourceChangeRequestByIdThunk({
            id: localStorage.getItem('sourceChangeRequestId') ?? '',
            voucherId: id,
          })
        ).unwrap();
      } else {
         await dispatch(
          fetchSourceChangeRequestByIdThunk({
            voucherId: id,
          })
        ).unwrap();
      }

    } catch (error: any) {
      console.log('error', error);

      const errorMessage =
        error?.message ||
        error?.data?.message ||
        'Failed to fetch request';

      console.log('errorMessage', errorMessage);
      route.push(generateRoleBasedRoute(userRole, 'eoi-records'));
    }
  };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, sourceChangeRequestId, dispatch]);

  // initialize fields to be swapped on page render
  useEffect(()=>{
    if(sourceChangeRequestData?.swappedFields){
      setSelectedSwapFields(sourceChangeRequestData?.swappedFields);
    }
  }, [sourceChangeRequestData?.swappedFields])

  // Reset new field data when changeSource changes
  useEffect(() => {

      // set EnquiryDataFetched in edit mode if it contains value
      if(isEditOrViewMode && sourceChangeRequestData?.changeSource ){
        setEnquiryDataFetched(true);
      }
    
    // Reset fields when changeSource actually changes (only after initialization)
    if (formik.values.changeSource != null && formik.values.changeSource && sourceChangeRequestData?.changeSource !== formik.values.changeSource) {
      resetEnquiryFields();
      setSelectedSwapFields([]);
      isInitializedRef.current = true;
      return;
    }
    if (isInitializedRef.current && formik.values.changeSource != null && formik.values.changeSource === sourceChangeRequestData?.changeSource !== formik.values.changeSource) {
     setEnquiryDataFetched(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.changeSource]);

  // set is vouched feched in edit mode if it contains value
  useEffect(()=>{
     if(isEditOrViewMode && sourceChangeRequestData?.newData?.sourceDetails?.uniqueRefId ){
        setIsVoucherFetched(true);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditOrViewMode])

  useEffect(() => {

    if (!!formik.values.primarySource && formik.values.primarySource !== PRIMARY_SOURCE.PurvaPrivilege  && formik.values.primarySource !== PRIMARY_SOURCE.ProvidentPremiere && isReferralOthers)
      formik.setFieldValue('referrer', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.primarySource]);
  
  useEffect(()=>{
    // reset referrer dependent fields
    if(!!formik.values.referrer && formik.values.referrer !== sourceChangeRequestData?.newData?.secondarySource){
            resetReferrerDependentFields(); 
    }
    // reset prmary source dependent fields
    if(!!formik.values.primarySource && formik.values.primarySource !== sourceChangeRequestData?.newData?.primarySource){
            resetReferrerDependentFields();
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ formik.values.referrer,formik.values.primarySource])



  const resetReferrerDependentFields = () => {
      formik.setFieldValue('customerName', '');
      formik.setFieldValue('customerMobileNumber', '');
      formik.setFieldValue('customerCountryCode','+91');
      formik.setFieldValue('customerEmail', '');
      formik.setFieldValue('project','');
      formik.setFieldValue('unitNumber', '');
      formik.setFieldValue('referredBy',  '');
      formik.setFieldValue('activityName', '')
      formik.setFieldValue('employeeName', '');
      formik.setFieldValue('employeeId', '');
      formik.setFieldValue('referralCampaign', '');
      formik.setFieldValue('uniqueRefId', '');
  }

  const resetEnquiryFields = (changedData?: any) => {
    formik.setFieldValue('newData.sfdcEnquiryId', changedData?.newData?.sfdcEnquiryId || '');
    formik.setFieldValue('newData.uniqueReferenceId',  changedData?.newData?.uniqueReferenceId || '');
    formik.setFieldValue('newData.firstName',  changedData?.newData?.firstName || '');
    formik.setFieldValue('newData.lastName',  changedData?.newData?.lastName || '');
    formik.setFieldValue('newData.emailId',   changedData?.newData?.emailId || '');
    formik.setFieldValue('newData.contactNumber',   changedData?.newData?.contactNumber || '');
    formik.setFieldValue('newData.countryCode',  changedData?.newData?.countryCode ||'+91');
    formik.setFieldValue('newData.amountPaid',  changedData?.newData?.amountPaid || 0);
    formik.setFieldValue('primarySource',   changedData?.newData?.primarySource || '');
    setEnquiryDataFetched(false);
  };



  const resetReferralFields = () => {
    formik.setFieldValue('referralCampaign', '');
    formik.setFieldValue('uniqueRefId', '');
    formik.setFieldValue('customerName', '');
    formik.setFieldValue('customerCountryCode', '+91');
    formik.setFieldValue('customerMobileNumber', '');
    formik.setFieldValue('customerEmail', '');
    setIsVoucherFetched(false);
  };

  // handle cloase swap dialog
  const hanldeSwapDialogClose = () => {
    setOpenSwapDialog(!openSwapDialog);
  };

  // handle upload approval proof
  const handleUpload = (fieldName: string, path: string) => {
    formik.setFieldValue(fieldName, path);
    formik.setFieldTouched(fieldName, true, false);
  };

  // handle delete approval proof
  const handleDelete = (field: string) => {
    formik.setFieldValue(field, '');
    formik.setFieldTouched(field, true, false);
  };

  
  // handle fetch new data using sfdc or payment ref id
  const handleFetchEnquiry = async () => {
    const campaignName = voucherData?.campaignName;
    const refId = isSfdcEnquiryId
      ? formik.values.newData.sfdcEnquiryId
      : formik.values.newData.uniqueReferenceId;
    if (!refId) {
      const fieldName = isSfdcEnquiryId ? 'newData.sfdcEnquiryId' : 'newData.uniqueReferenceId';
      formik.setFieldTouched(fieldName, true);
      return;
    }
    setEnquiryLoading(true);
    (isSfdcEnquiryId
      ? dispatch(getVoucherByEnquiryAction({ enqRefNo: refId, campaignName}))
      : dispatch(getVoucherByPaymentRefIdAction({ prid: refId, campaignId: voucherData?.campaignId }))
    )
      .unwrap()
      .then((res: any) => {
        setEnquiryLoading(false);
        if (res) {
          setEnquiryDataFetched(true);
          formik.setFieldValue('newData.firstName', res?.firstName || '');
          formik.setFieldValue('newData.lastName', res?.lastName || '');
          formik.setFieldValue('newData.emailId', res?.emailId || '');
          formik.setFieldValue('newData.amountPaid', res?.amountPaid || 0);
          formik.setFieldValue('newData.contactNumber', res?.mobile || res?.contactNumber || '');
          formik.setFieldValue('newData.countryCode', res?.countryCode || '+91');
          formik.setFieldValue('primarySource', res?.primarySource || '');
          formik.setFieldValue('referrer', getReferrerType(res?.secondarySource) || '');
          setTimeout(() => {
            formik.setFieldValue('channelPartner', res?.channelpartnerId?.toString() || '');
            formik.setFieldValue('customerName', res?.sourceDetails?.name ?? '');
            formik.setFieldValue('customerMobileNumber', res?.sourceDetails?.contactNumber ?? '');
            formik.setFieldValue('customerCountryCode', res?.sourceDetails?.countryCode ?? '');
            formik.setFieldValue('customerEmail', res?.sourceDetails?.email ?? '');
            formik.setFieldValue('project', res?.sourceDetails?.project?.toString() ?? '');
            formik.setFieldValue('unitNumber', res?.sourceDetails?.unit ?? '');
            formik.setFieldValue('referredBy', res?.sourceDetails?.referredBy ?? '');
            formik.setFieldValue('activityName', res?.sourceDetails?.activityName?.toString() ?? '');
            formik.setFieldValue('employeeName', res?.sourceDetails?.employeeName ?? '');
            formik.setFieldValue('employeeId', res?.sourceDetails?.employeeId ?? '');
            formik.setFieldValue('referralCampaign', res?.sourceDetails?.campaignId?.toString() ?? '');
            formik.setFieldValue('uniqueRefId', res?.sourceDetails?.uniqueRefId ?? '');
          }, 10);
          toast.success('Details fetched successfully');
        }
      })
      .catch((err: any) => {
        setEnquiryLoading(false);
        toast.error(err || 'Failed to fetch details');
      });
  };

 
  // Fetch data based on prid if primary source is Referral at Voucher/EOI
  const handleVoucherFetch = async () => {
    const campaign = Number(formik.values.referralCampaign);
    const { uniqueRefId } = formik.values;

    if (!campaignId || !uniqueRefId) {
      formik.setFieldTouched('referralCampaign', true);
      formik.setFieldTouched('uniqueRefId', true);
      formik.validateForm();
      return;
    }

    setVoucherLoading(true);
    dispatch(fetchReferredVoucherAction({ campaignId: campaign, uniqueRefId }))
      .unwrap()
      .then((res: any) => {
        setVoucherLoading(false);
        formik.setFieldValue('customerName', res.customerName || '');
        formik.setFieldValue('customerCountryCode', res.countryCode || '+91');
        formik.setFieldValue('customerMobileNumber', res.contactNumber || '');
        formik.setFieldValue('customerEmail', res.email || '');
        setIsVoucherFetched(true);
      })
      .catch((err) => {
        setVoucherLoading(false);
        setIsVoucherFetched(false);
        toast.error(err || 'Failed to fetch voucher');
      });
  };

  // handle apply swap
  const handleSwapApply = (selectedKeys: string[]) => {
    setSelectedSwapFields(selectedKeys);
  };


  // build swap payload
  const buildSwapPayload = () => {
    const currentData: Record<string, any> = {};
    const newData: Record<string, any> = {};
    const eligibleSwapFields = [
      'firstName',
      'lastName',
      'emailId',
      'contactNumber',
      'countryCode',
      'primarySource',
      ...(Number(formik.values.newData.amountPaid) > 0 ? ['amountPaid'] : []),
    ];

    eligibleSwapFields.forEach((key) => {
      const field = swapData[key as keyof typeof swapData];
      currentData[key] = field.current;
      newData[key] = field.new;
    });

    // condition flags
    const isCurrentSourceAddData = [
      ...SHOW_REFERRER_OPTIONS,
      PRIMARY_SOURCE.ReferralAtVoucherEoi,PRIMARY_SOURCE.ChannelPartner, PRIMARY_SOURCE.PurvaChampion, PRIMARY_SOURCE.ProvidentPremiere
    ]?.includes(formik.values.currentData.primarySource);

    const isNewSourceAddData = [
      ...SHOW_REFERRER_OPTIONS,
      PRIMARY_SOURCE.ReferralAtVoucherEoi,PRIMARY_SOURCE.ChannelPartner, PRIMARY_SOURCE.PurvaChampion,PRIMARY_SOURCE.ProvidentPremiere
    ]?.includes(formik.values.primarySource);

    // composed return object
    return {
      currentData: {
        ...currentData,
        ...(formik.values.currentData.sourceData.referrer && {
          secondarySource: formik.values.currentData.sourceData.referrer,
        }),
        uniqueReferenceId: formik.values?.currentData?.uniqueReferenceId ?? null,
        ...(isCurrentSourceAddData &&
          (() => {
            const cleaned = removeEmpty({
              name: formik.values.currentData.sourceData.customerName,
              email: formik.values.currentData.sourceData.customerEmail,
              countryCode: formik.values.currentData.sourceData.countryCode,
              contactNumber: formik.values.currentData.sourceData.contactNumber,
              project: Number(formik.values.currentData.sourceData.project),
              unit: formik.values.currentData.sourceData.unitNumber,
              referredBy: formik.values.currentData.sourceData.referredBy,
              activityName: formik.values.currentData.sourceData.activityName,
              employeeName: formik.values.currentData.sourceData.employeeName,
              employeeId: formik.values.currentData.sourceData.employeeId,
              campaignId: Number(formik.values.currentData.sourceData.referralCampaign),
              uniqueRefId: formik.values.currentData.sourceData.uniqueRefId,
              ...(formik.values.currentData.channelPartner && {
                channelPartner: cpOptions?.find((cp)=> cp?.label ===formik.values.currentData.channelPartner)?.label,
                cp_link_id: formik.values.currentData.cp_link_id,
              }),
            });

            return Object.keys(cleaned).length ? { sourceDetails: cleaned } : {};
          })()),
      },

      newData: {
        ...newData,

        ...(formik.values.referrer && {
          secondarySource: formik.values.referrer,
        }),
        ...(isNewSourceAddData &&
          (() => {
            const cleaned = removeEmpty({
              name: formik.values.customerName,
              email: formik.values.customerEmail,
              countryCode: formik.values.customerCountryCode,
              contactNumber: formik.values.customerMobileNumber,
              project: Number(formik.values.project),
              unit: formik.values.unitNumber,
              referredBy: formik.values.referredBy,
              activityName: formik.values.activityName,
              employeeName: formik.values.employeeName,
              employeeId: formik.values.employeeId,
              campaignId: Number(formik.values.referralCampaign),
              uniqueRefId: formik.values.uniqueRefId,
              ...(formik.values.channelPartner && {
                channelPartner: cpOptions?.find((cp)=> cp?.value ===formik.values.channelPartner)?.label,
                cp_link_id: formik.values.channelPartner,
              }),
            });

            return Object.keys(cleaned).length ? { sourceDetails: cleaned } : {};
          })()),
      },
    };
  };

  // handle submit (create / update)
  const handleSubmit = async (isUpdateRequest: boolean) => {
    const errors = await formik.validateForm();
    formik.setTouched(
      Object.keys(formik.values).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as any)
    );
    if (Object.keys(errors).length > 0) return;

    const currentAndNewData = buildSwapPayload();
    
    const payload: CreateSourceChangeRequestPayload = {
      ...(isUpdateRequest && { id: sourceChangeRequestData?.id}), // send id only for update request
      voucherId: Number(id),
      targetEnquiryId: formik.values.newData.sfdcEnquiryId,
      targetPRID: formik.values.newData.uniqueReferenceId,
      changeSource: formik.values.changeSource,
      reason: formik.values.reason || '',
      reviewerRemark: formik.values.reviewerRemark || '',
      swappedFields: selectedSwapFields,
      status: formik.values.status,
      approvalProof: formik.values.approvalProof,
      ...currentAndNewData,
    };
    
    try {
      setLoading(true);
      const response = await dispatch(addSourceChangeRequest(payload)).unwrap();
      toast.success(response?.message || 'Request submitted successfully');
      route.push(generateRoleBasedRoute(userRole, 'eoi-records'));
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.data?.message ||
        'Failed to submit request';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    formik.handleSubmit();
  };

  const isSwapRequested = (key: string) => selectedSwapFields.includes(key);

  // handle approve / reject change source request
  const handleApproveOrRejectRequest = async (isApproveRequest: boolean) => {
    // If rejecting → just clear approvalProof error
    if (!isApproveRequest) {
      formik.setFieldError('approvalProof', undefined);
      formik.setFieldTouched('approvalProof', false);
    }

    if (isApproveRequest) {
    // Approve → validate approvalProof
    if (!formik.values.approvalProof?.trim()) {
        formik.setFieldError(
          'approvalProof',
          changeSource.validation.approvalProof
        );
        formik.setFieldTouched('approvalProof', true);
        return;
      }
    } 
      
    // Reject → clear approvalProof error
    formik.setFieldError('approvalProof', undefined);

    // Validate reviewerRemark
    if (!formik.values.reviewerRemark?.trim()) {
      formik.setFieldError(
        'reviewerRemark',
        changeSource.validation.reviewerRemark
      );
      formik.setFieldTouched('reviewerRemark', true);
      return;
    }
    
    formik.setTouched({
      reviewerRemark: true,
    });
    
    const payload = {
      id: sourceChangeRequestData?.id,
      voucherId: sourceChangeRequestData?.voucherId,
      status: isApproveRequest ? 'Approved' : 'Rejected',
      approvalProof: formik.values.approvalProof || '',
      remark: formik.values.reviewerRemark || '',
    };

     try {
      setLoading(isApproveRequest);
      setIsRejectLoading(!isApproveRequest)
      const response = await dispatch(approveOrRejectSourceChangeRequestThunk(payload)).unwrap();
      toast.success(response?.message || 'Change request reviewed successfully');
      route.push(generateRoleBasedRoute(userRole, 'eoi-records'));
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.data?.message ||
        'Failed to submit request';
      toast.error(errorMessage);
    }finally {
      setLoading(false);
      setIsRejectLoading(false);
      formik.setFieldValue('approvalProof', '');
    }
  };

  const projectMap = projectOptions?.reduce<Record<string, string>>((acc, item) => {
  acc[item.id] = item.name;
  return acc;
}, {});
   

  const formattedHistory = transformChangeSourceHistory(sourceChangeRequestData?.history || []);

  let rejectBtnLabel: React.ReactNode = changeSource.label.rejectRequestBtn;
  if (isRejectLoading && !isRM) {
    rejectBtnLabel = <CircularProgress size={20} color="inherit" />;
  } else if (isRM) {
    rejectBtnLabel = uiText.button.cancel;
  }

  let submitBtnLabel: React.ReactNode = changeSource.label.approveRequestBtn;
  if (loading) {
    submitBtnLabel = <CircularProgress size={20} color="inherit" />;
  } else if (isRM) {
    submitBtnLabel = changeSource.label.submitRequestBtn;
  }

  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={heading}
          action={
            // Swap Fields Button
            <Button
              variant="outlined"
              disabled={!areAllNewValuesPresent || mode === 'view'}
              startIcon={<img src={swapIcon} alt="transfer" />}
              sx={{
                fontWeight: 600,
                fontSize: '15px',
                px: '16px',
                height: '48px',
                width: '154px',
                color: '#1A407D',
                borderColor: '#1A407D',
                borderRadius: '8px',
                '&:hover': {
                  borderColor: '#1A407D',
                  backgroundColor: 'transparent',
                },
              }}
              onClick={() => {
                setOpenSwapDialog(true);
              }}
            >
              {changeSource.swapBtn}
            </Button>
          }
        />
      </Box>
      <form onSubmit={handleFormSubmit}>
        <Card sx={{ padding: '30px', my: 2 }}>
          <Grid container spacing={3}>
            {/* Left Section */}
            <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>

              {/* Change Source From */}
              <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 4, mt: { sm: 0, md: 2 } }}>
                {changeSource.changeFrom}
              </Typography>

              <Grid container spacing={3}>
                {/* Payment ref id */}
                <ReadOnlyField
                  label={changeSource.label.paymentRefId}
                  value={formik.values.currentData.uniqueReferenceId}
                />

                {/* First Name */}
                <ReadOnlyField
                  label={basicDetails.label.firstName}
                  value={formik.values.currentData.firstName}
                  showHelper={isSwapRequested('firstName')}
                  helperText={changeSource.label.changeRequested}
                />

                {/* Last Name */}
                <ReadOnlyField
                  label={basicDetails.label.lastName}
                  value={formik.values.currentData.lastName}
                  showHelper={isSwapRequested('lastName')}
                  helperText={changeSource.label.changeRequested}
                />

                 {/* Email */}
                <ReadOnlyField
                  label={basicDetails.label.email}
                  value={formik.values.currentData.emailId}
                  showHelper={isSwapRequested('emailId')}
                  helperText={changeSource.label.changeRequested}
                />
                {/* Contact Number */}
                <Grid item xs={12}>
                  <Field.Phone
                    name="currentData.contactNumber"
                    countryCodeName="currentData.countryCode"
                    country="IN"
                    formik={formik}
                    placeholder="Contact Number"
                    disabled
                    highlight={isSwapRequested('contactNumber')}
                    highlightText={changeSource.label.changeRequested}
                  />
                </Grid>

                {/* Primary Source */}
                <ReadOnlyField
                  label={basicDetails.label.primarySource}
                  value={formik.values.currentData.primarySource}
                  showHelper={isSwapRequested('primarySource')}
                  helperText={changeSource.label.changeRequested}
                />

                {/* Cp name if primary source is selected as Channel Partner */}
                {formik.values.currentData.primarySource === PRIMARY_SOURCE.ChannelPartner && (
                  <Grid item xs={12}>
                    <ReadOnlyField
                      label={basicDetails.label.cpName}
                      value={formik.values.currentData.channelPartner}
                    />
                  </Grid>
                )}

                {SHOW_REFERRER_OPTIONS?.includes(formik.values.currentData.primarySource) && (
                  <>
                    <Grid item xs={12}>
                      <RadioGroup sx={{ ml: 1 }} row name="currentData.sourceData.referrer" value={formik.values.currentData.sourceData.referrer}>
                        <FormControlLabel
                          value={REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF}
                          control={<Radio disabled={false} />}
                          label={basicDetails.label.buyingForSelf}
                        />
                        <FormControlLabel
                          value={REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER}
                          control={<Radio disabled={false} />}
                          label={basicDetails.label.referredByCustomer}
                        />
                        {isPurvaPrivilege && (
                          <FormControlLabel
                            value={REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS}
                            control={<Radio disabled={false} />}
                            label={basicDetails.label.referralOthers}
                          />
                        )}
                      </RadioGroup>
                    </Grid>

                    {/* CASE 1 & 2: buyingForSelf OR referredByCustomer */}
                    {isBuyingOrReferred && (
                      <>
                        <ReadOnlyField
                          label={basicDetails.label.customerName}
                          value={formik.values.currentData.sourceData.customerName}
                        />
                        <Grid item xs={12}>
                          <Field.Phone
                            name="currentData.sourceData.contactNumber"
                            countryCodeName="currentData.sourceData.countryCode"
                            // label="contact number"
                            country="IN"
                            formik={formik}
                            placeholder="Contact Number"
                            disabled
                          />
                        </Grid>
                        <ReadOnlyField
                          label={basicDetails.label.customerEmail}
                          value={formik.values.currentData.sourceData.customerEmail}
                        />
                        
                        <ReadOnlyField
                          label={basicDetails.label.project}
                          value={projectMap[formik.values.currentData.sourceData.project]}
                        />

                        <ReadOnlyField
                          label={basicDetails.label.unitNumber}
                          value={formik.values.currentData.sourceData.unitNumber}
                        />

                        {/* Extra field ONLY for referredByCustomer */}
                        {referrerValue === REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER && (
                          <ReadOnlyField
                            label={basicDetails.label.referredBy}
                            value={formik.values.currentData.sourceData.referredBy}
                          />
                        )}
                      </>
                    )}

                    {/* CASE 3: referralOthers */}
                    {isReferralOther && (
                      <ReadOnlyField
                        label={basicDetails.label.activityName}
                        value={formik.values.currentData.sourceData.activityName}
                      />
                    )}
                  </>
                )}

                {formik.values.currentData.primarySource === PRIMARY_SOURCE.PurvaChampion && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="body2" mt={2}>
                        {basicDetails.purvaChampion}
                      </Typography>
                    </Grid>
                    <ReadOnlyField
                      label={basicDetails.label.employeeName}
                      value={formik.values.currentData.sourceData.employeeName}
                    />

                    <ReadOnlyField
                      label={basicDetails.label.employeeId}
                      value={formik.values.currentData.sourceData.employeeId}
                    />
                  </>
                )}

                {referralFormVisible && (
                  <>
                    <Grid item xs={12}>
                      <Typography sx={{ fontSize: '18px', fontWeight: 600 }}>
                        {basicDetails.referralFormTitle}
                      </Typography>
                    </Grid>

                    <ReadOnlyField
                      label={basicDetails.label.campaign}
                      value={formik.values.currentData.sourceData.campaignName}
                    />

                    <ReadOnlyField
                      label={basicDetails.label.uniqueRefId}
                      value={formik.values.currentData.sourceData.uniqueRefId}
                    />

                    <ReadOnlyField
                      label={basicDetails.label.customerName}
                      value={formik.values.currentData.sourceData.customerName}
                    />

                    <Grid item xs={12}>
                      <Field.Phone
                        name="currentData.sourceData.contactNumber"
                        countryCodeName="currentData.sourceData.countryCode"
                        country="IN"
                        formik={formik}
                        placeholder="Contact Number"
                        disabled
                      />
                    </Grid>
                    <ReadOnlyField
                      label={basicDetails.label.customerEmail}
                      value={formik.values.currentData.sourceData.customerEmail}
                    />
                  </>
                )}

                {/* Amount Paid */}
                <ReadOnlyField
                  label={changeSource.label.amount}
                  value={formik.values.currentData.amountPaid}
                  showHelper={isSwapRequested('amountPaid')}
                  helperText={changeSource.label.changeRequested}
                />
              </Grid>
            </Grid>

            {/* Right section */}
            <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
              {/* Select Change Source To */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 2.5,
                }}
              >
                <Typography sx={{ fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {changeSource.changeTo}
                </Typography>

                <Box sx={{ flex: 1 }}>
                  <FormikAutocomplete
                    // label={basicDetails.label.sdfcEnquiryId}
                    name="changeSource"
                    formik={formik}
                    disabled={mode === 'view'}
                    options={SOURCE_CHANGE_REQUEST_OPTIONS}
                  />
                </Box>
              </Box>

              {/* Data Fetching  */}
              {/* when change source to is selected as 'SFDC Enquiry ID' / 'Payment Ref ID' */}
              <Grid container spacing={3}>
                {!isRecordDoesNotExist && (
                  <FormikTextField
                    name={isSfdcEnquiryId ? 'newData.sfdcEnquiryId' : 'newData.uniqueReferenceId'}
                    label={
                      isSfdcEnquiryId
                        ? basicDetails.label.sdfcEnquiryId
                        : basicDetails.label.uniqueRefId
                    }
                    formik={formik}
                    isButton
                    required
                    disabled = {mode === 'view' ||
                      (enquiryDataFetched &&
                        (isSfdcEnquiryId
                          ? !!formik.values.newData?.sfdcEnquiryId
                          : !!formik.values.newData?.uniqueReferenceId))
                    }
                    buttonOnClick={handleFetchEnquiry}
                    onClear={resetEnquiryFields}
                    buttonDisabled={mode === 'view' || (enquiryDataFetched &&
                        (isSfdcEnquiryId
                          ? !!formik.values.newData?.sfdcEnquiryId
                          : !!formik.values.newData?.uniqueReferenceId))}
                    buttonTitle={uiText.button.fetch}
                    clearIconDisabled={mode === 'view'}
                    loading={enquiryLoading}
                    btnWidth="150px"
                    gridProps={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}
                  />
                )}

                {/* when change source to is selected as 'Record does not exist' */}
                {(enquiryDataFetched ||
                  isRecordDoesNotExist) && (
                  <>

                    {/* First Name */}
                    <FormikTextField
                      name="newData.firstName"
                      label={basicDetails.label.firstName}
                      formik={formik}
                      required
                      disabled={mode === 'view'}
                      gridProps={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}
                    />

                    {/* Last Name */}
                    <FormikTextField
                      name="newData.lastName"
                      label={basicDetails.label.lastName}
                      formik={formik}
                      required
                      disabled={mode === 'view'}
                      gridProps={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}
                    />

                    {/* Email ID */}
                    <FormikTextField
                      name="newData.emailId"
                      label={basicDetails.label.email}
                      formik={formik}
                      required
                      disabled={mode === 'view'}
                      gridProps={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}
                    />

                   {/* Contact Number */}
                    <Grid item xs={12}>
                      <Field.Phone
                        name="newData.contactNumber"
                        countryCodeName="newData.countryCode"
                        placeholder={basicDetails.label.contactNumber}
                        country="IN"
                        disabled={mode === 'view'}
                        formik={formik}
                      />
                    </Grid>
                   {/* Primary Source */}
                    <Grid item xs={12}>
                      <FormikAutocomplete
                        label={basicDetails.label.primarySource}
                        name="primarySource"
                        formik={formik}
                        disabled={mode === 'view'}
                        required
                        options={primarySourceOptions}
                      />
                    </Grid>

                    {/* Priary source conditional fields  */}
                    <PrimarySourceConditionalFields
                      formik={formik}
                      cpNameOptions={cpOptions}
                      projectOptions={projectOptions}
                      campaigns={campaigns}
                      gridProps={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}
                      onVoucherFetch={handleVoucherFetch}
                      onResetReferral={resetReferralFields}
                      voucherLoading={voucherLoading}
                      isVoucherFetched={isVoucherFetched}
                      paymentRefIdbuttonDisabled={isVoucherFetched && !!formik.values.uniqueRefId}
                      isEditable={mode !== 'view'}
                    />
                    {isPaymentRefId && (
                      <FormikTextField
                        name="newData.amountPaid"
                        label={changeSource.label.amount}
                        formik={formik}
                        required
                        disabled
                        gridProps={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}
                        textFieldType="number"
                      />
                    )}
                  </>
                )}
              </Grid>
              
              {/* Reason */}
              <Typography sx={{ fontSize: '16px', fontWeight: 600, my: 3 }}>
                {changeSource.provideReason} <span style={{ color: 'red' }}>*</span>
              </Typography>
              <TextField
                name="reason"
                fullWidth
                placeholder={changeSource.provideReasonPlaceholder}
                multiline
                disabled={mode === 'view'}
                rows={4}
                value={formik.values.reason}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                inputProps={{ maxLength: 5000 }}
                error={formik.touched.reason && Boolean(formik.errors.reason)}
                helperText={
                  <>
                    {formik.touched.reason && formik.errors.reason
                      ? formik.errors.reason
                      : `${formik.values.reason.length}/5000 characters`}
                  </>
                }
              />

              {/* Upload Approval Proof */}
              {!isRM  && (
                <Box sx={{mt: 2}}>
                  <NewDropzone
                    key={`approval-proof-${formik.values.approvalProof}`}
                    name="approvalProof"
                    fieldName="approvalProof"
                    id="approvalProof"
                    label="Approval Proof"
                    required
                    path={formik.values.approvalProof}
                    formik={formik}
                    handleupload={handleUpload}
                    documentType="both"
                    disabled={sourceChangeRequestData?.status?.toLowerCase() !== 'requested'} // disable if request is approved or rejected
                    handledelete={() => handleDelete('approvalProof')}
                    customSx
                    error={typeof formik?.errors?.approvalProof === 'string' ? formik?.errors?.approvalProof : undefined}
                    touched={typeof formik?.touched?.approvalProof === 'boolean' ? formik?.touched?.approvalProof : false}
                  />
                </Box>
              )}

              {/* Reviewer's Remark */}
               {!isRM  && (
                  <>
                  <Typography sx={{ fontSize: '16px', fontWeight: 600, my: 3 }}>
                    {changeSource.reviewerRemark} <span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <TextField
                    name="reviewerRemark"
                    fullWidth
                    placeholder={changeSource.provideReviewerRemarkPlaceholder}
                    multiline
                    disabled={sourceChangeRequestData?.status?.toLowerCase() !== 'requested'}
                    rows={4}
                    value={formik.values.reviewerRemark}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    inputProps={{ maxLength: 5000 }}
                    error={formik.touched.reviewerRemark && Boolean(formik.errors.reviewerRemark)}
                    helperText={
                      <>
                        {formik.touched.reviewerRemark && formik.errors.reviewerRemark
                          ? formik.errors.reviewerRemark
                          : `${formik.values.reason.length}/5000 characters`}
                      </>
                    }
                  />
                </>
               )}

            </Grid>
          </Grid>
          {/* Recent History  */}
          {/* change condition for create later accoridngly */}
          {sourceChangeRequestData?.history?.length > 0 ? (
            <ChangeSourceRecentHistory History={formattedHistory} voucherData={voucherData} />
          ) : null}

          {/* approve and reject buttons */}
          {(sourceChangeRequestData?.status?.toLowerCase() === 'requested'  || mode==='create' || mode==='edit' ) && (
            <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => {
                  if (isRM) {
                    route.push(generateRoleBasedRoute(userRole, 'eoi-records'));
                  } else {
                    handleApproveOrRejectRequest(false); // handle reject request
                  }
                }}
                sx={{
                  width: '150px',
                  height: '40px',
                }}
              >
                {rejectBtnLabel}
              </Button>

              <Button
                type="submit"
                variant="contained"
                onClick={()=> mode === 'view'? handleApproveOrRejectRequest(true) : handleSubmit(mode === 'edit')}
                disabled={ mode === 'view' && sourceChangeRequestData?.status?.toLowerCase() === 'requested' ? false : !isSwapSelected }
                sx={{
                  width: '150px',
                  height: '40px',
                  backgroundColor: '#1A407D',
                  '&:hover': {
                    backgroundColor: '#174A9D',
                  },
                }}
              >
                {submitBtnLabel}
              </Button>
            </Box>
          )}

          {/* Swap Field Dialog */}
          <SwapFieldDialog
            open={openSwapDialog}
            onClose={hanldeSwapDialogClose}
            swapData={swapData}
            onApply={handleSwapApply}
            swappedFields = {selectedSwapFields}
          />
        </Card>
      </form>
    </DashboardContent>
  );
};

export default ChangeSource;
