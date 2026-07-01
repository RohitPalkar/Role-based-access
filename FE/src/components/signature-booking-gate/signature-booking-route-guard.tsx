import { useState, useEffect } from 'react';

import { useSignatureBookingGate } from 'src/hooks/use-signature-booking-gate';

import { SignatureRequiredDialog } from './signature-required-dialog';

// ----------------------------------------------------------------------

type SignatureBookingRouteGuardProps = Readonly<{
  children: React.ReactNode;
  variant?: 'rm' | 'crm';
}>;

export function SignatureBookingRouteGuard({ children, variant = 'rm' }: SignatureBookingRouteGuardProps) {
  const {
    hasSignature,
    dialogOpen,
    showSignatureRequiredDialog,
    closeSignatureRequiredDialog,
    navigateToProfileSettings,
  } = useSignatureBookingGate();

  const [hasSkipped, setHasSkipped] = useState(false);

  const canAccessContent = hasSignature || (variant === 'crm' && hasSkipped);

  useEffect(() => {
    if (!hasSignature && !hasSkipped) {
      showSignatureRequiredDialog();
    }
  }, [hasSignature, hasSkipped, showSignatureRequiredDialog]);

  const handleUpload = () => {
    navigateToProfileSettings();
    closeSignatureRequiredDialog();
  };

  const handleClose = () => {
    closeSignatureRequiredDialog();
    if (variant === 'crm') {
      setHasSkipped(true);
    }
  };

  if (canAccessContent) {
    return <>{children}</>;
  }

  return (
    <SignatureRequiredDialog
      open={dialogOpen}
      onUpload={handleUpload}
      onClose={handleClose}
      variant={variant}
    />
  );
}
