import { z } from 'zod';
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, Controller } from 'react-hook-form';

import { Box, Card, Grid, Stack, Button, TextField, Typography } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useAppDispatch } from 'src/hooks/use-redux';

import axios from 'src/utils/axios';
import { decryptText } from 'src/utils/encryption';
import { getRoleSignatureSectionTitle } from 'src/utils/profile-settings-path';
import {
  updateSignatureImage,
  deleteSignatureImage,
  uploadAndUpdateSignature,
} from 'src/utils/signature-utils';

import { route } from 'src/services/apiRoutes';

import { toast } from 'src/components/snackbar';
import { Form } from 'src/components/hook-form';
import Dropzone from 'src/components/dropzone/Dropzone';

import { STORAGE_KEY } from 'src/auth/context/jwt';
import { useMockedUser, useAuthContext } from 'src/auth/hooks';

const borderBottomStyle = {
  borderBottom: '1px dashed #DADADA',
  paddingBottom: '20px',
};

const profileFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  group: z.string().optional(),
  signature: z.any().optional(),
});

type ProfileFormTypes = z.infer<typeof profileFormSchema>;

const Section = ({
  title,
  fields,
  control,
  errors,
  disabled = false,
}: {
  title: string;
  fields: { name: keyof ProfileFormTypes; label: string }[];
  control: any;
  errors: any;
  disabled?: boolean;
}) => (
  <Box mb={3} sx={borderBottomStyle}>
    <Typography variant="h6">{title}</Typography>
    <Grid container spacing={3} mt={2}>
      {fields.map(({ name, label }) => (
        <Grid key={name} item xs={12} sm={6} md={6} lg={6} xl={6}>
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={label}
                fullWidth
                disabled
                error={!!errors[name]}
                helperText={errors[name]?.message}
                autoComplete="off"
              />
            )}
          />
        </Grid>
      ))}
    </Grid>
  </Box>
);

const ProfileSettings: React.FC = () => {
  const { user } = useMockedUser();
  const { checkUserSession } = useAuthContext();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const refreshAuthAfterSignatureChange = async () => {
    await checkUserSession?.();
  };

  const [signature, setSignature] = useState<File | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string>('');
  const [pendingSignatureUpdate, setPendingSignatureUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const methods = useForm<ProfileFormTypes>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      role: '',
      group: '',
      signature: null,
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    setError,
    clearErrors,
  } = methods;

  const currentRole = useWatch({ control, name: 'role' });
  const signatureSectionTitle = getRoleSignatureSectionTitle(currentRole || user?.role);

  // Function to fetch user profile details
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem(STORAGE_KEY);
      if (!accessToken) {
        toast.error('No access token found');
        return;
      }

      const response = await axios.get(route.USERDETAIL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const decrypted = await decryptText(response?.data?.response?.data);

      const userData = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
      if (userData) {
        reset({
          name: userData.name || '',
          email: userData.email || '',
          role: userData.role || '',
          group: userData.group || '',
          signature: userData.signatureImage || null,
        });

        setSignatureUrl(userData.signatureImage || '');
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      toast.error(error?.response?.data?.message || 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always fetch fresh user profile data on component mount/page refresh
    fetchUserProfile();

    return () => {
      reset({ name: '', email: '', role: '', group: '', signature: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  useEffect(() => {
    // Also update form when user data changes from context
    if (user) {
      reset({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        group: user.group || '',
        signature: (user as any).signatureImage || null,
      });

      setSignatureUrl((user as any).signatureImage || '');
    }
  }, [user, reset]);

  // Handle signature upload (triggered when user uploads a new signature image)
  const handleSignatureUpload = async (fieldName: string, file: File) => {
    // Clear any existing signature errors
    clearErrors('signature');

    // Option 1: Upload and update signature immediately
    await uploadAndUpdateSignature({
      file,
      userId: user?.userId,
      dispatch,
      onSuccess: async (signatureImagePath) => {
        setSignature(file);
        setValue('signature', file);
        setSignatureUrl(signatureImagePath);
        setPendingSignatureUpdate(null);
        clearErrors('signature');
        await refreshAuthAfterSignatureChange();
        toast.success('Signature uploaded and saved successfully');
      },
      onError: (error) => {
        toast.error(error?.message || 'Failed to upload signature');
      },
    });
  };

  // Handle signature update (triggered when user clicks save/update button)
  const handleSignatureUpdate = async (signatureImagePath: string) =>
    updateSignatureImage({
      signatureImagePath,
      dispatch,
      onSuccess: async () => {
        setPendingSignatureUpdate(null);
        await refreshAuthAfterSignatureChange();
      },
      onError: (error) => {
        toast.error(error?.message || 'Failed to update signature');
      },
    });

  const handleSignatureDelete = async (fieldName: string, file: File, id: any) => {
    await deleteSignatureImage({
      dispatch,
      onSuccess: async () => {
        setSignature(null);
        setValue('signature', null);
        setSignatureUrl('');
        setPendingSignatureUpdate(null);
        setError('signature', {
          type: 'manual',
          message: 'Signature is required',
        });
        await refreshAuthAfterSignatureChange();
        toast.success('Signature removed successfully');
      },
      onError: (error) => {
        toast.error(error?.message || 'Failed to remove signature');
      },
    });
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Check if signature is required and present
      if (!data.signature && !signatureUrl) {
        setError('signature', {
          type: 'manual',
          message: 'Signature is required',
        });
        toast.error('Signature is required');
        return;
      }

      // Clear any signature errors if validation passes
      clearErrors('signature');

      // Handle pending signature update if there is one
      if (pendingSignatureUpdate) {
        const signatureUpdateSuccess = await handleSignatureUpdate(
          pendingSignatureUpdate
        );

        if (!signatureUpdateSuccess) {
          return;
        }
      }

      toast.success('Profile settings saved successfully');

      // Navigate back after successful save
      router.back();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save profile settings');
    }
  });

  const handleCancel = () => {
    router.back(); // Go back to previous page
  };

  return (
    <Card sx={{ padding: '30px' }}>
      <Form methods={methods} onSubmit={onSubmit}>
        {/* Basic Information Section */}
        <Section
          title="Profile Settings"
          fields={[
            { name: 'name', label: 'Full Name' },
            { name: 'email', label: 'Email Address' },
            { name: 'role', label: 'Role' },
            { name: 'group', label: 'Group' },
          ]}
          control={control}
          errors={errors}
          disabled={false}
        />

        {/* Signature Upload Section */}
        <Box mb={3} sx={borderBottomStyle}>
          <Stack direction="row" alignItems="center" mb={2}>
            <Typography variant="h6">{signatureSectionTitle}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              (Uploaded signature will be placed on the Cost Sheet and Office Use section)
            </Typography>
          </Stack>

          <Grid container>
            <Dropzone
              name="signature"
              file
              label="Signature"
              required
              title="Upload Signature"
              fieldName="signature"
              fileValue={signature}
              handleupload={handleSignatureUpload}
              handledelete={handleSignatureDelete}
              path={signatureUrl}
              id={signatureUrl}
              error={
                typeof errors.signature?.message === 'string' ? errors.signature.message : undefined
              }
              touched={!!errors.signature}
              documentType="image"
              action={<Button variant="contained">Yes</Button>}
            />
          </Grid>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="inherit" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="primaryBtn" sx={{ color: '#fff' }} disabled={loading}>
            {loading ? 'Loading...' : 'Save'}
          </Button>
        </Box>
      </Form>
    </Card>
  );
};

export default ProfileSettings;
