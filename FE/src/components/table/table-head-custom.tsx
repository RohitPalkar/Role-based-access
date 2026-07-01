import type { Theme, SxProps, CSSObject } from '@mui/material/styles';

import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import { Tooltip, Checkbox } from '@mui/material';
import TableSortLabel from '@mui/material/TableSortLabel';

import type { TableHeadCellProps } from './types';

// ----------------------------------------------------------------------

const visuallyHidden: CSSObject = {
  border: 0,
  margin: -1,
  padding: 0,
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
  clip: 'rect(0 0 0 0)',
} as const;

// ----------------------------------------------------------------------
export type TableHeadCustomProps = Readonly<{
  orderBy?: string;
  rowCount?: number;
  sx?: SxProps<Theme>;
  numSelected?: number;
  order?: 'asc' | 'desc';
  onSort?: (id: string) => void;
  headLabel: TableHeadCellProps[];
  onSelectAllRows?: (checked: boolean, rowIds?: string[]) => void;
  settableCheck?: any;
  hideCheckbox?: boolean;
  isColumnVisible?: (columnId: string, defaultVisible?: boolean) => boolean;
  allRowsCheck?: boolean;
  setAllRowsCheck?: any;
  customCheck?: boolean;
  rowIds?: string[];
}>;

export function TableHeadCustom({
  sx,
  order,
  onSort,
  orderBy,
  headLabel,
  rowCount = 0,
  numSelected = 0,
  onSelectAllRows,
  settableCheck,
  hideCheckbox,
  isColumnVisible,
  allRowsCheck,
  setAllRowsCheck,
  customCheck = false,
  rowIds,
}: TableHeadCustomProps) {
  const isSortable = (column: any) =>
    column && column.sortable === false ? column.sortable : true;
  if (settableCheck) settableCheck(numSelected > 0);

  const hasSelectColumn = headLabel.some(col => col.id === 'select');

  return (
    <TableHead sx={sx}>
      <TableRow>
        {onSelectAllRows && !hideCheckbox && !hasSelectColumn && (
          <TableCell
            padding="checkbox"
            sx={{
              backgroundColor: 'grey.500',
              borderBottom: '2px solid',
              borderBottomColor: 'grey.500',
              padding: 0,
            }}
          >
            {customCheck ? (
              <Checkbox
                indeterminate={!allRowsCheck && numSelected > 0 && numSelected < rowCount}
                checked={
                  allRowsCheck !== undefined
                    ? allRowsCheck
                    : numSelected > 0 && numSelected === rowCount
                }
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  const { checked } = event.target;

                  // propagate up
                    onSelectAllRows?.(checked, rowIds || []);

                  // maintain external flag
                  if (setAllRowsCheck) {
                    setAllRowsCheck(checked);
                  }

                  // optional: toggle "tableCheck" behaviour
                  if (settableCheck) {
                    settableCheck(checked);
                  }
                }}
                inputProps={{
                  name: 'select-all-rows',
                  'aria-label': 'select all rows',
                }}
                sx={{ p: 1.25 }}
              />
            ) : (
              <Checkbox
                indeterminate={!!numSelected && numSelected < rowCount}
                checked={!!rowCount && numSelected === rowCount}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  settableCheck?.(numSelected > 0);
                  onSelectAllRows?.(event.target.checked, rowIds || []);
                }}
                inputProps={{
                  name: 'select-all-rows',
                  'aria-label': 'select all rows',
                }}
                sx={{ p: 1.25 }}
              />
            )}
          </TableCell>
        )}

        {headLabel.filter((headCell): headCell is TableHeadCellProps => Boolean(headCell?.id)).map((headCell) => {
          // Skip rendering if column is not visible
          if (isColumnVisible && !isColumnVisible(headCell.id)) {
            return null;
          }

          if (headCell.id === 'select') {
            return (
              <TableCell key="select" padding="checkbox" sx={{ width: 60 }}>
                <Checkbox
                  indeterminate={!!numSelected && numSelected < rowCount}
                  checked={!!rowCount && numSelected === rowCount}
                  onChange={(event) =>
                    onSelectAllRows?.(event.target.checked, rowIds || [])
                  }
                />
              </TableCell>
            );
          }

          return (
            <TableCell
              key={headCell.id}
              align={headCell.align || 'left'}
              sortDirection={orderBy === headCell.id ? order : false}
              sx={[
                {
                  width: headCell.width,
                  verticalAlign: hasSelectColumn ? 'middle' : 'top',
                  py: 1,
                  backgroundColor: 'grey.400',
                  color: 'common.black',
                  fontWeight: 500,
                  borderBottom: '2px solid',
                  borderBottomColor: 'grey.500'
                },
                ...(Array.isArray(headCell.sx) ? headCell.sx : [headCell.sx]),
              ]}
            >
              {isSortable(headCell) && onSort ? (
                headCell.tooltip ? (
                  <Tooltip title={headCell.tooltip} arrow placement="top">
                    <TableSortLabel
                      hideSortIcon
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={() => onSort(headCell.id)}
                    >
                      {headCell.label}

                      {orderBy === headCell.id ? (
                        <Box component="span" sx={visuallyHidden}>
                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                        </Box>
                      ) : null}
                    </TableSortLabel>
                  </Tooltip>
                ) : (
                  <TableSortLabel
                    hideSortIcon
                    active={orderBy === headCell.id}
                    direction={orderBy === headCell.id ? order : 'asc'}
                    onClick={() => onSort(headCell.id)}
                  >
                    {headCell.label}

                    {orderBy === headCell.id ? (
                      <Box component="span" sx={visuallyHidden}>
                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </Box>
                    ) : null}
                  </TableSortLabel>
                )
              ) : (
                headCell.tooltip ? (
                  <Tooltip title={headCell.tooltip} arrow placement="top">
                    <span>{headCell.label}</span>
                  </Tooltip>
                ) : (
                  headCell.label
                )
              )}
            </TableCell>
          );
        })}
      </TableRow>
    </TableHead>
  );
}