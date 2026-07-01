import type { Theme, Components } from '@mui/material/styles';

// ----------------------------------------------------------------------

const MuiBreadcrumbs: Components<Theme>['MuiBreadcrumbs'] = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    ol: ({ theme }) => ({ rowGap: theme.spacing(0.5), columnGap: theme.spacing(2) }),

    li: ({ theme }) => ({ 
      display: 'inline-flex', 
      '& > *': { 
        ...theme.typography.body2,
        fontSize: theme.typography.pxToRem(13), // Reduced from default body2 size
      } 
    }),
    separator: { margin: 0 },
  },
};

// ----------------------------------------------------------------------

export const breadcrumbs = { MuiBreadcrumbs };
