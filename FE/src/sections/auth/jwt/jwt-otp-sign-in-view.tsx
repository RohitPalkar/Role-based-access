import { z as zod } from 'zod';
import Cookies from 'js-cookie';
import { useForm } from 'react-hook-form';
import { useRef, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import { Box, Stack, Button, TextField, Typography } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';

import { ROLES } from 'src/utils/constant';

import { OTPService } from 'src/services/otp-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { FilledButton } from 'src/components/buttons/FilledButton';

import { useAuthContext } from 'src/auth/hooks';
import { setSession } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type EmailSchemaType = zod.infer<typeof EmailSchema>;
export type OTPSchemaType = zod.infer<typeof OTPSchema>;

export const EmailSchema = zod.object({
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
});

export const OTPSchema = zod.object({
  digit1: zod.string().min(1, 'Required').max(1, 'Only 1 digit'),
  digit2: zod.string().min(1, 'Required').max(1, 'Only 1 digit'),
  digit3: zod.string().min(1, 'Required').max(1, 'Only 1 digit'),
  digit4: zod.string().min(1, 'Required').max(1, 'Only 1 digit'),
  digit5: zod.string().min(1, 'Required').max(1, 'Only 1 digit'),
  digit6: zod.string().min(1, 'Required').max(1, 'Only 1 digit'),
});

// ----------------------------------------------------------------------

type OTPSignInStep = 'email' | 'otp';

interface JwtOTPSignInViewProps {
  readonly onBackToSignIn: () => void;
}

export function JwtOTPSignInView({ onBackToSignIn }: JwtOTPSignInViewProps) {
  const router = useRouter();
  const { checkUserSession } = useAuthContext();

  const [currentStep, setCurrentStep] = useState<OTPSignInStep>('email');
  const [userEmail, setUserEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [otpError, setOtpError] = useState(false);

  const isSubmitting = useBoolean();

  // Email form
  const emailMethods = useForm<EmailSchemaType>({
    resolver: zodResolver(EmailSchema),
    defaultValues: { email: '' },
  });

  // OTP form
  const otpMethods = useForm<OTPSchemaType>({
    resolver: zodResolver(OTPSchema),
    defaultValues: {
      digit1: '',
      digit2: '',
      digit3: '',
      digit4: '',
      digit5: '',
      digit6: '',
    },
  });

  // OTP input refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer effect for OTP resend
  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && currentStep === 'otp') {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timeLeft, currentStep]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Send OTP to email
  const sendOTP = async (email: string) => OTPService.sendOTP({ email });

  // Resend OTP
  const resendOTP = async (email: string) => OTPService.resendOTP({ email });

  // Verify OTP
  const verifyOTP = async (email: string, otp: string) => OTPService.verifyOTP({ email, otp });

  // Role-based routing function
  const getRedirectPath = (userRole: string) => {
    switch (userRole?.toLowerCase()) {
      case ROLES.SuperAdmin.toLowerCase():
        return paths.superAdmin.root;
      case ROLES.Admin.toLowerCase():
        return paths.admin.root;
      case ROLES.FinanceAdmin.toLowerCase():
        return paths.financeAdmin.root;
      case ROLES.RM.toLowerCase():
        return paths.rm.root;
      case ROLES.GRE.toLowerCase():
        return paths.gre.root;
      case ROLES.CRM.toLowerCase():
        return paths.crm.dashboard.root;
      case ROLES.MIS.toLowerCase():
        return paths.mis.root;
      case ROLES.SALES_TL.toLowerCase():
        return paths.salesTL.root;
      case ROLES.SALES_RSH.toLowerCase():
        return paths.salesRSH.root;
      case ROLES.SALES_BH.toLowerCase():
        return paths.salesBH.root;
      case ROLES.PROJECT_HEAD.toLowerCase():
        return paths.projectHead.root;
      case ROLES.BIS.toLowerCase():
        return paths.bis.root;
      case ROLES.CRM_TL.toLowerCase():
        return paths.crmTl.root;
      case ROLES.CRM_HEAD.toLowerCase():
        return paths.crmHead.root;
      case ROLES.FINANCE_USER.toLowerCase():
        return paths.financeUser.root;
      case ROLES.FINANCE_HEAD.toLowerCase():
        return paths.financeHead.root;
      case ROLES.LOYALTY.toLowerCase():
        return paths.loyalty.root;
      default:
        return paths.rm.root; // Default fallback
    }
  };

  // Handle email submission
  const onEmailSubmit = emailMethods.handleSubmit(async (data, event) => {
    event?.preventDefault();

    try {
      isSubmitting.onTrue();

      const response = await sendOTP(data.email);

      setUserEmail(data.email);
      setCurrentStep('otp');
      setTimeLeft(60); // 1 minute timer
      setCanResend(false);
      toast.success(response?.response?.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      isSubmitting.onFalse();
    }
  });

  // Handle OTP submission
  const handleOTPFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const formData = otpMethods.getValues();

    try {
      isSubmitting.onTrue();
      setOtpError(false); // Clear any previous error state

      const otp = `${formData.digit1}${formData.digit2}${formData.digit3}${formData.digit4}${formData.digit5}${formData.digit6}`;

      // Validate OTP is complete
      if (otp.length !== 6) {
        toast.error('Please enter complete OTP');
        return;
      }

      // Step 1: Verify OTP and get token
      const verifyResponse = await verifyOTP(userEmail, otp);
      // Step 2: Extract tokens from response
      const accessToken = verifyResponse?.response?.data?.accessToken;

      const refreshToken = verifyResponse?.response?.data?.refreshToken;

      if (!accessToken) {
        throw new Error('Authentication token not received');
      }

      // Step 3: Set session with tokens
      await setSession(accessToken);

      // Store refresh token in cookies if available
      if (refreshToken) {
        Cookies.set('refreshToken', refreshToken); // 7 days
        localStorage.setItem('refreshToken', refreshToken);
      }

      // Step 4: Fetch user details and update auth context
      await checkUserSession?.();

      // Step 5: Get user role for routing (wait a bit for context to update)
      setTimeout(() => {
        const userRole = verifyResponse?.response?.data?.userRole || '';

        const redirectPath = getRedirectPath(userRole);

        toast.success('Login successful!');
        router.push(redirectPath);
      }, 100);
    } catch (error) {
      setOtpError(true);
      otpMethods.reset({
        digit1: '',
        digit2: '',
        digit3: '',
        digit4: '',
        digit5: '',
        digit6: '',
      });

      // Focus on first OTP input
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);

      toast.error(error instanceof Error ? error.message : 'Invalid OTP');
    } finally {
      isSubmitting.onFalse();
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    try {
      await resendOTP(userEmail);
      setTimeLeft(60);
      setCanResend(false);
      setOtpError(false); // Clear error state
      otpMethods.reset();
      toast.success('OTP resent successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend OTP');
    }
  };

  // Handle OTP input change
  const handleOTPChange = (index: number, value: string) => {
    // Only allow numeric input
    if (!/^\d*$/.test(value) || value.length > 1) return;

    const fieldName = `digit${index + 1}` as keyof OTPSchemaType;
    otpMethods.setValue(fieldName, value);

    // Auto focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP input keydown
  const handleOTPKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (
      event.key === 'Backspace' &&
      !otpMethods.getValues(`digit${index + 1}` as keyof OTPSchemaType) &&
      index > 0
    ) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e: React.ClipboardEvent<HTMLDivElement>, startIndex: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.split('').slice(0, 6);
    digits.forEach((digit, i) => {
      const index = startIndex + i;
      if (index < 6) {
        const key = `digit${index + 1}` as keyof OTPSchemaType;
        otpMethods.setValue(key, digit);
        if (otpRefs.current[index]) {
          otpRefs.current[index].value = digit;
        }
      }
    });

    const nextIndex = startIndex + digits.length;
    if (nextIndex < 6 && otpRefs.current[nextIndex]) {
      otpRefs.current[nextIndex].focus();
    }
  };

  // Render email step
  const renderEmailStep = (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ textAlign: 'center', mb: 1 }}>
          Sign in to your account{' '}
        </Typography>
      </Stack>

      <Field.Text
        name="email"
        label="Email Address"
        placeholder="Enter Your Email Address"
        InputLabelProps={{ shrink: true }}
      />

      <FilledButton
        width="100%"
        height="48px"
        label="Send OTP"
        type="submit"
        isLoading={isSubmitting.value}
      />

      <Button
        onClick={onBackToSignIn}
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
        Return to sign in
      </Button>
    </Stack>
  );

  // Render OTP input blocks
  const renderOTPInputs = () => (
    <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 1 }}>
      {Array.from({ length: 6 }, (_, index) => (
        <TextField
          key={index}
          // eslint-disable-next-line no-return-assign
          inputRef={(el) => (otpRefs.current[index] = el)}
          value={otpMethods.watch(`digit${index + 1}` as keyof OTPSchemaType) || ''}
          onChange={(e) => {
            handleOTPChange(index, e.target.value);
            if (otpError) {
              setOtpError(false);
            }
          }}
          onKeyDown={(e) => handleOTPKeyDown(index, e)}
          onPaste={(e) => handleOTPPaste(e, index)}
          error={otpError}
          inputProps={{
            maxLength: 1,
            style: {
              textAlign: 'center',
              fontSize: '20px', // or 18px
              padding: '16px 0',
            },
          }}
          sx={{
            width: '60px',
            height: '60px',
            '& input': {
              textAlign: 'center',
              fontSize: '20px', // or 18px
              padding: '16px 0',
            },
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              ...(otpError && {
                borderColor: 'error.main',
                '&:hover': {
                  borderColor: 'error.main',
                },
                '&.Mui-focused': {
                  borderColor: 'error.main',
                },
              }),
            },
          }}
          variant="outlined"
        />
      ))}
    </Stack>
  );

  // Render OTP step
  const renderOTPStep = (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ textAlign: 'center', mb: 1 }}>
          Enter Verification OTP
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          We&apos;ve sent a 6-digit OTP to {userEmail}
        </Typography>
      </Stack>

      {renderOTPInputs()}
      <FilledButton
        width="100%"
        height="48px"
        label="Verify OTP"
        type="submit"
        isLoading={isSubmitting.value}
      />

      <Stack direction="row" justifyContent="center" alignItems="center" sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Don’t have a OTP?{' '}
          {canResend ? (
            <Button onClick={handleResendOTP} sx={{ minWidth: 0, cursor: 'pointer' }}>
              <Typography variant="body2" color="primary.main" fontWeight="medium">
                Resend OTP
              </Typography>
            </Button>
          ) : (
            <Typography variant="body2" color="text.disabled" component="span">
              Resend in {formatTime(timeLeft)}
            </Typography>
          )}
        </Typography>
      </Stack>

      <Button
        onClick={() => {
          setCurrentStep('email');
          otpMethods.reset(); // Optional: Reset OTP fields
        }}
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
        disabled={!canResend}
      >
        Return to sign in
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 400, mx: 'auto' }}>
      {currentStep === 'email' ? (
        <Form methods={emailMethods} onSubmit={onEmailSubmit}>
          {renderEmailStep}
        </Form>
      ) : (
        <form onSubmit={handleOTPFormSubmit} noValidate>
          {renderOTPStep}
        </form>
      )}
    </Box>
  );
}
