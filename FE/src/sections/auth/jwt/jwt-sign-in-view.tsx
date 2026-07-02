import { Box, Stack, Typography, Button, Divider } from '@mui/material';

import { useState } from 'react';

import { LocalSignInView } from './local-sign-in-view';
import { JwtOTPSignInView } from './jwt-otp-sign-in-view';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function JwtSignInView() {
  const [loginMethod, setLoginMethod] = useState<'local' | 'otp'>('local');

  return (
    <Box className="LoginSlider" sx={{ height: '100vh', overflow: 'hidden', display: 'flex' }}>
      {/* Left side - Brand/Slider */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4, background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: 'white' }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
          Puravankara
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 400, mb: 1, textAlign: 'center' }}>
          Enterprise Administration Portal
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.8, textAlign: 'center', maxWidth: 400 }}>
          Secure, scalable, and intelligent access management for your organization.
        </Typography>
      </Box>

      {/* Right side - Login Form */}
      <Box sx={{ width: 500, maxWidth: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4, px: 2, bgcolor: 'background.default' }}>
        <Stack spacing={3} width="100%" maxWidth={440} mx="auto">
          <Typography variant="h4" sx={{ textAlign: 'center', fontWeight: 600 }}>
            Welcome Back
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            Choose your preferred sign-in method
          </Typography>

          {/* Method Tabs */}
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Button
              variant={loginMethod === 'local' ? 'contained' : 'outlined'}
              fullWidth
              onClick={() => setLoginMethod('local')}
              startIcon={<Iconify icon="eva:person-fill" />}
              sx={{ py: 1.5 }}
            >
              Username / Email
            </Button>
            <Button
              variant={loginMethod === 'otp' ? 'contained' : 'outlined'}
              fullWidth
              onClick={() => setLoginMethod('otp')}
              startIcon={<Iconify icon="eva:email-fill" />}
              sx={{ py: 1.5 }}
            >
              OTP (Email)
            </Button>
          </Stack>

          <Divider sx={{ my: 1 }} />

          {/* Login Forms */}
          {loginMethod === 'local' ? (
            <LocalSignInView onSwitchToOTP={() => setLoginMethod('otp')} />
          ) : (
            <JwtOTPSignInView onBackToSignIn={() => setLoginMethod('local')} />
          )}
        </Stack>
      </Box>
    </Box>
  );
}