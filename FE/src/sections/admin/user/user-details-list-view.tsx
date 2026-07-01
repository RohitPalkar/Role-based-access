import type { User } from 'src/redux/type';
import type { ColumnDefinition } from 'src/hooks/use-column-manager';

import React, { useState, useEffect } from 'react'

import { Box, Card, Table, TableRow, TableCell, TableBody, Typography } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { formatDateIST } from 'src/utils/helper';
import { getTableStyles, tableScrollbarStyles, calculateTableMinWidth, tableContainerStylesSmall, fixedFooterPaginationStyles, scrollableTableContentStyles } from 'src/utils/table-styles';

import { getUserDetailsList } from 'src/redux/actions/admin/user-actions';

import { Scrollbar } from 'src/components/scrollbar';
import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { UserDetailsToolbar } from './components/user-details-toolbar';
import { UserDetailsFilterResult } from './components/user-details-filter-result';

interface UserDetailsListProps {
  user: User;
}

const TABLE_HEAD: ColumnDefinition[] = [
  { id: 'groupName', label: 'Group Name', width: 320, visible: true, disableToggle: true },
  { id: 'startDate', label: 'Start Date', width: 250, visible: true, disableToggle: true },
  { id: 'endDate', label: 'End Date', width: 250, visible: true, disableToggle: false },
];

const UserDetailsListView = ({ user }: UserDetailsListProps) => {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');

  const columnManager = useColumnManager(TABLE_HEAD);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns);

  const { userDetailsList } = useAppSelector((state) => state.userlist);

  const assignments = userDetailsList?.assignments ?? [];
  const totalResults = userDetailsList?.total ?? 0;

  useEffect(() => {
    if (!user?.id) return;

    dispatch(
      getUserDetailsList({
        userId: user?.id,
        params: {
          page,
          limit: rowsPerPage,
          search,
        },
      })
    );
  }, [dispatch, user?.id, page, rowsPerPage, search]);

  return (
    <Card sx={{
      ...tableContainerStylesSmall,
      mt: 2,
    }}>
        {/* Toolbar */}
        <UserDetailsToolbar
          search={search}
          setSearch={setSearch}
          columnManager={columnManager}
        />

        {/* Filters result */}
        {Boolean(search) && (
          <UserDetailsFilterResult
            search={search}
            setSearch={setSearch}
            totalResults={assignments.length || 0}
            sx={{ px: 2, pb: 1 }}
          />
        )}

      {/* Table */}
      <Box sx={scrollableTableContentStyles}>
        <Scrollbar sx={tableScrollbarStyles}>
          <Table 
            stickyHeader 
            size="small" 
            sx={{
              ...getTableStyles(dynamicMinWidth),
              '& .MuiTableBody-root .MuiTableCell-root': {
                py: '6px',
              },
            }}
          >
            <TableHeadCustom
              headLabel={visibleColumns}
              orderBy={undefined}
              order="asc"
              numSelected={0}
              rowCount={assignments.length}
            />
          
          <TableBody>
            {assignments?.length > 0 ? (
              assignments?.map((row) => (
                <TableRow hover key={row.groupId}>
                  {visibleColumns.map((col) => {
                    const value = row[col.id as keyof typeof row];

                    if (col?.id === 'startDate' || col?.id === 'endDate') {
                      return (
                        <TableCell key={col?.id}>
                          <Typography noWrap variant="body2">
                            {value ? formatDateIST(value as string, { hideTime: true }) : '-'}
                          </Typography>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell key={col.id}>
                        <Typography noWrap variant="body2">
                        {value ?? '-'}
                        </Typography>
                      </TableCell>
                    );
                  })}
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
            count={totalResults}
            rowsPerPage={rowsPerPage}
            onPageChange={(e, newPage) => setPage(newPage + 1)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number.parseInt(e.target.value, 10));
              setPage(1);
            }}
            showResultsCount
            totalResults={totalResults}
          />
        </Box>
    </Card>
  )
}

export default UserDetailsListView

