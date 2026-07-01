import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { paths } from 'src/routes/paths';

import { useSignatureBookingGate } from 'src/hooks/use-signature-booking-gate';

import { useAuthContext } from 'src/auth/hooks';

import { SignatureRequiredDialog } from './signature-required-dialog';

// ----------------------------------------------------------------------

const SESSION_PROMPT_KEY = 'rm-signature-prompt-shown';

function isRmBookingPath(pathname: string): boolean {
  return (
    pathname === paths.rm.rmDashboard.root || pathname.startsWith(`${paths.rm.rmDashboard.root}/`)
  );
}

export function SignatureBookingLoginPrompt() {
  const { pathname } = useLocation();
  const { authenticated, loading } = useAuthContext();
  const {
    hasSignature,
    dialogOpen,
    showSignatureRequiredDialog,
    closeSignatureRequiredDialog,
    navigateToProfileSettings,
  } = useSignatureBookingGate();

  useEffect(() => {
    if (loading || !authenticated || hasSignature || isRmBookingPath(pathname)) {
      return;
    }
    if (sessionStorage.getItem(SESSION_PROMPT_KEY)) {
      return;
    }
    showSignatureRequiredDialog();
    sessionStorage.setItem(SESSION_PROMPT_KEY, '1');
  }, [authenticated, hasSignature, loading, pathname, showSignatureRequiredDialog]);

  const handleUpload = () => {
    navigateToProfileSettings();
    closeSignatureRequiredDialog();
  };

  if (hasSignature || isRmBookingPath(pathname)) {
    return null;
  }

  return (
    <SignatureRequiredDialog
      open={dialogOpen}
      onClose={closeSignatureRequiredDialog}
      onUpload={handleUpload}
    />
  );
}
