import * as Yup from 'yup';
import { toast } from 'sonner';
import { useFormik } from 'formik';
import { useParams } from 'react-router';
import React, { useState, useEffect } from 'react';

import { Box, Grid, Stack, Button, Typography } from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { BOOKING_AS , BOOKING_FORM_STATUS } from 'src/utils/constant';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { generateBookingFormUrl } from 'src/config/booking-form-urls';
import {
  manageApplicants,
  getApplicantDetails,
  getBookingApplicants,
  getOpportunityDetails,
} from 'src/redux/actions/rm-panel/dashboard-actions';

import { ShareFormDialog } from 'src/components/share-form-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import LinkActionBar from './link-action-bar';
import BookingFormDialog from './booking-form-dialog';
import ApplicantMappingRow from './applicant-mapping-row';

type ApplicantMap = Record<string, string | null>;

interface UnitValue {
  unitName: string;
  applicants: ApplicantMap;
}

interface FormValues {
  units: UnitValue[];
}
const applicantKeys = ['applicant1', 'applicant2', 'applicant3', 'applicant4'];

function ApplicantMapping() {
  const jsonValue = uiText.applicantMapping;
  const { oppId } = useParams();
  const dispatch = useAppDispatch();

  const { applicants, loading, noOfApplicants, applicantData,opportunity} = useAppSelector(
    (state) => state.dashboard
  );
  // Convert to dropdown options correctly
  // ✅ Handles undefined/null applicants gracefully
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingFormUrl, setBookingFormUrl] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const applicantOptions = [
    ...(applicants
      ? Object.values(applicants).filter(
          (a): a is { name: string; value: string,isMinor:boolean } => !!a && typeof a === 'object'
        )
      : []),
    { name: 'New Applicant', value: 'New Applicant',isMinor:false },
  ];

  const [unitZero, setUnitZero] = useState({
    unitName: jsonValue.existingApplicants,
    applicants: {}, // ✅ no comma or trailing syntax error
  });

useEffect(() => {
  const totalApplicantKeys = 4;

  if (applicants) {
    const isAllNew = noOfApplicants === 0;

    const dynamicApplicants = Array.from({ length: totalApplicantKeys }).reduce(
      (acc: Record<string, string | null>, _, index) => {
        const key = `applicant${index + 1}`;
        const applicantsData = (applicants as any)[key];

        // ✅ Only applicant1 becomes "New Applicant" when noOfApplicants is 0
        if (isAllNew && index === 0) {
          acc[key] = 'New Applicant';
        } else if (index < noOfApplicants && applicantsData === null) {
          acc[key] = 'New Applicant';
        } else {
          acc[key] = applicantsData?.name ?? null;
        }

        return acc;
      },
      {}
    );

    const dynamicApplicantsByValue = Array.from({ length: totalApplicantKeys })?.reduce(
      (acc: Record<string, string | null>, _, index) => {
        const key = `applicant${index + 1}`;
        const applicantsData = (applicants as any)[key];

        if (isAllNew && index === 0) {
          acc[key] = 'New Applicant';
        } else if (index < noOfApplicants && applicantsData === null) {
          acc[key] = 'New Applicant';
        } else {
          acc[key] = applicantsData?.value ?? null;
        }

        return acc;
      },
      {}
    );


    // ✅ Set unitZero for display
    setUnitZero({
      unitName: jsonValue.existingApplicants,
      applicants: dynamicApplicants,
    });

    // ✅ Update Formik values
    formik.setValues({
      units: [
        {
          unitName: jsonValue.swapWith,
          applicants: dynamicApplicantsByValue,
        },
      ],
    });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [noOfApplicants, jsonValue.existingApplicants, jsonValue.swapWith,applicants]);

  useEffect(() => {
    if (oppId) {
      dispatch(getOpportunityDetails(`/${oppId}`))
      dispatch(getApplicantDetails(`/${oppId}`));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const formik = useFormik<FormValues>({
    initialValues: {
      units: [
        {
          unitName: jsonValue.swapWith,
          applicants: {
            applicant1: null,
            applicant2: null,
            applicant3: null,
            applicant4: null,
          },
        },
      ],
    },
    validationSchema: Yup.object({
      units: Yup.array().of(
        Yup.object({
          unitName: Yup.string(),
          applicants: Yup.object(
            applicantKeys.reduce<Record<string, Yup.StringSchema<string | null>>>(
              (acc, key, index) => {
                acc[key] = Yup.string()
                  .nullable()
                  .test(
                    'required-when-set',
                    `Applicant ${index + 1} is required`,
                    (value) => value === null || (typeof value === 'string' && value.trim() !== '')
                  )
                  .test('unique', jsonValue.validations.unique, (value, context) => {
                    const strValue = value ?? '';

                    if (strValue === '' || strValue === 'New Applicant') return true;

                    const parentObj = context.parent as Record<string, string | null>;
                    const otherValues = Object.entries(parentObj)
                      .filter(([k]) => k !== key)
                      .map(([_, v]) => v)
                      .filter(
                        (v): v is string =>
                          typeof v === 'string' && v.trim() !== '' && v !== 'New Applicant'
                      );

                    return !otherValues.includes(strValue);
                  })
                  .defined() as Yup.StringSchema<string | null>;
                return acc;
              },
              {} as Record<string, Yup.StringSchema<string | null>>
            ) // Explicitly type the initial empty object
          ),
        })
      ),
    }),
    onSubmit: (values) => {},
  });

  const handleResetForm = () => {
    if (applicants && noOfApplicants) {
      const totalApplicantKeys = 4;

      // Build Formik-compatible values
      const dynamicApplicantsByValue = Array.from({ length: totalApplicantKeys }).reduce(
        (acc: Record<string, string | null>, _, index) => {
          const key = `applicant${index + 1}`;
          const applicantsDataObject = (applicants as any)[key]; // ✅ Fix: cast applicants as any

          // If within noOfApplicants range and null → "New Applicant"
          if (index < noOfApplicants && applicantsDataObject === null) {
            acc[key] = 'New Applicant';
          } else {
            acc[key] = applicantsDataObject?.value ?? null;
          }

          return acc;
        },
        {}
      );

      formik.setValues({
        units: [
          {
            unitName: jsonValue.swapWith,
            applicants: dynamicApplicantsByValue,
          },
        ],
      });
    }
  };

  const handleNext = async () => {
    // Validate form
    const errors = await formik.validateForm();

    // Mark all fields touched for validation
    const makeAllTouched = (values: any) => ({
      units: values.units.map((unit: any) => ({
        applicants: Object.keys(unit.applicants).reduce(
          (acc, key) => {
            acc[key] = true;
            return acc;
          },
          {} as Record<string, boolean>
        ),
      })),
    });

    formik.setTouched(makeAllTouched(formik.values));

    // Recursive error checker
    const hasErrors = (obj: any): boolean => {
      if (!obj) return false;
      if (typeof obj === 'string') return true;
      if (Array.isArray(obj)) return obj.some((val) => hasErrors(val));
      if (typeof obj === 'object') return Object.values(obj).some((val) => hasErrors(val));
      return false;
    };

    if (hasErrors(errors)) {
      toast.error('Please correct all highlighted errors before proceeding.');
      return;
    }

    try {
      const applicantsData = formik.values?.units?.[0]?.applicants ?? {};

      // Build object of only filled applicants
      const applicantsObject = Object.entries(applicantsData).reduce(
        (acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      // Count total applicants
      const numberOfApplicants = Object.values(applicantsObject)?.filter(Boolean)?.length;

      // Determine lastStep based on priority
      let lastStep: number | null = applicantData?.data?.lastStep ?? numberOfApplicants + 1
      if (applicantsObject?.applicant1 === 'New Applicant') {
        if (
          applicantData?.data?.bookingAs === BOOKING_AS?.CORPORATE ||
          applicantData?.data?.bookingAs === BOOKING_AS?.PARTNERSHIP_FIRM
        ) {
          lastStep = 2;
        } else {
          lastStep = 0;
        }
      } else if (applicantsObject?.applicant2 === 'New Applicant')
        if (
          applicantData?.data?.bookingAs === BOOKING_AS?.CORPORATE ||
          applicantData?.data?.bookingAs === BOOKING_AS?.PARTNERSHIP_FIRM
        ) {
          lastStep = 3;
        } else {
          lastStep = 1;
        }
      else if (applicantsObject?.applicant3 === 'New Applicant') {
        if (
          applicantData?.data?.bookingAs === BOOKING_AS?.CORPORATE ||
          applicantData?.data?.bookingAs === BOOKING_AS?.PARTNERSHIP_FIRM
        ) {
          lastStep = 4;
        } else {
          lastStep = 2;
        }
      } else if (applicantsObject?.applicant4 === 'New Applicant') {
        if (
          applicantData?.data?.bookingAs === BOOKING_AS?.CORPORATE ||
          applicantData?.data?.bookingAs === BOOKING_AS?.PARTNERSHIP_FIRM
        ) {
          lastStep = 4;
        } else {
          lastStep = 3;
        }
      }

      const payload = {
        ...applicantsObject,
        noOfApplicants: numberOfApplicants,
        lastStep,
      };

      await dispatch(manageApplicants({ oppId, payload })).unwrap();
      const dynamicUrl = generateBookingFormUrl(opportunity?.data?.projectBrandName ?? '', oppId || "");
      setBookingFormUrl(dynamicUrl);
      toast.success('Applicants updated successfully.');
      dispatch(getBookingApplicants(oppId ?? ''))
      setBookingModal(true)
    } catch (error) {
      console.error('Error managing applicants:', error);
      toast.error('Failed to update applicants. Please try again.');
    }
  };

  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        await dispatch(getBookingApplicants(oppId ?? '')).unwrap();
      } catch (error) {
        console.error(error);
        toast.error('Failed to fetch applicants. Please try again.');
      }
    };

    if (oppId) {
      fetchApplicants();
    }
  }, [dispatch, oppId]);

  // Helper function to get the correct URL based on available PDFs (excluding office use PDF)
  const getBookingFormUrl = (): string => bookingFormUrl;

  const handleOpen = (user: any) => {
      const url = getBookingFormUrl();
      window.open(url, '_blank');
  
      if (applicantData?.data?.mergedPdf) {
        toast.success('Opening Merged PDF');
      } else if (applicantData?.data?.signedPdf) {
        toast.success('Opening Signed PDF');
      } else if (
        applicantData?.data?.unsignedPdf &&
        BOOKING_FORM_STATUS?.SIGNED_OFFLINE === applicantData?.data?.bookingFormStatus
      ) {
        toast.success('Opening Unsigned PDF');
      } else {
        toast.success('Opening Booking Form');
      }
    };

  return (
    <DashboardContent>
      <CustomBreadcrumbs sx={{ mb: '16px' }} heading={jsonValue.title} />
      {!loading && (
        <Stack>
          <Grid
            container
            spacing={0}
            sx={{
              border: '1px solid rgba(26, 64, 125, 0.30)',
              borderRadius: '8px',
              padding: '16px',
              mb: {
                xs: 2,
                sm: 4,
                md: 5,
              },
            }}
          >
            {!loading && (
              <Grid item xs={12} sm={12} md={12} lg={12}>
                <Box>
                  <form onSubmit={formik.handleSubmit}>
                    <Grid container spacing={3}>
                      <Grid
                        item
                        xs={12}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography
                          sx={{
                            color: '#1C252E',
                            fontSize: '16px',
                            fontWeight: '500',
                            lineHeight: '36px',
                            textAlign: 'center',
                          }}
                        >
                          {jsonValue.labels.selectApplicants}
                        </Typography>
                        <Button
                          type="button"
                          sx={{
                            padding: '12px 20px',
                            borderRadius: '8px',
                            background: '#FFF',
                            color: '#1A407D',
                            border: '1px solid #D0D5DD',
                            fontSize: '16px',
                            fontWeight: '600',
                            lineHeight: '24px',
                            textTransform: 'capitalize',
                          }}
                          onClick={handleResetForm}
                        >
                          {jsonValue.buttons.reset}
                        </Button>
                      </Grid>

                      <Grid item xs={12}>
                        <ApplicantMappingRow
                          formik={formik}
                          unitName={unitZero?.unitName}
                          applicantsPath=""
                          applicantKeys={applicantKeys}
                          applicantOptions={applicantOptions}
                          applicants={unitZero?.applicants}
                          canAdd={false}
                          canRemove={false}
                          isDisabled
                          readOnly
                        />
                      </Grid>
                      <>
                        {formik.values?.units?.map((unit, index) => (
                          <Grid key={index} item xs={12}>
                            <ApplicantMappingRow
                              key={index}
                              formik={formik}
                              unitName={unit?.unitName}
                              applicantsPath={`units[${index}].applicants`}
                              applicantKeys={applicantKeys}
                              applicantOptions={applicantOptions}
                              canAdd
                              canRemove
                            />
                          </Grid>
                        ))}
                      </>

                      <Grid
                        item
                        xs={12}
                        display="flex"
                        justifyContent="end"
                        alignItems="center"
                        gap={3}
                        flexDirection={{
                          xs: 'column',
                          sm: 'row',
                        }}
                      >
                        <Button
                          type="button"
                          sx={{
                            width: {
                              xs: '48%',
                              sm: '157px',
                              md: '157px',
                              lg: '157px',
                            },
                            height: '48px',
                            borderRadius: '8px',
                            background: '#1A407D',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: '600',
                            lineHeight: '24px',
                            textTransform: 'capitalize',
                            '&:hover': {
                              backgroundColor: '#092552',
                            },
                          }}
                          onClick={handleNext}
                        >
                          {jsonValue.buttons.submit}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </Box>
              </Grid>
            )}
          </Grid>
        </Stack>
      )}
      <BookingFormDialog
        open={bookingModal}
        onClose={() => setBookingModal(false)}
        title="Applicants Updated"
        content={
          <>
          <Typography sx={{ color: '#1A407D', fontSize: '14px', fontWeight: 700, mb: -2 }}>
            Next Steps
          </Typography>
          <Typography sx={{ fontSize: '14px' }}>
            Add new applicant’s details, review & sign the booking form
          </Typography>
          <LinkActionBar
            title="Customer Booking Form"
            bookingError={false}
            getUrl={getBookingFormUrl}
            handleOpen={() => handleOpen(oppId)}
            handleShare={() => setShowShareDialog(true)}
            copyMessageFn={() => "Customer Booking Form URL copied to clipboard"}
          />
          </>
        }
        action={null}
      />
      <ShareFormDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        opportunityId={oppId || ""}
        formType='booking'
        title="Share"
      />
    </DashboardContent>
  );
}

export default ApplicantMapping;
