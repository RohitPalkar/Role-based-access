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

export type GroupConfig = {
  [groupName: string]: {
    label: string;
    colspan: number;
    align?: 'left' | 'center' | 'right';
  };
};

export type TableHeadGroupedProps = Readonly<{
  orderBy?: string;
  rowCount?: number;
  sx?: SxProps<Theme>;
  numSelected?: number;
  order?: 'asc' | 'desc';
  onSort?: (id: string) => void;
  headLabel: TableHeadCellProps[];
  onSelectAllRows?: (checked: boolean) => void;
  settableCheck?: any;
  hideCheckbox?: boolean;
  isColumnVisible?: (columnId: string, defaultVisible?: boolean) => boolean;
  groupConfig?: GroupConfig; // Configuration for groups
  stickyHeader?: boolean; // Enable sticky header functionality
}>;

export function TableHeadGrouped({
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
  groupConfig,
  stickyHeader = false,
}: TableHeadGroupedProps) {
  const isSortable = (column: any) =>
    column && column.sortable === false ? column.sortable : true;
  
  if (settableCheck) settableCheck(numSelected > 0);

  // Filter visible columns
  const visibleColumns = headLabel.filter(headCell => 
    !isColumnVisible || isColumnVisible(headCell.id)
  );

  // Calculate group spans based on visible columns
  const calculateGroupSpans = () => {
    if (!groupConfig) return {};
    
    const groupSpans: { [key: string]: number } = {};
    
    Object.keys(groupConfig).forEach(groupName => {
      const columnsInGroup = visibleColumns.filter(col => col.group === groupName);
      groupSpans[groupName] = columnsInGroup.length;
    });
    
    return groupSpans;
  };

  const groupSpans = calculateGroupSpans();

  // Render group header row
  const renderGroupHeader = () => {
    if (!groupConfig) return null;

    const groupCells = [];
    const processedColumns = new Set();

    // Add checkbox cell if needed
    if (onSelectAllRows && !hideCheckbox) {
      groupCells.push(
        <TableCell 
          key="checkbox-group" 
          rowSpan={2} 
          padding="checkbox"
          sx={{ 
            verticalAlign: 'middle',
            backgroundColor: 'grey.100',
 
          }}
        >
          <Checkbox
            indeterminate={!!numSelected && numSelected < rowCount}
            checked={!!rowCount && numSelected === rowCount}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              settableCheck(numSelected > 0);
              onSelectAllRows(event.target.checked);
            }}
            inputProps={{
              name: 'select-all-rows',
              'aria-label': 'select all rows',
            }}
          />
        </TableCell>
      );
    }


    visibleColumns.forEach((column, index) => {
      if (processedColumns.has(column.id)) return;

      if (column.group && groupConfig[column.group] && groupSpans[column.group] > 0) {
        // This is a grouped column
        const group = groupConfig[column.group];
        
        groupCells.push(
          <TableCell
            key={`group-${column.group}`}
            colSpan={groupSpans[column.group]}
            align={group.align || 'center'}
            sx={{
              fontWeight: 500,
              backgroundColor: 'grey.100',
              color: 'common.black',
                borderBottom: 'none',
             
            }}
          >
            {group.label}
          </TableCell>
        );

        // Mark all columns in this group as processed
        visibleColumns
          .filter(col => col.group === column.group)
          .forEach(col => processedColumns.add(col.id));
      } else {
        // This is a non-grouped column
        groupCells.push(
          <TableCell
            key={`single-${column.id}`}
            rowSpan={2}
            align={column.align || 'left'}
            sx={[
              { 
                width: column.width, 
                verticalAlign: 'middle',
                fontWeight: 500,
                backgroundColor: 'grey.100',
                color: 'common.black'
              },
              ...(Array.isArray(column.sx) ? column.sx : [column.sx]),
            ]}
          >
            {isSortable(column) && onSort ? (
              column.tooltip ? (
                <Tooltip title={column.tooltip} arrow placement="top">
                  <TableSortLabel
                    hideSortIcon
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => onSort(column.id)}
                  >
                    {column.label}
                    {orderBy === column.id ? (
                      <Box component="span" sx={visuallyHidden}>
                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </Box>
                    ) : null}
                  </TableSortLabel>
                </Tooltip>
              ) : (
                <TableSortLabel
                  hideSortIcon
                  active={orderBy === column.id}
                  direction={orderBy === column.id ? order : 'asc'}
                  onClick={() => onSort(column.id)}
                >
                  {column.label}
                  {orderBy === column.id ? (
                    <Box component="span" sx={visuallyHidden}>
                      {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                    </Box>
                  ) : null}
                </TableSortLabel>
              )
            ) : (
              column.tooltip ? (
                <Tooltip title={column.tooltip} arrow placement="top">
                  <span>{column.label}</span>
                </Tooltip>
              ) : (
                column.label
              )
            )}
          </TableCell>
        );
        processedColumns.add(column.id);
      }
    });

    return (
      <TableRow 
        sx={stickyHeader ? {
          position: 'sticky',
          top: 0,
          zIndex: 3,
          backgroundColor: 'background.paper',
        } : undefined}
      >
        {groupCells}
      </TableRow>
    );
  };

  // Render individual column headers (second row)
  const renderColumnHeaders = () => {
    const columnCells: React.ReactElement[] = [];

    // Get grouped columns only
    const groupedColumns = visibleColumns.filter(col => col.group);
    
    // Create a map of groups to their columns
    const groupToColumns: { [key: string]: typeof groupedColumns } = {};
    groupedColumns.forEach(col => {
      if (!groupToColumns[col.group!]) {
        groupToColumns[col.group!] = [];
      }
      groupToColumns[col.group!].push(col);
    });

   

    visibleColumns.forEach((headCell) => {
      // Skip non-grouped columns as they are already rendered in the first row with rowSpan={2}
      if (!headCell.group) return;   

      columnCells.push(
        <TableCell
          key={headCell.id}
          align={headCell.align || 'left'}
          sortDirection={orderBy === headCell.id ? order : false}
          sx={[
            { 
              width: headCell.width, 
              verticalAlign: 'top',
              backgroundColor: 'grey.100',
              color: 'common.black',
              fontWeight: 500,
   
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
    });

    return columnCells.length > 0 ? (
      <TableRow 
        sx={stickyHeader ? {
          position: 'sticky',
         
          zIndex: 2,
          backgroundColor: 'background.paper',
        } : undefined}
      >
        {columnCells}
      </TableRow>
    ) : null;
  };

  return (
    <TableHead 
      sx={[
        stickyHeader ? {
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'background.paper',
        } : {},
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {renderGroupHeader()}
      {renderColumnHeaders()}
    </TableHead>
  );
}