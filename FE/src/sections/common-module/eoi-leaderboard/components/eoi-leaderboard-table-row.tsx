import type { ColumnDefinition } from 'src/hooks/use-column-manager';
import type { EOILeaderboardData } from 'src/services/rm-panel/eoi-leaderboard-service';

import React from 'react';

import { Button, Tooltip, TableRow, TableCell, Typography } from '@mui/material';

import { formatDateISTShort, formatNumberWithCommas } from 'src/utils/helper';

type Props = {
  row: EOILeaderboardData;
  visibleColumns: ColumnDefinition[];
  setListFilters?: React.Dispatch<React.SetStateAction<any>>;
  onModalOpen?: () => void;
};

export const DashboardCellButton = ({
  disabled,
  tooltip = 'No records found',
  onClick,
  children,
}: {
  disabled: boolean;
  tooltip?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) => {
  const button = (
    <Button
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick?.();
      }}
    >
      <Typography noWrap variant="body2">
        {children}
      </Typography>
    </Button>
  );

  // Tooltip only when disabled
  if (disabled) {
    return (
      <Tooltip title={tooltip} placement="top">
        <span>{button}</span>
      </Tooltip>
    );
  }

  return button;
};

const EOILeaderboardTableRow: React.FC<Props> = ({ row, visibleColumns, setListFilters,
  onModalOpen, }) => {

  const isClickable = (value?: number | string) => !!value;

  const getDisplayValue = (value?: number | string) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && value === 0) return '-';
    return value;
  };

  const handleFilterUpdate = () => {
    onModalOpen?.();

    setListFilters?.({
      isEoiLeaderboard: true,
      campaignId: row.campaignId,
      ...(row.cpId && { cpName: row.cpId }),
      ...(row.rmId && { rmId: row.rmId }),
      ...(row.createdById && { rmId: row.createdById }),
    }
    );
  };


  return (
    <TableRow hover tabIndex={-1} sx={{ height: 8 }}>
      {visibleColumns.map((col) => {
        const value = row[col.id as keyof EOILeaderboardData];

        // DATE columns
        if (col.id === 'lastCollectedDate') {
          return (
            <TableCell key={col.id}>{getDisplayValue(formatDateISTShort(value as string))}</TableCell>
          );
        }

        if (col.id === 'voucherValue' || col.id === 'amountCollected') {
          const displayValue = getDisplayValue(value as number);

          return (
            <TableCell key={col.id}>
              {displayValue === '-'
                ? '-'
                : `₹ ${formatNumberWithCommas(displayValue as number)}`}
            </TableCell>
          );
        }

        if (col.id === 'noOfVouchers') {
          return (
            <TableCell key={col.id}>
              <DashboardCellButton
                disabled={!isClickable(value as number)}
                onClick={() =>
                  handleFilterUpdate()
                }
              >
                {getDisplayValue(value as number | string)}
              </DashboardCellButton>
            </TableCell>
          )
        }

        // DEFAULT cell
        return (
          <TableCell key={col.id}>
            {getDisplayValue(value as number | string)}
          </TableCell>
        );
      })}
    </TableRow>
  )
};

export default EOILeaderboardTableRow;
