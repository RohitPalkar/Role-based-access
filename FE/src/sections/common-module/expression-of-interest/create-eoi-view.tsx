import type { AppDispatch } from 'src/redux/store';

import * as yup from 'yup';
import { toast } from 'sonner';
import { useFormik } from 'formik'
import { useParams } from 'react-router';
import { useDispatch } from 'react-redux';
import React, { useState, useEffect } from 'react'

import { Box} from '@mui/material'

import { useAppSelector } from 'src/hooks/use-redux'

import { isValidPhoneNumberWithRules } from 'src/utils/helper';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles'
import { PRIMARY_SOURCE, SECONDARY_SOURCE, SHOW_REFERRER_OPTIONS, REFERRER_RADIO_OPTIONS, SHOW_REFERRAL_AT_EOI_OPTIONS } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard'
import { resetVoucherData } from 'src/redux/slices/rm-panel/eoi-slice';
import { fetchEOIProjects, getVoucherEOIById, fetchEOIPrimarySource, fetchEOICampaignsAction, getEOICampaignDetailsById } from 'src/redux/actions/rm-panel/eoi-actions';

import { AnimateLogo1 } from 'src/components/animate'
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs'

import MoreDetailsExpressionForm from './components/more-details-expression-form'
import BasicDetailsExpressionForm from './components/basic-details-expression-form'

const CreateEOIView = () => {
  const { id } = useParams();
  const dispatch: AppDispatch = useDispatch();
  const jsonValue = uiText.EOIJson.createEOI.form.basicDetails.validations
  const [sendLinkDisabled, setSendLinkDisabled] = useState(false);
  const { campaignsLoading, createVoucherLoading, voucherData } = useAppSelector((state) => state.expressonOfInterest);
  const isReferralOthers =['referralOthers', SECONDARY_SOURCE.referralOthers].includes(voucherData?.secondarySource) ? REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS : REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF

  useEffect(() => {
      dispatch(fetchEOIPrimarySource())
      dispatch(fetchEOIProjects());
      dispatch(fetchEOICampaignsAction());

      if (id) {
        dispatch(getVoucherEOIById({ id: Number(id) }))
          .unwrap()
          .then((res) => {
            dispatch(getEOICampaignDetailsById({ id: res?.campaignId || 0 }));
            setSendLinkDisabled(true);
          })
          .catch((error) => {
            toast.error('Error fetching Voucher/EOI details', error?.message);
          });
      }
      else {
        dispatch(resetVoucherData());
      }
  }, [dispatch, id])

  const requiredCustomerDetails = (primarySource: string, referrer?: string) =>
  (SHOW_REFERRER_OPTIONS.includes(primarySource) ||
    SHOW_REFERRAL_AT_EOI_OPTIONS.includes(primarySource)) &&
  referrer !== REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS;

  const formik = useFormik({
    initialValues: {
        firstName: voucherData?.applicant1?.personalDetails?.firstName || '',
        lastName: voucherData?.applicant1?.personalDetails?.lastName || '',
        countryCode: voucherData?.applicant1?.personalDetails?.countryCode || '+91',
        mobileNumber: voucherData?.applicant1?.personalDetails?.contactNumber || '',
        email: voucherData?.applicant1?.personalDetails?.emailAddress || '',
        residentStatus: voucherData?.applicant1?.personalDetails?.residentStatus || '',
        campaign: voucherData?.campaignId == null ? '' : String(voucherData?.campaignId),
        primarySource: voucherData?.primarySource || '',
        channelPartner: voucherData?.cpLinkId|| '',
        referrer: [SECONDARY_SOURCE.Referral,'referredByCustomer' ].includes(voucherData?.secondarySource) ? REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER : isReferralOthers,   
        customerName: voucherData?.sourceDetails?.name || '',
        customerCountryCode: voucherData?.sourceDetails?.countryCode || '+91',
        customerMobileNumber: voucherData?.sourceDetails?.contactNumber || '',
        customerEmail: voucherData?.sourceDetails?.email || '',
        project: voucherData?.sourceDetails?.project === null ? '' : String(voucherData?.sourceDetails?.project),
        unitNumber: voucherData?.sourceDetails?.unit || '',
        referredBy: voucherData?.sourceDetails?.referredBy || '',
        employeeName: voucherData?.sourceDetails?.employeeName || '',
        employeeId: voucherData?.sourceDetails?.employeeId || '',
        uniqueRefId: voucherData?.sourceDetails?.uniqueRefId || '',
        referralCampaign: voucherData?.sourceDetails?.campaignId == null ? '' : String(voucherData?.sourceDetails?.campaignId),
        sfdcEnquiryId: voucherData?.sourceDetails?.sfdcEnquiryRefId || '',
        activityName: voucherData?.sourceDetails?.activityName || '',
        sfdcLeadStatus: voucherData?.sourceDetails?.sfdcLeadStatus || '',
    },
    validationSchema: yup.object({
      firstName: yup.string().required(jsonValue.firstName),
      lastName: yup.string().required(jsonValue.lastName),
      countryCode: yup.string().required(jsonValue.countryCode),
      sfdcEnquiryId: yup.string().notRequired(),
      sfdcLeadStatus: yup.string().notRequired(),
      mobileNumber: yup
        .string()
        .required(jsonValue.contactNumber)
        .test(
          "is-valid-phone",
          jsonValue.invalidContactNumber,
          (value, context) => {
            const { countryCode } = context.parent;
            return isValidPhoneNumberWithRules(countryCode, value);
          }
        ),
      email: yup
      .string()
      .matches(
        /^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
        jsonValue.invalidEmail
      )
      .required(jsonValue.email),
      residentStatus: yup.string().required(jsonValue.residentStatus),
      campaign: yup.string().required(jsonValue.campaign),
      primarySource: yup.string().required(jsonValue.primarySource),
      channelPartner: yup.string().when('primarySource', ([value], schema) =>
        PRIMARY_SOURCE.ChannelPartner === value
          ? schema.required(jsonValue.cpName)
          : schema.notRequired()
      ),
      referrer: yup.string().when('primarySource', ([value], schema) =>
        SHOW_REFERRER_OPTIONS.includes(value)
          ? schema.required(jsonValue.referrer)
          : schema.notRequired()
      ),
      customerName: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          requiredCustomerDetails(primarySource, referrer)
            ? schema.required(jsonValue.customerName)
            : schema.notRequired()
      ),
      customerCountryCode: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          requiredCustomerDetails(primarySource, referrer)
            ? schema.required(jsonValue.countryCode)
            : schema.notRequired()
      ),
      customerMobileNumber: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          requiredCustomerDetails(primarySource, referrer)
            ? schema
                .required(jsonValue.contactNumber)
                .test(
                  'is-valid-phone',
                  jsonValue.invalidContactNumber,
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
                  jsonValue.invalidEmail
                )
                .required(jsonValue.email)
            : schema.notRequired()
      ),
      project: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          SHOW_REFERRER_OPTIONS.includes(primarySource) &&
          referrer !== REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS
            ? schema.required(jsonValue.project)
            : schema.notRequired()
      ),
      unitNumber: yup.string().when(
        ['primarySource', 'referrer'],
        ([primarySource, referrer], schema) =>
          SHOW_REFERRER_OPTIONS.includes(primarySource) &&
          referrer !== REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS
            ? schema.required(jsonValue.unitNumber)
            : schema.notRequired()
      ),
      referredBy: yup.string().when('referrer', ([value], schema) =>
        value === REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER
          ? schema.required(jsonValue.referredBy)
          : schema.notRequired()
      ),
      employeeName: yup.string().when('primarySource', ([value], schema) =>
        value === PRIMARY_SOURCE.PurvaChampion
          ? schema.required(jsonValue.employeeName)
          : schema.notRequired()
      ),
      employeeId: yup.string().notRequired(),
      referralCampaign: yup.string().when('primarySource', ([val], schema) =>
        SHOW_REFERRAL_AT_EOI_OPTIONS.includes(val)
          ? schema.required(jsonValue.referralCampaign)
          : schema.notRequired()
      ),
      uniqueRefId: yup.string().when('primarySource', ([val], schema) =>
        SHOW_REFERRAL_AT_EOI_OPTIONS.includes(val)
          ? schema.required(jsonValue.uniqueRefId)
          : schema.notRequired()
      ),
      activityName: yup.string().when('referrer', ([value], schema) =>
        value === REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS
          ? schema.required(jsonValue.activityName)
          : schema.notRequired()
      ),
    }),
    validateOnChange: true,
    validateOnBlur: true,
    enableReinitialize: true,
    onSubmit: (values) => {},
  });
  
  return campaignsLoading || createVoucherLoading ? (
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
        <CustomBreadcrumbs heading={id ? "Edit Voucher / Expression of Interest" : uiText.EOIJson.createEOI.title} />
      </Box>
      <BasicDetailsExpressionForm
      formik={formik}
      sendLinkDisabled={sendLinkDisabled}
      setSendLinkDisabled={setSendLinkDisabled}
      />
      {((voucherData?.voucherForm?.voucherId || voucherData?.id) && sendLinkDisabled) ? (
        <MoreDetailsExpressionForm residentStatus={formik.values.residentStatus} />
      ) : null}
    </DashboardContent>
  )
}

export default CreateEOIView