import { Helmet } from 'react-helmet-async';

import Switch from '@mui/material/Switch';
import InputBase from '@mui/material/InputBase';
import { Box, Grid, Divider, Typography } from '@mui/material';

import { CONFIG } from 'src/config-global';

import { BorderBox } from 'src/components/border-box/BorderBox';
import { FilledButton } from 'src/components/buttons/FilledButton';
import { HeaderWidget } from 'src/components/header-cards/HeaderWidget';

// ----------------------------------------------------------------------

const metadata = { title: `Page three | Dashboard - ${CONFIG.site.name}` };

const headerCardData = [
  { headingName: 'Opportunity ID', value: '15679hh765uyt' },
  { headingName: 'Opportunity Name', value: 'John Doe' },
  { headingName: 'Project', value: 'Purva Atmosphere' },
  { headingName: 'Unit', value: 'ATM/T2/123455' },
];

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 3, mt: 3, textAlign: 'center' }}>
        Post Booking Form
      </Typography>
      <Grid container spacing={3}>
        {headerCardData.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <HeaderWidget headingName={card.headingName} value={card.value} />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mt: 2, borderStyle: 'dashed', borderColor: '#DADADA' }} />
      <BorderBox
        title="Booking Form"
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <FilledButton label="View" width="20%" />
      </BorderBox>

      <BorderBox title="Office Use">
        <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>Booking Scheme</Typography>
        <InputBase
          fullWidth
          placeholder="Enter booking scheme name"
          sx={{
            pl: 1.5,
            height: 40,
            borderRadius: 1,
            border: '1px solid #D0D5DD',
            mt: 1,
          }}
        />

        <Typography sx={{ fontSize: '16px', fontWeight: 600, textAlign: 'center', mt: 2 }}>
          Booking Source
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 2 }}>
          <Box sx={{ display: 'flex' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
              Primary Source &nbsp;
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#00368C' }}>
              Digital Marketing
            </Typography>
          </Box>
          |
          <Box sx={{ display: 'flex' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
              Secondary Source &nbsp;
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#00368C' }}>
              Website
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#212B36' }}>
            Corporate Sales &nbsp;
          </Typography>
          <Switch
            defaultChecked
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

        <Divider sx={{ mt: 2, borderStyle: 'dashed', borderColor: '#DADADA' }} />
      </BorderBox>
    </>
  );
}
