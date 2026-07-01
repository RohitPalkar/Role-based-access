import type { AppDispatch } from 'src/redux/store';

import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import React, { useMemo, useEffect } from 'react';
import { useSetState } from 'minimal-shared/hooks';

import { Box, Table, Button, TableBody } from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';
import { useColumnManager } from 'src/hooks/use-column-manager';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { isSignaturePresent } from 'src/utils/signature-booking';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { getTableStyles, calculateTableMinWidth } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { fetchIOMData, fetchIomFromSap } from 'src/redux/actions/common-module/iom-management-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { useTable, TableNoData, TableHeadCustom, TableSelectedAction, TablePaginationCustom } from 'src/components/table';

import { type IomTableFilters } from 'src/sections/common-module/internal-office-memo/iom-config';

import { IomTableRow } from './iom-table-row';
import { IomTableToolbar } from './iom-table-toolbar';
import { IomTableFiltersResult } from './iom-table-filters-result';

const IomManagementTableView = () => {
  const {
    columns: roleColumns,
    filters: roleFilters,
    userRole,
    getRowActions,
    canSelectRows,
    canExport,
    canRefresh,
  } = useRoleBasedPermissions({
    module: 'iomManagement',
  });
  const dispatch = useDispatch<AppDispatch>();
  const table = useTable();

  const { iomData, loading, iomCount, error } = useAppSelector((state) => state.iomManagement);
  const user = useAppSelector((state) => state.auth.user);
  const { iomDropdowns } = useAppSelector((state) => state.common);
  const actionContext = useMemo(
    () => ({ hasSignature: isSignaturePresent(user?.signatureImage) }),
    [user?.signatureImage]
  );

  const tableHeadFromRole = useMemo(() => {
    const baseColumns = roleColumnsToDefinitions(roleColumns);

    if (!canSelectRows) return baseColumns;

    return [
      {
        id: 'select',
        label: '',
        width: 60,
        visible: true,
        disableToggle: true,
      },
      ...baseColumns,
    ];
  }, [roleColumns, canSelectRows]);

  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  const filters = useSetState<IomTableFilters>({
    iomStatus: [],
    search: '',
    project: [],
    invoiceStatus: [],
    pointsClassification: '',
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const {
    search,
    iomStatus,
    project,
    invoiceStatus,
    pointsClassification,
    startDate,
    endDate,
  } = filters.state;

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, iomStatus, project, invoiceStatus, pointsClassification, startDate, endDate]);

  const getParams = React.useCallback(() => ({
    page: table.page + 1,
    limit: table.rowsPerPage,
    listType: 'ioms',
    ...(search && { search: search.toLowerCase().trim() }),
    ...(iomStatus.length > 0 && { iomStatus: iomStatus.join(',') }),
    ...(project.length > 0 && { projects: project.join(',') }),
    ...(invoiceStatus.length > 0 && { invoiceStatus: invoiceStatus.join(',') }),
    ...(pointsClassification && {
      pointsClassification: pointsClassification.toUpperCase(),
    }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  }), [
    table.page,
    table.rowsPerPage,
    search,
    iomStatus,
    project,
    invoiceStatus,
    pointsClassification,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    dispatch(fetchIOMData(getParams()));
  }, [dispatch, getParams]);

  const handleRefresh = async () => {
    try {
      await dispatch(fetchIomFromSap()).unwrap();

      toast.success('IOM data refreshed successfully');

      await dispatch(fetchIOMData(getParams()));
    } catch (err: any) {
      toast.error(err || 'Failed to refresh IOM data');
    }
  };

  const currentFilters = filters.state;
  const canReset =
    !!currentFilters.search ||
    currentFilters.iomStatus.length > 0 ||
    currentFilters.project.length > 0 ||
    currentFilters.invoiceStatus.length > 0 ||
    !!currentFilters.pointsClassification ||
    !!currentFilters.startDate ||
    !!currentFilters.endDate;

  const notFound = !loading && iomData.length === 0;

  if (loading && iomData.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          height: '50vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnimateLogo1 />
      </Box>
    );
  }

  return (
    <>
      {/* search and filter toolbar */}
      <IomTableToolbar
        filters={filters}
        roleFilters={roleFilters}
        search={search}
        setSearch={(value) => filters.setState({ search: value })}
        columnManager={columnManager}
        dataLength={iomCount}
        canExport={canExport}
        canRefresh={canRefresh}
        onRefresh={handleRefresh}
      />
      {canReset && (
        <IomTableFiltersResult
          filters={filters}
          totalResults={iomCount}
          onResetPage={table?.onResetPage}
          iomDropdowns={iomDropdowns}
          sx={{ p: 1.5, pt: 0 }}
        />
      )}

      {/* Table Content */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {canSelectRows && (
          <TableSelectedAction
            numSelected={table.selected.length}
            rowCount={iomData.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(
                checked,
                iomData.map((row) => String(row.id))
              )
            }
            rowIds={iomData.map((row) => String(row.id))}
            label="IOM"
            action={
              <Button
                size="medium"
                variant="contained"
                sx={{
                  backgroundColor: 'background.paper',
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'grey.200',
                  },
                }}
                onClick={() => { }}
              >
                {uiText.internalOfficeMemo.actions.submitInvoice}
              </Button>
            }
          />
        )}
        <Scrollbar
          sx={{
            height: '100%',
            '& .simplebar-content': {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <Table
            stickyHeader
            size={table?.dense ? 'small' : 'medium'}
            sx={getTableStyles(dynamicMinWidth)}
          >
            <TableHeadCustom
              order={table?.order}
              orderBy={table?.orderBy}
              headLabel={visibleColumns}
              numSelected={table.selected.length}
              rowCount={iomData.length}
              onSelectAllRows={
                canSelectRows
                  ? (checked) =>
                    table.onSelectAllRows(
                      checked,
                      iomData.map((row) => String(row.id))
                    )
                  : undefined
              }
              rowIds={iomData?.map((row) => String(row?.id))}
              sx={{ backgroundColor: 'background.paper' }}
            />

            <TableBody>
              {iomData?.map((row) => (
                <IomTableRow
                  key={row?.id}
                  row={row}
                  visibleColumns={visibleColumns}
                  selected={table.selected.includes(String(row.id))}
                  onSelectRow={table.onSelectRow}
                  getRowActions={getRowActions}
                  actionContext={actionContext}
                  userRole={userRole}
                />
              ))}
              {!loading && notFound && (
                <TableNoData
                  notFound={notFound}
                  colSpan={visibleColumns?.length || tableHeadFromRole.length}
                />
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </Box>

      {/* Pagination */}
      {!notFound && (
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
            count={iomCount}
            rowsPerPage={table?.rowsPerPage}
            onPageChange={table?.onChangePage}
            onRowsPerPageChange={table?.onChangeRowsPerPage}
            showResultsCount
            totalResults={iomCount}
          />
        </Box>
      )}
    </>
  );
};

export default IomManagementTableView;
