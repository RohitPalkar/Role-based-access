import { Route, Routes, MemoryRouter } from 'react-router-dom';
import { it, vi, expect, describe, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';

import { ROLES, IomStatus, PointsAdjustmentType } from 'src/utils/constant';

import { createTheme } from 'src/theme/create-theme';

import { defaultSettings } from 'src/components/settings/config-settings';

import IomDetailsView from './iom-details-view';
import { IOM_DETAILS_SAMPLE } from './iom-config';

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 });

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

// ----------------------------- Mocks -----------------------------

const mockDispatch = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) =>
    selector({
      iomManagement: {
        iomDetails: (globalThis as any).__iomDetails,
        detailsLoading: false,
        submitting: false,
        approving: false,
      },
      auth: { user: { role: (globalThis as any).__userRole } },
    }),
}));

vi.mock('src/hooks/use-role-based-permissions', () => ({
  useRoleBasedPermissions: () => ({
    userRole: (globalThis as any).__userRole,
    columns: [],
    filters: [],
    actions: [],
    canCreate: false,
    canExport: false,
    canRefresh: false,
    canViewAll: false,
    useTab: false,
    permissions: {},
    getRowActions: () => [],
  }),
}));

vi.mock('src/redux/actions/common-module/iom-management-actions', () => ({
  fetchIomDetails: Object.assign(() => ({ type: 'iom/fetchIomDetails' }), {
    fulfilled: { match: (_: unknown) => false },
  }),
  approveIom: Object.assign(() => ({ type: 'iom/approveIom' }), {
    fulfilled: { match: (_: unknown) => false },
  }),
  submitIomForApprovalPatch: Object.assign(() => ({ type: 'iom/submitIomForApprovalPatch' }), {
    fulfilled: { match: (_: unknown) => false },
  }),
}));

vi.mock('src/redux/slices/common-module/iom-management-slice', () => ({
  clearIomDetails: () => ({ type: 'iom/clearIomDetails' }),
  __esModule: true,
  default: () => ({}),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard">{children}</div>
  ),
}));

vi.mock('src/components/custom-breadcrumbs', () => ({
  CustomBreadcrumbs: () => null,
}));

vi.mock(
  '../expression-of-interest/components/finance-components/transaction-remark-dialog',
  () => ({
    TransactionRemarksDialog: () => null,
  })
);

// ----------------------------- Helpers -----------------------------

const theme = createTheme(defaultSettings);

const buildPreviewWithDeviation = (iomId: string = '5') => ({
  ...IOM_DETAILS_SAMPLE,
  iom_id: iomId,
  iom_no: 'IOM_20260615_005',
  status: IomStatus.IOM_TO_BE_CREATED,
  payment_details: {
    ...IOM_DETAILS_SAMPLE.payment_details,
    points_adjustment_type: PointsAdjustmentType.OTHER,
    is_deviation: true,
  },
});

function renderView() {
  return render(
    <CssVarsProvider theme={theme}>
      <MemoryRouter initialEntries={[{ pathname: '/crm/iom-management/view/5' }]}>
        <Routes>
          <Route path="/crm/iom-management/view/:id" element={<IomDetailsView />} />
        </Routes>
      </MemoryRouter>
    </CssVarsProvider>
  );
}

// ----------------------------- Tests -----------------------------

describe('IomDetailsView', () => {
  beforeEach(() => {
    mockDispatch.mockReset();
  });

  afterEach(() => {
    cleanup();
    (globalThis as any).__iomDetails = null;
    (globalThis as any).__userRole = null;
  });

  it('renders the Deviation tag when the cached IOM has is_deviation=true', async () => {
    (globalThis as any).__iomDetails = buildPreviewWithDeviation();
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/IOM_20260615_005/)).toBeInTheDocument();
    });
    expect(screen.getByText(/^Deviation$/)).toBeInTheDocument();
    expect(screen.getByText(/Pending Verification/)).toBeInTheDocument();
  });

  it('does not render the Deviation tag when payment_details.is_deviation is false', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      iom_id: '5',
      iom_no: 'IOM_20260615_005',
      status: IomStatus.IOM_TO_BE_CREATED,
      payment_details: {
        ...IOM_DETAILS_SAMPLE.payment_details,
        is_deviation: false,
      },
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/IOM_20260615_005/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/^Deviation$/)).not.toBeInTheDocument();
  });

  it('skips fetchIomDetails when Redux already has the matching IOM', async () => {
    (globalThis as any).__iomDetails = buildPreviewWithDeviation();
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/IOM_20260615_005/)).toBeInTheDocument();
    });

    const dispatchedTypes = mockDispatch.mock.calls.map(([action]) => action?.type);
    expect(dispatchedTypes).not.toContain('iom/fetchIomDetails');
  });

  it('falls back to fetchIomDetails when Redux has no matching IOM', async () => {
    (globalThis as any).__iomDetails = null;
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    await waitFor(() => {
      const dispatchedTypes = mockDispatch.mock.calls.map(([action]) => action?.type);
      expect(dispatchedTypes).toContain('iom/fetchIomDetails');
    });
  });

  it('falls back to fetchIomDetails when the cached IOM is for a different id', async () => {
    (globalThis as any).__iomDetails = buildPreviewWithDeviation('99');
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    await waitFor(() => {
      const dispatchedTypes = mockDispatch.mock.calls.map(([action]) => action?.type);
      expect(dispatchedTypes).toContain('iom/fetchIomDetails');
    });
  });
});
