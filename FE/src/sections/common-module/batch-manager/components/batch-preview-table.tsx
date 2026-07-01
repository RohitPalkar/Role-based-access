

import { toast } from 'sonner';
import { useRef, useMemo, useState, useEffect, useCallback } from "react";

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { BatchStatus } from 'src/utils/constant';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import {
  getTableStyles,
  tableContainerStyles,
  tableScrollbarStyles,
  calculateTableMinWidth,
  scrollableTableContentStyles,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { BATCH_MANAGER_PREVIEW_GRID_COLUMNS } from 'src/config/role-based-permissions';
import { exportBatchListing, fetchBatchSlotsListAction } from 'src/redux/actions/common-module/batch-manager-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from "src/components/animate";
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { AddBatchModal } from './add-batch-modal';
import { BatchPreviewTableRow } from './batch-preview-table-row';
import { BatchPreviewTableFiltersResult } from './batch-preview-table-filters-result';
import { BatchPreviewToolbar, type BatchPreviewFilters } from './batch-preview-toolbar';
import { mapApiResultToRows, type BatchPreviewRow, type BatchPreviewEditablePatch } from '../utils/batch-preview-build-rows';


// ----------------------------------------------------------------------

type BatchManagerLocale = typeof uiText.batchManager & {
  previewTable: Record<string, string>;
  generateBatchesDisabledFallback: string;
  generateBatchesToast: string;
};

const batchManagerLocale = uiText.batchManager as BatchManagerLocale;

export type BatchPreviewTableProps = {
  batchName?: string;
  /** Parent calls the update API and replaces `rows` from the response (no client-side timeline rebuild). */
  onRowApply?: (rowIndex: number, patch: BatchPreviewEditablePatch) => void;
  /** When false, the preview table is read-only until the user runs “Preview Batch”. */
  editingEnabled?: boolean;
  /** When true, the primary “Generate Batches” action stays disabled (e.g. pending capacity or date window rule). */
  generateBatchesDisabled?: boolean;
  /** Shown in a tooltip when `generateBatchesDisabled` is true. */
  generateBatchesDisabledReason?: string;
  onGenerateBatches?: () => void;
  isEditMode?: boolean;
  mode?: 'preview' | 'listing';
  userRole: string | null;
  batchId?: string;
  rows?: BatchPreviewRow[];
  refreshKey?: number;
  isUserMapped?: boolean;
  batchStatus?: string;
};

function BatchPreviewTable({
  onRowApply,
  editingEnabled = true,
  generateBatchesDisabled = false,
  generateBatchesDisabledReason = '',
  onGenerateBatches,
  isEditMode,
  mode = 'preview',
  userRole,
  batchId,
  rows: previewRows = [],
  refreshKey = 0,
  isUserMapped=false,
  batchStatus=BatchStatus.ACTIVE,
}: Readonly<BatchPreviewTableProps>) {
  const { columns: previewColumns, actions: previewActions, canCreate } = useRoleBasedPermissions({
    module: 'batchManager',
  });
  const dispatch = useAppDispatch();
  const { batchSlotsData, loading } = useAppSelector((state) => state.batchManager);
  const { columns: listingColumns, actions: listingAction, canExport } = useRoleBasedPermissions({ module: 'batchSlotListing', });
  const table = useTable({ defaultRowsPerPage: 10 });
  const roleColumns = mode === 'preview' ? previewColumns : listingColumns;
  const roleActions = mode === 'preview' ? previewActions : listingAction;

  const [search, setSearch] = useState('');
  const [addBatchModalOpen, setAddBatchModalOpen] = useState(false);
  const [filterState, setFilterState] = useState<BatchPreviewFilters>({
    startDate: null,
    endDate: null,
  });
  const lastParamsRef = useRef<string>('');

  const actionIdSet = useMemo(
    () => new Set(roleActions.map((a) => a.id).filter((id): id is string => Boolean(id))),
    [roleActions]
  );

  const canReset = !!search || !!filterState?.startDate || !!filterState?.endDate;

  // API call for data fetching
  useEffect(() => {
    if (batchId) {
      const params = {
        batchId,
        page: table.page + 1,
        limit: table.rowsPerPage,
        search: search || undefined,
        startDate: filterState.startDate || undefined,
        endDate: filterState.endDate || undefined,
      };

      const trackingParams = { ...params, refreshKey };
      const paramsStr = JSON.stringify(trackingParams);
      if (paramsStr === lastParamsRef.current) {
        return;
      }
      lastParamsRef.current = paramsStr;

      dispatch(fetchBatchSlotsListAction(params)).unwrap().catch((error) => {
        toast.error(error);
      });
    }
  }, [dispatch, batchId, table.page, table.rowsPerPage, search, filterState, refreshKey]);

  const rows = useMemo(() => {
    if (batchSlotsData?.result?.length) {
      return mapApiResultToRows(batchSlotsData.result);
    }
    return mode === 'preview' ? previewRows : [];
  }, [batchSlotsData?.result, mode, previewRows]);

  const totalBatches = batchSlotsData?.total || 0;

  const handleRefresh = useCallback(() => {
    if (batchId) {
      const params = {
        batchId,
        page: table.page + 1,
        limit: table.rowsPerPage,
        search: search || undefined,
        startDate: filterState.startDate || undefined,
        endDate: filterState.endDate || undefined,
      };
      // Clear the ref to ensure the manual refresh is not blocked by the deduplication logic
      lastParamsRef.current = '';
      dispatch(fetchBatchSlotsListAction(params)).unwrap().catch((error) => {
        toast.error(error);
      });
    }
  }, [batchId, table.page, table.rowsPerPage, search, filterState, dispatch]);

  const handleApplyFilters = useCallback((newFilters: BatchPreviewFilters) => {
    setFilterState(newFilters);
    table.onResetPage();
  }, [table]);

  const handleResetFilters = useCallback(() => {
    setFilterState({
      startDate: null,
      endDate: null,
    });
    table.onResetPage();
  }, [table]);

  const handleRemoveFilter = useCallback((filterName: keyof BatchPreviewFilters, value: string[] | null) => {
    setFilterState((prev) => ({ ...prev, [filterName]: value }));
    table.onResetPage();
  }, [table]);


  const tableHeadFromRole = useMemo(() => {
    const fromRole = roleColumnsToDefinitions(roleColumns);
    if (fromRole.length && fromRole.some((c) => c.id === 'sequence')) {
      return fromRole;
    }
    return roleColumnsToDefinitions(BATCH_MANAGER_PREVIEW_GRID_COLUMNS);
  }, [roleColumns]);

  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;

  const filteredColumns = useMemo(
    () =>
      batchStatus === BatchStatus.ARCHIVED
        ? visibleColumns.filter((col) => col.id !== 'actions')
        : visibleColumns,
    [visibleColumns, batchStatus]
  );

  const previewTableHeadLabel = useMemo(
    () => filteredColumns.map((c) => (c.id === 'actions' ? { ...c, align: 'center' as const } : c)),
    [filteredColumns]
  );

  const dynamicMinWidth = calculateTableMinWidth(filteredColumns?.length ? filteredColumns : tableHeadFromRole);


  const rowApplyHandler = useMemo(() => {
    if (!editingEnabled || !onRowApply || !actionIdSet.has('editBatch')) {
      return undefined;
    }
    return onRowApply;
  }, [actionIdSet, editingEnabled, onRowApply]);

  const pt = batchManagerLocale.previewTable;
  const totalCount = Number(totalBatches) || 0;
  const headingTotal = pt.headingTotalBatches?.replace('{{total}}', String(totalCount)) || '';
  const previewHeading = `${pt.headingPrefix || ''} ${headingTotal}`;

  const handleExport = () => {
    if (!batchId) {
      toast.error('Batch ID is required');
      return;
    }

    dispatch(
      exportBatchListing({
        batchId,
        ...(search && { search }),
        ...(filterState.startDate && { startDate: filterState.startDate }),
        ...(filterState.endDate && { endDate: filterState.endDate }),
      })
    );
  };

  return (
    <>
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
        <Card sx={tableContainerStyles}>
          <BatchPreviewTableHeader
            mode={mode}
            previewHeading={previewHeading}
            pt={pt}
            canCreate={canCreate}
            isEditMode={isEditMode}
            onAddBatch={() => setAddBatchModalOpen(true)}
          />

          <BatchPreviewToolbar
            search={search}
            onSearchChange={setSearch}
            onResetPage={table.onResetPage}
            columnManager={columnManager}
            filters={filterState}
            onApplyFilters={handleApplyFilters}
            canExport={canExport}
            handleExport={handleExport}
            mode={mode}
            rows={rows}
          />

          {canReset && (
            <BatchPreviewTableFiltersResult
              search={search}
              setSearch={setSearch}
              filters={filterState}
              onResetFilters={handleResetFilters}
              onRemoveFilter={handleRemoveFilter}
              onResetPage={table.onResetPage}
              totalResults={totalBatches}
              sx={{ px: 2, pb: 1 }}
            />
          )}

          <Box sx={scrollableTableContentStyles}>
            <Scrollbar sx={tableScrollbarStyles}>
              <Table
                stickyHeader
                size={table.dense ? 'small' : 'medium'}
                sx={getTableStyles(dynamicMinWidth)}
              >
                <TableHeadCustom
                  headLabel={previewTableHeadLabel}
                  orderBy={table.orderBy}
                  order={table.order}
                  onSort={table.onSort}
                  numSelected={0}
                  rowCount={totalBatches}
                />
                <TableBody>
                  {rows?.length > 0 ? (
                    rows?.map((row) => {
                      const rowIndex = rows?.findIndex((r) => r.id === row.id);
                      return (
                        <BatchPreviewTableRow
                          key={row.id}
                          row={row}
                          rowIndex={rowIndex}
                          visibleColumns={filteredColumns}
                          onRowApply={rowApplyHandler}
                          onRefresh={handleRefresh}
                          mode={mode}
                          userRole={userRole}
                          roleActions={roleActions}
                          isUserMapped={isUserMapped}
                        />
                      );
                    })
                  ) : (
                    <TableNoData notFound colSpan={filteredColumns?.length || tableHeadFromRole.length} />
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              borderTop: (theme) => `1px dashed ${theme.palette.divider}`,
              backgroundColor: 'background.paper',
              zIndex: 1,
            }}
          >
            <TablePaginationCustom
              page={table.page}
              count={totalBatches}
              rowsPerPage={table.rowsPerPage}
              onPageChange={table.onChangePage}
              onRowsPerPageChange={table.onChangeRowsPerPage}
              showResultsCount
              totalResults={totalBatches}
            />
          </Box>

          <BatchPreviewTableFooter
            mode={mode}
            loading={loading}
            actionIdSet={actionIdSet}
            roleActions={roleActions}
            generateBatchesDisabled={generateBatchesDisabled}
            generateBatchesDisabledReason={generateBatchesDisabledReason}
            onGenerateBatches={onGenerateBatches}
          />
        </Card>

      )}
      <AddBatchModal
        open={addBatchModalOpen}
        onClose={() => setAddBatchModalOpen(false)}
        batchId={batchId}
        onRefresh={handleRefresh}
      />
    </>
  );
}

// ----------------------------------------------------------------------

type HeaderProps = {
  mode: string;
  previewHeading: string;
  pt: any;
  canCreate: boolean;
  isEditMode?: boolean;
  onAddBatch: () => void;
};

function BatchPreviewTableHeader({
  mode,
  previewHeading,
  pt,
  canCreate,
  isEditMode,
  onAddBatch,
}: Readonly<HeaderProps>) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pt: 2, pb: 1 }}>
      <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 600 }}>
        {mode === 'preview' ? previewHeading : pt.batchListing}
      </Typography>
      {canCreate && isEditMode && (
        <Button variant="contained" className="primaryBtn" onClick={onAddBatch}>
          {pt.addBatches}
        </Button>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

type FooterProps = {
  mode: string;
  loading: boolean;
  actionIdSet: Set<string>;
  roleActions: any[];
  generateBatchesDisabled: boolean;
  generateBatchesDisabledReason: string;
  onGenerateBatches?: () => void;
};

function BatchPreviewTableFooter({
  mode,
  loading,
  actionIdSet,
  roleActions,
  generateBatchesDisabled,
  generateBatchesDisabledReason,
  onGenerateBatches,
}: Readonly<FooterProps>) {
  const generateBatchesAction = roleActions.find((a) => a.id === 'generateBatches');
  
  if (!((actionIdSet.has('generateBatches') || actionIdSet.has('sharePreview')) && mode === 'preview')) {
    return null;
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      justifyContent="flex-end"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ px: 2, py: 2 }}
    >
      {actionIdSet.has('generateBatches') && (
        generateBatchesDisabled ? (
          <Tooltip title={generateBatchesDisabledReason || batchManagerLocale.generateBatchesDisabledFallback} arrow>
            <Box component="span" sx={{ display: 'inline-block' }}>
              <Button variant="contained" color="primary" disabled>
                {generateBatchesAction?.label ?? 'Map EOIs to batches'}
              </Button>
            </Box>
          </Tooltip>
        ) : (
          <LoadingButton
            variant="contained"
            color="primary"
            onClick={onGenerateBatches}
            loading={loading}
            sx={{ '&:hover': { backgroundColor: '#174a9d' } }}
          >
            {generateBatchesAction?.label ?? 'Map EOIs to batches'}
          </LoadingButton>
        )
      )}
    </Stack>
  );
}

export default BatchPreviewTable;