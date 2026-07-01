import type { Theme, Components } from '@mui/material/styles';

import { menuItem } from '../../styles';

// ----------------------------------------------------------------------

const MuiMenu: Components<Theme>['MuiMenu'] = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    /**
     * CustomPopover (filters, etc.) uses `zIndex.modal + 1`. Default Menu uses `modal`,
     * so Select dropdowns render behind filter panels. Align with MuiPickersPopper (+2).
     */
    root: ({ theme }) => ({
      zIndex: theme.zIndex.modal + 2,
    }),
  },
};

// ----------------------------------------------------------------------

const MuiMenuItem: Components<Theme>['MuiMenuItem'] = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: { root: ({ theme }) => ({ ...menuItem(theme) }) },
};

// ----------------------------------------------------------------------

export const menu = { MuiMenu, MuiMenuItem };
