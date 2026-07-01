import type { BoxProps } from '@mui/material/Box';
import type { Breakpoint } from '@mui/material/styles';

import { useState } from 'react';
import Turnstile from 'react-turnstile';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';
import uiText from 'src/locales/langs/en/common.json';

import { toast } from 'src/components/snackbar';
import { FilledButton } from 'src/components/buttons/FilledButton';

import { JwtOTPSignInView } from 'src/sections/auth/jwt/jwt-otp-sign-in-view';

import puravankaraLogo from '../../assets/images/login-logo.svg';

// ----------------------------------------------------------------------

type SectionProps = BoxProps & {
  title?: string;
  method?: string;
  imgUrl?: string;
  subtitle?: string;
  layoutQuery: Breakpoint;
  methods?: {
    path: string;
    icon: string;
    label: string;
  }[];
};

type SignInMethod = 'sso' | 'otp' | 'selection';

export function Section({
  sx,
  method,
  layoutQuery,
  methods,
  title = 'Manage the job',
  imgUrl = `${CONFIG.site.basePath}/assets/illustrations/illustration-dashboard.webp`,
  subtitle = 'Sign in to your account',
  ...other
}: SectionProps) {
  const theme = useTheme();
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('selection');
  const [captchaToken, setCaptchaToken] = useState('');

  const turnstileEnabled = CONFIG.turnstile.enabled;
  const turnstileSiteKey = CONFIG.turnstile.siteKey;
  /** When Turnstile is off (e.g. dev), SSO/OTP CTAs work without a token */
  const canUseSignInActions = !turnstileEnabled || captchaToken.length > 0;

  const handleCyberArkClick = () => {
    if (!canUseSignInActions) {
      toast.warning(uiText.main.captchaError);
      return;
    }
    const url = `${CONFIG.site.loginUrl}`;
    window.location.href = url;
  };

  const handleOTPClick = () => {
    if (!canUseSignInActions) {
      toast.warning(uiText.main.captchaError);
      return;
    }
    setSignInMethod('otp');
  };

  const handleVerify = (token: string | null) => {
    if (!token) return;
    setCaptchaToken(token);
  };

  const handleBackToSelection = () => {
    setSignInMethod('selection');
  };

  const showTurnstile = turnstileEnabled && Boolean(turnstileSiteKey);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: {
          xs: '100%',
          sm: '100%',
          md: '45%',
          lg: '45%',
          xl: '45%',
        },
        textAlign: 'center',
        //   maxWidth: 480,

        // display: 'none',
        position: 'relative',
        // pt: 'var(--layout-header-desktop-height)',
        [theme.breakpoints.up(layoutQuery)]: {
          // gap: 8,
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
        },
        ...sx,
      }}
      {...other}
      className="loginLeftPanel"
    >
      {/* <Typography variant="h3" sx={{ textAlign: 'center' }}>
          {title}
        </Typography> */}

      {/* Login Logo  */}
      <Box component="div" sx={{ mb: 5 }}>
        <img src={puravankaraLogo} alt="Puravankara" />
      </Box>
      {/* Login Logo  */}

      {signInMethod === 'selection' && (
        <>
          {subtitle && (
            <Typography
              sx={{
                fontSize: '20px',
                fontWeight: '500',
                lineHeight: '30px',
                textAlign: 'center',
                mb: 3,
              }}
            >
              {subtitle}
            </Typography>
          )}

          <Stack spacing={2} sx={{ width: '100%', maxWidth: '360px', mx: 'auto' }}>
            {showTurnstile ? (
              <Turnstile
                sitekey={turnstileSiteKey}
                theme="light"
                onVerify={handleVerify}
                onExpire={() => setCaptchaToken('')}
                onError={() => setCaptchaToken('')}
              />
            ) : null}
            <FilledButton
              height="48px"
              label="Sign In with SSO"
              onClick={handleCyberArkClick}
              width="100%"
            />

            <Box sx={{ position: 'relative', my: 2 }}>
              <Divider sx={{ borderColor: '#E0E0E0' }} />
              <Typography
                variant="body2"
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'white',
                  px: 2,
                  color: 'text.secondary',
                }}
              >
                OR
              </Typography>
            </Box>

            <Button
              variant="outlined"
              onClick={handleOTPClick}
              sx={{
                height: '48px',
                borderColor: '#1A407D',
                color: '#1A407D',
                '&:hover': {
                  borderColor: '#163966',
                  backgroundColor: 'rgba(26, 64, 125, 0.04)',
                },
              }}
            >
              Sign In with OTP
            </Button>
          </Stack>
        </>
      )}

      {signInMethod === 'otp' && (
        <Box sx={{ width: '100%', maxWidth: '400px', mx: 'auto' }}>
          <JwtOTPSignInView onBackToSignIn={handleBackToSelection} />
        </Box>
      )}

      {/* <Box
        component="img"
        alt="Dashboard illustration"
        src={imgUrl}
        sx={{ width: 1, aspectRatio: '4/3', objectFit: 'cover' }}
      /> */}

      {!!methods?.length && method && (
        <Box component="ul" gap={2} display="flex">
          {methods.map((option) => {
            const selected = method === option.label.toLowerCase();

            return (
              <Box
                key={option.label}
                component="li"
                sx={{
                  ...(!selected && {
                    cursor: 'not-allowed',
                    filter: 'grayscale(1)',
                  }),
                }}
              >
                <Tooltip title={option.label} placement="top" enterTouchDelay={0}>
                  <Link
                    component={RouterLink}
                    href={option.path}
                    sx={{
                      ...(!selected && { pointerEvents: 'none' }),
                    }}
                  >
                    <Box
                      component="img"
                      alt={option.label}
                      src={option.icon}
                      sx={{ width: 32, height: 32 }}
                    />
                  </Link>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
