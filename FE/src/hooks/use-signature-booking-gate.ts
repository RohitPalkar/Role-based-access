import { useState, useCallback } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { useAppSelector } from 'src/hooks/use-redux';

import { isSignaturePresent } from 'src/utils/signature-booking';
import { getProfileSettingsPath } from 'src/utils/profile-settings-path';

// ----------------------------------------------------------------------

export function useSignatureBookingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasSignature = isSignaturePresent(user?.signatureImage);

  const showSignatureRequiredDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const closeSignatureRequiredDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const navigateToProfileSettings = useCallback(() => {
    const settingsPath = getProfileSettingsPath(pathname) ?? paths.profile.settings;
    router.push(settingsPath);
  }, [router, pathname]);

  return {
    hasSignature,
    dialogOpen,
    showSignatureRequiredDialog,
    closeSignatureRequiredDialog,
    navigateToProfileSettings,
  };
}
