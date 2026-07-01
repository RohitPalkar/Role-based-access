import { it, expect, describe, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';

import { defaultSettings } from 'src/components/settings/config-settings';

import IomDetailsCard from './iom-details-card';

Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

const theme = createTheme(defaultSettings);

const renderCard = (props: Partial<React.ComponentProps<typeof IomDetailsCard>> = {}) =>
  render(
    <CssVarsProvider theme={theme}>
      <IomDetailsCard
        iomId="IOM00154"
        status="IOM To Be Created"
        generatedOn="16 May 2026"
        iomDate="16 May 2026"
        createdBy="Darshan Kumar"
        {...props}
      />
    </CssVarsProvider>
  );

describe('IomDetailsCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the status badge by default and not the deviation/pending chips', () => {
    renderCard();
    expect(screen.getByText('IOM To Be Created')).toBeInTheDocument();
    expect(screen.queryByText('Deviation')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Verification')).not.toBeInTheDocument();
  });

  it('renders the Deviation chip when showDeviation is true', () => {
    renderCard({ showDeviation: true });
    expect(screen.getByText('Deviation')).toBeInTheDocument();
    expect(screen.queryByText('IOM To Be Created')).not.toBeInTheDocument();
  });

  it('renders the Pending Verification chip when showPendingVerification is true', () => {
    renderCard({ showPendingVerification: true });
    expect(screen.getByText('Pending Verification')).toBeInTheDocument();
  });

  it('renders both override chips together when both flags are true', () => {
    renderCard({ showDeviation: true, showPendingVerification: true });
    expect(screen.getByText('Deviation')).toBeInTheDocument();
    expect(screen.getByText('Pending Verification')).toBeInTheDocument();
    expect(screen.queryByText('IOM To Be Created')).not.toBeInTheDocument();
  });
});
