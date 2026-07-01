import type { InvoiceTableFilters } from 'src/sections/common-module/internal-office-memo/iom-config';

import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { useSetState } from 'minimal-shared/hooks';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import Chip from '@mui/material/Chip';
import { Box, Card, Table, Button, TableBody, Typography } from '@mui/material';

import { useColumnManager } from 'src/hooks/use-column-manager';
import { useRoleBasedPermissions } from 'src/hooks/use-role-based-permissions';

import { generateRoleBasedRoute } from 'src/utils/constant';
import { roleColumnsToDefinitions } from 'src/utils/role-table-head';
import { getTableStyles, tableContainerStyles, calculateTableMinWidth, stickyBreadcrumbsStyles } from 'src/utils/table-styles';

import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';

import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';
import { useTable, TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { InvoiceTableRow } from './invoice-table-row';
import InvoiceDialog from '../dialog-boxes/invoice-dialog';
import { InvoiceTableToolbar } from './invoice-table-toolbar';
import {
  filterInvoiceListing,
  INVOICE_LISTING_MOCK_DATA,
  getCloseInvoiceDetailsFromRow,
} from './invoice-listing-mock';

const invoiceCopy = uiText.internalOfficeMemo.invoiceListing;

const InvoiceTableView = () => {
  const { id: invoiceId } = useParams();
  const { columns: roleColumns, userRole } = useRoleBasedPermissions({ module: 'iomInvoice' });

  const table = useTable({ defaultRowsPerPage: 5 });
  const [isCloseInvoiceOpen, setIsCloseInvoiceOpen] = useState(false);
  const [isCloseInvoiceSubmitting, setIsCloseInvoiceSubmitting] = useState(false);

  const tableHeadFromRole = useMemo(
    () => roleColumnsToDefinitions(roleColumns),
    [roleColumns]
  );
  const columnManager = useColumnManager(tableHeadFromRole);
  const { visibleColumns } = columnManager;
  const dynamicMinWidth = calculateTableMinWidth(visibleColumns || tableHeadFromRole);

  const filters = useSetState<InvoiceTableFilters>({ search: '' });
  const { search } = filters.state;

  const selectedInvoice = useMemo(
    () => INVOICE_LISTING_MOCK_DATA.find((row) => String(row.id) === invoiceId),
    [invoiceId]
  );

  const invoiceNumber = selectedInvoice?.invoiceNumber;
  const invoiceHeading = invoiceNumber
    ? `${uiText.internalOfficeMemo.columns.invoiceNo} : ${invoiceNumber}`
    : uiText.internalOfficeMemo.columns.invoiceNo;

  const closeInvoiceDetails = useMemo(
    () => getCloseInvoiceDetailsFromRow(selectedInvoice),
    [selectedInvoice]
  );

  const filteredRows = useMemo(
    () => filterInvoiceListing(INVOICE_LISTING_MOCK_DATA, search),
    [search]
  );

  const invoiceData = useMemo(() => {
    const start = table.page * table.rowsPerPage;
    return filteredRows.slice(start, start + table.rowsPerPage);
  }, [filteredRows, table.page, table.rowsPerPage]);

  const total = filteredRows.length;

  useEffect(() => {
    table.onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleCloseInvoiceSubmit = useCallback(
    async (_payload: any) => {
      try {
        setIsCloseInvoiceSubmitting(true);
        // TODO: wire close-invoice API when available
        setIsCloseInvoiceOpen(false);
      } catch {
        toast.error(uiText.internalOfficeMemo.closeInvoice.submitError);
      } finally {
        setIsCloseInvoiceSubmitting(false);
      }
    },
    []
  );

  const notFound = invoiceData.length === 0;
  const canReset = Boolean(search);

  return (
    <DashboardContent>
      <Box sx={stickyBreadcrumbsStyles}>
        <CustomBreadcrumbs
          heading={invoiceHeading}
          links={[
            {
              name: uiText.internalOfficeMemo.title,
              href: generateRoleBasedRoute(userRole, 'iom-management'),
            },
            {
              name: invoiceHeading,
              href: '#',
            },
          ]}
          action={
            <Button
              size="large"
              variant="contained"
              className="primaryBtn"
              onClick={() => setIsCloseInvoiceOpen(true)}
            >
              {uiText.internalOfficeMemo.actions.closeInvoice}
            </Button>
          }
        />
      </Box>

      <Typography sx={{ px: 2, pt: 2, fontSize: 16, fontWeight: 600 }}>
        {invoiceCopy.linkedIoms}
      </Typography>

      <Card sx={{ ...tableContainerStyles, mt: 2 }}>
        <InvoiceTableToolbar
          search={search}
          setSearch={(value) => filters.setState({ search: value })}
          columnManager={columnManager}
        />

        {canReset && (
          <FiltersResult
            totalResults={total}
            onReset={() => {
              filters.setState({ search: '' });
              table.onResetPage();
            }}
            sx={{ px: 1.5, pt: 0, pb: 1 }}
          >
            <FiltersBlock label="Search:" isShow={Boolean(search)}>
              <Chip
                {...chipProps}
                label={search}
                onDelete={() => {
                  filters.setState({ search: '' });
                  table.onResetPage();
                }}
              />
            </FiltersBlock>
          </FiltersResult>
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
              size={table.dense ? 'small' : 'medium'}
              sx={getTableStyles(dynamicMinWidth)}
            >
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headLabel={visibleColumns}
                rowCount={invoiceData.length}
                sx={{ backgroundColor: 'background.paper' }}
              />

              <TableBody>
                {invoiceData.map((row) => (
                  <InvoiceTableRow
                    key={row.id}
                    row={row}
                    visibleColumns={visibleColumns}
                    userRole={userRole}
                  />
                ))}
                {notFound && (
                  <TableNoData notFound={notFound} colSpan={visibleColumns.length || tableHeadFromRole.length} />
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
            }}
          >
            <TablePaginationCustom
              page={table.page}
              count={total}
              rowsPerPage={table.rowsPerPage}
              onPageChange={table.onChangePage}
              onRowsPerPageChange={table.onChangeRowsPerPage}
              showResultsCount
              totalResults={total}
            />
          </Box>
        )}
      </Card>

      <InvoiceDialog
        mode='close'
        open={isCloseInvoiceOpen}
        onClose={() => setIsCloseInvoiceOpen(false)}
        invoiceDetails={isCloseInvoiceOpen ? closeInvoiceDetails : null}
        isSubmitting={isCloseInvoiceSubmitting}
        onSubmit={handleCloseInvoiceSubmit}
      />
    </DashboardContent>
  );
};

export default InvoiceTableView;
