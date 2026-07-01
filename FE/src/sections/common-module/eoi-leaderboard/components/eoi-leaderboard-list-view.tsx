import type { ColumnDefinition } from 'src/hooks/use-column-manager';

import { toast } from 'sonner';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { Box, Card, Stack, Table, Dialog, TableBody, IconButton, Typography } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { mapArrayToLabelValue } from 'src/utils/helper';
import { EOI_LEADERBOARD_TAB_OPTIONS } from 'src/utils/constant';
import {
  getTableStyles,
  tableContainerStyles,
  calculateTableMinWidth,
} from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { resetCampaigns } from 'src/redux/slices/rm-panel/eoi-slice';
import { fetchUserGroups } from 'src/redux/actions/admin/common-actions';
import { getRmDropdown } from 'src/redux/actions/admin/reports-user-actions';
import { fetchEOILeaderboardList } from 'src/redux/actions/rm-panel/eoi-leaderboard-actions';
import { fetchCPNameAction, fetchEOICampaignsAction } from 'src/redux/actions/rm-panel/eoi-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import ViewTypeTabs from 'src/sections/common-module/eoi-dashboard/components/view-type-tabs';

import EOILeaderboardTableRow from './eoi-leaderboard-table-row';
import EOILeaderboardToolbar from './eoi-leaderboard-table-toolbar';
import { EOILeaderboardTableFiltersResult } from './eoi-leaderboard-table-filter-result';
import ExpressionOfInterest from '../../expression-of-interest/expression-of-interest-table-view';

import type { LeaderboardFilters } from './eoi-leaderboard-table-toolbar';

interface Props {
  setCampaignName: (value: string) => void;
  setView: (value: string) => void;
}

const EOILeaderboardListView = ({ setCampaignName, setView }: Props) => {
  const { columns: roleColumns, filters: roleFilters, canExport } = useRoleBasedPermissions({
    module: 'eoiLeaderboard',
  });

  const CP_TABLE_HEAD: ColumnDefinition[] = useMemo(
    () =>
      Object.values(roleColumns).filter(
        (col) => col.tab === 'channelPartner' || col.tab === 'both'
      ),
    [roleColumns]
  );

  const RM_TABLE_HEAD: ColumnDefinition[] = useMemo(
    () =>
      Object.values(roleColumns).filter(
        (col) => col.tab === 'relationshipManager' || col.tab === 'both'
      ),
    [roleColumns]
  );
  const { leaderboardList, total, error, loading } = useAppSelector(
    (state) => state.eoiLeaderboard
  );
  const { cpName: cpNameOptions } = useAppSelector((state) => state.expressonOfInterest || {}
  );
  const { userGroups } = useAppSelector((state) => state.common);
  const { rmList } = useAppSelector((state) => state.reportsUser);

  const dispatch = useAppDispatch();
  const table = useTable();
  const [tabValue, setTabValue] = useState('channelPartner');
  const [openTable, setOpenTable] = useState(false);
  const isCPView = tabValue === 'channelPartner';
  const activeTableHead = isCPView ? CP_TABLE_HEAD : RM_TABLE_HEAD;

  const cpColumnManager = useColumnManager(CP_TABLE_HEAD);
  const rmColumnManager = useColumnManager(RM_TABLE_HEAD);
  const { campaigns } = useAppSelector((state) => state.expressonOfInterest);
  const columnManager = isCPView ? cpColumnManager : rmColumnManager;
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || activeTableHead);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    campaign: null,
    cpName: null,
    rmName: null,
    userGroup: null,
    startDate: null,
    endDate: null,
  });

  const [listFilters, setListFilters] = useState({
    campaignId: '',
    cpName: '',
    rmId: '',
    isEoiLeaderboard : true,
  });
  const canReset = !!filters.campaign || filters.cpName || !!filters.rmName || !!filters.userGroup || !!filters.startDate || !!filters.endDate;

  const campaignOptions = useMemo(
    () =>
      campaigns?.map((item) => ({
        label: item?.name,
        value: String(item?.value),
      })) || [],
    [campaigns]
  );

  const rmOptions = rmList?.map((item) => ({
    label: item?.name,
    value: String(item?.id),
  }))

  const userGroupOptions = mapArrayToLabelValue(userGroups, "name", "id")
  
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    const { campaign } = filters
    if (!campaign) {
      setCampaignName('All');
      return
    };

    if (campaign.length === 1 && campaign[0]) {
      const campaignLabel = campaignOptions.find((item) => item.value === campaign[0])?.label;
      setCampaignName(campaignLabel ?? 'All');
    } else {
      setCampaignName('Multiple');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.campaign, campaignOptions, setCampaignName]);

  useEffect(() => {
    table.onResetPage();
    if (isCPView && (filters.rmName || filters.userGroup)) {
      setFilters((prev) => ({
        ...prev,
        rmName: null,
        userGroup: null,
      }));
    }
    if (!isCPView && filters.cpName) setFilters((prev) => ({
      ...prev,
      cpName: null,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue]);

  useEffect(() => {
    const { campaign, cpName, rmName, userGroup, startDate, endDate } = filters || {};

    const params = {
      page: table.page + 1,
      limit: table.rowsPerPage,
      view: isCPView ? 'channelPartner' : 'relationshipManager',
      ...(campaign && { campaignId: campaign }),
      ...(cpName && { channelPartnerId: cpName }),
      ...(rmName && { rmId: rmName }),
      ...(userGroup && { userGroupId: userGroup }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };
    dispatch(fetchEOILeaderboardList(params));
  }, [dispatch, filters, isCPView, table.page, table.rowsPerPage]);

  useEffect(() => {
    dispatch(fetchEOICampaignsAction({ showAll: true }));
    return () => {
      dispatch(resetCampaigns());
    };
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCPNameAction({}));
    dispatch(getRmDropdown(''));
    dispatch(fetchUserGroups());

  }, [dispatch]);

  const onClose = () => {
    setOpenTable(false);
  };
  const handleOpen = () => {
    setOpenTable(true);
  };
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
    setView(newValue);
    table.onResetPage();
  };

  const handleFiltersChange = useCallback((newFilters: LeaderboardFilters) => {
    setFilters(newFilters);
    table.onResetPage();
  }, [table]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      startDate: null,
      endDate: null,
    });
    table.onResetPage();
  }, [table]);

  const handleRemoveFilter = useCallback((filterName: keyof LeaderboardFilters, value: string[] | null) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    table.onResetPage();
  }, [table]);

  if (loading) {
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
    <Card sx={tableContainerStyles}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={2}
        sx={{ width: '100%' }}
      >
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: '100%', md: 'auto' },
            mb: { md: 3, xs: 0 },
          }}
        >
          <ViewTypeTabs
            value={tabValue}
            onChange={handleTabChange}
            options={EOI_LEADERBOARD_TAB_OPTIONS}
          />
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: 'flex',
            justifyContent: { sm: 'flex-start', md: 'flex-end' },
            alignItems: 'center',
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          <EOILeaderboardToolbar
            columnManager={columnManager}
            filters={filters}
            isCpView={isCPView}
            onApplyFilters={handleFiltersChange}
            roleFilters={roleFilters}
            campaignOptions={campaignOptions}
            cpNameOptions={cpNameOptions}
            rmNameOptions={rmOptions}
            userGroupOptions={userGroupOptions}
            canExport={canExport}
            isExportDisabled={leaderboardList?.length === 0}
          />
        </Box>
      </Stack>

      <Box sx={{ flexShrink: 0, pl: 2, pb: 2 }}>
        <Typography variant="h6">{isCPView ? uiText.eoiLeaderboard.cp : uiText.eoiLeaderboard.rm}</Typography>
      </Box>

      {canReset && (
        <EOILeaderboardTableFiltersResult
          filters={filters}
          campaignOptions={campaignOptions}
          rmNameOptions={rmOptions}
          userGroupOptions={userGroupOptions}
          cpNameOptions={cpNameOptions}
          onResetFilters={handleResetFilters}
          onRemoveFilter={handleRemoveFilter}
          totalResults={total}
          sx={{ px: 1.5, py: 0.75 }}
        />
      )}

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
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
              order="asc"
              orderBy={undefined}
              headLabel={visibleColumns}
              hideCheckbox
              rowCount={leaderboardList.length}
            />
            <TableBody>
              {leaderboardList?.length > 0 ? (
                leaderboardList?.map((row) => (
                  <EOILeaderboardTableRow
                    key={row.id}
                    row={row}
                    visibleColumns={visibleColumns}
                    setListFilters={setListFilters}
                    onModalOpen={handleOpen}
                  />
                ))
              ) : (
                <TableNoData notFound colSpan={visibleColumns?.length || activeTableHead.length} />
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </Box>
      {leaderboardList?.length > 0 && (
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
            count={total}
            rowsPerPage={table?.rowsPerPage}
            onPageChange={table?.onChangePage}
            onRowsPerPageChange={table?.onChangeRowsPerPage}
            showResultsCount
            totalResults={total}
          />
        </Box>
      )}

      <Dialog
        open={openTable}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '16px',
          },
        }}
      >
        <Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 9999,
              color: (theme) => theme.palette.grey[600],
            }}
          >
            <CloseIcon />
          </IconButton>
          <ExpressionOfInterest dashboardFilters={listFilters} />
        </Box>
      </Dialog>
    </Card>
  );
};

export default EOILeaderboardListView;
