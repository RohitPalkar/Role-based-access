import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useRef, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import { Box, Stack, Button, TextField, Typography, Alert, IconButton, InputAdornment } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { FilledButton } from 'src/components/buttons/FilledButton';

import { useAuthContext } from 'src/auth/hooks';
import { setSession } from 'src/auth/context/jwt/utils';
import { LocalAuthService } from 'src/services/local-auth-service';

import Cookies from 'js-cookie';

// ----------------------------------------------------------------------

export type LocalLoginSchemaType = zod.infer<typeof LocalLoginSchema>;

export const LocalLoginSchema = zod.object({
  usernameOrEmail: zod
    .string()
    .min(1, { message: 'Username or Email is required!' })
    .max(255, { message: 'Username or Email must not exceed 255 characters!' }),
  password: zod
    .string()
    .min(6, { message: 'Password must be at least 6 characters!' })
    .max(50, { message: 'Password must not exceed 50 characters!' }),
});

// ----------------------------------------------------------------------

interface LocalSignInViewProps {
  readonly onSwitchToOTP: () => void;
}

export function LocalSignInView({ onSwitchToOTP }: LocalSignInViewProps) {
  const router = useRouter();
  const { checkUserSession } = useAuthContext();

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isSubmitting = useBoolean();

  // Login form
  const methods = useForm<LocalLoginSchemaType>({
    resolver: zodResolver(LocalLoginSchema),
    defaultValues: { usernameOrEmail: '', password: '' },
  });

  // Handle login submission
  const onSubmit = methods.handleSubmit(async (data, event) => {
    event?.preventDefault();

    try {
      isSubmitting.onTrue();
      setLoginError(null);

      const response = await LocalAuthService.login({
        usernameOrEmail: data.usernameOrEmail,
        password: data.password,
      });

      // Extract tokens from response
      const accessToken = response?.data?.accessToken;
      const refreshToken = response?.data?.refreshToken;
      const userRole = response?.data?.userRole;

      if (!accessToken) {
        throw new Error('Authentication token not received');
      }

      // Set session with tokens
      await setSession(accessToken);

      // Store refresh token in cookies if available
      if (refreshToken) {
        Cookies.set('refreshToken', refreshToken);
        localStorage.setItem('refreshToken', refreshToken);
      }

      // Fetch user details and update auth context
      await checkUserSession?.();

      // Get user role for routing
      setTimeout(() => {
        const redirectPath = getRedirectPath(userRole || '');
        toast.success('Login successful!');
        router.push(redirectPath);
      }, 100);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      isSubmitting.onFalse();
    }
  });

  // Role-based routing function
  const getRedirectPath = (userRole: string) => {
    switch (userRole?.toLowerCase()) {
      case 'super admin':
        return paths.superAdmin.root;
      case 'admin':
        return paths.admin.root;
      case 'finance admin':
        return paths.financeAdmin.root;
      case 'rm':
        return paths.rm.root;
      case 'gre':
        return paths.gre.root;
      case 'crm':
        return paths.crm.dashboard.root;
      case 'mis':
        return paths.mis.root;
      case 'sales tl':
        return paths.salesTL.root;
      case 'sales rsh':
        return paths.salesRSH.root;
      case 'sales bh':
        return paths.salesBH.root;
      case 'project head':
        return paths.projectHead.root;
      case 'bis':
        return paths.bis.root;
      case 'crm tl':
        return paths.crmTl.root;
      case 'crm head':
        return paths.crmHead.root;
      case 'finance user':
        return paths.financeUser.root;
      case 'finance head':
        return paths.financeHead.root;
      case 'loyalty':
        return paths.loyalty.root;
      default:
        return paths.rm.root; // Default fallback
    }
  };

  // Toggle password visibility
  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  // Render login form
  const renderLoginForm = (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ textAlign: 'center', mb: 1 }}>
          Sign in to your account
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Use your username/email and password
        </Typography>
      </Stack>

      {loginError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loginError}
        </Alert>
      )}

      <Field.Text
        name="usernameOrEmail"
        label="Username or Email"
        placeholder="Enter your username or email"
        InputLabelProps={{ shrink: true }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:person-fill" sx={{ width: 20, height: 20, mr: 1, color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
      />

      <Field.Text
        name="password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Enter your password"
        InputLabelProps={{ shrink: true }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:lock-fill" sx={{ width: 20, height: 20, mr: 1, color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleTogglePassword}
                edge="end"
                sx={{ p: 0 }}
                aria-label="Toggle password visibility"
              >
                <Iconify
                  icon={showPassword ? 'eva:eye-off-fill' : 'eva:eye-fill'}
                  sx={{ width: 20, height: 20, color: 'text.secondary' }}
                />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <FilledButton
        width="100%"
        height="48px"
        label="Sign In"
        type="submit"
        isLoading={isSubmitting.value}
      />

      <Button
        onClick={onSwitchToOTP}
        startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
        sx={{
          mt: 1,
          color: 'text.secondary',
          textTransform: 'none',
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: 'transparent',
            color: 'primary.main',
          },
        }}
      >
        Use OTP instead
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 400, mx: 'auto' }}>
      <Form methods={methods} onSubmit={onSubmit}>
        {renderLoginForm}
      </Form>
    </Box>
  );
}