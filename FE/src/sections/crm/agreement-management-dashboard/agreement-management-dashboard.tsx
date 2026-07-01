/* eslint-disable @typescript-eslint/no-unused-vars */
import type { IAgreementListTableFilters } from 'src/types/crm/agreement';

import { toast } from 'sonner';
import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect, useCallback } from 'react';

import AddIcon from '@mui/icons-material/Add';
import { Box, Card, Grid, Table, Button, TableBody } from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { ROLES, generateRoleBasedRoute } from 'src/utils/constant';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
  stickyBreadcrumbsStyles,
} from 'src/utils/table-styles';

import ExportIcon from 'src/assets/icons/export.svg';
import {
  getOptions,
  fetchAgreements,
  exportAgreementListReport,
} from 'src/redux/slices/crm/agreement-slice';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { usePopover } from 'src/components/custom-popover';
import { ColumnManager } from 'src/components/column-manager';
import { FilledButton } from 'src/components/buttons/FilledButton';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { IncentiveCard } from 'src/sections/rm-panel/incentive-dashboard/incentive-view/component/incentive-cards/incentive-cards';

import { AgreementTableRow } from './components/agreement-table-row';
import { AgreementTableToolbar } from './components/agreement-table-toolbar';
import { AgreementTableFiltersResult } from './components/agreement-table-filters-result';

// Optimized Table Header Configuration
// Optimized Table Header Configuration removed as it's now role-based

export function AgreementManagementDashboard() {
  const {
    columns: roleColumns,
    actions: roleActions,
    canCreate,
    canExport,
    filters: roleFilters,
    userRole,
  } = useRoleBasedPermissions({ module: 'agreementManagement' });

  const actionPermissions = useMemo(
    () =>
      roleActions.reduce((acc, action) => {
        if (action.id) {
          acc[action.id] = true;
        }
        return acc;
      }, {} as Record<string, boolean>),
    [roleActions]
  );

  const tableHeadFromRole = useCallback(() => roleColumnsToDefinitions(roleColumns), [roleColumns]);
  const columnManager = useColumnManager(tableHeadFromRole());
  const { visibleColumns } = columnManager;

  const table = useTable();
  const dispatch = useAppDispatch();
  const filters = useSetState<IAgreementListTableFilters>({
    name: '',
    projectName: '',
    documentStatus: '',
    crmUser: '',
    internalSignatory: '',
    documentType: '',
    startDate: '',
    enddate: '',
  });
  const route = useRouter();
  const menuActions = usePopover();

  const [selected, setSelected] = useState<string[]>([]);
  const isPopupApiCall = false;
  const {
    data: agreementList,
    loading,
    totalCount,
    summary,
  } = useAppSelector((state) => state.agreements);
  const [cardsListing, setCardsListing] = useState([
    {
      title: 'Total Documents Sent',
      amount: summary?.totalSent,
      gradientColor: 'rgba(34,197,94,1)',
      params: {
        name: '',
        projectName: '',
        documentStatus: 'Total Documents Sent',
        crmUser: '',
        internalSignatory: '',
        startDate: '',
        enddate: '',
      },
      active: false,
      allowedRoles: [ROLES.CRM, ROLES.RM, ROLES.SALES_TL, ROLES.PROJECT_HEAD, ROLES.SALES_RSH],
    },
    {
      title: 'Total Documents Signed',
      amount: summary?.totalSigned,
      gradientColor: 'rgba(255,171,0,1)',
      params: {
        name: '',
        projectName: '',
        documentStatus: userRole === ROLES.CRM ? 'CRM: Signed' : 'Cx: Signed',
        crmUser: '',
        internalSignatory: '',
        startDate: '',
        enddate: '',
      },
      active: false,
      allowedRoles: [ROLES.CRM, ROLES.RM, ROLES.SALES_TL, ROLES.PROJECT_HEAD, ROLES.SALES_RSH],
    },
    {
      title: 'Cx Signature Due For > 3 Days',
      amount: summary?.dueFor3Days,
      gradientColor: 'rgba(142,51,255,1)',
      params: {
        name: '',
        projectName: '',
        documentStatus: 'Cx: Sign Due For Three Days',
        crmUser: '',
        internalSignatory: '',
        startDate: '',
        enddate: '',
      },
      active: false,
      allowedRoles: [ROLES.CRM, ROLES.RM, ROLES.SALES_TL, ROLES.PROJECT_HEAD, ROLES.SALES_RSH],
    },
    {
      title: 'Pending with Authorised Signatory',
      amount: summary?.pendingInternal,
      gradientColor: '#56b8e6',
      params: {
        name: '',
        projectName: '',
        documentStatus: 'Cx: Signed',
        crmUser: '',
        internalSignatory: '',
        startDate: '',
        enddate: '',
      },
      active: false,
      allowedRoles: [ROLES.CRM],
    },
  ]);
  useEffect(() => {
    if (!summary) return;

    setCardsListing((prev) =>
      prev.map((card) => {
        switch (card.title) {
          case 'Total Documents Sent':
            return { ...card, amount: summary.totalSent };
          case 'Total Documents Signed':
            return { ...card, amount: summary.totalSigned };
          case 'Cx Signature Due For > 3 Days':
            return { ...card, amount: summary.dueFor3Days };
          case 'Pending with Authorised Signatory':
            return { ...card, amount: summary.pendingInternal };
          default:
            return card;
        }
      })
    );
  }, [summary]);

  const [debouncedSearch, setDebouncedSearch] = useState(filters.state.name);
  const [exporting, setExporting] = useState(false);

  const currentFilters = filters.state;
  const canReset =
    !!currentFilters?.name ||
    !!currentFilters?.projectName ||
    !!currentFilters?.crmUser ||
    !!currentFilters?.documentStatus ||
    !!currentFilters?.enddate ||
    !!currentFilters?.startDate ||
    !!currentFilters?.internalSignatory ||
    !!currentFilters?.documentType;

  const notFound = agreementList?.length === 0;

  // Use the column manager hook
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole());

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(filters.state.name), 1000);
    return () => clearTimeout(handler);
  }, [filters.state.name]);

  useEffect(() => {
    if (!isPopupApiCall) {

      const params = {
        page: table.page + 1,
        limit: table.rowsPerPage,
        search: debouncedSearch || undefined,
        documentStatus: filters.state.documentStatus || undefined,
        createdBy: filters.state.crmUser?.id || undefined,
        internalSignatory: filters.state.internalSignatory?.id || undefined,
        documentType: filters.state.documentType || undefined,
        startDate: filters.state.startDate || undefined,
        endDate: filters.state.enddate || undefined,
      };

      dispatch(fetchAgreements(params))
        .unwrap()
        .then((resp) => { })
        .catch((error) => {
          toast.error(error || 'Failed to fetch agreements');
        });
    }
  }, [
    dispatch,
    table.page,
    table.rowsPerPage,
    table?.orderBy,
    table?.order,
    debouncedSearch,
    filters.state.projectName,
    filters.state.documentStatus,
    filters.state.crmUser,
    filters.state.internalSignatory,
    filters.state.documentType,
    filters.state.startDate,
    isPopupApiCall,
    filters.state.enddate,
  ]);
  useEffect(() => {
    dispatch(fetchAgreements())
      .unwrap()
      .then((resp) => { })
      .catch((error) => {
        toast.error(error || 'Failed to fetch agreements'); // error
      });
    if (userRole === ROLES.CRM) {
      dispatch(getOptions())
        .unwrap()
        .then((resp) => { })
        .catch((error) => {
          console.log('getOptions', error);
          toast.error(error || 'Failed to fetch agreements'); // error
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectAllRows = (checked: boolean, ids: string[]) => {
    setSelected(checked ? ids : []);
  };
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await dispatch(
        exportAgreementListReport({
          search: debouncedSearch || undefined,
          documentStatus: filters.state.documentStatus || undefined,
          documentType: filters.state.documentType || undefined,
          createdBy: filters.state.crmUser?.id || undefined,
          internalSignatory: filters.state.internalSignatory?.id || undefined,
          startDate: filters.state.startDate || undefined,
          endDate: filters.state.enddate || undefined,
          ...(table.orderBy && table.order
            ? { sortBy: `${table.orderBy}:${table.order}` }
            : {}),
        })
      ).unwrap();
    } catch {
      // Errors handled in service (toast)
    } finally {
      setExporting(false);
    }
  }, [
    dispatch,
    debouncedSearch,
    filters.state.documentStatus,
    filters.state.crmUser,
    filters.state.internalSignatory,
    filters.state.startDate,
    filters.state.enddate,
    filters.state.documentType,
    table.orderBy,
    table.order,
  ]);

  const dataLength = agreementList?.length ?? 0;


  return (
    <Box>
      <CustomBreadcrumbs heading="Agreement E- Signature Dashboard" sx={stickyBreadcrumbsStyles} />
      {loading && !isPopupApiCall ? (
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
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {cardsListing
              .filter((card) => card.allowedRoles?.includes(userRole as ROLES))
              .map((card, index) => (
              <Grid item xs={12} sm={6} md={userRole === ROLES.CRM ? 3 : 4} key={index + 1}>
                <IncentiveCard
                  title={card.title}
                  amount={card.amount}
                  subtitle=""
                  subtitleAmount=""
                  gradientColor={card.gradientColor}
                  dateRange=""
                  type=""
                  isActive={card.active}
                  onClick={() => {
                    setCardsListing((prev) =>
                      prev.map((c, i) => {
                        // toggle only the clicked card
                        if (i === index) {
                          const newActive = !c.active;
                          if (newActive) {
                            filters.setState(card.params);
                          } else {
                            filters.setState({
                              name: '',
                              projectName: '',
                              documentStatus: '',
                              crmUser: '',
                              internalSignatory: '',
                              startDate: '',
                              enddate: '',
                            });
                          }
                          return { ...c, active: newActive };
                        }
                        return { ...c, active: false }; // others become inactive
                      })
                    );
                  }}
                  showRupeeSymbol={false}
                />
              </Grid>
            ))}
          </Grid>
          <Card sx={tableContainerStyles}>
            {/* Fixed Header Section */}
            <Box sx={{ flexShrink: 0 }}>
              {/* Toolbar row */}
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: {
                    xs: 'flex-end',
                    lg: 'center',
                  },
                  flexDirection: {
                    xs: 'column',
                    lg: 'row',
                  },
                  my: {
                    xs: 1,
                    lg: 0,
                  },
                  px: {
                    xs: 1,
                    lg: 0,
                  },
                }}
              >
                <Box sx={{
                  width: { xs: '100%', lg: 'auto' },
                  flexGrow: { lg: 1 },
                }}>
                  <AgreementTableToolbar filters={filters} roleFilters={roleFilters} userRole={userRole} onResetPage={table?.onResetPage} />
                </Box>

                {/* Column Manager + actions menu (Export) */}
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    justifyContent: {
                      xs: 'flex-end',
                      lg: 'flex-end',
                    },
                    width: {
                      xs: '100%',
                      lg: 'auto',
                    },
                    mr: 2
                  }}
                >
                  <ColumnManager {...columnManager} />

                  {canExport && (
                    <Button
                      variant="contained"
                      onClick={() => {
                        handleExport();
                        menuActions.onClose();
                      }}
                      disabled={dataLength === 0 || exporting}
                      startIcon={<img src={ExportIcon} alt="export" style={{ width: 18, height: 18 }} />}
                      sx={{
                        bgcolor: '#1A407D',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#1A407D',
                        },
                        py: 0.75,
                        px: 2,
                        mx: 1
                      }}
                    >
                      Report
                    </Button>
                  )}
                  {canCreate && (
                    <FilledButton
                      onClick={() => {
                        route.push(generateRoleBasedRoute(userRole, `/dashboard/new`));
                      }}
                      label="New Document"
                      width="176px"
                      icon={<AddIcon />}
                    />
                  )}
                </Box>
              </Box>

              {/* Results BELOW the toolbar row */}
              {canReset && (
                <AgreementTableFiltersResult
                  filters={filters}
                  totalResults={agreementList?.length}
                  onResetPage={table?.onResetPage}
                  sx={{ p: 1.5, pt: 0 }}
                />
              )}
            </Box>

            {/* Table Content */}
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0, // Important for flex child to shrink
                position: 'relative',
              }}
            >
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
                    onSelectAllRows={(checked) =>
                      handleSelectAllRows(
                        checked,
                        agreementList?.map((row) => row?.id?.toString())
                      )
                    }
                    hideCheckbox
                    sx={{ backgroundColor: 'background.paper' }}
                  />

                  <TableBody>
                    {agreementList?.map((row) => (
                      <AgreementTableRow
                        key={row?.id}
                        row={row}
                        selected={selected.includes(row?.id?.toString())}
                        columnVisibility={columnManager?.columns?.reduce(
                          (acc, col) => ({ ...acc, [col.id]: col.visible }),
                          {} as Record<string, boolean>
                        )}
                        actionPermissions={actionPermissions}
                        userRole={userRole}
                      />
                    ))}
                    {!loading && notFound && (
                      <TableNoData
                        notFound={notFound}
                        colSpan={visibleColumns?.length || 14}
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
        </Box>
      )}
    </Box>
  );
}
