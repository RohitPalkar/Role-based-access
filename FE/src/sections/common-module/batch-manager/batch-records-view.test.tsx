import { render, screen } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';

import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';

import { ROLES } from 'src/utils/constant';

import { createTheme } from 'src/theme/create-theme';
import { ROLE_BASED_PERMISSIONS } from 'src/config/role-based-permissions';

import { defaultSettings } from 'src/components/settings/config-settings';

import BatchRecordsView from './batch-records-view';

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

const mockDispatch = vi.fn();

vi.mock('src/hooks/use-redux', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: { batchManager: Record<string, unknown> }) => unknown) =>
    selector({
      batchManager: {
        batchRecordsList: [],
        batchRecordsTotal: 0,
        batchRecordsError: null,
        batchRecordsLoading: false,
      },
    }),
}));

vi.mock('src/hooks/use-role-based-permissions', () => ({
  useRoleBasedPermissions: vi.fn(() => ({
    columns: {
      uniqueReferenceId: { id: 'uniqueReferenceId', label: 'PRID', width: 120, visible: true },
      customerName: { id: 'customerName', label: 'Customer Name', width: 180, visible: true },
      closingRmName: { id: 'closingRmName', label: 'Closing RM', width: 180, visible: true },
      cxStatus: { id: 'cxStatus', label: 'Cx Status', width: 150, visible: true },
    },
    userRole: ROLES.GRE,
    actions: [],
  })),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
  Toaster: () => null,
}));

const theme = createTheme(defaultSettings);

function renderBatchRecordsView() {
  return render(
    <CssVarsProvider theme={theme}>
      <BatchRecordsView />
    </CssVarsProvider>
  );
}

describe('BatchRecordsView', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  // First render is slow (~5s) due to MUI theme + heavy component cold start; raise per-test timeout.
  it(
    'renders View Records heading',
    () => {
      renderBatchRecordsView();
      expect(screen.getByText('View Records')).toBeInTheDocument();
    },
    15000
  );

  it('renders search field with customer name placeholder', () => {
    renderBatchRecordsView();
    expect(screen.getAllByPlaceholderText(/customer name/i)[0]).toBeInTheDocument();
  });

  it('renders table headers from batchViewRecords role columns', () => {
    renderBatchRecordsView();
    const columnHeaders = screen.getAllByRole('columnheader').map((el) => el.textContent);
    expect(columnHeaders).toEqual(
      expect.arrayContaining(['PRID', 'Customer Name', 'Closing RM', 'Cx Status'])
    );
  });

  it('shows empty state when records list is empty and not loading', () => {
    renderBatchRecordsView();
    expect(screen.getAllByText('No data')[0]).toBeInTheDocument();
  });

  it('dispatches fetch action on mount', () => {
    renderBatchRecordsView();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('does not render comment UI', () => {
    renderBatchRecordsView();
    expect(screen.queryByLabelText(/comment/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/comment/i)).not.toBeInTheDocument();
  });
});

describe('ROLE_BASED_PERMISSIONS GRE batchViewRecords', () => {
  it('defines batchViewRecords module with expected column ids', () => {
    const module = ROLE_BASED_PERMISSIONS[ROLES.GRE]?.batchViewRecords;
    expect(module).toBeDefined();
    expect(module.columns).toBeDefined();
    const columnIds = module.columns!.map((col) => col.id);
    expect(columnIds).toEqual([
      'uniqueReferenceId',
      'paidVoucherId',
      'stdEoiId',
      'preEoiId',
      'customerName',
      'sequence',
      'date',
      'startTime',
      'headCount',
      'closingRm',
      'sourcingRm',
      'attendance',
    ]);
    expect(module.actions).toEqual([]);
    expect(module.canCreate).toBe(false);
    expect(module.canExport).toBe(false);
  });
});
