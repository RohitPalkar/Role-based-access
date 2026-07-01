import type { RootState, AppDispatch } from 'src/redux/store';
import type { IUserItem, IUserTableFilters } from 'src/types/admin/feature/user';

import { useSelector } from 'react-redux';
import { varAlpha } from 'minimal-shared/utils';
import { useSetState } from 'minimal-shared/hooks';
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAdminPanelPaths } from 'src/hooks/use-admin-panel-paths';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { useDebounceMethod } from 'src/utils/helper';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { USER_TAB_OPTIONS, FILTER_STATUS_OPTIONS } from 'src/utils/constant';
import { 
 getTableStyles,
 tableContainerStyles,
 calculateTableMinWidth,
 stickyBreadcrumbsStyles
} from 'src/utils/table-styles';

import { CONFIG } from 'src/config-global';
import { DashboardContent } from 'src/layouts/dashboard';
import { clearUserDetails } from 'src/redux/slices/admin/user-slice';
import { fetchBrands } from 'src/redux/actions/admin/common-actions';
import { getRoles, fetchUser, getUserGroups } from 'src/redux/actions/admin/user-actions';

import { SvgColor } from 'src/components/svg-color';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  CustomTableSkeleton,
  TablePaginationCustom,
} from 'src/components/table';

import { UserTableRow } from './components/user-table-row';
import { UserTableToolbar } from './components/user-table-toolbar';
import { UserTableFiltersResult } from './components/user-table-filters-result';
// ----------------------------------------------------------------------



// ----------------------------------------------------------------------

export function UserListView() {
  const {
    users: dataFiltered,
    loading,
    totalCount,
  } = useAppSelector((state: RootState) => state.userlist);
  const [statusOption, setStatusOption] = useState<
    { value: string; label: string; isLocked: boolean }[]
  >([]);
  const { roles } = useSelector((state: RootState) => state.userlist);
  const { brands } = useAppSelector((state) => state.common);
  const { groups } = useAppSelector((state: RootState) => state.userlist);

  const isFirstRender = useRef(true);

  const table = useTable();
  const dispatch: AppDispatch = useAppDispatch();
  const panelPaths = useAdminPanelPaths();
  const { permissions, columns: roleColumns, canExport, canRefresh } = useRoleBasedPermissions({
    module: 'userList',
  });
  const disableUserEdit = permissions.canEdit === false;
  const filters = useSetState<IUserTableFilters>({
    name: '',
    role: null,
    brand: null,
    status: null,
    group: null,
  });

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );

  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;

  const columnVisibility = useMemo(
    () =>
      columnManager.columns.reduce(
        (acc, col) => {
          if (col?.id) acc[col.id] = col.visible ?? true;
          return acc;
        },
        {} as Record<string, boolean>
      ),
    [columnManager.columns]
  );

  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);


  const mappedRoles = useMemo(
    () =>
      roles
        ?.filter((role: { id?: unknown } | null | undefined) => role != null && role.id != null)
        .map((role: { id: unknown; name?: string }) => ({
          value: String(role.id),
          label: role.name ?? '',
          isLocked: false,
        })) ?? [],
    [roles]
  );

  useEffect(() => {
    setStatusOption([
      { value: 'all', label: 'All', isLocked: false },
      ...mappedRoles,
      ...USER_TAB_OPTIONS,
    ]);
  }, [mappedRoles]);

  const { state: currentFilters, setState: updateFilters } = filters;

  const getApiCall = () => {
    const { name, status, role, ...rest } = filters.state;
    const payload = {
      page: (table?.page ?? 0) + 1,
      search: name || '',
      role: role === 'all' ? '' : role || '',
      brandId: currentFilters?.brand ? Number(currentFilters?.brand) : undefined,
      groupId: currentFilters?.group ? Number(currentFilters?.group) : undefined,
      status: currentFilters?.status ?? status ?? undefined,
      limit: table?.rowsPerPage ?? 10,
      ...rest,
    };
    dispatch(fetchUser(payload));
  };

  const debounceApiCall = useDebounceMethod(getApiCall, 500);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false; // Mark first render as done, no need to call API on first render
      return;
    }
    debounceApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters?.name]);

  useEffect(() => {
    getApiCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    currentFilters?.role,
    table?.rowsPerPage,
    table?.page,
    currentFilters?.brand,
    currentFilters?.group,
    currentFilters?.status,
  ]);

  useEffect(() => {
    dispatch(clearUserDetails());
    Promise.all([dispatch(fetchBrands())]);
  }, [dispatch]);

  useEffect(() => {
    dispatch(getUserGroups());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getRoles({ page: 1, limit: 10 }));
  }, [dispatch]);

  const canReset =
    !!currentFilters?.name ||
    (!!currentFilters?.role && currentFilters?.role !== 'all') ||
    !!currentFilters?.brand ||
    !!currentFilters?.status ||
    !!currentFilters?.group;

  const notFound = (!dataFiltered?.length && canReset) || !dataFiltered?.length;

  const handleFilterRole = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      table?.onResetPage();
      updateFilters({ role: newValue });
    },
    [updateFilters, table]
  );

  const tableOnReset = () => {
    table?.onResetPage();
  };

  const icon = (name: string, width = 16, height = 16) => (
    <SvgColor
      src={`${CONFIG.site.basePath}/assets/icons/home/${name}.svg`}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );

  const renderTableContent = () => {
    if (loading) {
      return (
        <CustomTableSkeleton
          rowCount={table?.rowsPerPage ?? 10}
          cellCount={visibleColumns?.length || tableHeadFromRole.length}
        />
      );
    }
    if (dataFiltered && dataFiltered.length > 0) {
      return dataFiltered
        ?.map((row) =>
          row?.id ? (
            <UserTableRow
              key={row.id}
              row={row as unknown as IUserItem}
              selected={table?.selected?.includes(row.id.toString()) ?? false}
              editHref={panelPaths.user.edit(row.id.toString())}
              columnVisibility={columnVisibility}
              disableEditLink={disableUserEdit}
            />
          ) : null
        )
        .filter(Boolean);
    }
    return (
      <TableNoData
        notFound={notFound}
        colSpan={visibleColumns?.length || tableHeadFromRole.length}
      />
    );
  };

  return (
    <DashboardContent>
      {/* Sticky Breadcrumbs */}
      <CustomBreadcrumbs 
        heading="Users" 
        sx={stickyBreadcrumbsStyles}
      />

      <Card sx={tableContainerStyles}>
        {/* Fixed Header Section */}
        <Box sx={{ flexShrink: 0 }}>
          <Tabs
            value={currentFilters?.role || 'all'}
            onChange={handleFilterRole}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: { xs: 0.75, md: 1.5 },
              boxShadow: (theme) =>
                `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main',
                height: '2px',
              },
              '& .MuiTab-root': {
                fontWeight: 500,
                color: 'text.secondary',
                minWidth: { xs: 'auto', md: 160 },
                fontSize: { xs: '0.875rem', md: '1rem' },
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              },
            }}
          >
            {statusOption?.map((tab) => (
              <Tab
                key={tab.value}
                iconPosition="end"
                value={tab.value}
                label={tab.label}
                disabled={tab.isLocked}
                icon={
                  tab.isLocked ? (
                    icon('lock-disabled')
                  ) : (
                    // eslint-disable-next-line react/jsx-no-useless-fragment
                    <></>
                  )
                }
              />
            ))}
          </Tabs>

          <UserTableToolbar
            filters={filters}
            onResetPage={tableOnReset}
            getLists={getApiCall}
            columnManager={columnManager}
            canExport={canExport}
            canRefresh={canRefresh}
            options={{
              brand: brands?.map((brand) => ({ value: brand?.id, label: brand?.name })) || [],
              group: Array.isArray(groups)
                ? groups?.map((group) => ({ value: group?.id, label: group?.name })) || []
                : [],
              status: FILTER_STATUS_OPTIONS || [],
            }}
          />

          {canReset && (
            <UserTableFiltersResult
              filters={filters}
              totalResults={totalCount || 0}
              onResetPage={table?.onResetPage}
              sx={{ px: 1.5, py: 0.75 }}
            />
          )}
        </Box>

        {/* Scrollable Table Content */}
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0, // Important for flex child to shrink
          position: 'relative'
        }}>
          <Scrollbar sx={{ 
            height: '100%',
            '& .simplebar-content': {
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }
          }}>
            <Table 
              stickyHeader
              size={table?.dense ? 'small' : 'medium'} 
              sx={getTableStyles(dynamicMinWidth)}
            >
              <TableHeadCustom
                headLabel={visibleColumns || []}
                rowCount={dataFiltered?.length ?? 0}
                sx={{ 
                  whiteSpace: 'nowrap',
                  backgroundColor: 'background.paper'
                }}
              />

              <TableBody>
                {renderTableContent()}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        {/* Fixed Footer Pagination */}
        <Box
          sx={{
            flexShrink: 0,
            borderTop: (theme) => `1px dashed ${theme.palette.divider}`,
            backgroundColor: 'background.paper',
            zIndex: 1,
          }}
        >
          <TablePaginationCustom
            page={table?.page ?? 0}
            dense={table?.dense ?? false}
            count={totalCount || 0}
            rowsPerPage={table?.rowsPerPage ?? 10}
            onPageChange={table?.onChangePage}
            onChangeDense={table?.onChangeDense}
            onRowsPerPageChange={table?.onChangeRowsPerPage}
            showResultsCount
            totalResults={totalCount || 0}
          />
        </Box>
      </Card>
    </DashboardContent>
  );
}
