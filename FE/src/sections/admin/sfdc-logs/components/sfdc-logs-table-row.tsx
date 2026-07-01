import type { FC } from 'react';
import type { RoleAction } from 'src/config/role-based-permissions';
import type { ColumnDefinition } from 'src/hooks/use-column-manager';

import { Box, Tooltip, TableRow, TableCell, IconButton } from '@mui/material';

import { fDateTime } from 'src/utils/format-time';
import { STATUS_COLORS, SfdcLogStatus } from 'src/utils/constant';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { formatSfdcLogEventLabel } from '../log-event-filter';

type LabelColor = 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

function getSfdcLogStatusColor(raw: unknown): LabelColor {
  if (raw == null || typeof raw !== 'string') {
    return 'default';
  }
  const v = raw.trim().toLowerCase();
  if (!v) {
    return 'default';
  }
  if (v === SfdcLogStatus.SUCCESS) {
    return STATUS_COLORS.SFDC_LOG_STATUS[SfdcLogStatus.SUCCESS];
  }

  return STATUS_COLORS.SFDC_LOG_STATUS[SfdcLogStatus.ERROR];
}

type Props = {
  row: Record<string, unknown>;
  visibleColumns: ColumnDefinition[];
  roleActions: RoleAction[];
  onView: (id: number) => void;
};

function formatCell(colId: string, raw: unknown): string {
  if (raw === null || raw === undefined) {
    return '-';
  }
  if (colId === 'createdAt' && (typeof raw === 'string' || raw instanceof Date)) {
    return fDateTime(raw) ?? '-';
  }
  if (typeof raw === 'object') {
    const s = JSON.stringify(raw);
    return s.length > 240 ? `${s.slice(0, 240)}…` : s;
  }
  return String(raw);
}

const SfdcLogsTableRow: FC<Props> = ({ row, visibleColumns, roleActions, onView }) => {
  const rowId = row.id;
  const numericId = typeof rowId === 'number' ? rowId : Number(rowId);
  const canView = Number.isFinite(numericId);

  return (
    <TableRow hover tabIndex={-1}>
      {visibleColumns.map((col) => {
        if (col.id === 'action' && roleActions.some((a) => a.id === 'view')) {
          return (
            <TableCell key={col.id}>
              <Tooltip title="View">
                <span>
                  <IconButton
                    size="small"
                    disabled={!canView}
                    onClick={() => canView && onView(numericId)}
                  >
                    <Iconify icon="solar:eye-bold" width={20} />
                  </IconButton>
                </span>
              </Tooltip>
            </TableCell>
          );
        }

        if (col.id === 'logEvent') {
          const raw = row[col.id];
          const text = formatSfdcLogEventLabel(raw);
          return (
            <TableCell key={col.id}>
              {text}
            </TableCell>
          );
        }

        if (col.id === 'status') {
          const rawStatus = row[col.id];
          let labelText = '';
          if (typeof rawStatus === 'string') {
            labelText = rawStatus.trim();
          } else if (rawStatus !== null && rawStatus !== undefined) {
            labelText = typeof rawStatus === 'object' ? JSON.stringify(rawStatus) : String(rawStatus);
          }
          return (
            <TableCell key={col.id}>
              <Label variant="soft" color={getSfdcLogStatusColor(rawStatus)}>
                {labelText || '-'}
              </Label>
            </TableCell>
          );
        }

        const raw = row[col.id];
        const text = formatCell(col.id, raw);
        const showTip = typeof raw === 'object' && raw !== null;
        return (
          <TableCell key={col.id}>
            {showTip ? (
              <Tooltip
                title={
                  <Box sx={{ maxWidth: 480, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(raw, null, 2)}
                  </Box>
                }
              >
                <span>{text}</span>
              </Tooltip>
            ) : (
              text
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

export default SfdcLogsTableRow;
