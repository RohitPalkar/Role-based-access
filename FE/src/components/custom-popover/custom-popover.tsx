import type { PaperProps } from '@mui/material/Paper';

import Popover from '@mui/material/Popover';
import { listClasses } from '@mui/material/List';
import { menuItemClasses } from '@mui/material/MenuItem';

import { calculateAnchorOrigin } from './utils';

import type { CustomPopoverProps } from './types';

// ----------------------------------------------------------------------

export function CustomPopover({
  open,
  onClose,
  children,
  anchorEl,
  slotProps,
  sx,
  ...other
}: CustomPopoverProps) {
  const arrowPlacement = slotProps?.arrow?.placement ?? 'top-right';

  const { paperStyles, anchorOrigin, transformOrigin } = calculateAnchorOrigin(arrowPlacement);

  let sxArray: typeof sx extends any[] ? typeof sx : any[] = [];
  if (sx) {
    sxArray = Array.isArray(sx) ? sx : [sx];
  }

  return (
    <Popover
      open={!!open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      sx={[
        (theme) => ({
          /** Above sticky headers / page chrome that share the default modal layer (1300). */
          zIndex: theme.zIndex.modal + 1,
          width: '100%',
          maxWidth: '100%',
          '@media (min-width: 600px) and (max-width: 899px)': {
            width: '80%',
          },
          '@media (min-width: 899px)': {
            width: 'auto',
          },
        }),
        ...sxArray,
      ]}
      slotProps={{
        ...slotProps,
        paper: {
          ...slotProps?.paper,
          sx: {
            ...paperStyles,
            overflow: 'inherit',
            [`& .${listClasses.root}`]: { minWidth: 140 },
            [`& .${menuItemClasses.root}`]: { gap: 2 },
            ...(slotProps?.paper as PaperProps)?.sx,
            width: '100%',
            '@media (min-width: 600px) and (max-width: 899px)': {
              width: '80%',
            },
            '@media (min-width: 899px)': {
              width: 'auto',
            },
          },
        },
      }}
      {...other}
    >
      {children}
    </Popover>
  );
}
