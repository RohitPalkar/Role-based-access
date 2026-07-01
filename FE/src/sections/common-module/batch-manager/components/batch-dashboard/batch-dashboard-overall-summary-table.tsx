import React from 'react';

import {
  Card,
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  TableContainer,
} from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

const { overallSummary } = uiText.batchManager.dashboard;
const headerCellBase = {
  verticalAlign: 'middle',
  backgroundColor: '#F4F6F8',
  color: '#637381',
};

type ColumnAlign = 'left' | 'center' | 'right' | 'justify' | 'inherit';

type Row = {
  id: number;
  segment: string;
  invited: number;
  attended: number;
  unitsBooked: number;
  agreementsSigned: number;
  salesVolume: string;
  amountCollected: string;
  percentage: string;
  onlineBookings: string;
  crmPushed: string;
  isTotal?: boolean;
  amountCollectedSubText?: string;
};

type Column = {
  key: keyof Row;
  label: string;
  width: number;
  align?: ColumnAlign;
  wrap?: boolean;
};

const columns: Column[] = [
  { key: 'segment', label: overallSummary.segment, width: 200, align: 'left' },
  { key: 'invited', label: overallSummary.invited, width: 100, align: 'center' },
  { key: 'attended', label: overallSummary.attended, width: 100, align: 'center' },
  { key: 'unitsBooked', label: overallSummary.unitsBooked, width: 150, align: 'center' },
  {
    key: 'agreementsSigned',
    label: overallSummary.agreementsSigned,
    width: 150,
    wrap: true,
    align: 'center',
  },
  { key: 'salesVolume', label: overallSummary.salesValue, width: 150, align: 'center' },
  {
    key: 'amountCollected',
    label: overallSummary.agreementAmountCollected,
    width: 240,
    wrap: true,
    align: 'center',
  },
  { key: 'percentage', label: overallSummary.percentageOfSaleValue, width: 200, align: 'center' },
];

const rows: Row[] = [
  {
    id: 1,
    segment: overallSummary.batchesActiveElapsed,
    invited: 1000,
    attended: 870,
    unitsBooked: 490,
    agreementsSigned: 352,
    salesVolume: '989.41 Cr',
    amountCollected: '95.41 Cr',
    amountCollectedSubText: overallSummary.activeElapsedAmtSubtext,
    percentage: '9.62%',
    onlineBookings: '467 (95%)',
    crmPushed: '23 (80%)',
  },
  {
    id: 2,
    segment: overallSummary.freshWalkIns,
    invited: 70,
    attended: 40,
    unitsBooked: 40,
    agreementsSigned: 32,
    salesVolume: '88.65 Cr',
    amountCollected: '7.85 Cr',
    amountCollectedSubText: overallSummary.freshWalkInsAmtSubtext,
    percentage: '8%',
    onlineBookings: '32 (80%)',
    crmPushed: '-',
  },
  {
    id: 3,
    segment: overallSummary.total,
    invited: 1070,
    attended: 910,
    unitsBooked: 530,
    agreementsSigned: 384,
    salesVolume: '1,078.06 Cr',
    amountCollected: '102.12 Cr',
    amountCollectedSubText: overallSummary.totalAmtSubtext,
    percentage: '9.58%',
    onlineBookings: '499 (94%)',
    crmPushed: '23 (100%)',
    isTotal: true,
  },
];

const BatchDashboardOverallSummaryTable = () => (
  <Card sx={{ p: 3, my: 2 }}>
    <Typography sx={{ fontSize: '16px', mb: 2, fontWeight: 600 }}>
      {overallSummary.overallSummary}
    </Typography>

    <TableContainer
      sx={{
        borderRadius: 2,
        border: '1px solid #E5E7EB',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
      <Table
        sx={{
          minWidth: 1600,
          borderCollapse: 'separate',
          borderSpacing: 0,
          '& th, & td': {
            borderLeft: '1px solid #E5E7EB !important',
            borderBottom: '1px solid #E5E7EB !important',
          },
          '& th:first-of-type, & td:first-of-type': {
            borderLeft: 'none',
          },
        }}
      >
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                rowSpan={2}
                align={col?.align || 'center'}
                sx={{
                  ...headerCellBase,
                  width: col.width,
                  ...(col.wrap && {
                    whiteSpace: 'normal',
                    overflow: 'visible',
                  }),
                }}
              >
                {col.label}
              </TableCell>
            ))}

            <TableCell align="center" colSpan={2} sx={headerCellBase}>
              {overallSummary.onlineBookingForms}
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell
              align="center"
              sx={{
                ...headerCellBase,
                border: '1px solid #E5E7EB !important',
                borderTop: 'none !important',
              }}
            >
              {overallSummary.signed}
            </TableCell>

            <TableCell
              align="center"
              sx={{
                ...headerCellBase,
                borderBottom: '1px solid #E5E7EB !important',
              }}
            >
              {overallSummary.crmPushed}
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={row.id}
              sx={{
                '& td': {
                  fontWeight: row.isTotal ? 600 : 400,
                },
                backgroundColor: row.isTotal ? '#E8ECF2' : 'transparent !important',
              }}
            >
              {columns.map((col) => (
                <TableCell key={String(col.key)} align={col.align || 'center'}>
                  {col.key === 'amountCollected' ? (
                    <>
                      <Typography
                        sx={{
                          fontSize: '16px',
                          fontWeight: row.isTotal ? 600 : 400,
                          color: '#1C252E',
                        }}
                      >
                        {row.amountCollected}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#637381',
                        }}
                      >
                        {row.amountCollectedSubText}
                      </Typography>
                    </>
                  ) : (
                    row[col.key]
                  )}
                </TableCell>
              ))}

              <TableCell align="center">{row.onlineBookings}</TableCell>
              <TableCell align="center">{row.crmPushed}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Card>
);

export default BatchDashboardOverallSummaryTable;
