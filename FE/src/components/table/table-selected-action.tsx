import type { StackProps } from '@mui/material/Stack';

import Stack from '@mui/material/Stack';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export type TableSelectedActionProps = StackProps & {
  dense?: boolean;
  rowCount: number;
  numSelected: number;
  action?: React.ReactNode;
  onSelectAllRows: (checked: boolean, rowIds?: string[]) => void;
  rowIds?: string[];
  settableCheck?: any;
  label?: string;
};

export function TableSelectedAction({
  dense,
  action,
  rowCount,
  numSelected,
  onSelectAllRows,
  rowIds,
  settableCheck,
  label,
  sx,
  ...other
}: TableSelectedActionProps) {
  if (!numSelected) {
    return null;
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        pl: 2,
        pr: 2,
        width: 1,
        zIndex: 9,
        height: 58,
        position: 'relative',
        bgcolor: 'primary.main',
        color:'white',
        ...(dense && { height: 38 }),
        ...sx,
      }}
      {...other}
    >
      <Checkbox
         sx={{
          color: '#fff',
          '&.Mui-checked': {
            color: '#fff',
          },
          '&.MuiCheckbox-indeterminate': {
            color: '#fff',
          },
        }}
        indeterminate={!!numSelected && numSelected < rowCount}
        checked={!!rowCount && numSelected === rowCount}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          settableCheck?.(numSelected > 0);
          onSelectAllRows(event.target.checked, rowIds || []);
        }}
      />

      <Typography
        variant="subtitle2"
        sx={{
          ml: 2,
          flexGrow: 1,
          color: 'primary',
          ...(dense && { ml: 3 }),
        }}
      >
        {numSelected} {label ? `${label}${numSelected > 1 ? 's' : ''} ` : ''}selected
      </Typography>

      {action || null}
    </Stack>
  );
}
