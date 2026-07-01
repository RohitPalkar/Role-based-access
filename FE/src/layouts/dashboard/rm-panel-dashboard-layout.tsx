import { useMemo } from 'react';

import { useSignatureBookingGate } from 'src/hooks/use-signature-booking-gate';

import { rmNav, RM_BOOKINGS_NAV_PATH } from 'src/layouts/config-nav-dashboard';

import { SignatureBookingLoginPrompt } from 'src/components/signature-booking-gate/signature-booking-login-prompt';

import { DashboardLayout } from './layout';

// ----------------------------------------------------------------------

type RmPanelDashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export function RmPanelDashboardLayout({ children }: RmPanelDashboardLayoutProps) {
  const { hasSignature } = useSignatureBookingGate();

  const navData = useMemo(
    () =>
      rmNav.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          item.path === RM_BOOKINGS_NAV_PATH ? { ...item, disabled: !hasSignature } : item
        ),
      })),
    [hasSignature]
  );

  return (
    <DashboardLayout navData={navData}>
      {children}
      <SignatureBookingLoginPrompt />
    </DashboardLayout>
  );
}
