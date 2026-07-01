// ChannelPartners.tsx
import type { RootState, AppDispatch } from 'src/redux/store';

import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Table,
  Button,
  TableRow,
  TableBody,
  TableCell,
  IconButton,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { formatDateIST } from 'src/utils/helper';
import { generateRoleBasedRoute } from 'src/utils/constant';
import { formatTableCellValue } from 'src/utils/table-cell-display';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import {
  getTableStyles,
  tableContainerStyles,
  tableScrollbarStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
  fixedFooterPaginationStyles,
  scrollableTableContentStyles,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { resetCampaigns } from 'src/redux/slices/rm-panel/eoi-slice';
import { getRmDropdown } from 'src/redux/actions/admin/reports-user-actions';
import { fetchEOICampaignsAction } from 'src/redux/actions/rm-panel/eoi-actions';
import {
  fetchChannelPartnersAction,
  downloadChannelPartnerReports,
} from 'src/redux/actions/rm-panel/channel-partners-actions';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { useTable, TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import linkIcon from '../../../../public/assets/icons/navbar/linkicon.svg';
import { ChannelPartnerToolbar } from './components/channel-partner-toolbar';
import { ChannelPartnerTableFiltersResult } from './components/channel-partner-table-filters-result';

import type { CPFilters } from './components/channel-partner-toolbar';

export default function ChannelPartners() {
  const {
    columns: roleColumns,
    filters: roleFilters,
    actions,
    canCreate,
    userRole,
    canExport,
  } = useRoleBasedPermissions({ module: 'channelPartners' });
  const dispatch = useDispatch<AppDispatch>();
  const { channelPartnersData, channelPartnersCount, loading } = useSelector(
    (state: RootState) => state.channelpartner
  );
  const table = useTable()
  const { rmList } = useSelector((state: RootState) => state.reportsUser);

  const { campaigns } = useSelector((state: RootState) => state.expressonOfInterest || {});

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);
  const route = useRouter();
  const [filters, setFilters] = useState<CPFilters>({
    campaign: null,
    createdBy: null,
    startDate: null,
    endDate: null,
  });

  const canReset =
    !!filters.campaign ||
    (!!filters.createdBy && filters.createdBy.length > 0) ||
    !!filters.startDate ||
    !!filters.endDate ||
    !!search;

  const campaignOptions = useMemo(
    () =>
      campaigns?.map((campaign) => ({
        label: campaign?.name,
        value: String(campaign?.value),
      })) || [],
    [campaigns]
  );

  const createdByOptions = useMemo(
    () =>
      rmList?.map((rm) => ({
        label: rm?.name,
        value: String(rm?.id),
      })) || [],
    [rmList]
  );
  useEffect(() => {
    dispatch(fetchEOICampaignsAction());
    dispatch(getRmDropdown(''));

    return () => {
      dispatch(resetCampaigns());
    };
  }, [dispatch]);
  useEffect(() => {
    const { campaign, createdBy, startDate, endDate } = filters || {};
    const params: Record<string, any> = {
      page,
      limit: rowsPerPage,
      search,
      ...(campaign && {campaignId: campaign }),
      ...(createdBy && { createdBy }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };

    if(table.orderBy && table.order){
      params.sortBy =  `${table.orderBy}:${table.order}`
    }
    dispatch(fetchChannelPartnersAction(params));
  }, [dispatch, page, rowsPerPage, search, filters, table.orderBy, table.order]);

  const handleExport = () => {
    const { campaign, createdBy, startDate, endDate } = filters || {};

    const payload: Record<string, any> = {
      ...(search ? { search } : {}),
      ...(campaign && {campaignId: campaign }),
      ...(createdBy && { createdBy }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };
    dispatch(downloadChannelPartnerReports(payload));
  };

  const handleFiltersChange = useCallback((newFilters: CPFilters) => {
    setFilters(newFilters);
  }, []);

  const handleRemoveCreatedByItem = useCallback((updatedCreatedBy: string[] | null) => {
    setFilters((prev) => ({ ...prev, createdBy: updatedCreatedBy }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      campaign: null,
      createdBy: null,
      startDate: null,
      endDate: null,
    });
  }, []);

    const handleRemoveFilter = useCallback((filterName: keyof CPFilters) => {
      setFilters((prev) => ({ ...prev, [filterName]: null }));
    }, []);

  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={uiText.cpJSON.title}
          action={
            canCreate ? (
              <Button
                variant="contained"
                className="primaryBtn"
                onClick={() => {
                  route.push(generateRoleBasedRoute(userRole, 'cp-list/create'));
                }}
              >
                {uiText.cpJSON.createCP.btnLabel}
              </Button>
            ) : undefined
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
        <Card sx={tableContainerStyles}>
          {/* Toolbar */}
          <ChannelPartnerToolbar
            search={search}
            setSearch={setSearch}
            columnManager={columnManager}
            channelPartnersData={channelPartnersData}
            canExport={canExport}
            roleFilters={roleFilters}
            handleExport={handleExport}
            filters={filters}
            onApplyFilters={handleFiltersChange}
            campaignOptions={campaignOptions}
            createdByOptions={createdByOptions}
          />

          {/* Filters result */}
          {canReset && (
            <ChannelPartnerTableFiltersResult
              search={search}
              setSearch={setSearch}
              totalResults={channelPartnersData?.length || 0}
              sx={{ px: 2, pb: 1 }}
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onResetFilters={handleResetFilters}
              onRemoveCreatedByItem={handleRemoveCreatedByItem}
              campaignOptions={campaignOptions}
              createdByOptions={createdByOptions}
            />
          )}

          {/* Table */}
          <Box sx={scrollableTableContentStyles}>
            <Scrollbar sx={tableScrollbarStyles}>
              <Table stickyHeader size="small" sx={getTableStyles(dynamicMinWidth)}>
                <TableHeadCustom
                  headLabel={visibleColumns}
                  orderBy={table.orderBy}
                  order={table.order}
                  onSort={table.onSort}
                  numSelected={0}
                  rowCount={channelPartnersData.length}
                />
                <TableBody>
                  {channelPartnersData?.length > 0 ? (
                    channelPartnersData?.map((row) => (
                      <TableRow hover key={row.id} sx={{ height: 8 }}>
                        {visibleColumns.map((col) => {
                          const value = row[col.id as keyof typeof row];

                          // Status column
                          if (col.id === 'status') {
                            const normalizedValue = (value as string)?.trim();
                            const getStatusColor = (status: string | undefined) => {
                              switch (status) {
                                case 'SFDC Empanelled':
                                  return 'success';
                                case 'New Registration':
                                  return 'info';

                                case 'Empanelment Pending':
                                  return 'error';

                                default:
                                  return 'success';
                              }
                            };
                            return (
                              <TableCell key={col.id} sx={{ minWidth: 250 }}>
                                <Label variant="soft" color={getStatusColor(normalizedValue)}>
                                  {normalizedValue || '-'}
                                </Label>
                              </TableCell>
                            );
                          }

                          if (col?.id === 'createdAt' || col?.id === 'lastCollectedDate') {
                            return (
                              <TableCell key={col?.id}>{formatDateIST(value as string)}</TableCell>
                            );
                          }

                          // Actions column
                          if (col.id === 'actions') {
                            const copyLink = async () => {
                              const finalUrl = `${import.meta.env.VITE_CHANNEL_PARTNER_LINK}/${row.linkId ?? ''}`;
                              await navigator.clipboard.writeText(finalUrl);
                              toast.success('Link copied to clipboard');
                            };
                            return (
                              actions.find((action) => action?.id === 'copyLink') && (
                                <TableCell key={col.id}>
                                  <IconButton size="small" onClick={copyLink}>
                                    <img
                                      src={linkIcon} // <-- put your image path here
                                      alt="copy link"
                                      style={{ width: 18, height: 18 }}
                                    />
                                  </IconButton>
                                </TableCell>
                              )
                            );
                          }

                          // ID column with link
                          // if (col.id === 'id') {
                          //   return (
                          //     <TableCell key={col.id}>
                          //       {value ? (
                          //         <Link to={`/rm-panel/channel-partners/${row.id}`}>
                          //           {value as string}
                          //         </Link>
                          //       ) : (
                          //         '-'
                          //       )}
                          //     </TableCell>
                          //   );
                          // }
                          return (
                            <TableCell key={col.id}>
                              {formatTableCellValue(value)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  ) : (
                    <TableNoData notFound colSpan={visibleColumns?.length || tableHeadFromRole.length} />
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </Box>

          {/* Pagination */}
          <Box sx={fixedFooterPaginationStyles}>
            <TablePaginationCustom
              page={page - 1}
              count={channelPartnersCount}
              rowsPerPage={rowsPerPage}
              onPageChange={(e, newPage) => setPage(newPage + 1)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(Number.parseInt(e.target.value, 10));
                setPage(1);
              }}
              showResultsCount
              totalResults={channelPartnersCount}
            />
          </Box>
        </Card>
      )}
    </DashboardContent>
  );
}
