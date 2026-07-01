/* eslint-disable react-hooks/exhaustive-deps */
// ExpressionOfInterest.tsx
import type { RootState, AppDispatch } from 'src/redux/store';
import type { ColumnDefinition} from 'src/hooks/use-column-manager';
import type {
  EOILeadStatus,
  EOIFinanceStatus,
  EOIPaymentStatus,
  SfdcLeadStatusEnum,
  BatchVoucherStatus,
} from 'src/utils/constant';

import { toast } from 'sonner';
import { useDebounce } from 'minimal-shared/hooks';
import { useDispatch, useSelector } from 'react-redux';
import React, { useMemo, useState, useEffect, useCallback, useLayoutEffect } from 'react';

import { Box , Card , Stack ,
  Table,
  Button,
  Tooltip,
  Popover,
  MenuItem,
  TableRow,
  MenuList,
  TableBody,
  TableCell,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { formatDateIST, formatTimeToAMPM } from 'src/utils/helper';
import {
  ROLES,
  STATUS_COLORS,
  EOIFormStatus,
  BOOKING_STATUS,
  SourceChangeStatus,
  UnitBlockingStatus,
  generateRoleBasedRoute,
  CancellationActionEnum,
  deleteRestoreActionEnumStatus,
} from 'src/utils/constant';
import {
  getTableStyles,
  tableContainerStyles,
  tableScrollbarStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
  tableContainerStylesPopup,
  fixedFooterPaginationStyles,
  scrollableTableContentStyles
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { getRmDropdown } from 'src/redux/actions/admin/reports-user-actions';
import { pushLeadsToSFDCAction } from 'src/redux/actions/admin/eoi-manager-actions';
import { searchSalesTeamDropdown } from 'src/redux/actions/rm-panel/dashboard-actions';
import { downloadFinanceTxnList } from 'src/redux/actions/rm-panel/eoi-finance-actions';
import { releaseInventoryUnit } from 'src/redux/actions/rm-panel/unit-inventory-actions';
import { setTabValue, resetMapAndConvertData } from 'src/redux/slices/rm-panel/eoi-slice';
import {
  POPUP_COLUMNS,
  isActionDisabled,
  buildEoiRecordsTabOptions,
  CANCELLATION_TABLE_COLUMNS,
} from 'src/config/role-based-permissions';
import {
  fetchEOIData,
  assignClosingRM,
  sendEoiFormLink,
  cancelEOIAction,
  convertEOIAction,
  fetchCPNameAction,
  fetchEOITabCounts,
  rejectUnitBlocking, 
  updateVoucherStatus,
  approveUnitBlocking,
  fetchEOIPrimarySource,
  updateEOIRefundPayment,
  fetchEOICampaignsAction,
  approveCancellationAction,
  eoiExportBookingFormAsPDF,
  deleteRestoreServiceAction,
  manageSfdcOpportunityThunk,
  fetchChangeSourceRequestData,
  fetchApprovalUnitListingData,
  downloadExportVouchersReports,
} from 'src/redux/actions/rm-panel/eoi-actions';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';
import { QRCodeGenerator } from 'src/components/qr-code-generator';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import CustomAutocomplete from 'src/components/customautocomplete/CustomAutocomplete';
import { useTable, TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { EOITableToolbar } from './components/eoi-table-toolbar';
import copyIcon from '../../../../public/assets/icons/copyIcon.svg';
import openIcon from '../../../../public/assets/icons/OpenIcon.svg';
import VoucherStatusDialog from './components/voucher-status-dialog';
import shareIcon from '../../../../public/assets/icons/shareicon.svg';
import ViewTypeTabs from '../eoi-dashboard/components/view-type-tabs';
import { evaluateEoiRowSfdcEligibility } from './eoi-sfdc-row-eligibility';
import { EOITableFiltersResult } from './components/eoi-table-filters-result';
import CancellationApproveDialogCRM from './components/cancellation-request-dialog';
import { TransactionRemarksDialog } from './components/finance-components/transaction-remark-dialog';
import { DynamicTransactionDialog } from './components/finance-components/dynamic-transaction-dialog';

import type { Filters } from './components/eoi-table-filters-result';

interface RMUser {
  userName: string;
  userId: string;
}

interface ExpressionOfInterestProps {
  dashboardFilters?:any
}

const SORT_FIELD_MAP: Record<string, string> = {
  remainingTime: 'approvalExpiry',
};

const getSortField = (orderBy?: string) => {
  if (!orderBy) return '';

  return SORT_FIELD_MAP[orderBy] || orderBy;
};

export default function ExpressionOfInterest({dashboardFilters}:Readonly<ExpressionOfInterestProps>) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  // State
  const [popovers, setPopovers] = useState<Record<string, HTMLElement | SVGElement | null>>({});
  const [tooltips, setTooltips] = useState<Record<string, boolean>>({});

  const {
    eoiData,
    tabValue,
    eoiCount,
    loading,
    campaigns,
    campaignsLoading,
    primarySource,
    cpName,
    sourceChangeListingData,
    sourceChangeListingCount,
    changeRequestCount,
    cancellationTabCount,
    approveUnitCount
  } = useSelector((state: RootState) => state.expressonOfInterest || {});
  const releaseInventoryUnitLoading = useSelector(
    (state: RootState) => state.unitInventory.releaseInventoryUnitLoading
  );
  const table = useTable();
  const { actions } = uiText.EOIJson
  const jsonValue = uiText.EOIJson.mapAndConvertEOI;
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const isChangeRequestView = tabValue === 'sourceView';
  const isCancellationsView = tabValue === 'cancellationsView';
  const isApprovalUnitView = tabValue === 'approveUnit';
  const listingData =
    isChangeRequestView || isApprovalUnitView ? sourceChangeListingData : eoiData;
  const count =
    isChangeRequestView || isApprovalUnitView ? sourceChangeListingCount : eoiCount;
  const [isExporting, setIsExporting] = useState(false);
  const INITIAL_FILTERS: Filters = {
    campaignId: '',
    primarySource: '',
    leadStatus: '',
    formStatus: [],
    paymentStatus: [],
    financeStatus: [],
    sortBy: '',
    deletionStatus: '',
    queueIdAllotted: null,
    cpName: '',
    startDate: '',
    endDate: '',
    rmUsers: [],
    approvalStatus: '',
  }
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    id: string | null;
    comment: string;
  }>({
    open: false,
    id: null,
    comment: '',
  });
  const [actionDialog, setActionDialog] = useState<{
  open: boolean;
  id: number | null;
  reason: string;
  type: 'cancelEOI' | 'requestCancellation' | 'approveCancellation' | 'crmCancellationAccepted' | 'EOI_converted' | 'deleteEoi' | 'restoreEoi' | null;
}>({
  open: false,
  id: null,
  reason: '',
  type: null,
});

const [copyLinkPopup, setCopyLinkPopup] = useState<{ open: boolean; voucherId: number | null; rowId: number | null }>({
  open: false,
  voucherId: null,
  rowId: null,
});

 const   actionConfig = {
  cancelEOI: {
    title: uiText.actions.cancelEOI,
    confirmText: uiText.actionDialogs.cancelEOI.confirmText,
    placeholder: uiText.actionDialogs.cancelEOI.placeholder,
    successMsg: uiText.actionDialogs.cancelEOI.successMsg,
    service: cancelEOIAction,
  },
  requestCancellation: {
    title: uiText.actions.requestCancellation,
    confirmText: uiText.actionDialogs.requestCancellation.confirmText,
    placeholder: uiText.actionDialogs.requestCancellation.placeholder,
    successMsg: uiText.actionDialogs.requestCancellation.successMsg,
    service: cancelEOIAction,
  },
  approveCancellation: {
    title: uiText.actions.approveCancellation,
    confirmText: uiText.actionDialogs.approveCancellation.confirmText,
    placeholder: uiText.actionDialogs.approveCancellation.placeholder,
    successMsg: uiText.actionDialogs.approveCancellation.successMsg,
    service: approveCancellationAction,
  },
  EOI_converted: {
    title: uiText.actions.EOI_converted,
    confirmText: uiText.actionDialogs.EOI_converted.confirmText,
    placeholder: uiText.actionDialogs.EOI_converted.placeholder,
    successMsg: uiText.actionDialogs.EOI_converted.successMsg,
    service: convertEOIAction,
  },
  deleteEoi: {
    title: uiText.actions.deleteEoi,
    confirmText: uiText.actionDialogs.deleteEoi.confirmText,
    placeholder: uiText.actionDialogs.deleteEoi.placeholder,
    successMsg: uiText.actionDialogs.deleteEoi.successMsg,
    service: deleteRestoreServiceAction,
  },
  restoreEoi: {
    title: uiText.actions.restoreEoi,
    confirmText: uiText.actionDialogs.restoreEoi.confirmText,
    placeholder: uiText.actionDialogs.restoreEoi.placeholder,
    successMsg: uiText.actionDialogs.restoreEoi.successMsg,
    service: deleteRestoreServiceAction,
  },
  crmCancellationAccepted: {
    title: uiText.EOIJson?.changeSource?.cancellationAcceptedDialog?.title ?? 'Cancellation Request Accepted',
    confirmText: uiText.EOIJson?.changeSource?.cancellationAcceptedDialog?.approveLabel ?? 'Approve',
    revokeLabel: uiText.EOIJson?.changeSource?.cancellationAcceptedDialog?.revokeLabel ?? 'Revoke',
    staticMessage: uiText.EOIJson?.changeSource?.cancellationAcceptedDialog?.message ?? 'The Cancellation process has been initiated. Update refund details post completion',
    successMsg: 'Cancellation action completed successfully',
    service: approveCancellationAction,
  },
};

  // Closing RM dialog state
  const [closingRMDialog, setClosingRMDialog] = useState<{
    open: boolean;
    id: number | null;
    sourcingRM: { userName: string; userId: any } | null;
    selectedRM: { userName: string; userId: any } | null;
  }>({
    open: false,
    id: null,
    sourcingRM: null,
    selectedRM: null,
  });
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [transactionData, setTransactionData] = useState<{
    refundDate?: string;
    refundTransactionId?: string;
    internalRefNumber?: string;
    comments?: string;
    paidAmount: string;
  }>({
    refundDate: '',
    refundTransactionId: '',
    internalRefNumber: '',
    comments: '',
    paidAmount: '',
  });

  // Voucher status dialog state
  const [voucherStatusDialog, setVoucherStatusDialog] = useState<{
    open: boolean;
    id: number | null;
    action: 'verify' | 'requestChanges';
    comment: string;
  }>({
    open: false,
    id: null,
    action: 'verify',
    comment: '',
  });

  // RM search functionality
  const [rmSearchQuery, setRMSearchQuery] = useState('');   // For closing RM
  const [sourcingRMSearchQuery, setSourcingRMSearchQuery] = useState('');
  const [rmOptions, setRMOptions] = useState<{ userName: string; userId: string }[]>([]);  // For closing RM
  const [sourcingRMOptions, setSourcingRMOptions] = useState<{ userName: string; userId: string }[]>([]);
  
  // CRM cancellation dialog state (status 16: info dialog, status 17: CancellationApproveDialogCRM)
  const [crmCancellationDialog, setCrmCancellationDialog] = useState<{
    open: boolean;
    id: number | null;
    formStatus: string | null;
  }>({ open: false, id: null, formStatus: null });

  // Map and convert dialog state
  const [selectedBlockingId, setSelectedBlockingId] = useState<string | null>(null);
  const [mapConvertDialogOpen, setMapConvertDialogOpen] = useState(false);
  // To refresh EOI Listing after Revert to Active EOI
  const [refreshKey, setRefreshKey] = useState(0);

  // Manage SFDC Opportunity dialog
  const [manageSfdcDialog, setManageSfdcDialog] = useState<{
    open: boolean;
    voucherId: number | null;
    sfdcEnquiryId: string;
    opportunityId: string;
  }>({ open: false, voucherId: null, sfdcEnquiryId: '', opportunityId: '' });
  const [manageSfdcSubmitting, setManageSfdcSubmitting] = useState(false);

  /** SFDC push: voucherId = row.id; campaignId = row.campaign.id (see API `campaign` object) */
  const [eoiSfdcPushDialog, setEoiSfdcPushDialog] = useState<{
    open: boolean;
    voucherId: number | null;
    campaignId: number | null;
    type: 'create' | 'convert' | null;
  }>({ open: false, voucherId: null, campaignId: null, type: null });
  const [eoiSfdcPushLoading, setEoiSfdcPushLoading] = useState(false);

  const eoiSfdcConfirmText =
    eoiSfdcPushDialog.type === 'convert'
      ? uiText.campaignListing.convertConfirmDialog
      : uiText.campaignListing.createConfirmDialog;

  const handleEoiPushLeadsToSFDC = async () => {
    if (
      eoiSfdcPushDialog.voucherId == null ||
      eoiSfdcPushDialog.campaignId == null ||
      !eoiSfdcPushDialog.type
    ) {
      return;
    }
    setEoiSfdcPushLoading(true);
    try {
      const response = await dispatch(
        pushLeadsToSFDCAction({
          voucherId: eoiSfdcPushDialog.voucherId,
          campaignId: eoiSfdcPushDialog.campaignId,
          ...(eoiSfdcPushDialog.type === 'convert' ? { pushConverted: true } : {}),
        })
      ).unwrap();
      toast.success(response?.message || 'SFDC Lead Push Job initiated successfully');
      setEoiSfdcPushDialog({
        open: false,
        voucherId: null,
        campaignId: null,
        type: null,
      });
      // Refetch EOI listing (and tab counts) so enquiry/opportunity columns update
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error || 'Failed to push leads to SFDC');
    } finally {
      setEoiSfdcPushLoading(false);
    }
  };

  const handleManageSfdcSubmit = async () => {
    const { voucherId, sfdcEnquiryId, opportunityId } = manageSfdcDialog;

    setManageSfdcSubmitting(true);
    try {
      await dispatch(
        manageSfdcOpportunityThunk({
          voucherId: Number(voucherId),
          sfdcEnquiryId: sfdcEnquiryId.trim(),
          opportunityId: opportunityId.trim(),
        })
      ).unwrap();
      toast.success(uiText.manageSfdc.successMsg);
      setManageSfdcDialog({ open: false, voucherId: null, sfdcEnquiryId: '', opportunityId: '' });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err ?? uiText.manageSfdc.errorMsg);
    } finally {
      setManageSfdcSubmitting(false);
    }
  };
  
  const debouncedRMSearch = useDebounce(rmSearchQuery, 500);  // For closing RM
  const sourcingDebouncedRMSearch = useDebounce(sourcingRMSearchQuery, 500);
  
  const rolePermissions = useRoleBasedPermissions({ module: 'eoi', eoiListTab: tabValue });
  const {
    permissions: eoiModulePermissions,
    columns: roleColumns,
    filters: roleFilters,
    canCreate,
    canExport,
    userRole,
    useTab,
    getRowActions,
  } = rolePermissions;

  const approvalUnitPermissions = useRoleBasedPermissions({ module: 'approvalUnitList' });
  const { columns: approvalUnitRoleColumns } = approvalUnitPermissions;

  const isRM = userRole === ROLES.RM;

  const openApproveUnitForRow = useCallback((row: any) => {
    const voucherKey = row?.voucherId ?? row?.id;
    if (voucherKey == null || voucherKey === '') {
      toast.error('Invalid row data');
      return;
    }
    setApproveDialog({
      open: true,
      id: typeof voucherKey === 'string' ? voucherKey : String(voucherKey),
      comment: '',
    });
  }, []);

  /** EOI Records tabs: `ROLE_BASED_PERMISSIONS[role].eoi.useTab` + `eoiRecordsTabs` (see `buildEoiRecordsTabOptions`). */
  const eoiRecordsTabLabels = useMemo(
    () => ({
      allRecords: 'All Records',
      changeRequest: 'Change Request',
      cancellations: 'Cancellations',
      approveUnit: uiText.actions.approveUnit,
    }),
    []
  );

  const tabOptions = useMemo(
    () => buildEoiRecordsTabOptions(eoiModulePermissions, eoiRecordsTabLabels),
    [eoiModulePermissions, eoiRecordsTabLabels]
  );

  const visibleFilters = useMemo(() => {
    if (isApprovalUnitView) {
      //  Only keep filters you want in Approve Unit tab
      return roleFilters?.filter((f) =>
        ['campaignId', 'cpName', 'approvalStatus', 'rmUsers'].includes(f?.id)
      );
    }
    //  Default (EOI tab)
    return roleFilters?.filter((f) => f.id !== 'approvalStatus');
  }, [roleFilters, isApprovalUnitView]);

  // Convert role-based columns to ColumnDefinition format for compatibility
  const DEFAULT_TABLE_HEAD: ColumnDefinition[] = useMemo(
    () =>
      (dashboardFilters ? POPUP_COLUMNS : roleColumns)?.map((col) => ({
        id: col?.id || '',
        label: col?.label || '',
        width: col?.width || 150,
        visible: col?.visible !== false,
        disableToggle: col?.disableToggle || false,
        tooltip: col?.tooltip || undefined,
        sortable: col?.sortable === true,
      })) || [],
    [dashboardFilters, roleColumns]
  );

  const ALL_TABLE_HEAD = useMemo(
    () =>
      roleColumns?.filter(
        (col) => col.tab === 'all' || col.tab === 'both'
      ) || [],
    [roleColumns]
  );

 const SOURCE_TABLE_HEAD = useMemo(
  () =>
    (roleColumns
      ?.filter((col) => col.tab === 'sourceView' || col.tab === 'both')
      .map((col) =>
        col.id === 'paidVoucherId'
          ? { ...col, sortable: false }
          : col
      )) || [],
  [roleColumns]
);

  const CANCELLATION_TABLE_HEAD: ColumnDefinition[] = useMemo(
    () =>
      CANCELLATION_TABLE_COLUMNS?.map((col) => ({
        id: col?.id ?? '',
        label: col?.label ?? '',
        width: col?.width ?? 150,
        visible: col?.visible !== false,
        disableToggle: col?.disableToggle ?? false,
        tooltip: col?.tooltip,
        sortable: col?.sortable === true,
      })) ?? [],
    []
  );

  const APPROVAL_UNIT_TABLE_HEAD: ColumnDefinition[] = useMemo(
    () =>
      approvalUnitRoleColumns?.map((col) => ({
        id: col?.id ?? '',
        label: col?.label ?? '',
        width: col?.width ?? 150,
        visible: col?.visible !== false,
        disableToggle: col?.disableToggle ?? false,
        tooltip: col?.tooltip,
        sortable: col?.sortable === true,
      })) ?? [],
    [approvalUnitRoleColumns]
  );

  const defaultColumnManager = useColumnManager(DEFAULT_TABLE_HEAD);
  const allColumnManager = useColumnManager(ALL_TABLE_HEAD);
  const sourceColumnManager = useColumnManager(SOURCE_TABLE_HEAD);
  const cancellationColumnManager = useColumnManager(CANCELLATION_TABLE_HEAD);
  const approvalColumnManager = useColumnManager(APPROVAL_UNIT_TABLE_HEAD);

  let columnManager = defaultColumnManager;

  if (useTab) {
    columnManager =
      isChangeRequestView
        ? sourceColumnManager
        : isCancellationsView
          ? cancellationColumnManager
            : isApprovalUnitView
              ? approvalColumnManager
                : allColumnManager;
  }

  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns);
  const route = useRouter();
  
  useEffect(() => {
     const commonParams = {
      page,
      limit: rowsPerPage,
      sortBy: filters?.sortBy,
      search: debouncedSearch,
    };
    const eoiParams = {
     ...commonParams,
      primarySource: filters?.primarySource,
      campaignId: filters?.campaignId,
      leadStatus: filters?.leadStatus,
      ...(filters?.formStatus?.length ? { formStatus: filters?.formStatus } : {}),
      ...(filters?.paymentStatus?.length ? { paymentStatus: filters?.paymentStatus } : {}),
      ...(filters?.financeStatus?.length ? { financeStatus: filters?.financeStatus } : {}),
      deletionStatus: filters?.deletionStatus,
      queueIdAllotted: filters?.queueIdAllotted ? true : null,
      cpLinkIds: filters?.cpName,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      ...(filters?.rmUsers?.length ? { rmUsers: filters?.rmUsers } : {}),
    };
    const approvalParams = {
      ...commonParams,
      ...(filters?.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters?.cpName ? { cpLinkIds: filters.cpName } : {}),
      ...(filters?.approvalStatus ? { approvalStatus: filters.approvalStatus } : {}),
      ...(filters?.rmUsers?.length ? { rmUsers: filters.rmUsers } : {}),
    };
    if (isChangeRequestView) {
      dispatch(fetchChangeSourceRequestData(commonParams));
      return;
    }
    if (isCancellationsView) {
      dispatch(fetchEOIData({
        ...eoiParams,
        isCancellationTab: true,
      }));
      return;
    }
    if (isApprovalUnitView) {
      if (table?.orderBy && table?.order) {
        approvalParams.sortBy = `${getSortField(table.orderBy)}:${table.order}`;
      }
      
      dispatch(fetchApprovalUnitListingData(approvalParams));
      return;
    }
    if (table?.orderBy && table?.order) {
      eoiParams.sortBy = `${getSortField(table.orderBy)}:${table.order}`;
    }
    if (!dashboardFilters) {
      dispatch(fetchEOIData(eoiParams));
    }
  }, [
    dispatch,
    page,
    rowsPerPage,
    debouncedSearch,
    filters,
    table?.orderBy,
    table?.order,
    dashboardFilters,
    refreshKey,
    isChangeRequestView,
    isCancellationsView,
    isApprovalUnitView,
  ]);

  useEffect(() => {
    if (!dashboardFilters) {
      dispatch(fetchEOICampaignsAction({showAll: true}));
      dispatch(fetchEOIPrimarySource());
      dispatch(fetchCPNameAction({}));
      dispatch(getRmDropdown(''));
    }
  }, [dispatch]);

  // Fetch tab badge counts when useTab is true (Change Request & Cancellations) - single API
  useEffect(() => {
    if (useTab && !dashboardFilters) {
      dispatch(fetchEOITabCounts({ search: debouncedSearch }));
    }
  }, [dispatch, useTab, dashboardFilters, debouncedSearch, refreshKey]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.toLowerCase().trim()), 1000);
    return () => clearTimeout(handler);
  }, [search]);

  // Search for Sourcing and Closing RMs when search query changes
  const fetchRMOptions = async (
    query: string,
    setter: React.Dispatch<React.SetStateAction<RMUser[]>>
  ) => {
    try {
      const res = await dispatch(
        searchSalesTeamDropdown({
          search: query,
          role: ROLES.RM,
        })
      ).unwrap(); // ensures correct typing

      const users = res?.data?.data?.users ?? [];

      const formatted: RMUser[] = users?.map((user: any) => ({
        userName: user?.username || user?.userName || "Unknown User",
        userId: user?.id || user?.userId || "",
      }));

      setter(formatted);
    } catch (error) {
      console.error(error);
      setter([]); // fallback
    }
  };

  useEffect(() => {
    if (!debouncedRMSearch?.trim()) {
      setRMOptions([]);
      return;
    }
    fetchRMOptions(debouncedRMSearch, setRMOptions);
  }, [debouncedRMSearch]);

  useEffect(() => {
    if (!sourcingDebouncedRMSearch?.trim()) {
      setSourcingRMOptions([]);
      return;
    }
    fetchRMOptions(sourcingDebouncedRMSearch, setSourcingRMOptions);
  }, [sourcingDebouncedRMSearch]);

  useEffect(() => {
    setPage(1);
  }, [filters, debouncedSearch]);

  useEffect(() => {
    if(dashboardFilters){

      setFilters(dashboardFilters);
      const params = {
        page,
      limit: rowsPerPage,
      search: debouncedSearch,
      primarySource: dashboardFilters?.primarySource,
      campaignId: dashboardFilters?.campaignId,
      rmUsers: dashboardFilters?.rmId,
      leadStatus: dashboardFilters?.leadStatus,
      formStatus: dashboardFilters?.formStatus,
      paymentStatus: dashboardFilters?.paymentStatus,
      financeStatus: dashboardFilters?.financeStatus,
      sortBy: dashboardFilters?.sortBy,
      deletionStatus: dashboardFilters?.deletionStatus,
      rmPending:dashboardFilters?.rmPending,
      queueIdAllotted:dashboardFilters?.queueIdAllotted ? true : null,
      cpLinkIds:dashboardFilters?.cpName,
      eoiCollected:dashboardFilters?.eoiCollected,
      totalEoiAmount:dashboardFilters?.totalEoiAmount,
      isEoiDashboard: dashboardFilters?.isEoiDashboard,
      isEoiLeaderboard: dashboardFilters?.isEoiLeaderboard,
      startDate: dashboardFilters?.startDate,
      endDate: dashboardFilters?.endDate,
      unitType: dashboardFilters?.unitType,
      crmPending: dashboardFilters?.crmPending,
      misPending: dashboardFilters?.misPending,
      eoiCollectedPartiallyPaid: dashboardFilters?.eoiCollectedPartiallyPaid,
      totalEoiAmountCollected: dashboardFilters?.totalEoiAmountCollected
    };

    if (table?.orderBy && table?.order) {
      params.sortBy = `${getSortField(table.orderBy)}:${table.order}`;
    }
    dispatch(fetchEOIData(params));
    }
  }, [dispatch, page, rowsPerPage, debouncedSearch, filters, table?.orderBy, table?.order,dashboardFilters]);

  useEffect(() => {
    table.onResetPage();
    setFilters(INITIAL_FILTERS);
    // reset search 
    setSearch('');
    setDebouncedSearch('');
  }, [tabValue]);

  // Reset to 'all' if current tabValue is not available for this role (e.g. Admin/CRM on sourceView).
  // useLayoutEffect keeps Redux and MUI Tabs aligned before paint — a mismatched controlled value
  // can destabilize Mui Tabs / useDefaultProps during concurrent recovery.
  useLayoutEffect(() => {
    const hasTab = tabOptions.some((opt) => opt.value === tabValue);
    if (!hasTab && tabValue !== 'all') {
      dispatch(setTabValue('all'));
    }
  }, [dispatch, tabOptions, tabValue]);

  // Open popover
const handlePopoverOpen = (
  event: React.MouseEvent<HTMLElement | SVGElement>,
  rowId: number | string,
  type: string
) => {
  const key = `${rowId}-${type}`;
  setPopovers((prev) => ({ ...prev, [key]: event.currentTarget }));
};

// Close popover
const handlePopoverClose = (rowId: number | string, type: string) => {
  const key = `${rowId}-${type}`;
  setPopovers((prev) => ({ ...prev, [key]: null }));
};

 const handleExport = (exportTransaction=false) => {
   const payload: Record<string, any> = {
     ...(debouncedSearch ? { search: debouncedSearch } : {}),
     ...(filters?.primarySource ? { primarySource: filters.primarySource } : {}),
     ...(filters?.cpName ? { cpLinkIds: filters.cpName } : {}),
     ...(filters?.campaignId ? { campaignId: filters.campaignId } : {}),
     ...(filters?.leadStatus ? { leadStatus: filters.leadStatus } : {}),
     ...(filters?.formStatus?.length ? { formStatus: filters.formStatus } : {}),
     ...(filters?.paymentStatus?.length ? { paymentStatus: filters.paymentStatus } : {}),
     ...(filters?.financeStatus?.length ? { financeStatus: filters.financeStatus } : {}),
     ...(filters?.deletionStatus ? { deletionStatus: filters.deletionStatus } : {}),
     ...(filters?.queueIdAllotted ? { queueIdAllotted: filters.queueIdAllotted ? true : null } : {}),
     ...(filters?.startDate ? { startDate: filters.startDate } : {}),
     ...(filters?.endDate ? { endDate: filters.endDate } : {}),
     ...(table?.orderBy ? { sortBy: `${getSortField(table.orderBy)}:${table.order}` } : {}),
     ...(filters?.rmUsers?.length ? { rmUsers: filters?.rmUsers } : {}),
   };
   if (exportTransaction) {
     dispatch(downloadFinanceTxnList(payload))
   }
   else {
     dispatch(downloadExportVouchersReports(payload));
   }
 };

 // handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    dispatch(setTabValue(newValue));
    table.onResetPage();
    if (useTab && !dashboardFilters) {
      dispatch(fetchEOITabCounts({ search: debouncedSearch }));
    }
  };

 const handleActionDialogSubmit = async (cancellationAction?: CancellationActionEnum, deleteRestoreEoi?:deleteRestoreActionEnumStatus ) => {
   if (!actionDialog.id || !actionDialog.type) return;
   const isCrmCancellationAccepted = actionDialog.type === 'crmCancellationAccepted';
   if (!isCrmCancellationAccepted && !actionDialog.reason.trim()) return;
   const { service, successMsg } = actionConfig[actionDialog.type];
   const payload: Record<string, any> = {
     voucherId: actionDialog.id,
     remarks: isCrmCancellationAccepted ? (cancellationAction === CancellationActionEnum.APPROVE ? 'Approved by CRM' : 'Revoked by CRM') : actionDialog.reason.trim(),
   };
   if (actionDialog.type === 'approveCancellation' || isCrmCancellationAccepted) {
     payload.action = cancellationAction ?? CancellationActionEnum.APPROVE;
   }
   
  if(actionDialog.type === 'deleteEoi' || actionDialog.type === 'restoreEoi'){
    payload.action = deleteRestoreEoi; // DELETE or RESTORE
  }
   try {
     await dispatch(service(payload as any)).unwrap();
     const message =
       (isApproveCancellationAction || isCrmCancellationAcceptedAction) &&
       cancellationAction === CancellationActionEnum.REVOKE
         ? 'Cancellation revoked successfully'
         : successMsg;
     toast.success(message);
     setActionDialog({ open: false, id: null, reason: '', type: null });
     const refetchParams: Record<string, any> = {
       page,
       limit: rowsPerPage,
       search: debouncedSearch,
       primarySource: filters?.primarySource,
       campaignId: filters?.campaignId,
       ...(filters?.formStatus?.length ? { formStatus: filters?.formStatus } : {}),
       paymentStatus: filters?.paymentStatus,
       financeStatus: filters?.financeStatus,
       sortBy: filters?.sortBy,
       deletionStatus: filters?.deletionStatus,
       queueIdAllotted: filters?.queueIdAllotted ? true : null,
       startDate: filters?.startDate,
       endDate: filters?.endDate,
       rmUsers: filters?.rmUsers,
       ...(isCancellationsView ? { isCancellationTab: true } : {}),
     };
     if (isChangeRequestView) {
       dispatch(fetchChangeSourceRequestData({ page, limit: rowsPerPage, search: debouncedSearch, sortBy: filters?.sortBy }));
     } else {
       dispatch(fetchEOIData(refetchParams));
       if (isCancellationsView) {
         dispatch(fetchEOITabCounts({ search: debouncedSearch }));
       }
     }
   } catch (err: any) {
     toast.error(err);
   }
 };

 const isApproveCancellationAction = actionDialog.type === 'approveCancellation';
 const isCrmCancellationAcceptedAction = actionDialog.type === 'crmCancellationAccepted';
 const canRevokeCancellation =
    isApproveCancellationAction &&
    [ROLES.Admin, ROLES.SuperAdmin, ROLES.SALES_RSH].includes((userRole || '') as ROLES);
 const useStaticMessage = isCrmCancellationAcceptedAction; // Same as approve cancellation, but static msg instead of reason input
 const currentActionConfig = actionDialog.type ? actionConfig[actionDialog.type] : null;

 // Handle voucher status update
  const handleVoucherStatusSubmit = async () => {
    if (!voucherStatusDialog.id) {
      toast.error('Invalid voucher selected');
      return;
    }

    const role = userRole; // from rolePermissions
    const isVerify = voucherStatusDialog.action === 'verify';
    const isRequestChanges = voucherStatusDialog.action === 'requestChanges';

    if (isRequestChanges && !voucherStatusDialog.comment.trim()) {
      toast.error('Please provide reason for requesting changes');
      return;
    }

    // Map role+action → status
    let nextStatus = '';
    if (role === ROLES.MIS) {
      nextStatus = isVerify
        ? EOIFormStatus.MIS_VERIFIED
        : EOIFormStatus.MIS_REQUESTED_CHANGES;
    } else if (role === ROLES.CRM) {
      nextStatus = isVerify
        ? EOIFormStatus.CRM_VERIFIED
        : EOIFormStatus.CRM_REQUESTED_CHANGES;
    }

    const payload = {
      voucherId: voucherStatusDialog.id,
      voucherStatus: nextStatus,
      checkerRemarks: voucherStatusDialog.comment.trim() || (isVerify ? 'Verified successfully' : ''),
    };

    try {
      const result = await dispatch(updateVoucherStatus(payload));
      if (updateVoucherStatus.fulfilled.match(result)) {
        setVoucherStatusDialog({ open: false, id: null, action: 'verify', comment: '' });
      const params = {
         page,
         limit: rowsPerPage,
         search: debouncedSearch,
         primarySource: filters?.primarySource,
         cpLinkIds: filters?.cpName,
         queueIdAllotted: filters?.queueIdAllotted ? true : null,
         campaignId: filters?.campaignId,
         leadStatus: filters?.leadStatus,
         ...(filters?.formStatus?.length ? { formStatus: filters?.formStatus } : {}),
         ...(filters?.paymentStatus?.length ? { paymentStatus: filters?.paymentStatus } : {}),
         ...(filters?.financeStatus?.length ? { financeStatus: filters?.financeStatus } : {}),
         sortBy: filters?.sortBy,
         deletionStatus: filters?.deletionStatus,
         ...(filters?.rmUsers?.length ? { rmUsers: filters?.rmUsers } : {}),
         ...(isCancellationsView ? { isCancellationTab: true } : {}),
       };
       dispatch(fetchEOIData(params));    }
  } catch (error) {
    console.error('Error updating voucher status:', error);
  }
};

  const handleReleaseMappedUnitConfirm = () => {
    if (!selectedBlockingId) {
      toast.error('Blocking ID not found');
      return;
    }

    dispatch(releaseInventoryUnit(selectedBlockingId))
      .unwrap()
      .then((res) => {
        toast.success(res || 'Unit released successfully');
        setMapConvertDialogOpen(false);
        setSelectedBlockingId(null);
        dispatch(resetMapAndConvertData());
        setRefreshKey((k) => k + 1);
      })
      .catch((err) => {
        toast.error(err || 'Failed to release unit');
      });
  };

  const handleExportBookingForm = async (oppId: string, rowId: number) => {
    if (!oppId) {
      toast.error("Invalid voucher id");
      return;
    }
    try {
      setIsExporting(true);
      await dispatch(eoiExportBookingFormAsPDF(oppId))?.unwrap();
    } catch (error) {
      console.log(error);
      toast.error("Error exporting PDF");
    } finally {
      setIsExporting(false);
      handlePopoverClose(rowId, 'actions');
    }
  };

  // set selected tab value to all on mount
  useEffect(()=>{
    dispatch(setTabValue("all"))
  }, [])

  const handleApproveUnit = async () => {
    if (!approveDialog.id) return;

    try {
      const res = await dispatch(approveUnitBlocking(approveDialog.id)).unwrap();
      toast.success(res?.message || 'Unit approved successfully');

      setApproveDialog({
        open: false,
        id: null,
        comment: '',
      });

      setRefreshKey((k) => k + 1); // refresh table
    } catch (err: any) {
      toast.error(
        typeof err === 'string'
          ? err
          : err?.message || 'Something went wrong'
      );
    }
  };

  const handleRejectUnit = async () => {
    if (!approveDialog.id || !approveDialog.comment.trim()) return;

    try {
      const res = await dispatch(
        rejectUnitBlocking({
          id: approveDialog.id,
          rejectedReason: approveDialog.comment,
        })
      ).unwrap();
      toast.success(res?.message || 'Unit rejected successfully');

      setApproveDialog({
        open: false,
        id: null,
        comment: '',
      });
      setRefreshKey((k) => k + 1); // refresh table
    } catch (err: any) {
        toast.error(
          typeof err === 'string'
            ? err
            : err?.message || 'Something went wrong'
        );
    }
  };

  return (
  <DashboardContent
    sx={
      dashboardFilters
        ? {
            pl: '16px !important',
            pr: '16px !important',
            py: 2,
          }
        : undefined
    }
  >
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={uiText.EOIJson.title}
          action={
            canCreate && !dashboardFilters ? (
              <Button
                variant="contained"
                className="primaryBtn"
                onClick={() => {
                  route.push(generateRoleBasedRoute(userRole,'eoi-records/create'));
                }}
                
              >
                {uiText.EOIJson.createEOI.btnLabel}

              </Button>
            ) : null
          }
          slotProps={{
            container: {
              sx: {
                justifyContent: 'flex-start',
              },
            },
          }}
        />
      </Box>
      {loading ? (
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            height: '80vh',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimateLogo1 />
        </Box>
      ) : (
      <Card sx={dashboardFilters ? tableContainerStylesPopup: tableContainerStyles}>

          {useTab && !dashboardFilters && (
            <ViewTypeTabs
              value={tabValue}
              onChange={handleTabChange}
              options={tabOptions}
              tabCounts={{
                sourceView: changeRequestCount ?? 0,
                cancellationsView: cancellationTabCount ?? 0,
                approveUnit: approveUnitCount ?? 0,
              }}
            />
          )}

          {/* Toolbar */}
          <EOITableToolbar
            search={search}
            setSearch={setSearch}
            filters={filters}
            setFilters={setFilters}
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
            columnManager={columnManager}
            eoiData={eoiData || []}
            campaigns={campaigns}
            campaignsLoading={campaignsLoading}
            primarySource={primarySource}
            cpName={cpName}
            roleFilters={visibleFilters}
            userRole={userRole}
            canExport={canExport}
            handleExport={handleExport}
            isFromDashbhboard={Boolean(dashboardFilters)}
            isChangeRequestView={isChangeRequestView}
            isCancellationsView={isCancellationsView}
            isApprovalUnitView={isApprovalUnitView}
          />
          {/* Filters result */}
          {!dashboardFilters && (Boolean(search) || Object.entries(filters)?.some(([key, value]) => {
            if (Array.isArray(value)) return value?.length > 0;  
            return Boolean(value);
          })) && (
            <EOITableFiltersResult
              search={search}
              setSearch={setSearch}
              filters={filters}
              setFilters={setFilters}
              totalResults={count ?? listingData?.length ?? 0}
              campaigns={campaigns}
              cpNameOptions={cpName}
              sx={{ px: 2, pb: 1 }}
            />
          )}

          {/* Table */}
          <Box sx={scrollableTableContentStyles}>
            <Scrollbar  sx={tableScrollbarStyles}>
              <Table stickyHeader size="small" sx={getTableStyles(dynamicMinWidth)}>
                <TableHeadCustom
                  headLabel={visibleColumns}
                  order={table?.order}
                  orderBy={table?.orderBy}
                  onSort={table?.onSort}   
                  numSelected={0}
                  rowCount={listingData?.length || 0}
                />
                <TableBody>

                  {listingData && Array.isArray(listingData) && listingData.length > 0  ? (
                    listingData?.map((row) => (
                      <TableRow hover key={row?.id} sx={{ height: 8 }}>
                        {visibleColumns && Array.isArray(visibleColumns) ? visibleColumns.map((col, colIndex) => {
                          if (!col?.id) return <TableCell key={`empty-${row?.id}-${colIndex}`}>-</TableCell>;
                          const value = row?.[col.id as keyof typeof row];

                          if (['leadStatus', 'formStatus', 'paymentStatus', 'financeStatus', 'sfdcLeadStatus', 'status', 'approvalStatus', 'cxStatus'].includes(col?.id || '')) {
                            const normalizedValue = value && typeof value === 'string' ? value.trim() : '';

                            const getStatusColor = (
                              column: string,
                              statusValue: string
                            ):
                              | 'default'
                              | 'primary'
                              | 'secondary'
                              | 'info'
                              | 'success'
                              | 'warning'
                              | 'error' => {
                              if (!statusValue || !column) return 'default';
                              switch (column) {
                                case 'leadStatus':
                                  return STATUS_COLORS?.LEAD_STATUS?.[statusValue as EOILeadStatus] || 'default';
                                case 'formStatus':
                                  return STATUS_COLORS?.FORM_STATUS?.[statusValue as EOIFormStatus] || 'default';
                                case 'sfdcLeadStatus':
                                  return STATUS_COLORS?.SFDC_LEAD_STATUS?.[statusValue as SfdcLeadStatusEnum] || 'default';
                                case 'status':
                                  return STATUS_COLORS?.SOURCE_VIEW_STATUS?.[statusValue as SourceChangeStatus] || 'default';
                                case 'cxStatus':
                                  return STATUS_COLORS?.CX_STATUS?.[statusValue as BatchVoucherStatus] || 'default';
                                case 'approvalStatus': 
                                  return STATUS_COLORS?.UNIT_BLOCKING_STATUS[statusValue as UnitBlockingStatus] || 'default';   
                                case 'paymentStatus':
                                  return STATUS_COLORS?.PAYMENT_STATUS?.[statusValue as EOIPaymentStatus] || 'default';
                                  case 'financeStatus':
                                  return STATUS_COLORS?.FINANCE_STATUS?.[statusValue as EOIFinanceStatus] || 'default';
                                default:
                                  return 'default';
                              }
                            };
                            return (
                              <TableCell key={col?.id} sx={{ minWidth: 250 }}>
                                {col?.id === 'formStatus' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Label
                                      variant="soft"
                                      color={getStatusColor(col?.id, normalizedValue)}
                                    >
                                      {normalizedValue || '-'}
                                    </Label>
                                    {row?.checkerRemarks &&
                                      (row?.formStatus === EOIFormStatus.MIS_VERIFIED ||
                                        row?.formStatus === EOIFormStatus.CRM_VERIFIED ||
                                        row?.formStatus === EOIFormStatus.MIS_REQUESTED_CHANGES ||
                                        row?.formStatus === EOIFormStatus.CRM_REQUESTED_CHANGES ||
                                        row?.formStatus === EOIFormStatus.MIS_UPDATED ||
                                        row?.formStatus === EOIFormStatus.CRM_UPDATED) && (
                                        <>
                                          <Tooltip
                                            title="View Remarks"
                                            placement="top"
                                            arrow
                                            slotProps={{
                                              popper: {
                                                disablePortal: true,
                                                modifiers: [
                                                  {
                                                    name: 'preventOverflow',
                                                    options: {
                                                      boundary: 'clippingParents',
                                                    },
                                                  },
                                                ],
                                              },
                                            }}
                                            open={
                                              !popovers[`${row.id}-formStatus`] &&
                                              tooltips[`${row.id}-formStatus`]
                                            }
                                            onOpen={() =>
                                              setTooltips((prev) => ({
                                                ...prev,
                                                [`${row.id}-formStatus`]: true,
                                              }))
                                            }
                                            onClose={() =>
                                              setTooltips((prev) => ({
                                                ...prev,
                                                [`${row.id}-formStatus`]: false,
                                              }))
                                            }
                                          >
                                            <Iconify
                                              icon="mdi:information-outline"
                                              width={18}
                                              height={18}
                                              color="action"
                                              onClick={(e) => {
                                                handlePopoverOpen(e, row.id, 'formStatus');
                                                setTooltips((prev) => ({
                                                  ...prev,
                                                  [`${row.id}-formStatus`]: false,
                                                }));
                                              }}
                                              style={{ cursor: 'pointer' }}
                                            />
                                          </Tooltip>

                                          <Popover
                                            open={Boolean(popovers[`${row.id}-formStatus`])}
                                            anchorEl={popovers[`${row.id}-formStatus`] || null}
                                            onClose={() => handlePopoverClose(row.id, 'formStatus')}
                                            anchorOrigin={{
                                              vertical: 'center',
                                              horizontal: 'right',
                                            }}
                                            transformOrigin={{
                                              vertical: 'center',
                                              horizontal: 'left',
                                            }}
                                          >
                                            <Box
                                              sx={{ p: 2, maxWidth: 500, whiteSpace: 'pre-line' }}
                                            >
                                              {row?.checkerRemarks ? (
                                                <>
                                                  {row?.checkerRemarks?.misRemark && (
                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                      {row?.checkerRemarks?.misRemark}
                                                    </Typography>
                                                  )}
                                                  {row?.checkerRemarks?.crmRemark && (
                                                    <Typography variant="body2">
                                                      {row?.checkerRemarks?.crmRemark}
                                                    </Typography>
                                                  )}
                                                </>
                                              ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                  No remarks available
                                                </Typography>
                                              )}
                                            </Box>
                                          </Popover>
                                        </>
                                      )}
                                  </Box>
                                ) : col?.id === 'paymentStatus' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Label
                                      variant="soft"
                                      color={getStatusColor(col?.id, normalizedValue)}
                                    >
                                      {normalizedValue || '-'}
                                    </Label>

                                    {row?.chequeAlerts && (
                                      <>
                                        <Tooltip
                                          title="View Cheque Alerts"
                                          placement="top"
                                          arrow
                                          slotProps={{
                                            popper: {
                                              disablePortal: true, // <--- correct way to disable portal
                                              modifiers: [
                                                {
                                                  name: 'preventOverflow',
                                                  options: {
                                                    boundary: 'clippingParents',
                                                  },
                                                },
                                              ],
                                            },
                                          }}
                                          open={
                                            !popovers[`${row.id}-paymentStatus`] &&
                                            tooltips[`${row.id}-paymentStatus`]
                                          }
                                          onOpen={() =>
                                            setTooltips((prev) => ({
                                              ...prev,
                                              [`${row.id}-paymentStatus`]: true,
                                            }))
                                          }
                                          onClose={() =>
                                            setTooltips((prev) => ({
                                              ...prev,
                                              [`${row.id}-paymentStatus`]: false,
                                            }))
                                          }
                                        >
                                          <Iconify
                                            icon="mdi:information-outline"
                                            width={18}
                                            height={18}
                                            color="action"
                                            onClick={(e) => {
                                              handlePopoverOpen(e, row.id, 'paymentStatus');
                                              setTooltips((prev) => ({
                                                ...prev,
                                                [`${row.id}-paymentStatus`]: false,
                                              }));
                                            }}
                                            style={{ cursor: 'pointer' }}
                                          />
                                        </Tooltip>
                                        <Popover
                                          open={Boolean(popovers[`${row.id}-paymentStatus`])}
                                          anchorEl={popovers[`${row.id}-paymentStatus`] || null}
                                          onClose={() =>
                                            handlePopoverClose(row.id, 'paymentStatus')
                                          }
                                          anchorOrigin={{
                                            vertical: 'center',
                                            horizontal: 'right',
                                          }}
                                          transformOrigin={{
                                            vertical: 'center',
                                            horizontal: 'left',
                                          }}
                                        >
                                          <Box sx={{ p: 2, maxWidth: 500, whiteSpace: 'pre-line' }}>
                                            {row?.chequeAlerts ? (
                                              <Typography variant="body2">
                                                {row?.chequeAlerts}
                                              </Typography>
                                            ) : (
                                              <Typography variant="body2" color="text.secondary">
                                                No alerts available
                                              </Typography>
                                            )}
                                          </Box>
                                        </Popover>
                                      </>
                                    )}
                                  </Box>
                                ) : col?.id === 'financeStatus' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Label
                                      variant="soft"
                                      color={getStatusColor(col?.id, normalizedValue)}
                                    >
                                      {normalizedValue || '-'}
                                    </Label>
                                    {row?.financeRemarks && row?.financeStatus && (
                                      <>
                                        <Tooltip
                                          title="View Remarks"
                                          placement="top"
                                          arrow
                                          slotProps={{
                                            popper: {
                                              disablePortal: true, // <--- correct way to disable portal
                                              modifiers: [
                                                {
                                                  name: 'preventOverflow',
                                                  options: {
                                                    boundary: 'clippingParents',
                                                  },
                                                },
                                              ],
                                            },
                                          }}
                                          open={
                                            !popovers[`${row.id}-financeStatus`] &&
                                            tooltips[`${row.id}-financeStatus`]
                                          }
                                          onOpen={() =>
                                            setTooltips((prev) => ({
                                              ...prev,
                                              [`${row.id}-financeStatus`]: true,
                                            }))
                                          }
                                          onClose={() =>
                                            setTooltips((prev) => ({
                                              ...prev,
                                              [`${row.id}-financeStatus`]: false,
                                            }))
                                          }
                                        >
                                          <Iconify
                                            icon="mdi:information-outline"
                                            width={18}
                                            height={18}
                                            color="action"
                                            onClick={(e) => {
                                              handlePopoverOpen(e, row.id, 'financeStatus');
                                              setTooltips((prev) => ({
                                                ...prev,
                                                [`${row.id}-financeStatus`]: false,
                                              }));
                                            }}
                                            style={{ cursor: 'pointer' }}
                                          />
                                        </Tooltip>
                                        <Popover
                                          open={Boolean(popovers[`${row.id}-financeStatus`])}
                                          anchorEl={popovers[`${row.id}-financeStatus`] || null}
                                          onClose={() =>
                                            handlePopoverClose(row.id, 'financeStatus')
                                          }
                                          anchorOrigin={{
                                            vertical: 'center',
                                            horizontal: 'right',
                                          }}
                                          transformOrigin={{
                                            vertical: 'center',
                                            horizontal: 'left',
                                          }}
                                        >
                                          <Box sx={{ p: 2, maxWidth: 500, whiteSpace: 'pre-line' }}>
                                            {row?.financeRemarks ? (
                                              <Typography variant="body2">
                                                {row?.financeRemarks}
                                              </Typography>
                                            ) : (
                                              <Typography variant="body2" color="text.secondary">
                                                No remarks available
                                              </Typography>
                                            )}
                                          </Box>
                                        </Popover>
                                      </>
                                    )}
                                  </Box>
                                ) : (
                                  <>
                                    {normalizedValue ? (
                                      <Label
                                        variant="soft"
                                        color={getStatusColor(col?.id, normalizedValue)}
                                      >
                                        {normalizedValue}
                                      </Label>
                                    ) : (
                                      '-'
                                    )}
                                  </>
                                )}
                              </TableCell>
                            );
                          }

                          // Prefill Booking Form (Yes/No)
                          if (col?.id === 'bookingStatus') {
                            const isPreFilled = value === BOOKING_STATUS.PRE_FILLED;

                            return (
                              <TableCell key={col.id}>
                                {isPreFilled ? uiText.button.yes : uiText.button.no}
                              </TableCell>
                            );
                          }
                        // view & edit source action
                          if (col?.id === 'actions') {

                            if (useTab && isChangeRequestView) {
                              return (
                                <TableCell key={col?.id}>
                                  <Tooltip title={isRM ? 'Edit' : 'View'} placement="top" arrow>
                                    <IconButton
                                     disabled={row?.status !== SourceChangeStatus.REQUESTED && isRM}
                                      onClick={() => {
                                        if (!row?.voucherId) return;
                                        // set source change request ID
                                        localStorage.setItem('sourceChangeRequestId', row.id);
                                        route.push(
                                          generateRoleBasedRoute(
                                            userRole,
                                            isRM ? 'eoi-records/change-source/edit' : 'eoi-records/change-source/view',
                                            String(row?.voucherId)
                                          )
                                        );
                                      }}
                                    >
                                      <Iconify icon={isRM ? 'solar:pen-bold' : 'tabler:eye'} />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              );
                            }

                            if (useTab && isApprovalUnitView) {
                              const approveTabActions =
                                getRowActions && typeof getRowActions === 'function' ? getRowActions(row) : [];
                              const approveUnitAction = approveTabActions.find((a) => a?.id === 'approveUnit');
                              if (!approveUnitAction) {
                                return <TableCell key={col?.id} />;
                              }
                              const normalizeStatus = (v: unknown) =>
                                typeof v === 'string' ? v.trim() : '';
                              const isApprovedOrRejected = (s: string) =>
                                s === UnitBlockingStatus.APPROVED ||
                                s === UnitBlockingStatus.REJECTED;
                              const isApproveOrRejectFinalStatus =
                                isApprovedOrRejected(normalizeStatus(row?.approvalStatus));
                              return (
                                <TableCell key={col?.id}>
                                  <Tooltip title={uiText.actions.approveUnit} placement="top" arrow>
                                    <IconButton
                                      onClick={() => openApproveUnitForRow(row)}
                                      disabled={
                                        isApproveOrRejectFinalStatus ||
                                        isActionDisabled(approveUnitAction, row) ||
                                        Boolean(
                                          approveUnitAction?.condition && !approveUnitAction.condition(row)
                                        )
                                      }
                                    >
                                      <Iconify
                                        icon="solar:pen-bold"
                                        sx={{
                                          color: isApproveOrRejectFinalStatus ? 'disabled.text' : 'inherit',
                                        }}
                                      />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              );
                            }

                            // Get role-based actions for this row
                            const rowActions = (getRowActions && typeof getRowActions === 'function' ? getRowActions(row) : [])
                              ?.filter((action) => !action?.visible || action?.visible(row)) ?? [];

                            // Don't render actions column if no actions are available
                            if (!rowActions || !Array.isArray(rowActions) || rowActions.length === 0) {
                              return (
                                <TableCell key={col?.id}>
                                  {useTab && isApprovalUnitView ? null : '-'}
                                </TableCell>
                              );
                            }

                            // Check if there's a view and edit action
                            const viewAction = rowActions?.find(action => action?.id === 'view');
                            const editAction = rowActions?.find(action => action?.id === 'edit');
                            const showView = Boolean(viewAction);
                            const showEdit = Boolean(editAction);

                            // BIS: use ⋮ menu for Preview + Finance view (not standalone eye icon).
                            if (
                              (showView || showEdit) &&
                              userRole !== ROLES.FinanceAdmin &&
                              userRole !== ROLES.BIS &&
                              userRole !== ROLES.CRM
                            ) {
                            return (
                              <TableCell key={col?.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {showView && (
                                  <Tooltip title="View" placement="top" arrow>
                                    <IconButton
                                      color="default"
                                      onClick={() => {
                                        if (!row?.id) {
                                          toast.error('Invalid row data');
                                          return;
                                        }
                                        router.push(
                                          generateRoleBasedRoute(
                                            userRole,
                                            'eoi-records/finance-record-details',
                                            row?.id?.toString()
                                          )
                                        );
                                      }}
                                      disabled={isActionDisabled(viewAction, row) || (viewAction?.condition && !viewAction.condition(row))}
                                    >
                                      <Iconify icon="tabler:eye" />
                                    </IconButton>
                                  </Tooltip>
                                )}

                                {showEdit && (
                                  <Tooltip title="Edit" placement="top" arrow>
                                    <IconButton
                                      color="default"
                                      onClick={() => {
                                        if (!row?.id) {
                                          toast.error('Invalid row data');
                                          return;
                                        }
                                        setSelectedRowId(row?.id);
                                        setTransactionData({
                                          refundDate: '',
                                          refundTransactionId: '',
                                          internalRefNumber: '',
                                          comments: '',
                                          paidAmount:''
                                        });
                                        setOpenEditDialog(true);
                                      }}
                                      disabled={isActionDisabled(editAction, row) || (editAction?.condition && !editAction.condition(row))}
                                    >
                                      <Iconify icon="solar:pen-bold" sx={{ color: isActionDisabled(editAction, row) || (editAction?.condition && !editAction.condition(row)) ? 'disabled.text' : 'black' }} />
                                    </IconButton>
                                </Tooltip>
                                )}
                              </Box>
                              </TableCell>
                            )}
                            
                            // If no view action, show the menu with other actions
                            return (
                              <TableCell key={col?.id}>
                                <IconButton
                                  color={popovers[`${row.id}-actions`] ? 'inherit' : 'default'}
                                  onClick={(e) => handlePopoverOpen(e, row?.id, 'actions')}
                                >
                                  <Iconify icon="eva:more-vertical-fill" />
                                </IconButton>

                                <CustomPopover
                                  open={Boolean(popovers[`${row.id}-actions`])}
                                  anchorEl={popovers[`${row.id}-actions`]}
                                  onClose={() => handlePopoverClose(row.id, 'actions')}
                                  slotProps={{ arrow: { placement: 'right-top' } }}
                                > 
                                  <MenuList>
                                    {(() => {
                                      const sfdcRowEligibility = evaluateEoiRowSfdcEligibility(row);
                                      return rowActions?.map((action) => {
                                      if (!action || !action.id) return null;
                                      // Handle different action types
                                      switch (action.id) {
                                        case 'viewCustomer':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={async () => {
                                                setCopyLinkPopup({
                                                  open: true,
                                                  voucherId: (row as any)?.voucherId ?? row?.id,
                                                  rowId: row?.id
                                                })
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={
                                                isActionDisabled(action, row) ||
                                                (action?.condition && !action.condition(row))
                                              }
                                            >
                                              <Typography
                                                variant="body2"
                                                sx={{
                                                  color: action?.color
                                                    ? `${action.color}.main`
                                                    : 'inherit',
                                                }}
                                              >
                                                {action?.label || 'Copy Link'}
                                              </Typography>
                                            </MenuItem>
                                          );

                                        case 'view':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (!row?.id) {
                                                  toast.error('Invalid row data');
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                router.push(
                                                  generateRoleBasedRoute(
                                                    userRole,
                                                    'eoi-records/finance-record-details',
                                                    row?.id?.toString()
                                                  )
                                                );
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row) || (action?.condition && !action.condition(row))}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || 'View'}
                                              </Typography>
                                            </MenuItem>
                                          );

                                        case 'edit':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (!row?.id) {
                                                  toast.error('Invalid row data');
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                setSelectedRowId(row?.id);
                                                setTransactionData({
                                                  refundDate: '',
                                                  refundTransactionId: '',
                                                  internalRefNumber: '',
                                                  comments: '',
                                                  paidAmount: '',
                                                });
                                                setOpenEditDialog(true);
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row) || (action?.condition && !action.condition(row))}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || 'Edit'}
                                              </Typography>
                                            </MenuItem>
                                          );

                                        case 'editEOI':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (!row?.id) {
                                                  toast.error("Invalid row data");
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }                                                
                                                route.push(generateRoleBasedRoute(userRole,'eoi-records/edit', String(row?.id)));
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row)}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || 'Edit EOI'}
                                              </Typography>
                                            </MenuItem>
                                          );
                                          // Change source Action popover 
                                        case 'changeSource':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (!row?.id) {
                                                  toast.error("Invalid row data");
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }                                           
                                                route.push(generateRoleBasedRoute(userRole,'eoi-records/change-source/create', String(row?.id)));
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row, userRole) || row?.isChangeRequestPending}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || 'Edit EOI'}
                                              </Typography>
                                            </MenuItem>
                                          );
                                        case 'assignClosingRM':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (!row?.id) {
                                                  toast.error("Invalid row data");
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }

                                                const sourcingRM = row?.sourcingRm 
                                                  ? { userName: row.sourcingRm?.name, userId: String(row.sourcingRm?.id) } 
                                                  : null;

                                                const closingRM = row?.closingRm
                                                  ? { userName: row.closingRm?.name, userId: String(row.closingRm?.id) }
                                                  : null;

                                                if (sourcingRM) setSourcingRMOptions([sourcingRM]);
                                                if (closingRM) setRMOptions([closingRM]);

                                                setClosingRMDialog({ 
                                                  open: true, 
                                                  id: row?.id, 
                                                  sourcingRM,
                                                  selectedRM: closingRM, 
                                                });
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row) || (action?.condition && !action.condition(row))}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || 'Assign RM'}
                                              </Typography>
                                            </MenuItem>
                                          );
                                          case 'cancelEOI':
                                          case 'requestCancellation':
                                          case 'approveCancellation':
                                          case 'EOI_converted':
                                          case 'deleteEoi':
                                          case 'restoreEoi':
                                            return (
                                              <MenuItem
                                                key={action.id}
                                                onClick={() => {
                                                  if (!row?.id) {
                                                    toast.error('Invalid row data');
                                                    handlePopoverClose(row.id, 'actions');
                                                    return;
                                                  }
                                                  setActionDialog({
                                                    open: true,
                                                    id: row.id,
                                                    reason: '',
                                                    type: action.id as any,
                                                  });
                                                  handlePopoverClose(row.id, 'actions');
                                                }}
                                                disabled={isActionDisabled(action, row, userRole) || (action.condition && !action.condition(row))}
                                              >
                                                <Typography variant="body2" sx={{ color: action?.color === 'error' ? '#B71D18' : 'inherit' }}>
                                                  {action.label}
                                                </Typography>
                                              </MenuItem>
                                            );
                         
                                        case 'crmCancellationAction':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (!row?.id) {
                                                  toast.error('Invalid row data');
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                if (row?.formStatus === EOIFormStatus.CANCEL_ACCEPTED) {
                                                  setActionDialog({
                                                    open: true,
                                                    id: row.id,
                                                    reason: '',
                                                    type: 'crmCancellationAccepted',
                                                  });
                                                } else {
                                                  setCrmCancellationDialog({
                                                    open: true,
                                                    id: row.id,
                                                    formStatus: row?.formStatus ?? null,
                                                  });
                                                }
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row)}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label}
                                              </Typography>
                                            </MenuItem>
                                          );

                                        case 'verify':
                                        case 'requestChanges':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (!row?.id) {
                                                  toast.error('Invalid row data');
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                setVoucherStatusDialog({
                                                  open: true,
                                                  id: row?.id,
                                                  action: action.id as 'verify' | 'requestChanges',
                                                  comment: '',
                                                });
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row, userRole)}
                                            >
                                              <Typography
                                                variant="body2"
                                                sx={{ color: action?.color === 'error' ? '#B71D18' : 'inherit' }}
                                              >
                                                {action.label}
                                              </Typography>
                                            </MenuItem>
                                          );

                                        case 'previewForm':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (!row?.id) {
                                                  toast.error("Invalid row data");
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }

                                                const url = generateRoleBasedRoute(
                                                  userRole,
                                                  'preview-voucher',
                                                  String(row?.id)
                                                );

                                                // Open in new tab
                                                window.open(url, '_blank', 'noopener,noreferrer');

                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row) || (action?.condition && !action.condition(row))}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || 'Preview Form'}
                                              </Typography>
                                            </MenuItem>
                                          );

                                          case 'mapAndConvertEOI':
                                          if (!row?.preferredUnit) return null;
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (!row?.id) {
                                                  toast.error("Invalid row data");
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }

                                                setSelectedBlockingId(row?.blockingId);
                                                setMapConvertDialogOpen(true);
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row) || (action?.condition && !action.condition(row))}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {jsonValue.eoiConvertDialog.title}
                                              </Typography>
                                            </MenuItem>
                                          );
                                          case 'exportBookingForm':
                                          return (
                                            <MenuItem
                                              key={action?.id}
                                              onClick={() => {
                                                if (!row?.id || !row?.opportunityId) {
                                                  toast.error("Invalid row data");
                                                  handlePopoverClose(row?.id, 'actions');
                                                  return;
                                                }
                                                handleExportBookingForm(row?.opportunityId, row?.id);
                                              }}
                                              disabled={isExporting || isActionDisabled(action, row) || (action?.condition && !action.condition(row))}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {isExporting ? 'Exporting...' : action?.label || 'Export Booking Form'}
                                              </Typography>
                                            </MenuItem>
                                          );

                                        case 'manageSfdcOpportunity':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (row?.id == null) {
                                                  toast.error(uiText.manageSfdc.invalidRowData);
                                                  if (row?.id) handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                const rowAny = row as Record<string, unknown>;
                                                // API listing returns id (number) and voucherId (string). Manage-SFDC API expects numeric id.
                                                const voucherId = Number(row.id);
                                                if (Number.isNaN(voucherId)) {
                                                  toast.error(uiText.manageSfdc.invalidVoucherId);
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                setManageSfdcDialog({
                                                  open: true,
                                                  voucherId,
                                                  sfdcEnquiryId: String(rowAny?.sfdcEnquiryId  ?? ''),
                                                  opportunityId: String(rowAny?.opportunityId  ?? ''),
                                                });
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row)}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || uiText.actions.manageSfdcOpportunity}
                                              </Typography>
                                            </MenuItem>
                                          );

                                        case 'createLeadsOnSFDC':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                const voucherId = Number(row?.id);
                                                if (row?.id == null || Number.isNaN(voucherId)) {
                                                  toast.error(uiText.manageSfdc.invalidVoucherId);
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                const campaignId = Number(
                                                  row?.campaign?.id ?? row?.campaignId
                                                );
                                                if (Number.isNaN(campaignId)) {
                                                  toast.error('Campaign is required for this action');
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                setEoiSfdcPushDialog({
                                                  open: true,
                                                  voucherId,
                                                  campaignId,
                                                  type: 'create',
                                                });
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={
                                                isActionDisabled(action, row) ||
                                                sfdcRowEligibility.isCreateDisabled
                                              }
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || uiText.campaignListing.actionsLabel.createLeadsOnSFDC}
                                              </Typography>
                                            </MenuItem>
                                          );

                                        case 'convertLeadsOnSFDC':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                const voucherId = Number(row?.id);
                                                if (row?.id == null || Number.isNaN(voucherId)) {
                                                  toast.error(uiText.manageSfdc.invalidVoucherId);
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                const campaignId = Number(
                                                  row?.campaign?.id ?? row?.campaignId
                                                );
                                                if (Number.isNaN(campaignId)) {
                                                  toast.error('Campaign is required for this action');
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                setEoiSfdcPushDialog({
                                                  open: true,
                                                  voucherId,
                                                  campaignId,
                                                  type: 'convert',
                                                });
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={
                                                isActionDisabled(action, row) ||
                                                sfdcRowEligibility.isConvertDisabled
                                              }
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || uiText.campaignListing.actionsLabel.convertLeadsOnSFDC}
                                              </Typography>
                                            </MenuItem>
                                          );

                                        case 'preBookingDetails':
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                if (!row?.id) {
                                                  toast.error("Invalid row data");
                                                  handlePopoverClose(row.id, 'actions');
                                                  return;
                                                }
                                                route.push(generateRoleBasedRoute(userRole, 'eoi-records/pre-booking-form', String(row?.id)));
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row) || (action?.condition && !action.condition(row))}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || 'Complete Pre-Booking Details'}
                                              </Typography>
                                            </MenuItem>
                                          );

                                        default:
                                          return (
                                            <MenuItem
                                              key={action.id}
                                              onClick={() => {
                                                console.warn(`Action ${action?.id || 'unknown'} not implemented`);
                                                handlePopoverClose(row.id, 'actions');
                                              }}
                                              disabled={isActionDisabled(action, row)}
                                            >
                                              <Typography variant="body2" sx={{ color: action?.color ? `${action.color}.main` : 'inherit' }}>
                                                {action?.label || 'Action'}
                                              </Typography>
                                            </MenuItem>
                                          );
                                      }
                                    });
                                  })()}
                                  </MenuList>
                                </CustomPopover>
                              </TableCell>
                            );
                          }

                          if (col?.id === 'uniqueReferenceId') {
                            return <TableCell key={col?.id}>{value || '-'}</TableCell>;
                          }
                          if (col?.id === 'paidVoucherId') {
                            return <TableCell key={col?.id}>{value || '-'}</TableCell>;
                          }
                          if (col?.id === 'createdAt' || col?.id === 'finalPaidDate' ||  col?.id === 'requestedDate' ||  col?.id === 'reviewDate') {
                            return <TableCell key={col?.id}>{formatDateIST(value as string)}</TableCell>;
                          }

                          // Handle special columns like closingRm and sourcingRm that have {id, name} format
                          if (['closingRm', 'sourcingRm'].includes(col?.id || '')) {
                            const displayValue = value && typeof value === 'object' && value !== null 
                              ? (value as any)?.name || (value as any)?.id || '-'
                              : value || '-';
                            return <TableCell key={col?.id}>{displayValue}</TableCell>;
                          }
                          
                          if (col?.id === 'dob' || col?.id === 'slotDate') {
                            return <TableCell key={col?.id}>{formatDateIST(value as string, {hideTime: true})}</TableCell>;
                          }

                          if (col?.id === 'slotStartTime') {
                            return <TableCell key={col?.id}>{formatTimeToAMPM(value as string)}</TableCell>;
                          }
                          
                          return (
                            <TableCell key={col?.id}>
                              {typeof value === 'object' && value !== null
                                ? '-'
                                : value || '-'}
                            </TableCell>
                          );
                        }) : <TableCell>-</TableCell>}

                      </TableRow>
                      
                    ))
                  ) : (
                    <TableNoData notFound colSpan={visibleColumns.length} />
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          {/* Pagination */}
          <Box sx={fixedFooterPaginationStyles}>
            <TablePaginationCustom
              page={page - 1}
              count={count || 0}
              rowsPerPage={rowsPerPage}
              onPageChange={(e, newPage) => setPage(newPage + 1)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(Number.parseInt(e.target.value, 10) || 10);
                setPage(1);
              }}
              showResultsCount
              totalResults={count || 0}
            />
          </Box>

          <ConfirmDialog
            open={actionDialog.open}
            onClose={() => setActionDialog({ open: false, id: null, reason: '', type: null })}
            title={currentActionConfig?.title ?? ''}
            leftAlignTitle
            contentTextAlign="left"
            titlePadding="24px 24px 16px"
            content={
              <Stack spacing={2} sx={{ width: '100%', minWidth: 400 }}>
                {useStaticMessage ? (
                  <Typography variant="body2">
                    {(currentActionConfig as any)?.staticMessage ?? ''}
                  </Typography>
                ) : (
                  <>
                    <Typography variant="body2">
                      {currentActionConfig?.title
                        ? `Are you sure you want to ${currentActionConfig.title.toLowerCase()}?`
                        : ''}
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder={(currentActionConfig as any)?.placeholder ?? ''}
                      multiline
                      rows={4}
                      value={actionDialog.reason}
                      onChange={(e) =>
                        setActionDialog((prev) => ({ ...prev, reason: e.target.value }))
                      }
                      inputProps={{ maxLength: 500 }}
                      helperText={`${actionDialog.reason.length}/500 characters`}
                    />
                  </>
                )}
              </Stack>
            }
            showCloseButton
            action={
              <Button
                variant="contained"
                color="error"
                disabled={!useStaticMessage && !actionDialog.reason?.trim()}
                onClick={() => {
                  if (actionDialog.type === 'deleteEoi') {
                    handleActionDialogSubmit(
                      undefined,
                      deleteRestoreActionEnumStatus.DELETE
                    );
                  } else if (actionDialog.type === 'restoreEoi') {
                    handleActionDialogSubmit(
                      undefined,
                      deleteRestoreActionEnumStatus.RESTORE
                    );
                  } else if (useStaticMessage) {
                    handleActionDialogSubmit(CancellationActionEnum.APPROVE);
                  } else {
                    handleActionDialogSubmit(); // other actions
                  }
                }}
                sx={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#fff',
                  background: '#1A407D',
                  minWidth: { xs: '120px', lg: '204px' },
                  height: '48px',
                  '&:hover': { background: '#1A407D', boxShadow: 'none' },
                }}
              >
                {useStaticMessage
                  ? (currentActionConfig as any)?.confirmText ?? 'Approve'
                  : currentActionConfig?.confirmText ?? 'Confirm'}
              </Button>
            }
            cancelLabel={
              canRevokeCancellation
                ? CancellationActionEnum.REVOKE
                : useStaticMessage
                  ? (currentActionConfig as any)?.revokeLabel ?? 'Revoke'
                  : undefined
            }
            cancelDisabled={canRevokeCancellation && !actionDialog.reason?.trim()}
            onCancel={
              canRevokeCancellation
                ? () => handleActionDialogSubmit(CancellationActionEnum.REVOKE)
                : useStaticMessage
                  ? () => handleActionDialogSubmit(CancellationActionEnum.REVOKE)
                  : undefined
            }
          />

          {/* Manage SFDC Opportunity */}
          <ConfirmDialog
            open={manageSfdcDialog.open}
            onClose={() => setManageSfdcDialog((p) => ({ ...p, open: false }))}
            title={uiText.manageSfdc.title}
            leftAlignTitle
            contentTextAlign="left"
            isMedium
            showCancel={false}
            action={null}
            content={
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleManageSfdcSubmit();
                }}
                style={{ width: '100%' }}
              >
                <Stack spacing={2.5} sx={{ pt: 2, pb: 0.5, width: '100%', overflow: 'visible' }}>
                  <TextField
                    fullWidth
                    label={uiText.manageSfdc.sfdcEnquiryIdLabel}
                  value={manageSfdcDialog.sfdcEnquiryId}
                  onChange={(e) => setManageSfdcDialog((p) => ({ ...p, sfdcEnquiryId: e.target.value }))}
                  placeholder={uiText.manageSfdc.sfdcEnquiryIdPlaceholder}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiInputBase-root': { borderRadius: 1 }, '& .MuiInputLabel-root': { overflow: 'visible' } }}
                  />
                  <TextField
                    fullWidth
                    label={uiText.manageSfdc.opportunityIdLabel}
                  value={manageSfdcDialog.opportunityId}
                  onChange={(e) => setManageSfdcDialog((p) => ({ ...p, opportunityId: e.target.value }))}
                  placeholder={uiText.manageSfdc.opportunityIdPlaceholder}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiInputBase-root': { borderRadius: 1 } }}
                  />
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setManageSfdcDialog((p) => ({ ...p, open: false }))}
                    sx={{ fontSize: '15px', fontWeight: 600, color: '#1A407D', height: '48px', minWidth: '120px' }}
                  >
                    {uiText.button.cancel}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!manageSfdcDialog.sfdcEnquiryId?.trim()|| manageSfdcSubmitting}
                    sx={{
                      fontSize: '15px',
                      fontWeight: 600,
                      minWidth: { xs: '120px', lg: '204px' },
                      height: '48px',
                      background: '#1A407D',
                      '&:hover': { background: '#174A9D' },
                    }}
                  >
                    {manageSfdcSubmitting ? <CircularProgress size={20} color="inherit" /> : uiText.button.submit}
                  </Button>
                </Stack>
              </form>
            }
            showCloseButton
          />

          {/* EOI Records: Create / Convert leads on SFDC (voucherId in API body) */}
          <ConfirmDialog
            open={eoiSfdcPushDialog.open}
            showCancel
            cancelLabel={uiText.button.cancel}
            showDivider
            onClose={() => {
              setEoiSfdcPushDialog({
                open: false,
                voucherId: null,
                campaignId: null,
                type: null,
              });
            }}
            title={eoiSfdcConfirmText.eoiTitle}
            leftAlignTitle
            content={
              <Box sx={{ textAlign: 'left' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 400 }}>
                  {eoiSfdcConfirmText.eoiDesc1}
                </Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 400 }}>
                  {eoiSfdcConfirmText.desc2}
                </Typography>
              </Box>
            }
            action={
              <Button
                variant="contained"
                color="error"
                sx={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#fff',
                  background: '#1A407D',
                  minWidth: { xs: '120px', lg: '204px' },
                  height: '48px',
                  '&:hover': { background: '#1A407D', boxShadow: 'none' },
                }}
                disabled={eoiSfdcPushLoading}
                onClick={handleEoiPushLeadsToSFDC}
              >
                {eoiSfdcPushLoading ? (
                  <CircularProgress size={24} sx={{ color: '#fff' }} />
                ) : (
                  uiText.button.confirm
                )}
              </Button>
            }
          />

          {/* CRM Cancellation - Status 17: CancellationApproveDialogCRM */}
          <CancellationApproveDialogCRM
            open={
              crmCancellationDialog.open &&
              crmCancellationDialog.formStatus === EOIFormStatus.CANCEL_APPROVED
            }
            voucherId={crmCancellationDialog.id}
            onClose={() =>
              setCrmCancellationDialog({ open: false, id: null, formStatus: null })
            }
            onSuccess={() => {
              setCrmCancellationDialog({ open: false, id: null, formStatus: null });
              const params = {
                page,
                limit: rowsPerPage,
                search: debouncedSearch,
                primarySource: filters?.primarySource,
                campaignId: filters?.campaignId,
                leadStatus: filters?.leadStatus,
                ...(filters?.formStatus?.length ? { formStatus: filters?.formStatus } : {}),
                ...(filters?.paymentStatus?.length ? { paymentStatus: filters?.paymentStatus } : {}),
                ...(filters?.financeStatus?.length ? { financeStatus: filters?.financeStatus } : {}),
                sortBy: filters?.sortBy,
                deletionStatus: filters?.deletionStatus,
                ...(filters?.rmUsers?.length ? { rmUsers: filters?.rmUsers } : {}),
                ...(isCancellationsView ? { isCancellationTab: true } : {}),
              };
              dispatch(fetchEOIData(params));
            }}
          />

          {/* Assign Closing RM Dialog */}
          <ConfirmDialog
            open={closingRMDialog?.open}
            onClose={() => setClosingRMDialog({ open: false, id: null, sourcingRM: null, selectedRM: null })}
            title="Assign RM"
            content={
              <Stack
                spacing={2}
                sx={{
                  width: '100%',
                  minWidth: { xs: '280px', sm: '400px' },
                  maxWidth: { xs: '90vw', sm: '500px' },
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  <CustomAutocomplete
                    label="Sourcing RM"
                    options={sourcingRMOptions || []}
                    value={closingRMDialog?.sourcingRM || null}
                    inputValue={sourcingRMSearchQuery || ''}
                    onChange={(event, newValue) => {
                      setClosingRMDialog((prev) => ({ ...prev, sourcingRM: newValue }));
                    }}
                    onInputChange={(event, newInputValue) => {
                      setSourcingRMSearchQuery(newInputValue || '');
                    }}
                    placeholder="Search and select Sourcing RM"
                    noOptionsText={sourcingDebouncedRMSearch ? "No RMs found" : "Type to search RMs"}
                  />
                  <CustomAutocomplete
                    label="Closing RM"
                    options={rmOptions || []}
                    value={closingRMDialog?.selectedRM || null}
                    inputValue={rmSearchQuery || ''}
                    onChange={(event, newValue) => {
                      setClosingRMDialog((prev) => ({ ...prev, selectedRM: newValue }));
                    }}
                    onInputChange={(event, newInputValue) => {
                      setRMSearchQuery(newInputValue || '');
                    }}
                    placeholder="Search and select Closing RM"
                    noOptionsText={debouncedRMSearch ? "No RMs found" : "Type to search RMs"}
                  />
                </Box>
              </Stack>
            }
            action={
              <Button
                variant="contained"
                disabled={!closingRMDialog?.selectedRM}
                onClick={async () => {
                  if (!closingRMDialog?.id || !closingRMDialog?.selectedRM) return;
                  
                  try {
                    await dispatch(assignClosingRM({
                      id: closingRMDialog?.id,
                      sourcingRmId: Number(closingRMDialog?.sourcingRM?.userId),
                      closingRmId: Number(closingRMDialog?.selectedRM?.userId),
                    })).unwrap();
                    
                    setClosingRMDialog({ open: false, id: null, sourcingRM: null, selectedRM: null });
                    setSourcingRMSearchQuery('');
                    setRMSearchQuery('');
                    setSourcingRMOptions([]);
                    setRMOptions([]);
                    
                    // Refresh list
                    const params = {
                      page,
                      limit: rowsPerPage,
                      search: debouncedSearch,
                      primarySource: filters?.primarySource,
                      campaignId: filters?.campaignId,
                      leadStatus: filters?.leadStatus,
                      ...(filters?.formStatus?.length ? { formStatus: filters?.formStatus } : {}),
                      ...(filters?.paymentStatus?.length ? { paymentStatus: filters?.paymentStatus } : {}),
                      ...(filters?.financeStatus?.length ? { financeStatus: filters?.financeStatus } : {}),
                      sortBy: filters?.sortBy,
                      deletionStatus: filters?.deletionStatus,
                      ...(filters?.rmUsers?.length ? { rmUsers: filters?.rmUsers } : {}),
                      ...(isCancellationsView ? { isCancellationTab: true } : {}),
                    };
                    dispatch(fetchEOIData(params));
                  } catch (err: any) {
                    toast.error(err?.message || 'Failed to assign Closing RM');
                  }
                }}
                sx={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#fff',
                  background: '#1A407D',
                  minWidth: { xs: '120px', lg: '204px' },
                  height: '48px',
                  margin: 0,
                  '&:hover': {
                    background: '#1A407D',
                    boxShadow: 'none',
                  },
                }}
              >
                Assign RM
              </Button>
            }
          />

          {/* Edit Dialog */}
          <DynamicTransactionDialog
            open={openEditDialog}
            title="Refund - Transaction Details"
            transactionData={transactionData}
            onTransactionDataChange={(data) => setTransactionData(prev => ({ ...prev, ...data }))}
            onClose={() => {
              setOpenEditDialog(false);
              setSelectedRowId(null);
              setTransactionData({
                refundDate: '',
                refundTransactionId: '',
                internalRefNumber: '',
                comments: '',
                paidAmount:''
              });
            }}
            onSubmit={async () => {
              if (!selectedRowId || !transactionData?.refundDate || !transactionData?.refundTransactionId) {
                toast.error('Please fill in required fields');
                return;
              }
              
              try {
                // Call the API to update refund payment
                await dispatch(updateEOIRefundPayment({
                  voucherId: selectedRowId,
                  refundDate: transactionData?.refundDate,
                  refundTransactionId: transactionData?.refundTransactionId,
                  internalRefNumber: transactionData?.internalRefNumber,
                  comments: transactionData?.comments,
                  paidAmount: transactionData?.paidAmount
                })).unwrap();
                
                // Refresh the EOI data to show updated information
                const params = {
                  page,
                  limit: rowsPerPage,
                  search: debouncedSearch,
                  primarySource: filters?.primarySource,
                  campaignId: filters?.campaignId,
                  leadStatus: filters?.leadStatus,
                  ...(filters?.formStatus?.length ? { formStatus: filters?.formStatus } : {}),
                  ...(filters?.paymentStatus?.length ? { paymentStatus: filters?.paymentStatus } : {}),
                  ...(filters?.financeStatus?.length ? { financeStatus: filters?.financeStatus } : {}),
                  sortBy: filters?.sortBy,
                  deletionStatus: filters?.deletionStatus,
                  ...(filters?.rmUsers?.length ? { rmUsers: filters?.rmUsers } : {}),
                  ...(isCancellationsView ? { isCancellationTab: true } : {}),
                };
                await dispatch(fetchEOIData(params));
                
                // Close dialog and reset state
                setOpenEditDialog(false);
                setSelectedRowId(null);
                setTransactionData({
                  refundDate: '',
                  refundTransactionId: '',
                  internalRefNumber: '',
                  comments: '',
                  paidAmount: '',
                });
              } catch (error: any) {
                // Error handling is already done in the action (toast.error)
                console.error('Failed to update refund payment:', error);
              }
            }}
            submitButtonText="Update"
          />

          {/* Voucher Status Dialog */}
          <VoucherStatusDialog
            open={voucherStatusDialog.open}
            action={voucherStatusDialog.action} // now 'verify' | 'requestChanges'
            voucherId={voucherStatusDialog.id}
            comment={voucherStatusDialog.comment}
            setComment={(comment: string) =>
              setVoucherStatusDialog((prev) => ({ ...prev, comment }))
            }
            onClose={() =>
              setVoucherStatusDialog({
                open: false,
                id: null,
                action: 'verify', // default to generic action instead of MIS-specific
                comment: '',
              })
            }
              onSubmit={handleVoucherStatusSubmit}
            />

            {copyLinkPopup.open && (
              <ConfirmDialog
                open={copyLinkPopup.open}
                onClose={() =>
                  setCopyLinkPopup({ open: false, voucherId: null, rowId: null })
                }
                title={
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, }}>
                      {uiText.actions.viewCustomer}
                    </Typography>
                  </Box>
                }
                showCancel={false}
                showCloseButton
                showDivider
                sx={{
                  '& .MuiDialog-paper': {
                    margin: { xs: 1, sm: 3 },
                    marginBottom: 'auto',
                    width: { xs: 'calc(100% - 16px)', sm: 'auto' },
                    maxWidth: { xs: '95vw', sm: '600px' },
                    maxHeight: '90vh',
                    overflowY: 'auto',
                  },
                  '& .MuiDialogContent-root': {
                    marginBottom: 'auto',
                  },
                }}
                content={
                  <Stack
                    spacing={2}
                    sx={{
                      width: '100%',
                      minWidth: { xs: '280px', sm: '400px' },
                      maxWidth: { xs: '90vw', sm: '500px' },
                    }}
                  >
                    {/* 1. Section: Customer Booking Form */}
                    <Box>
                      {copyLinkPopup?.voucherId && (
                        <QRCodeGenerator
                          value={`${import.meta.env.VITE_VOUCHER_THANKYOU_LINK}/${copyLinkPopup.voucherId}`}
                          size={150}
                          sx={{ mb: 2 }}
                        />
                      )}
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                      >
                        {/* Copy Link */}
                        <Tooltip title={actions.copyUrl}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              if (!copyLinkPopup.voucherId) return;

                              const base = import.meta.env.VITE_VOUCHER_THANKYOU_LINK;
                              const url = `${base}/${copyLinkPopup.voucherId}`;

                              navigator.clipboard.writeText(url);
                              toast.success(actions.linkCopied);
                            }}
                            color="primary"
                            sx={{
                              flex: { xs: 1, sm: 'none' },
                              minWidth: { xs: 'auto', sm: '126px' },
                              height: '36px',
                              padding: '6px',
                            }}
                          >
                            <Box
                              component="img"
                              src={copyIcon}
                              alt="Copy"
                              sx={{ width: 20, height: 20 }}
                            />
                          </Button>
                        </Tooltip>

                        {/* Open Link in new tab */}

                        <Tooltip title={actions.openNewTab}>
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            sx={{
                              flex: { xs: 1, sm: 'none' },
                              minWidth: { xs: 'auto', sm: '126px' },
                              height: '36px',
                              padding: '6px',
                            }}
                            onClick={() => {
                              if (!copyLinkPopup.voucherId) return;
                              const base = import.meta.env.VITE_VOUCHER_THANKYOU_LINK;
                              const url = `${base}/${copyLinkPopup.voucherId}`;
                              window.open(url, '_blank');
                            }}
                          >
                            <Box
                              component="img"
                              src={openIcon}
                              alt="Open"
                              sx={{ width: 20, height: 20 }}
                            />
                          </Button>
                        </Tooltip>

                        {/* Share Link */}
                        <Tooltip title={actions.shareCxLink}>
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            sx={{
                              flex: { xs: 1, sm: 'none' },
                              minWidth: { xs: 'auto', sm: '126px' },
                              height: '36px',
                              padding: '6px',
                            }}
                            onClick={async () => {
                              if (!copyLinkPopup?.rowId) {
                                toast.error(actions.invalidRowData);
                                return;
                              }

                              try {
                                const result = await dispatch(
                                  sendEoiFormLink({ id: copyLinkPopup.rowId })
                                );

                                if (sendEoiFormLink.fulfilled.match(result)) {
                                  const data = result.payload;

                                  if (data?.response?.success) {
                                    toast.success(
                                      data?.response?.response?.message ||
                                      actions.voucherEmailSent
                                    );
                                  } else {
                                    toast.warning(
                                      data?.response?.response?.message ||
                                      actions.failVoucherFormEmail
                                    );
                                  }
                                } else {
                                  toast.error(actions.emailFailed);
                                }
                              } catch (err) {
                                console.error(err);
                                toast.error(actions.somethingWentWrong);
                              }
                            }}
                          >
                            <Box
                              component="img"
                              src={shareIcon}
                              alt="Share"
                              sx={{ width: 20, height: 20 }}
                            />
                          </Button>
                        </Tooltip>
                      </Stack>
                    </Box>

                  </Stack>
                }
                action={null}
              />
            )}

            {mapConvertDialogOpen && (
              <ConfirmDialog
                open={mapConvertDialogOpen}
                onClose={() => {
                  setMapConvertDialogOpen(false);
                  setSelectedBlockingId(null);
                }}
                title={jsonValue.eoiConvertDialog.title}
                content={
                  <Typography sx={{ fontSize: '14px', fontWeight: 500, textAlign: 'left' }}>
                    {jsonValue.eoiConvertDialog.confirmMessage}
                  </Typography>
                }
                showDivider
                leftAlignTitle
                contentTextAlign="left"
                showCancel
                cancelLabel={uiText.button.no}
                action={
                  <Button
                    variant="contained"
                    sx={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#fff',
                      background: '#1A407D',
                      minWidth: { xs: '120px', lg: '204px' },
                      height: '48px',
                      margin: 0,
                      '&:hover': {
                        background: '#1A407D',
                        boxShadow: 'none',
                      },
                    }}
                    onClick={handleReleaseMappedUnitConfirm}
                    disabled={releaseInventoryUnitLoading}
                  >
                    {releaseInventoryUnitLoading ? (
                      <CircularProgress size={22} sx={{ color: '#fff' }} />
                    ) : (
                      uiText.button.yes
                    )}
                  </Button>
                }
              />
            )}

            <TransactionRemarksDialog
              open={approveDialog.open}
              showAllFields={false} 
              action="approve"
              remark={{ comments: approveDialog.comment }}
              setRemark={(value) =>
                setApproveDialog((prev) => ({
                  ...prev,
                  comment: value.comments || '',
                }))
              }
              onSubmit={handleApproveUnit}
              onReject={handleRejectUnit}
              onClose={() =>
                setApproveDialog({ open: false, id: null, comment: '' })
              }
          />
        </Card>
      )}
    </DashboardContent>
  );
}
