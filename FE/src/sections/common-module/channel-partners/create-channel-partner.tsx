import "../rm-panel.css"

import type { FormikHelpers } from 'formik';
import type { AddressDetails } from "src/components/google-maps-autocomplete/GoogleMapsAutocomplete";

import * as Yup from 'yup';
import { toast } from 'sonner';
import { useFormik } from 'formik';
// eslint-disable-next-line import/no-extraneous-dependencies
import React, { useRef, useState, useEffect } from 'react';

import {
  Box,
  Grid,
  Button,
  TextField,
  Typography,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { isUpcomingEstates } from "src/utils/constant";
import { isValidPhoneNumberWithRules } from "src/utils/helper";
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import { route } from 'src/services/apiRoutes';
import { GET } from 'src/services/axiosInstance';
import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchEOICampaignsAction } from 'src/redux/actions/rm-panel/eoi-actions';
import { createChannelPartnerLinkAction } from 'src/redux/actions/rm-panel/channel-partners-actions';

import { Field } from "src/components/hook-form";
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import CustomAutocomplete from 'src/components/customautocomplete/CustomAutocomplete';
import FormikAutocomplete from "src/components/formik-autocomplete/FormikAutocomplete";
import GoogleMapsAutocomplete from "src/components/google-maps-autocomplete/GoogleMapsAutocomplete";

/* Styles */
const borderBottomStyle = {
  borderTop: '1px dashed #DADADA',
  paddingBottom: '10px',
};

interface ReferralList {
  countryCode: string;
  mobileNumber: string;
}

export interface CreateChannelPartnerFormValues {
  campaignName: string;
  cpName: string; // label
  cpId?: string; // id from API
  channelPartnerType?: string | null;  // partnerType from API
  email: string;
  referralList: ReferralList;
  reraNumber: string;
  name: string;
  gstNo: string;
  country: string;
  state: string;
  city: string;
  address: string;
  pincode: string;
  unit: string;
  panNumber: string;
}

interface CPApiItem {
  cpId: string;
  cpName: string;
  channelPartnerType: string | null;
  reraNumber?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
}

const CreateChannelPartner: React.FC = () => {
const handlePlaceChanged = (data: AddressDetails) => {
    formik.setFieldValue('country', data?.country || '');
    formik.setFieldValue('state', data?.state || '');
    formik.setFieldValue('city', data?.city || '');
    formik.setFieldValue('pincode', data?.pinCode || '');
  };
  
  const router = useRouter();
  const dispatch = useAppDispatch();
  const jsonValue = uiText.cpJSON.createCP.form;
  const { campaigns } = useAppSelector((state) => state.expressonOfInterest);

  const [showFullForm, setShowFullForm] = useState(false);
  const [cpOptions, setCpOptions] = useState<{ userName: string; userId: string }[]>([]);
  const [cpSearch, setCpSearch] = useState('');
  const [selectedCp, setSelectedCp] = useState<{ userName: string; userId: string } | null>(null);
  const [autoFilledFromApi, setAutoFilledFromApi] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    dispatch(fetchEOICampaignsAction());
  }, [dispatch]);

  const formik = useFormik<CreateChannelPartnerFormValues>({
    initialValues: {
      campaignName: '',
      cpName: '',
      cpId: undefined,
      channelPartnerType: null,
      email: '',
      referralList: {
        countryCode: '+91',
        mobileNumber: '',
      },
      reraNumber: '',
      name: '',
      gstNo: '',
      country: '',
      address: '',
      pincode: '',
      unit: '',
      state: '',
      city: '',
      panNumber: '',
    },
    validationSchema: Yup.object({
      campaignName: Yup.string().required(jsonValue.validations.campaignName),
      cpName: Yup.string().required(jsonValue.validations.cpName),
      email: Yup.string()
        .email(jsonValue.validations.invalidEmail)
        .when('cpId', ([cpId], schema) =>
          cpId
            ? schema.notRequired()
            : schema.required(jsonValue.validations.email)
        ),
      referralList: Yup.object({
        mobileNumber: Yup.string().when('$cpId', ([cpId], schema) =>
          cpId
            ? schema.notRequired()
            : schema
                .required(jsonValue.validations.mobNo)
                .test('is-valid-phone', jsonValue.validations.invalidMobNo, (value, context) => {
                  const { countryCode } = context.parent;
                  return isValidPhoneNumberWithRules(countryCode, value);
                })
        ),
      }),
      reraNumber: autoFilledFromApi
        ? Yup.string().notRequired()
        : Yup.string().required(jsonValue.validations.reraNo),
      gstNo: Yup.string().when(['cpId', 'cpName'], ([cpId, cpName], schema) =>
        cpId || isUpcomingEstates(cpName)
          ? schema.notRequired()
          : schema
              .required(jsonValue.validations.gstNo)
              .matches(
                /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/,
                jsonValue.validations.matchGSTNo
              )
      ),
      name: Yup.string().when('cpName', ([cpName], schema) =>
        isUpcomingEstates(cpName)
          ? schema.required(jsonValue.validations.name)
          : schema.notRequired()
      ),
      panNumber: Yup.string().when(['cpId', 'cpName'], ([cpId, cpName], schema) =>
        cpId || isUpcomingEstates(cpName)
          ? schema.notRequired()
          : schema
              .required(jsonValue.validations.panNo)
              .matches(/^[A-Z]{5}\d{4}[A-Z]$/, jsonValue.validations.matchPANNo)
      ),
      country: Yup.string().when('cpId', ([cpId], schema) =>
        cpId ? schema.notRequired() : schema.required(jsonValue.validations.country)
      ),
      address: Yup.string().when('cpId', ([cpId], schema) =>
        cpId ? schema.notRequired() : schema.required(jsonValue.validations.address)
      ),
      state: Yup.string().when('cpId', ([cpId], schema) =>
        cpId ? schema.notRequired() : schema.required(jsonValue.validations.state)
      ),
      city: Yup.string().when('cpId', ([cpId], schema) =>
        cpId ? schema.notRequired() : schema.required(jsonValue.validations.city)
      ),
      pincode: Yup.string().when('cpId', ([cpId], schema) =>
        cpId ? schema.notRequired() : schema.required(jsonValue.validations.pincode)
      ),
      unit: Yup.string().when('cpId', ([cpId], schema) =>
        cpId ? schema.notRequired() : schema.required(jsonValue.validations.unit)
      ),
    }),
    onSubmit: async (
      values: CreateChannelPartnerFormValues,
      helpers: FormikHelpers<CreateChannelPartnerFormValues>
    ) => {

  // Derive status based on CP Name
  let status = 'Empanelment Pending';
  if (autoFilledFromApi) {
    status = 'SFDC Empanelled';
  } else if (isUpcomingEstates(values.cpName)) {
    status = 'New Registration';
  }

  const sfdcCPId = autoFilledFromApi ? values.cpId : null;

  const payload = {
    cpName: values.cpName,
    email: values.email,
    countryCode: values.referralList.countryCode,
    contactNumber: values.referralList.mobileNumber,
    campaignId: Number(values.campaignName),
    address: values.address,
    country: values?.country || "",
    state: values?.state || "",
    city: values?.city || "",
    pincode: values?.pincode || "",
    rera: values.reraNumber || undefined,
    gst: values.gstNo || undefined,
    panNumber: values.panNumber || undefined,
    status,
    unit: values.unit,
    sfdcCPId,
    cpType: values.channelPartnerType || null,
    ...(isUpcomingEstates(values.cpName) && { name: values.name })
  };

      try {
        await dispatch(createChannelPartnerLinkAction(payload)).unwrap();
        toast.success('Channel Partner link generated successfully!');

        // Full reset on success: clear all values including cpName and search
        helpers.resetForm({
          values: {
            campaignName: '',
            cpName: '',
            cpId: undefined,
            channelPartnerType: null,
            email: '',
            referralList: { countryCode: '+91', mobileNumber: '' },
            reraNumber: '',
            name: '',
            gstNo: '',
            country: '',
            state: '',
            city: '',
            address: '',
            pincode: '',
            unit: '',
            panNumber: '',
          },
        });
        setSelectedCp(null);
        setAutoFilledFromApi(false);
        setCpSearch('');
        router?.push('/rm-panel/cp-list');
      } catch (error: any) {
        toast.error(`Error creating CP Link: ${error?.message}`);
      }
    },
  validateOnChange:true,
  validateOnBlur: true,
  });

  // Hard code reraNumber in case of Upcoming Estates
  useEffect(() => {
    if (isUpcomingEstates(formik.values.cpName)) {
      formik.setFieldValue("reraNumber", "PRM/KA/RERA/1251/309/AG/171324/000075");
    } else {
      formik.setFieldValue("reraNumber", "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.cpName]);

  useEffect(() => {
    formik.validateForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik?.values]);

  // Debounced CP search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const q = cpSearch?.trim();
      const url = `${route.SEARCH_CP}?search=${encodeURIComponent(q || '')}`;
      try {
        const res = await GET(url);
        if (res.status === 200) {
          const data = res?.response?.response?.data;
          let list: any[] = [];
          if (Array.isArray(data)) {
            list = data;
          } else if (Array.isArray(res?.response?.response)) {
            list = res.response.response;
          }

          const mapped = list?.map((i: any) => ({
            userName: i?.cpName || i?.name,
            userId: String(i?.cpId || i?.id),
          }));

          setCpOptions(mapped);
        }
      } catch (e) {
        setCpOptions([]);
        console.error(e);
        toast.error('Failed to fetch CP list');
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [cpSearch]);


  // Handle CP selection and autofill
  const handleCpSelect = async (val: { userName: string; userId: string } | null) => {
    setSelectedCp(val);
    setAutoFilledFromApi(false);
    formik.setFieldValue('cpName', val?.userName || '');
    formik.setFieldValue('cpId', val?.userId || undefined);

    if (!val?.userId) {
      setShowFullForm(true); // No CP found, show full form
      // No CP selected; keep existing RERA/GST/PAN values as entered by the user
      return;
    }

    try {
      const url = `${route.SEARCH_CP}?search=${encodeURIComponent(val.userName)}`;
      const res = await GET(url);
      if (res.status === 200) {
        const list: CPApiItem[] = res?.response?.response?.data || res?.response?.response || [];
        const match = list?.find(
          (x: any) => String(x.cpId || x.id) === val.userId || (x.cpName || x.name) === val.userName
        );
        if (match) {
          // CP found, do NOT show full form
          setShowFullForm(false);
          const rera = (match as any).reraNumber || '';
          formik.setFieldValue('reraNumber', rera || match.cpId); // <-- set cpId if reraNumber is null/empty
          formik.setFieldValue('gstNo', (match as any).gstNumber || '');
          formik.setFieldValue('panNumber', (match as any).panNumber || '');
          formik.setFieldValue('channelPartnerType', match.channelPartnerType || null);
          setAutoFilledFromApi(true);
        } else {
        // No CP found, show full form
        setShowFullForm(true);
         setAutoFilledFromApi(false);
      }
      }
    } catch (e) {
      console.error(e);
      setShowFullForm(true); // On error, show full form
      toast.error('Failed to fetch CP details');
    }
  };

    const handleChangeWithTouch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    let finalValue = value;
    // Special handling for pan
    if (name === 'panNumber') {
      finalValue = value.toUpperCase();
    }

    formik.setFieldValue(name, finalValue);
    formik.setFieldTouched(name, true, false);
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs heading={uiText.cpJSON.createCP.title} sx={stickyBreadcrumbsStyles} />
      <Box
        component="form"
        onSubmit={formik.handleSubmit}
        sx={{
          padding: '16px 24px',
          boxShadow: '0.1px 0.1px 4px 1px #919EAB33',
          borderRadius: '16px',
        }}
      >
        <Grid container spacing={2} sx={{ borderRadius: 1 }}>
          {/* Campaign Name */}
          <Grid item xs={12} md={6}>
            <FormikAutocomplete
              label={jsonValue.label.campaignName}
              name="campaignName"
              required
              formik={formik}
              options={campaigns?.map((opt) => ({
                value: String(opt?.value),
                label: opt?.name,
              }))}
            />
          </Grid>
          {/* CP Name */}
          <Grid item xs={12} md={6}>
            <CustomAutocomplete
              noOptionsText={jsonValue.placeholder.cpNameWithoutOption} 
              options={cpOptions}
              value={selectedCp}
              inputValue={cpSearch}
              onChange={(_, v) => handleCpSelect(v)}
              onInputChange={(_, v) => {
                setCpSearch(v);
                // Keep cpName as what the user types if not selecting from API
                formik.setFieldValue('cpName', v || '');
                // If cleared or diverged from selected option, clear cpId/selectedCp and reset autofilled fields
                if (!v || (selectedCp && v !== selectedCp.userName)) {
                  setSelectedCp(null);
                  formik.setFieldValue('cpId', undefined);
                  formik.setFieldValue('channelPartnerType', null);
                  // Reset RERA/GST/PAN on new search - they were autofilled from previous selection
                  setAutoFilledFromApi(false);
                  if (!isUpcomingEstates(v || '')) {
                    formik.setFieldValue('reraNumber', '');
                  }
                  formik.setFieldValue('gstNo', '');
                  formik.setFieldValue('panNumber', '');
                  // Reset all form errors when CP is cleared
                  formik.setErrors({});
                  formik.setTouched({});
                }
                // Check if the typed value matches any option
                // Debounce the showFullForm toggle
                if (debounceRef.current) clearTimeout(debounceRef.current);

                debounceRef.current = setTimeout(() => {
                  const match = cpOptions.find(opt => opt.userName === v);
                  if (match) {
                    setShowFullForm(false); // CP found, hide full form
                  } else {
                    setShowFullForm(true); // No CP found, show full form
                  }
                }, 3000);
              }}
              label={<>{jsonValue.label.cpName} <span style={{ color: 'red'}}>*</span></>}
              placeholder={jsonValue.placeholder.cpName} 
              height={55}
            />
            {formik.touched.cpName && formik.errors.cpName && (
              <Typography color="error" sx={{ fontSize: '12px', mt: 1 }}>
                {formik.errors.cpName}
              </Typography>
            )}
          </Grid>

        {showFullForm && (
          <>
          {/* Email */}
          <Grid item xs={12} md={6}>
            <TextField
              label={jsonValue.label.email} 
              name="email"
              fullWidth
              InputLabelProps={{ required: true }}
              className="requiredField custom-input"
              value={formik.values.email}
              onChange={handleChangeWithTouch}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && (formik.errors.email as string)}
            />
          </Grid>

          {/* Mobile Number with Country Code */}
          <Grid item xs={12} md={6}>
               <Field.Phone
                  name="referralList.mobileNumber"
                  countryCodeName="referralList.countryCode"
                  // label={jsonValue.label.contactNumber}
                  placeholder="Contact Number"
                  country="IN"
                  formik={formik}
                  required
                />
          </Grid>

          {/* GST No */}
          <Grid item xs={12} md={6}>
            <TextField
              label={jsonValue.label.gstNo} 
              name="gstNo"
              fullWidth
              InputLabelProps={{ required: !isUpcomingEstates(formik.values.cpName) }}
              className={`custom-input ${!isUpcomingEstates(formik.values.cpName) ? "requiredField" : ""}`}
              value={formik.values.gstNo}
              onChange={handleChangeWithTouch}
              error={formik.touched.gstNo && Boolean(formik.errors.gstNo)}
              helperText={formik.touched.gstNo && (formik.errors.gstNo as string)}
              disabled={autoFilledFromApi}
            />
          </Grid>
          {/* PAN Number */}
          <Grid item xs={12} md={6}>
            <TextField
              label={jsonValue.label.panNo} 
              name="panNumber"
              fullWidth
              InputLabelProps={{ required: !isUpcomingEstates(formik.values.cpName)}}
              className={`custom-input ${!isUpcomingEstates(formik.values.cpName) ? "requiredField" : ""}`}
              value={formik.values.panNumber}
              onChange={handleChangeWithTouch}
              error={formik.touched.panNumber && Boolean(formik.errors.panNumber)}
              helperText={formik.touched.panNumber && (formik.errors.panNumber as string)}
              inputProps={{
                style: { textTransform: 'uppercase' },
              }}
              disabled={autoFilledFromApi}
            />
          </Grid>
          </>
          )}

          {/* RERA No */}
          <Grid item xs={12} md={6}>
            <TextField
              label={jsonValue.label.reraNumber} 
              name="reraNumber"
              fullWidth
              InputLabelProps={{ required: true }}
              className="requiredField custom-input"
              value={formik.values.reraNumber}
              onChange={handleChangeWithTouch}
              error={formik.touched.reraNumber && Boolean(formik.errors.reraNumber)}
              helperText={formik.touched.reraNumber && (formik.errors.reraNumber as string)}
              disabled={autoFilledFromApi || isUpcomingEstates(formik.values.cpName)}
            />
          </Grid>

          {isUpcomingEstates(formik?.values?.cpName) && (
          <Grid item xs={12} md={6}>
            <TextField
              label={jsonValue.label.name}
              name="name"
              fullWidth
              InputLabelProps={{ required: true }}
              className="requiredField custom-input"
              value={formik.values.name}
              onChange={handleChangeWithTouch}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && (formik.errors.name as string)}
            />
          </Grid>
          )}

          {showFullForm && (
          <Grid container spacing={2} mt={0} ml={0}>
            {/* Address with Google Autocomplete */}
            <Grid item xs={12} md={6}>
              <GoogleMapsAutocomplete
                  name="address"
                  formik={formik}
                  label={jsonValue.label.address}
                  required
                  variant="outlined"
                  TextFieldProps={{ className: 'requiredField custom-input' }}
                  onSelect={(data) => handlePlaceChanged(data)}
                />
            </Grid>

            {/* Country */}
            <Grid item xs={12} md={6}>
              <TextField
                label={jsonValue.label.country}
                name="country"
                fullWidth
                InputLabelProps={{ required: true }}
                className="requiredField custom-input"
                value={formik.values.country}
                onChange={handleChangeWithTouch}
                error={formik.touched.country && Boolean(formik.errors.country)}
                helperText={formik.touched.country && formik.errors.country}
              />
            </Grid>

            {/* State */}
            <Grid item xs={12} md={6}>
              <TextField
                label={jsonValue.label.state}
                name="state"
                fullWidth
                InputLabelProps={{ required: true }}
                className="requiredField custom-input"
                value={formik.values.state}
                onChange={handleChangeWithTouch}
                error={formik.touched.state && Boolean(formik.errors.state)}
                helperText={formik.touched.state && formik.errors.state}
              />
            </Grid>

            {/* City */}
            <Grid item xs={12} md={6}>
              <TextField
                label={jsonValue.label.city}
                name="city"
                fullWidth
                InputLabelProps={{ required: true }}
                className="requiredField custom-input"
                value={formik.values.city}
                onChange={handleChangeWithTouch}
                error={formik.touched.city && Boolean(formik.errors.city)}
                helperText={formik.touched.city && formik.errors.city}
              />
            </Grid>

            {/* Pincode */}
            <Grid item xs={12} md={6}>
              <TextField
                label={jsonValue.label.pincode}
                name="pincode"
                fullWidth
                InputLabelProps={{ required: true }}
                className="requiredField custom-input"
                value={formik.values.pincode}
                onChange={handleChangeWithTouch}
                error={formik.touched.pincode && Boolean(formik.errors.pincode)}
                helperText={formik.touched.pincode && formik.errors.pincode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={jsonValue.label.unit}
                name="unit"
                fullWidth
                InputLabelProps={{ required: true }}
                className="requiredField custom-input"
                value={formik.values.unit}
                onChange={handleChangeWithTouch}
                error={formik.touched.unit && Boolean(formik.errors.unit)}
                helperText={formik.touched.unit && formik.errors.unit}
              />
            </Grid>

          </Grid>
          )}

          {/* Action Buttons */}
          <Grid item xs={12} display="flex" justifyContent="flex-end" gap={2} mt={3} ml={2} sx={{ ...borderBottomStyle }}>
            <Button variant="outlined" color="inherit"
              onClick={() => {
                router.push('/rm-panel/cp-list');
              }}
            >
              {uiText.button.cancel}
            </Button>
            <Button type="submit" variant="contained" className="primaryBtn">
              {uiText.button.generateLink}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </DashboardContent>
  );
};

export default CreateChannelPartner;
