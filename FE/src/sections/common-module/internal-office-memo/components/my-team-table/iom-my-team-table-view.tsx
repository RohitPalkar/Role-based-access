import type { AppDispatch } from 'src/redux/store';
import type { IomMyTeamRowItem } from 'src/sections/common-module/internal-office-memo/iom-config';

import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { useSetState } from 'minimal-shared/hooks';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import { Box, Table, TableBody } from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';
import { useColumnManager } from 'src/hooks/use-column-manager';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { MyTeamStatus } from 'src/utils/constant';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { getTableStyles, calculateTableMinWidth } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import {
  markUserAvailable,
  markUserUnavailable,
  fetchMyTeamAvailability,
  exportMyTeamAvailabilityReport,
} from 'src/redux/actions/common-module/iom-management-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { AnimateLogo1 } from 'src/components/animate';
import { useTable, TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { IomMyTeamToolbar } from './iom-my-team-toolbar';
import { IomMyTeamTableRow } from './iom-my-team-table-row';
import { IomMyTeamFiltersResult } from './iom-my-team-filters-result';
import { MarkAvailabilityDialog, type MarkAvailabilityFormValues } from './mark-availability-dialog';

const myTeamCopy = uiText.internalOfficeMemo.myTeam;

dayjs.extend(customParseFormat);

const toIstIsoDateTime = (date: string, time: string): string => {
  const parsed = dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm', true);

  if (!parsed.isValid()) {
    throw new Error('Invalid date or time');
  }

  return `${parsed.format('YYYY-MM-DD')}T${parsed.format('HH:mm:ss')}+05:30`;
};

const IomMyTeamTableView = () => {
  const { columns: roleColumns, filters: roleFilters, actions: roleActions, canExport } =
    useRoleBasedPermissions({
      module: 'iomMyTeam',
    });

  const dispatch = useDispatch<AppDispatch>();
  const table = useTable();
  const { myTeamData, myTeamLoading, myTeamCount, myTeamError } = useAppSelector(
    (state) => state.iomManagement
  );
  const [editRow, setEditRow] = useState<IomMyTeamRowItem | null>(null);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [isSubmittingAvailability, setIsSubmittingAvailability] = useState(false);

  const handleEditClick = useCallback((row: IomMyTeamRowItem) => {
    setEditRow(row);
    setAvailabilityDialogOpen(true);
  }, []);

  const handleAvailabilityDialogClose = useCallback(() => {
    setAvailabilityDialogOpen(false);
    setEditRow(null);
  }, []);

  const filters = useSetState({
    search: '',
    status: null as string | null,
    project: [] as string[],
  });

  const { search, status, project } = filters.state;

  const refetchMyTeam = useCallback(() => {
    const params = {
      page: table.page + 1,
      limit: table.rowsPerPage,
      ...(search && { search: search.toLowerCase().trim() }),
      ...(status && { status }),
      ...(project.length > 0 && { project: project.join(',') }),
    };

    dispatch(fetchMyTeamAvailability(params));
  }, [dispatch, search, status, project, table.page, table.rowsPerPage]);

  const handleAvailabilitySubmit = useCallback(
    async (values: MarkAvailabilityFormValues, row: IomMyTeamRowItem) => {
      try {
        setIsSubmittingAvailability(true);

        if (values.availabilityStatus === MyTeamStatus.AVAILABLE) {
          await dispatch(markUserAvailable({ userId: row.userId })).unwrap();
        } else {
          const { startDate, startTime, endDate, endTime } = values;

          await dispatch(
            markUserUnavailable({
              userId: row.userId,
              unavailableFrom: toIstIsoDateTime(startDate ?? '', startTime ?? ''),
              unavailableTo: toIstIsoDateTime(endDate ?? '', endTime ?? ''),
            })
          ).unwrap();
        }

        toast.success(myTeamCopy.markAvailability.submitSuccess);
        handleAvailabilityDialogClose();
        refetchMyTeam();
      } catch (error: any) {
        toast.error(error || myTeamCopy.markAvailability.submitError);
      } finally {
        setIsSubmittingAvailability(false);
      }
    },
    [dispatch, refetchMyTeam, handleAvailabilityDialogClose]
  );

  const handleExport = useCallback(() => {
    dispatch(exportMyTeamAvailabilityReport());
  }, [dispatch]);

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );

  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  useEffect(() => {
    if (myTeamError) {
      toast.error(myTeamError);
    }
  }, [myTeamError]);

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, project]);

  useEffect(() => {
    refetchMyTeam();
  }, [refetchMyTeam]);

  const canReset = !!search || !!status || project.length > 0;
  const notFound = !myTeamLoading && myTeamData.length === 0;

  if (myTeamLoading && myTeamData.length === 0) {
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
      <IomMyTeamToolbar
        search={search}
        setSearch={(value) => filters.setState({ search: value })}
        filters={filters}
        roleFilters={roleFilters}
        columnManager={columnManager}
        canExport={canExport}
        dataLength={myTeamCount}
        onExport={handleExport}
      />

      {canReset && (
        <IomMyTeamFiltersResult
          filters={filters}
          totalResults={myTeamCount}
          onResetPage={table.onResetPage}
          sx={{ p: 1.5, pt: 0 }}
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
              order={table?.order}
              orderBy={table?.orderBy}
              headLabel={visibleColumns}
              rowCount={myTeamData.length}
              sx={{ backgroundColor: 'background.paper' }}
            />

            <TableBody>
              {myTeamData.map((row) => (
                <IomMyTeamTableRow
                  key={row.userId}
                  row={row}
                  visibleColumns={visibleColumns}
                  roleActions={roleActions}
                  onEditClick={handleEditClick}
                />
              ))}
              {notFound && (
                <TableNoData
                  notFound={notFound}
                  colSpan={visibleColumns?.length || tableHeadFromRole.length}
                />
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </Box>

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
            count={myTeamCount}
            rowsPerPage={table?.rowsPerPage}
            onPageChange={table?.onChangePage}
            onRowsPerPageChange={table?.onChangeRowsPerPage}
            showResultsCount
            totalResults={myTeamCount}
          />
        </Box>
      )}

      <MarkAvailabilityDialog
        open={availabilityDialogOpen}
        row={editRow}
        onClose={handleAvailabilityDialogClose}
        onSubmit={handleAvailabilitySubmit}
        isSubmitting={isSubmittingAvailability}
      />
    </>
  );
};

export default IomMyTeamTableView;
