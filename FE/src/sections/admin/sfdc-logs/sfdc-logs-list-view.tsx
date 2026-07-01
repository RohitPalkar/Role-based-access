import { useDebounce } from 'minimal-shared/hooks';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Stack,
  Table,
  Button,
  Tooltip,
  TableBody,
  IconButton,
  Typography,
} from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import {
  getTableStyles,
  tableContainerStyles,
  tableScrollbarStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
  scrollableTableContentStyles,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { getSFDCLogById } from 'src/services/admin-services/sdfc-logs-service';
import { fetchSFDCLogsList, type FetchSFDCLogsListArgs } from 'src/redux/actions/admin/sfdc-logs-actions';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { ConfirmDialog } from 'src/components/custom-dialog/confirm-dialog';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { JsonSyntaxView } from './components/json-syntax-view';
import SfdcLogsTableRow from './components/sfdc-logs-table-row';
import { SfdcLogsTableToolbar } from './components/sfdc-logs-table-toolbar';
import { SfdcLogsTableFiltersResult } from './components/sfdc-logs-table-filters-result';

/** Resolves `payload` and SFDC `response` from list/detail API shapes (flat `data` or wrapped envelope). */
function getPayloadAndSfdcResponse(raw: unknown): { payload: unknown; sfdcResponse: unknown } {
  if (raw == null || typeof raw !== 'object') {
    return { payload: null, sfdcResponse: null };
  }
  const r = raw as Record<string, unknown>;
  if ('payload' in r && 'response' in r) {
    return { payload: r.payload, sfdcResponse: r.response };
  }
  const nested = r.response as Record<string, unknown> | undefined;
  const data = nested?.data as Record<string, unknown> | undefined;
  if (data && typeof data === 'object' && 'payload' in data) {
    return { payload: data.payload, sfdcResponse: data.response };
  }
  const flatData = r.data as Record<string, unknown> | undefined;
  if (flatData && typeof flatData === 'object' && 'payload' in flatData) {
    return { payload: flatData.payload, sfdcResponse: flatData.response };
  }
  return { payload: null, sfdcResponse: null };
}

async function copyJsonToClipboard(value: unknown) {
  const text = JSON.stringify(value ?? null, null, 2);
  await navigator.clipboard.writeText(text);
}

function totalFromPayloadBlock(p: Record<string, unknown>, logsLen: number): number {
  if (typeof p.total === 'number') {
    return p.total;
  }
  if (typeof p.count === 'number') {
    return p.count;
  }
  return logsLen;
}

function normalizeLogsPayload(payload: unknown): { logs: Record<string, unknown>[]; total: number } {
  if (!payload) {
    return { logs: [], total: 0 };
  }
  if (Array.isArray(payload)) {
    return { logs: payload as Record<string, unknown>[], total: payload.length };
  }
  if (typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.logs)) {
      const logs = p.logs as Record<string, unknown>[];
      return { logs, total: totalFromPayloadBlock(p, logs.length) };
    }
    if (Array.isArray(p.data)) {
      const logs = p.data as Record<string, unknown>[];
      return { logs, total: totalFromPayloadBlock(p, logs.length) };
    }
  }
  return { logs: [], total: 0 };
}

const SfdcLogsListView = () => {
  const { columns: roleColumns, actions: roleActions } = useRoleBasedPermissions({ module: 'sfdcLogs' });
  const { sfdcLogs: rawPayload, loading, error } = useAppSelector((state) => state.sfdcLogsHistory);
  const table = useTable();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState('');
  const [logEvent, setLogEvent] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null);

  const handleViewLog = useCallback(async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailRecord(null);
    try {
      const data = await getSFDCLogById(id);
      setDetailRecord((data && typeof data === 'object' ? data : { value: data }) as Record<string, unknown>);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load SFDC log');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailRecord(null);
  }, []);

  const { allLogs, totalCount } = useMemo(() => {
    const raw = rawPayload as
      | { logs?: Record<string, unknown>[]; total?: number; count?: number }
      | null
      | undefined;
    if (raw && Array.isArray(raw.logs)) {
      return {
        allLogs: raw.logs,
        totalCount: totalFromPayloadBlock(raw as Record<string, unknown>, raw.logs.length),
      };
    }
    const n = normalizeLogsPayload(rawPayload);
    return { allLogs: n.logs, totalCount: n.total };
  }, [rawPayload]);

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  const loadLogs = useCallback(() => {
    const args: FetchSFDCLogsListArgs = {
      page: table.page + 1,
      limit: table.rowsPerPage,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(logEvent.trim() ? { logEvent: logEvent.trim() } : {}),
      ...(table.orderBy ? { sortBy: `${table.orderBy}:${table.order}` } : {}),
    };
    dispatch(fetchSFDCLogsList(args));
  }, [
    dispatch,
    table.page,
    table.rowsPerPage,
    table.orderBy,
    table.order,
    debouncedSearch,
    logEvent,
  ]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const canReset = !!search.trim() || !!logEvent.trim();

  const { payload: detailPayload, sfdcResponse: detailSfdcResponse } = useMemo(
    () => getPayloadAndSfdcResponse(detailRecord),
    [detailRecord]
  );

  const handleCopyPayload = useCallback(async () => {
    try {
      await copyJsonToClipboard(detailPayload);
      toast.success(uiText.sfdcLogs.copied);
    } catch {
      toast.error('Copy failed');
    }
  }, [detailPayload]);

  const handleCopyResponse = useCallback(async () => {
    try {
      await copyJsonToClipboard(detailSfdcResponse);
      toast.success(uiText.sfdcLogs.copied);
    } catch {
      toast.error('Copy failed');
    }
  }, [detailSfdcResponse]);

  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={uiText.sfdcLogs.title}
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
        <Card sx={tableContainerStyles}>
          <SfdcLogsTableToolbar
            search={search}
            setSearch={setSearch}
            logEvent={logEvent}
            setLogEvent={setLogEvent}
            onResetPage={table.onResetPage}
            columnManager={columnManager}
          />

          {canReset && (
            <SfdcLogsTableFiltersResult
              search={search}
              setSearch={setSearch}
              logEvent={logEvent}
              setLogEvent={setLogEvent}
              totalResults={totalCount}
              onResetPage={table.onResetPage}
              sx={{ px: 2, pb: 1 }}
            />
          )}

          <Box sx={scrollableTableContentStyles}>
            <Scrollbar sx={tableScrollbarStyles}>
              <Table
                stickyHeader
                size={table?.dense ? 'small' : 'medium'}
                sx={getTableStyles(dynamicMinWidth)}
              >
                <TableHeadCustom
                  headLabel={visibleColumns}
                  orderBy={table.orderBy}
                  order={table.order}
                  onSort={table.onSort}
                  numSelected={0}
                  rowCount={allLogs.length}
                />
                <TableBody>
                  {allLogs.length > 0 ? (
                    allLogs.map((row, idx) => (
                      <SfdcLogsTableRow
                        key={
                          (row.id as string | number | undefined) ??
                          (row.voucherId as string | undefined) ??
                          `row-${table.page}-${idx}`
                        }
                        row={row}
                        visibleColumns={visibleColumns}
                        roleActions={roleActions}
                        onView={handleViewLog}
                      />
                    ))
                  ) : (
                    <TableNoData
                      notFound
                      colSpan={visibleColumns?.length || tableHeadFromRole.length}
                    />
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>
          {totalCount > 0 && (
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
                count={totalCount}
                rowsPerPage={table?.rowsPerPage}
                onPageChange={table?.onChangePage}
                onRowsPerPageChange={table?.onChangeRowsPerPage}
                showResultsCount
                totalResults={totalCount}
              />
            </Box>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={detailOpen}
        onClose={handleCloseDetail}
        title={uiText.sfdcLogs.detailTitle}
        showCloseButton
        leftAlignTitle
        contentTextAlign="left"
        titlePadding="24px 24px 16px"
        isLarge
        showCancel={false}
        content={
          detailLoading ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <AnimateLogo1 />
            </Box>
          ) : (
            <Stack spacing={2} sx={{ width: '100%' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">{uiText.sfdcLogs.payloadSection}</Typography>
                  <Tooltip title={uiText.common.copy}>
                    <IconButton
                      size="small"
                      onClick={handleCopyPayload}
                      aria-label={uiText.common.copy}
                    >
                      <Iconify icon="solar:copy-bold" width={20} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <JsonSyntaxView value={detailPayload} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">{uiText.sfdcLogs.responseSection}</Typography>
                  <Tooltip title={uiText.common.copy}>
                    <IconButton
                      size="small"
                      onClick={handleCopyResponse}
                      aria-label={uiText.common.copy}
                    >
                      <Iconify icon="solar:copy-bold" width={20} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <JsonSyntaxView value={detailSfdcResponse} />
              </Box>
            </Stack>
          )
        }
        action={
          <Button variant="contained" onClick={handleCloseDetail} sx={{ minWidth: 120 }}>
            {uiText.sfdcLogs.close}
          </Button>
        }
      />
    </DashboardContent>
  );
};

export default SfdcLogsListView;
