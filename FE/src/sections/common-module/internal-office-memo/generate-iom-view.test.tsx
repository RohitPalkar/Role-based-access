import userEvent from '@testing-library/user-event';
import { it, vi, expect, describe, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { Route, Routes, useLocation, MemoryRouter } from 'react-router-dom';

import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';

import { ROLES, IomStatus, PointsAdjustmentType } from 'src/utils/constant';

import { createTheme } from 'src/theme/create-theme';

import { defaultSettings } from 'src/components/settings/config-settings';

import { IOM_DETAILS_SAMPLE } from './iom-config';
import GenerateIomView from './generate-iom-view';

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
const fetchedThunk = { type: 'iom/fetchIomDetails' };
const submitThunk = { type: 'iom/submitIomForApproval' };
const submitFulfilledType = 'iom/submitIomForApproval/fulfilled';

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) =>
    selector({
      iomManagement: {
        iomDetails: (globalThis as any).__iomDetails,
        detailsLoading: false,
        submitting: false,
      },
      auth: { user: { role: (globalThis as any).__userRole } },
      common: { iomDropdowns: [] },
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

vi.mock('src/redux/actions/admin/common-actions', () => ({
  fetchIomDropdowns: () => ({ type: 'common/fetchIomDropdowns' }),
}));

vi.mock('src/redux/actions/common-module/iom-management-actions', () => ({
  fetchIomDetails: Object.assign(() => fetchedThunk, {
    fulfilled: { match: (_: unknown) => false },
  }),
  submitIomForApproval: Object.assign((payload: unknown) => ({ ...submitThunk, payload }), {
    fulfilled: {
      match: (action: any) => action?.type === submitFulfilledType,
    },
  }),
  deleteIomApprovalProof: () => ({ type: 'iom/deleteApprovalProof' }),
}));

vi.mock('src/redux/slices/common-module/iom-management-slice', () => ({
  clearIomDetails: () => ({ type: 'iom/clearIomDetails' }),
  setIomDetailsFromPreview: (payload: unknown) => ({
    type: 'iom/setIomDetailsFromPreview',
    payload,
  }),
  __esModule: true,
  default: () => ({}),
}));

vi.mock('src/redux/actions/rm-panel/upload-actions', () => ({
  deleteImage: () => ({ type: 'deleteImage' }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock('src/components/dropzone/NewDropzone', () => ({
  __esModule: true,
  default: () => <div data-testid="approval-proof-dropzone" />,
}));

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard">{children}</div>
  ),
}));

vi.mock('src/components/custom-breadcrumbs', () => ({
  CustomBreadcrumbs: ({ heading }: { heading: string }) => <h1>{heading}</h1>,
}));

vi.mock(
  '../expression-of-interest/components/finance-components/transaction-remark-dialog',
  () => ({
    TransactionRemarksDialog: () => null,
  })
);

// ----------------------------- Helpers -----------------------------

const theme = createTheme(defaultSettings);

const LocationDisplay = () => {
  const location = useLocation();
  return (
    <>
      <div data-testid="location-pathname">{location.pathname}</div>
      <div data-testid="location-state">{JSON.stringify(location.state)}</div>
    </>
  );
};

function renderView({ path = '/crm/iom-management/generate-iom/IOM00154' } = {}) {
  return render(
    <CssVarsProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/crm/iom-management/generate-iom/:id" element={<GenerateIomView />} />
          <Route path="/crm-tl/iom-management/verify-iom/:id" element={<GenerateIomView />} />
          <Route
            path="/crm/iom-management/view/:id"
            element={<div data-testid="view-iom-route">View IOM Page</div>}
          />
          <Route
            path="/crm/iom-management"
            element={<div data-testid="iom-listing-route">Listing</div>}
          />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </CssVarsProvider>
  );
}

describe('GenerateIomView', () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockDispatch.mockImplementation(() => Promise.resolve({ type: submitFulfilledType }));
  });

  afterEach(() => {
    cleanup();
    (globalThis as any).__iomDetails = null;
    (globalThis as any).__userRole = null;
  });

  it('renders Save Draft, Back, and Preview CTAs (without Cancel IOM) when CRM views an editable IOM', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_TO_BE_CREATED,
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel iom/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit for approval/i })).not.toBeInTheDocument();
  });

  it.each([
    ['CRM_HEAD_APPROVAL_PENDING', IomStatus.CRM_HEAD_APPROVAL_PENDING],
  ])('shows only Cancel IOM CTA for CRM when status is %s', async (_label, status) => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status,
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel iom/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument();
  });

  it('hides Cancel IOM CTA for non-CRM users even when status is cancellable', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE
    };
    (globalThis as any).__userRole = ROLES.CRM_TL;

    renderView({ path: '/crm-tl/iom-management/verify-iom/IOM00154' });

    await waitFor(() => {
      expect(screen.getByText(/Verify IOM/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /cancel iom/i })).not.toBeInTheDocument();
  });

  it('hides Cancel IOM CTA for CRM when status is not cancellable', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_CLOSED,
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Generate IOM/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /cancel iom/i })).not.toBeInTheDocument();
  });

  it('hides edit CTAs for non-CRM (Verify mode)', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_TO_BE_CREATED,
    };
    (globalThis as any).__userRole = ROLES.CRM_TL;

    renderView({ path: '/crm-tl/iom-management/verify-iom/IOM00154' });

    await waitFor(() => {
      expect(screen.getByText(/Verify IOM/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument();
  });

  it('dispatches submitIomForApproval with action draft on Save Draft click', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_TO_BE_CREATED,
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    const user = userEvent.setup();
    const saveDraftBtn = await screen.findByRole('button', { name: /save draft/i });
    await user.click(saveDraftBtn);

    await waitFor(() => {
      const draftCall = mockDispatch.mock.calls.find(
        ([action]) => action?.type === submitThunk.type
      );
      expect(draftCall).toBeTruthy();
      expect(draftCall?.[0]?.payload?.action).toBe('draft');
      expect(draftCall?.[0]?.payload?.deviation).toBe(false);
    });
  });

  it('seeds Redux with the preview snapshot and navigates to View IOM on Preview click', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_TO_BE_CREATED,
      iom_id: 'IOM00154',
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();
    const user = userEvent.setup();

    const previewBtn = await screen.findByRole('button', { name: /preview/i });
    await user.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByTestId('location-pathname').textContent).toBe(
        '/crm/iom-management/view/IOM00154'
      );
    });
    expect(screen.getByTestId('view-iom-route')).toBeInTheDocument();

    const previewDispatch = mockDispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action?.type === 'iom/setIomDetailsFromPreview');
    expect(previewDispatch).toBeTruthy();
    expect(previewDispatch?.payload?.iom_id).toBe('IOM00154');
    expect(previewDispatch?.payload?.payment_details?.basic_sale_price).toBe(
      IOM_DETAILS_SAMPLE.payment_details.basic_sale_price
    );
  });

  it('disables Save Draft and Preview when an editable Payment Details field is empty', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_TO_BE_CREATED,
      payment_details: {
        ...IOM_DETAILS_SAMPLE.payment_details,
        basic_sale_price: 0,
      },
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    const user = userEvent.setup();
    const basicSalePriceInput = await screen.findByLabelText(/basic sale price/i);
    await user.clear(basicSalePriceInput);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save draft/i })).toBeDisabled();
    });
    expect(screen.getByRole('button', { name: /preview/i })).toBeDisabled();
  });

  it('navigates to IOM listing on Back click', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_TO_BE_CREATED,
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();
    const user = userEvent.setup();

    const backBtn = await screen.findByRole('button', { name: /^back$/i });
    await user.click(backBtn);

    await waitFor(() => {
      expect(screen.getByTestId('location-pathname').textContent).toBe('/crm/iom-management');
    });
  });

  it('shows Business Exception card only when adjustment type is not 1:1', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_TO_BE_CREATED,
      payment_details: {
        ...IOM_DETAILS_SAMPLE.payment_details,
        points_adjustment_type: PointsAdjustmentType.TWO_ZERO,
        pts_to_referer: 2,
        pts_to_referee: 0,
      },
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Business Exception/i)).toBeInTheDocument();
    });
  });

  it('forwards is_deviation=true in the Redux preview snapshot when Deviation is toggled before Preview', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_TO_BE_CREATED,
      iom_id: 'IOM00154',
      payment_details: {
        ...IOM_DETAILS_SAMPLE.payment_details,
        points_adjustment_type: PointsAdjustmentType.OTHER,
        pts_to_referer: 1,
        pts_to_referee: 1,
        approval_proof_url: 'https://example.com/proof.pdf',
      },
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();
    const user = userEvent.setup();

    const deviationCheckbox = await screen.findByRole('checkbox', {
      name: /Brokerage adjustment other than loyalty points/i,
    });
    await user.click(deviationCheckbox);

    const previewBtn = await screen.findByRole('button', { name: /preview/i });
    await user.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByTestId('view-iom-route')).toBeInTheDocument();
    });
    const previewDispatch = mockDispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action?.type === 'iom/setIomDetailsFromPreview');
    expect(previewDispatch?.payload?.payment_details?.is_deviation).toBe(true);
  });

  it('renders the Approval Proof section when the view API returns an existing proof and no edit triggers are active', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_TO_BE_CREATED,
      payment_details: {
        ...IOM_DETAILS_SAMPLE.payment_details,
        points_adjustment_type: PointsAdjustmentType.ONE_ONE,
        is_basic_sale_price_edited: false,
        is_brokerage_edited: false,
        is_points_adjustment_edited: false,
        approval_proof_url: 'documents/43646hero_endframe__.jpeg',
      },
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    await waitFor(() => {
      expect(screen.getByTestId('approval-proof-dropzone')).toBeInTheDocument();
    });
  });

  it('shows the Deviation checkbox and hides the four computed fields when checked (Other type)', async () => {
    (globalThis as any).__iomDetails = {
      ...IOM_DETAILS_SAMPLE,
      status: IomStatus.IOM_TO_BE_CREATED,
      payment_details: {
        ...IOM_DETAILS_SAMPLE.payment_details,
        points_adjustment_type: PointsAdjustmentType.OTHER,
        pts_to_referer: 1,
        pts_to_referee: 1,
        approval_proof_url: 'https://example.com/proof.pdf',
      },
    };
    (globalThis as any).__userRole = ROLES.CRM;

    renderView();

    const deviationCheckbox = await screen.findByRole('checkbox', {
      name: /Brokerage adjustment other than loyalty points/i,
    });
    expect(deviationCheckbox).toBeInTheDocument();
    expect(screen.getByLabelText(/Points Referrer Amount/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(deviationCheckbox);

    await waitFor(() => {
      expect(screen.queryByLabelText(/Points Referrer Amount/i)).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/Points Referee Amount/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Points to Referrer/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Points to Referee/i)).not.toBeInTheDocument();
  });
});
