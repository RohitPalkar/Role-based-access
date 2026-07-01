import { useEffect } from 'react';

import InfoIcon from '@mui/icons-material/Info';
import { Box, Grid, Stack, Tooltip, Divider, IconButton, Typography } from '@mui/material';

import { useParams, useRouter } from 'src/routes/hooks';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { getMasterDataList, getApplicantDetails, getOpportunityDetails } from 'src/redux/actions/rm-panel/dashboard-actions';

import OfficeUse from 'src/components/office-use/OfficeUse';
import { HeaderWidget } from 'src/components/header-cards/HeaderWidget';
import UploadDocuments from 'src/components/upload-documents/UploadDocuments';
// ----------------------------------------------------------------------

export default function PreBookingForm() {
  const dispatch = useAppDispatch();
  const { oppId } = useParams();

  const router = useRouter()
  interface ApplicantDetailsResponse {
    response: any;
    errors: any;
    isCompleted: boolean;
  }
  const { opportunity, preBookingStep } = useAppSelector((state) => state.dashboard);
  const headerCardData = [
    { headingName: 'Opportunity ID', value: opportunity?.data?.OppId ?? '' },
    {
      headingName: 'Opportunity Name',
      value: [opportunity?.data?.Cname, opportunity?.data?.X1st_Applicant_Last_Name]
        .filter(Boolean)
        .join(' ') || ''
    }, { headingName: 'Project', value: opportunity?.data?.ProjectName || '' },
    {
      headingName: 'Unit',
      value: [opportunity?.data?.Project_Name, opportunity?.data?.Block, opportunity?.data?.UnitNo]
        .filter(Boolean)
        .join(' / ') || ''
    },];

  useEffect(() => {
    dispatch(getOpportunityDetails(`/${oppId}`));
    dispatch(getMasterDataList());
    const fetchApplicantDetails = async () => {
      const response = await dispatch(getApplicantDetails(`/${oppId}`));
      const payload = response?.payload as ApplicantDetailsResponse;
      if (payload?.errors?.statusCode !== 404 && payload?.isCompleted !== false) {
        router.push("/");
      }
    };
    fetchApplicantDetails();
  }, [dispatch, oppId, router]);

  return (
    <Stack className="dashboard-page-wrapper">
      <Box className="box-width-p-l-r">
        <Typography
          sx={{
            fontSize: '18px',
            fontWeight: 600,
            mb: 3,
            mt: 3,
            textAlign: 'center',
            lineHeight: '22px',
          }}
        >
          {preBookingStep === 0 ? 'Pre Booking Form' : 'Office use section'}
          {preBookingStep === 0 && (
            <Tooltip
              enterTouchDelay={0}
              title="You can continue uploading documents while the customer fills the booking form. Uploads are allowed until the customer reviews unit details."
            >
              <IconButton sx={{ ml: 1 }}> <InfoIcon /> </IconButton>
            </Tooltip>
          )}
        </Typography>
        <Box className="pre-booking-cards-wrap">
          <Grid container spacing={3}>
            {headerCardData.map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <HeaderWidget headingName={card.headingName} value={card?.value} />
              </Grid>
            ))}
          </Grid>
        </Box>
        <Divider
          sx={{
            width: '100%',
            height: '1px',
            borderColor: '#DADADA',
            borderStyle: 'dashed',
            borderWidth: '1px',
            backgroundColor: 'transparent',
            mt: 3,
            mb: 3,
          }}
        />
        {preBookingStep === 0 && <UploadDocuments />}
        {preBookingStep === 1 && <OfficeUse />}

      </Box>
    </Stack>
  );
}
