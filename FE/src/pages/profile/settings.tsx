import { Helmet } from 'react-helmet-async';

import { Stack, Typography } from '@mui/material';

import { CONFIG } from 'src/config-global';

import { ProfileSettings } from 'src/sections/profile';

// ----------------------------------------------------------------------

const metadata = { title: `Profile Settings - ${CONFIG.site.name}` };

export default function ProfileSettingsPage() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>
      <Stack sx={{ p: '30px' }}>
        <Typography sx={{ fontSize: '24px', fontWeight: 600, color: '#1C252E', mb: 3 }}>
          Profile Settings
        </Typography>
        <ProfileSettings />
      </Stack>
    </>
  );
}
