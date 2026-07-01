import type { Opportunity } from 'src/redux/slices/rm-panel/opportunityList-slice';

import React from 'react';

import { Button, TableRow, TableCell, Typography } from '@mui/material';

import { BOOKING_FORM_STATUS } from 'src/utils/constant';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

interface OpportunitySelectionTableRowProps {
  readonly row: Opportunity;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly columns: any[]; // Pass visible columns
}

export function OpportunitySelectionTableRow({
  row,
  selected,
  onSelect,
  columns,
}: OpportunitySelectionTableRowProps) {

  const statusColorMap = {
    [BOOKING_FORM_STATUS.SIGNED_DIGITALLY]: 'success',
    [BOOKING_FORM_STATUS.SIGNED_OFFLINE]: 'success',

    [BOOKING_FORM_STATUS.SIGNED_RM_UPLOAD]: 'info',
    [BOOKING_FORM_STATUS.PRE_BOOKING_UPLOADED]: 'info',
    [BOOKING_FORM_STATUS.FILLING_BY_RM]: 'info',
    [BOOKING_FORM_STATUS.SIGNED_OFFICE_USE]: 'info',

    [BOOKING_FORM_STATUS.IN_PROGRESS]: 'warning',
    [BOOKING_FORM_STATUS.PARTIALLY_SIGNED]: 'warning',

    [BOOKING_FORM_STATUS.NOT_SIGNED]: 'error',
    [BOOKING_FORM_STATUS.NEW]: 'secondary',
  } as const;

  const statusColor = statusColorMap[row?.status as keyof typeof statusColorMap] ?? 'default';

  return (
    <TableRow
      hover
      selected={selected}
      sx={{
        '&.Mui-selected': {
          bgcolor: 'action.selected',
        },
      }}
    >
      {columns?.map((col) => {
        const value = (() => {
          switch (col.id) {
            case 'project_name':
              return row?.Project || 'N/A';
            case 'unit_number':
              return row?.unitno || 'N/A';
            case 'oppName':
              return row?.Name || 'N/A';
            case 'oppId':
              return row?.Id || 'N/A';
            case 'enqrefno':
              return row?.enqrefno || 'N/A';
            case 'status':
              return (
                <Label
                  variant="soft" color={statusColor}>
                  {row?.status}
                </Label>
              );
            case 'action':
              return (
                <Button
                  size="small"
                  variant={selected ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                  }}
                  sx={{
                    minWidth: '80px', // Ensure consistent button width
                    ...(selected && {
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        boxShadow: 'none',
                      },
                    }),
                  }}
                >
                  {selected ? 'Selected' : 'Select'}
                </Button>
              );
            default:
              return '—';
          }
        })();

        return (
          <TableCell
            key={col.id}
            sx={{
              width: col.width,
              maxWidth: col.width,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {typeof value === 'string' ? (
              <Typography variant="body2" noWrap>
                {value}
              </Typography>
            ) : (
              value
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
