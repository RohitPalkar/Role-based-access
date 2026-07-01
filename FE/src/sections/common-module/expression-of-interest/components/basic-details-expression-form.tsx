import '../../rm-panel.css';

import type { AppDispatch } from 'src/redux/store';
import type { ProjectOption, CreateVoucherEOI } from 'src/services/rm-panel/eoi-service';

import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import React, { useState, useEffect } from 'react';

import { Box ,
  Card,
  Grid,
  Radio,
  Button,
  Divider,
  RadioGroup,
  Typography,
  FormControlLabel,
} from '@mui/material';

import { paths } from 'src/routes/paths';
import { useParams, useRouter } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { interpolate } from 'src/utils/helper';
import { PRIMARY_SOURCE, SECONDARY_SOURCE, SHOW_REFERRER_OPTIONS, generateRoleBasedRoute, REFERRER_RADIO_OPTIONS, RESIDENT_STATUS_OPTIONS, SHOW_REFERRAL_AT_EOI_OPTIONS } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { addVoucherEOI, fetchCPNameAction, getEOICampaignDetailsById, getVoucherByEnquiryAction, fetchReferredVoucherAction } from 'src/redux/actions/rm-panel/eoi-actions';

import { Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { FormikTextField } from 'src/components/formik-textfield/formik-textfield';
import FormikAutocomplete from 'src/components/formik-autocomplete/FormikAutocomplete';

interface BasicDetailsExpressionFormProps {
  formik: any;
  sendLinkDisabled: boolean;
  setSendLinkDisabled: (v: boolean) => void;
}

/* Styles */
const borderBottomStyle = {
  borderBottom: '1px dashed #DADADA',
  paddingBottom: '20px',
};

const Section = ({
  title,
  children,
  noBorder,
}: {
  title?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) => (
  <Box
    mb={noBorder ? 0 : 3}
    sx={{
      ...(noBorder ? {} : borderBottomStyle),
    }}
  >
    {title && <Typography variant="h6">{title}</Typography>}
    <Grid container spacing={3} mt={2}>
      {children}
    </Grid>
  </Box>
);

const BasicDetailsExpressionForm = ({
  sendLinkDisabled,
  setSendLinkDisabled,
  formik,
}: BasicDetailsExpressionFormProps) => {
  const { id } = useParams();
  const isEditMode = !!id;
  const rolePermissions = useRoleBasedPermissions({ module: 'eoi' });
  const { userRole } = rolePermissions;
  const dispatch: AppDispatch = useDispatch();
  const route = useRouter();
  const { primarySource, campaigns, cpName: cpNameOptions, voucherData, projectOptions } = useAppSelector((state) => state.expressonOfInterest);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquiryDataFetched, setEnquiryDataFetched] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [cpSearchText, setCpSearchText] = useState('')
  const [cpName, setCpName] = useState('');
  const [isVoucherFetched, setIsVoucherFetched] = useState<boolean>(false);
  const jsonValue = uiText.EOIJson.createEOI.form.basicDetails;
  const referralFormVisible = SHOW_REFERRAL_AT_EOI_OPTIONS?.includes(formik?.values?.primarySource);
  const isPurvaPrivilege = formik?.values?.primarySource === PRIMARY_SOURCE.PurvaPrivilege;
  const isReferralOthers = formik?.values?.referrer === REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS;
  const isCampaignSelected = Boolean(formik?.values?.campaign);
  const DEBOUNCE_DELAY = 2000;
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Run only when campaigns are loaded
    if (isEditMode || !campaigns || campaigns.length === 0) return;

    // Auto-select only when exactly one campaign exists
    if (campaigns.length === 1) {
      const singleCampaign = campaigns[0];

      // Avoid overriding if already selected
      if (!formik.values.campaign) {
        formik.setFieldValue(
          'campaign',
          String(singleCampaign.value)
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns]);

  useEffect(() => {
    formik.validateForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik?.values]);

  useEffect(() => {
    if ((formik?.values?.primarySource !== PRIMARY_SOURCE.PurvaPrivilege) && isReferralOthers)
      formik.setFieldValue('referrer', REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik?.values?.primarySource]);

  useEffect(() => {
    if (
      !isEditMode ||
      !voucherData?.cpLinkId ||
      !cpNameOptions?.length
    ) {
      return;
    }

    const matchedCp = cpNameOptions.find(
      (cp) => String(cp?.value) === String(voucherData?.cpLinkId)
    );

    if (matchedCp) {
      formik.setFieldValue('channelPartner', String(matchedCp?.value), false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherData?.cpLinkId, cpNameOptions]);


  useEffect(() => {
    const campaignId = formik?.values?.campaign;
    dispatch(fetchCPNameAction({ campaignId }));
  }, [dispatch, formik?.values?.campaign, formik?.values?.primarySource, cpSearchText]);

  const createVoucherPayload = (): CreateVoucherEOI => ({
    firstName: formik?.values?.firstName || '',
    lastName: formik?.values?.lastName || '',
    emailId: formik?.values?.email || '',
    residentStatus: formik?.values?.residentStatus || '',
    countryCode: formik?.values?.countryCode || '+91',
    contactNumber: formik?.values?.mobileNumber || '',
    campaignId: Number(formik?.values?.campaign) || 0,
    primarySource: formik?.values?.primarySource || '',
    ...(formik?.values?.primarySource === PRIMARY_SOURCE.ChannelPartner &&
      formik?.values?.channelPartner && {
        cpLinkId: Number(formik.values.channelPartner || ''),
      }),
    ...(enquiryDataFetched && formik?.values?.sfdcEnquiryId && {
      sfdcEnquiryId: formik.values.sfdcEnquiryId,
    }),
    ...(enquiryDataFetched && formik?.values?.sfdcLeadStatus && {
      sfdcLeadStatus: formik.values.sfdcLeadStatus,
    }),
    ...(SHOW_REFERRER_OPTIONS?.includes(formik?.values?.primarySource) && {
      secondarySource: formik?.values?.referrer === REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF ? SECONDARY_SOURCE.Loyalty : SECONDARY_SOURCE.Referral,
      sourceAdditionalData: {
        name: formik?.values?.customerName || '',
        email: formik?.values?.customerEmail || '',
        countryCode: formik?.values?.customerCountryCode || '',
        contactNumber: formik?.values?.customerMobileNumber || '',
        project: Number(formik?.values?.project) || 0,
        unit: formik?.values?.unitNumber || '',
      },
    }),
    ...(formik?.values?.referrer === REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER && {
      sourceAdditionalData: {
        name: formik?.values?.customerName || '',
        email: formik?.values?.customerEmail || '',
        countryCode: formik?.values?.customerCountryCode || '',
        contactNumber: formik?.values?.customerMobileNumber || '',
        project: Number(formik?.values?.project),
        unit: formik?.values?.unitNumber,
        referredBy: formik?.values?.referredBy,
      },
    }),
    ...(formik?.values?.referrer === REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS && {
      secondarySource: SECONDARY_SOURCE.referralOthers,
      sourceAdditionalData: {
        activityName: formik?.values?.activityName || '',
      },
    }),
    ...(formik?.values?.primarySource === PRIMARY_SOURCE.PurvaChampion && {
      sourceAdditionalData: {
        employeeName: formik?.values?.employeeName,
        employeeId: formik?.values?.employeeId,
      },
    }),
    ...(referralFormVisible && {
      sourceAdditionalData: {
        campaignId: Number(formik?.values?.referralCampaign) || 0,
        uniqueRefId: formik?.values?.uniqueRefId || '',
        name: formik?.values?.customerName || '',
        email: formik?.values?.customerEmail || '',
        countryCode: formik?.values?.customerCountryCode || '',
        contactNumber: formik?.values?.customerMobileNumber || '',
      },
    }),
  });

  const resetReferralFields = () => {
    formik.setFieldValue('referralCampaign', '');
    formik.setFieldValue('uniqueRefId', '');
    formik.setFieldValue('customerName', '');
    formik.setFieldValue('customerCountryCode', '+91');
    formik.setFieldValue('customerMobileNumber', '');
    formik.setFieldValue('customerEmail', '');
    setIsVoucherFetched(false);
  };

  const handleSubmit = async () => {
    if (Object?.keys(formik?.errors).length === 0) {
      if (
        formik.values.sfdcEnquiryId &&
        !enquiryDataFetched
      ) {
        toast.error("Please fetch the SFDC Enquiry ID before sending form link.");
        return;
      }
      dispatch(addVoucherEOI(createVoucherPayload()))
        .unwrap()
        .then(() => {
          setSendLinkDisabled(true);
          dispatch(getEOICampaignDetailsById({ id: Number(formik?.values?.campaign) }));
        })
        .catch((error) => {
          toast.error(`Error creating EOI: ${error}`);
          setSendLinkDisabled(false);
          setEnquiryDataFetched(false)
        });
    }
  };

  const handleCancelConfirmation = () => {
    setConfirmDialogOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If phone is valid, proceed with Formik submission
    formik.handleSubmit();
  };
  const resetEnquiryFields = () => {
    formik.setFieldValue('sfdcEnquiryId', '');
    formik.setFieldValue('sfdcLeadStatus', '');
    formik.setFieldValue('firstName', '');
    formik.setFieldValue('lastName', '');
    formik.setFieldValue('email', '');
    formik.setFieldValue('residentStatus', '');
    formik.setFieldValue('countryCode', '+91');
    formik.setFieldValue('mobileNumber', '');
    formik.setFieldValue('primarySource', '');
    if(enquiryDataFetched) formik.setFieldValue('campaign', '');
    setEnquiryDataFetched(false)
  };

  const handleFetchEnquiry = async () => {
    const enqRefNo = formik.values.sfdcEnquiryId;
    const campaignName =
      campaigns?.find((campaign) => campaign?.value === Number(formik.values.campaign))?.name || '';
      const sfdcProjectName = campaigns?.find((campaign) => campaign?.value === Number(formik.values.campaign))?.sfdcProjectName || '';
    if (!enqRefNo) {
      formik.setFieldTouched('sfdcEnquiryId', true);
      return;
    }

    setEnquiryLoading(true);
    dispatch(getVoucherByEnquiryAction({ enqRefNo, campaignName, sfdcProjectName }))
      .unwrap()
      .then((res: any) => {
        setEnquiryLoading(false);
        if (res) {
          setEnquiryDataFetched(true)
          formik.setFieldValue('firstName', res?.firstName || '');
          formik.setFieldValue('sfdcLeadStatus', res?.sfdcLeadStatus || '');
          formik.setFieldValue('lastName', res?.lastName || '');
          formik.setFieldValue('email', res?.emailId || '');
          formik.setFieldValue('residentStatus', res?.residentStatus || '');
          formik.setFieldValue('mobileNumber', res?.mobile || res?.contactNumber || '');
          formik.setFieldValue('countryCode', res?.countryCode || '+91');
          formik.setFieldValue('primarySource', res?.primarySource || '');
          if (res?.channelpartnerId) {
            const matchedCp = cpNameOptions?.find(
              (cp: any) =>
                cp?.sfdcCPId === res?.channelpartnerId);
            if (matchedCp) {
              formik.setFieldValue('channelPartner', matchedCp.value);
            } else {
              setCpName(res?.channelpartnername);
              setConfirmDialogOpen(true);
            }
          }
          toast.success('Enquiry details fetched successfully');
        }
      })
      .catch((err: any) => {
        setEnquiryLoading(false);
        toast.error(err || 'Failed to fetch enquiry details');
      });
  };
  const handleVoucherFetch = async () => {
    const campaignId = Number(formik.values.referralCampaign);
    const { uniqueRefId } = formik.values;

    if (!campaignId || !uniqueRefId) {
      formik.setFieldTouched("referralCampaign", true);
      formik.setFieldTouched("uniqueRefId", true);
      formik.validateForm();
      return;
    }

    setVoucherLoading(true);
    dispatch(fetchReferredVoucherAction({ campaignId, uniqueRefId }))
      .unwrap()
      .then((res: any) => {
        setVoucherLoading(false);
        formik.setFieldValue("customerName", res.customerName || "");
        formik.setFieldValue("customerCountryCode", res.countryCode || "+91");
        formik.setFieldValue("customerMobileNumber", res.contactNumber || "");
        formik.setFieldValue("customerEmail", res.email || "");
        setIsVoucherFetched(true)
      })
      .catch((err) => {
        setVoucherLoading(false);
        setIsVoucherFetched(false)
        toast.error(err || "Failed to fetch voucher");
      });
  };

  const handleCpSearchDebounced = (rawInput: string) => {
    const input = rawInput.trim();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (input.length < 3) {
      setConfirmDialogOpen(false);
      setCpSearchText(input)
      setCpName('');
      return;
    }
    debounceRef.current = setTimeout(() => {
      const matchedCp = cpNameOptions?.some((cp) =>
        cp.label.toLowerCase().includes(input.toLowerCase())
      );
      setCpSearchText(input)
      if (matchedCp) {
        setConfirmDialogOpen(false);
        setCpName('');
      } else {
        setCpName(input);
        setConfirmDialogOpen(true);
      }
    }, DEBOUNCE_DELAY);
  };
  
  return (
    <form onSubmit={handleFormSubmit}>

      <Card sx={{ padding: '20px', my: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <FormikAutocomplete
              label={jsonValue.label.campaign}
              name="campaign"
              disabled={sendLinkDisabled || enquiryDataFetched}
              required
              formik={formik}
              options={campaigns?.map((cam) => ({
                value: String(cam?.value),
                label: cam?.name,
              }))}
              fallbackLabel={isEditMode ? voucherData?.campaignName : undefined}
            />
          </Grid>
        </Grid>
      </Card>

      {isCampaignSelected && (
        <>
          {!isEditMode && (
            <Card sx={{ padding: '20px', mb: 2 }}>
              <Typography sx={{ fontSize: '16px', fontWeight: 600, textAlign: 'justify', mb: 1 }}>
                {jsonValue.label.existingLeadMsg}

              </Typography>
              <FormikTextField
                name="sfdcEnquiryId"
                label={jsonValue.label.sdfcEnquiryId}
                formik={formik}
                isButton
                disabled={sendLinkDisabled || enquiryDataFetched}
                buttonOnClick={handleFetchEnquiry}
                onClear={resetEnquiryFields}
                buttonDisabled={sendLinkDisabled || enquiryDataFetched}
                buttonTitle={uiText.button.fetch}
                clearIconDisabled={sendLinkDisabled}
                loading={enquiryLoading}
                btnWidth="150px"
              />
            </Card>
          )}
          <Card sx={{ padding: '30px' }}>
            <Section title={jsonValue.title} noBorder={isEditMode}>
              <FormikTextField
            name="firstName"
            label={jsonValue.label.firstName}
            required
            formik={formik}
            disabled={sendLinkDisabled}
          />
          <FormikTextField
            name="lastName"
            label={jsonValue.label.lastName}
            required
            formik={formik}
            disabled={sendLinkDisabled}
          />
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <Field.Phone
              name="mobileNumber"
              countryCodeName="countryCode"
              // label={jsonValue.label.contactNumber}
              placeholder={jsonValue.label.contactNumber}
              country="IN"
              formik={formik}
              disabled={sendLinkDisabled}
            />
          </Grid>
          <FormikTextField
            name="email"
            label={jsonValue.label.email}
            required
            formik={formik}
            disabled={sendLinkDisabled}
          />
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <FormikAutocomplete
              name="residentStatus"
              label={jsonValue.label.residentStatus}
              required
              formik={formik}
              options={RESIDENT_STATUS_OPTIONS}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <FormikAutocomplete
              label={jsonValue.label.primarySource}
              name="primarySource"
              disabled={sendLinkDisabled}
              required
              formik={formik}
              options={primarySource?.map((src) => ({
                value: src?.value,
                label: src?.value,
              }))}
            />
          </Grid>

          {formik?.values?.primarySource === PRIMARY_SOURCE.ChannelPartner && (
           <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                  <FormikAutocomplete
                    label={jsonValue.label.cpName}
                    name="channelPartner"
                    formik={formik}
                    options={cpNameOptions}
                    disabled={sendLinkDisabled}
                    required
                    onInputChange={(
                      _event: React.SyntheticEvent,
                      inputValue: string,
                      reason: 'input' | 'reset' | 'clear'
                    ) => {
                      if (reason === 'input') {
                        handleCpSearchDebounced(inputValue);
                      }

                      if (reason === 'clear') {
                        if (debounceRef.current) {
                          clearTimeout(debounceRef.current);
                        }
                        formik.setFieldValue('channelPartner', '');
                        formik.setFieldTouched('channelPartner', false);
                        setCpName('');
                        setConfirmDialogOpen(false);
                      }
                    }}
                  />
            </Grid>
          )}
          
          <Grid
            item
            xs={12}
            sm="auto"
            sx={{
              display: { xs: 'none', sm: 'block' },
              height: 0,
              padding: 0,
              margin: 0,
            }}
          />

          {SHOW_REFERRER_OPTIONS?.includes(formik?.values?.primarySource) && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ borderBottom: '1px dashed rgba(218, 218, 218, 1)', mt: 1 }} />
                <RadioGroup
                  sx={{ ml: 1, mt: 2 }}
                  row
                  name="referrer"
                  value={formik?.values?.referrer}
                  onChange={formik?.handleChange}
                >
                  <FormControlLabel
                    value={REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF}
                    control={<Radio disabled={sendLinkDisabled} />}
                    label={jsonValue.label.buyingForSelf}
                  />
                  <FormControlLabel
                    value={REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER}
                    control={<Radio disabled={sendLinkDisabled} />}
                    label={jsonValue.label.referredByCustomer}
                  />
                  {isPurvaPrivilege && (
                    <FormControlLabel
                      value={REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS}
                      control={<Radio disabled={sendLinkDisabled} />}
                      label={jsonValue.label.referralOthers}
                    />
                  )}
                </RadioGroup>
              </Grid>

              {/* CASE 1 & 2: buyingForSelf OR referredByCustomer */}
              {(formik.values.referrer === REFERRER_RADIO_OPTIONS.BUYING_FOR_SELF ||
                formik.values.referrer === REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER) && (
                <>
                  <FormikTextField
                    name="customerName"
                    label={jsonValue.label.customerName}
                    required
                    formik={formik}
                    disabled={sendLinkDisabled}
                  />
                  <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                    <Field.Phone
                      name="customerMobileNumber"
                      countryCodeName="customerCountryCode"
                      // label="contact number"
                      country="IN"
                      formik={formik}
                      placeholder="Contact Number"
                      required
                      disabled={sendLinkDisabled}
                    />
                  </Grid>
                  <FormikTextField
                    name="customerEmail"
                    label={jsonValue.label.customerEmail}
                    required
                    formik={formik}
                    disabled={sendLinkDisabled}
                  />
                  <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                    <FormikAutocomplete
                      label={jsonValue.label.project}
                      name="project"
                      disabled={sendLinkDisabled}
                      required
                      formik={formik}
                      options={projectOptions?.map((project: ProjectOption) => ({
                        value: project?.id,
                        label: project?.name,
                      }))}
                    />
                  </Grid>
                  <FormikTextField
                    name="unitNumber"
                    label={jsonValue.label.unitNumber}
                    required
                    formik={formik}
                    disabled={sendLinkDisabled}
                  />

                  {/* Extra field ONLY for referredByCustomer */}
                  {formik?.values?.referrer === REFERRER_RADIO_OPTIONS.REFERRED_BY_CUSTOMER && (
                    <FormikTextField
                      name="referredBy"
                      label={jsonValue.label.referredBy}
                      required
                      formik={formik}
                      disabled={sendLinkDisabled}
                    />
                  )}
                </>
              )}

              {/* CASE 3: referralOthers */}
              {formik?.values?.referrer === REFERRER_RADIO_OPTIONS.REFERRAL_OTHERS && (
                <FormikTextField
                  name="activityName"
                  label={jsonValue.label.activityName}
                  required
                  formik={formik}
                  disabled={sendLinkDisabled}
                />
              )}
            </>
          )}

          {formik?.values?.primarySource === PRIMARY_SOURCE.PurvaChampion && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ borderBottom: '1px dashed rgba(218, 218, 218, 1)' }} />
                <Typography variant="body2" mt={2}>
                  {jsonValue.purvaChampion}
                </Typography>
              </Grid>
              <FormikTextField
                name="employeeName"
                label={jsonValue.label.employeeName}
                required
                formik={formik}
                disabled={sendLinkDisabled}
              />
              <FormikTextField
                name="employeeId"
                label={jsonValue.label.employeeId}
                formik={formik}
                disabled={sendLinkDisabled}
              />
            </>
          )}

          {referralFormVisible && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ borderBottom: '1px dashed rgba(218, 218, 218, 1)', my: 1 }} />
                <Typography sx={{ fontSize: '18px', fontWeight: 600 }}>
                  {jsonValue.referralFormTitle}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <FormikAutocomplete
                  label={jsonValue.label.campaign}
                  name="referralCampaign"
                  disabled={sendLinkDisabled || isVoucherFetched}
                  required
                  formik={formik}
                  options={campaigns?.map((cam) => ({
                    value: String(cam?.value),
                    label: cam?.name,
                  }))}
                  fallbackLabel={isEditMode ? voucherData?.sourceDetails?.campaignName : undefined}
                />
              </Grid>
              <FormikTextField
                name="uniqueRefId"
                label={jsonValue.label.uniqueRefId}
                required
                formik={formik}
                disabled={sendLinkDisabled || isVoucherFetched}
                isButton
                buttonOnClick={handleVoucherFetch}
                onClear={resetReferralFields}
                buttonDisabled={sendLinkDisabled || isVoucherFetched}
                buttonTitle={uiText.button.fetch}
                clearIconDisabled={sendLinkDisabled}
                loading={voucherLoading}
              />
              <FormikTextField
                name="customerName"
                label={jsonValue.label.customerName}
                required
                formik={formik}
                disabled
              />
              <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
                <Field.Phone
                  name="customerMobileNumber"
                  countryCodeName="customerCountryCode"
                  country="IN"
                  formik={formik}
                  placeholder="Contact Number"
                  required
                  disabled
                />
              </Grid>
              <FormikTextField
                name="customerEmail"
                label={jsonValue.label.customerEmail}
                required
                formik={formik}
                disabled
              />
            </>
          )}

        </Section>

        {!isEditMode && (
          <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                route.push(generateRoleBasedRoute(userRole, 'eoi-records'));
              }}
            >
              {uiText.button.cancel}
            </Button>

            <Button
              type="submit"
              variant="contained"
              onClick={handleSubmit}
              disabled={sendLinkDisabled || (referralFormVisible && !isVoucherFetched)}
              sx={{
                backgroundColor: '#1A407D',
                '&:hover': {
                  backgroundColor: '#174A9D',
                },
              }}
            >
              {uiText.button.sendLink}
            </Button>
              </Box>
            )}

            <Typography sx={{ fontSize: '16px', fontWeight: 400, mt: 3, textAlign: 'justify' }}>
              <span style={{ fontWeight: 600 }}> {jsonValue.label.note}:</span> {jsonValue.label.paymentNote}
            </Typography>
          </Card>

        </>
      )}

        <ConfirmDialog
          open={confirmDialogOpen}
          showCancel
          cancelLabel={uiText.button.cancel}
          showCloseButton
          showDivider
          onClose={handleCancelConfirmation}
          title={jsonValue.confirmDialog.title}
          content={
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ mb: 2, fontSize: '14px', fontWeight: 600 }}>
                {interpolate(jsonValue.confirmDialog.noLinkCreated, { cpName })}.
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 400, textAlign: 'justify' }}>
                {interpolate(jsonValue.confirmDialog.msg, { cpName })}
              </Typography>
            </Box>
          }
          action={
            <Button
              variant="contained"
              color="error"
              sx={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#fff',
                background: '#1A407D',
                minWidth: { xs: '120px', lg: '204px' },
                height: '48px',
                '&:hover': { background: '#1A407D', boxShadow: 'none' },
              }}
              onClick={() => {
                window.open(
                  paths.rm.createChannelPartner.root,
                  '_blank',
                  'noopener,noreferrer'
                );
              }}

            >
              {jsonValue.confirmDialog.createCpBtn}
            </Button>
          }
        />
    </form>
  );
};

export default BasicDetailsExpressionForm;
