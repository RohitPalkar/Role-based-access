import type { Theme, Components } from '@mui/material/styles';

import { tableRowClasses } from '@mui/material/TableRow';
import { tableCellClasses } from '@mui/material/TableCell';

import { varAlpha } from '../../styles';

// ----------------------------------------------------------------------

const MuiTableContainer: Components<Theme>['MuiTableContainer'] = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ theme }) => ({
      position: 'relative',
      scrollbarWidth: 'thin',
      scrollbarColor: `${varAlpha(theme.vars.palette.text.disabledChannel, 0.4)} ${varAlpha(theme.vars.palette.text.disabledChannel, 0.08)}`,
    }),
  },
};

// ----------------------------------------------------------------------

const MuiTable: Components<Theme>['MuiTable'] = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ theme }) => ({ 
      '--palette-TableCell-border': theme.vars.palette.divider,
      // Common table styles
      tableLayout: 'fixed',
      width: '100%',
      minWidth: 1200,
    }),
  },
};

// ----------------------------------------------------------------------

const MuiTableRow: Components<Theme>['MuiTableRow'] = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ theme }) => ({
      [`&.${tableRowClasses.selected}`]: {
        backgroundColor: varAlpha(theme.vars.palette.primary.darkChannel, 0.04),
        '&:hover': { backgroundColor: varAlpha(theme.vars.palette.primary.darkChannel, 0.08) },
      },
      '&:last-of-type': { [`& .${tableCellClasses.root}`]: { borderColor: 'transparent' } },
      // Alternating row colors for table body
      'tbody &:nth-of-type(even)': {
        backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
      },
      'tbody &:hover': {
        backgroundColor: `${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)} !important`,
      },
    }),
  },
};

// ----------------------------------------------------------------------

const MuiTableCell: Components<Theme>['MuiTableCell'] = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ theme }) => ({ 
      borderBottomStyle: 'dashed',
      // Common cell styles for all tables
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      paddingLeft: theme.spacing(1.25),
      paddingRight: theme.spacing(1.25),
    }),
    head: ({ theme }) => ({
      fontSize: 14,
      color: theme.vars.palette.common.black,
      fontWeight: theme.typography.fontWeightSemiBold,
      backgroundColor: theme.vars.palette.grey[400],
     
      padding: theme.spacing(1),
      verticalAlign: 'top',
      whiteSpace: 'nowrap'
    }),
    stickyHeader: ({ theme }) => ({
      backgroundColor: theme.vars.palette.grey[400],
      backgroundImage: `linear-gradient(to bottom, ${theme.vars.palette.grey[400]} 0%, ${theme.vars.palette.grey[400]} 100%)`,
    
    }),
    paddingCheckbox: ({ theme }) => ({ 
      paddingLeft: theme.spacing(1),
     
    }),
   
  },
};

// ----------------------------------------------------------------------

const MuiTablePagination: Components<Theme>['MuiTablePagination'] = {
  /** **************************************
   * DEFAULT PROPS
   *************************************** */
  defaultProps: {
    backIconButtonProps: { size: 'small', sx: { padding: '2px', width: 24, height: 24 } },
    nextIconButtonProps: { size: 'small', sx: { padding: '2px', width: 24, height: 24 } },
    slotProps: { select: { name: 'table-pagination-select' } },
  },

  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: { width: '100%' },
    toolbar: { 
      height: 32, // Reduced from 48
      minHeight: 32, // Reduced from 48
      padding: '0 4px', // More compact padding
      display: 'flex',
      alignItems: 'center',
    },
    actions: { marginRight: 4 }, // Reduced margin
    displayedRows: {
      fontSize: '0.7rem', // Smaller font
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      lineHeight: 1.2,
    },
    selectLabel: {
      fontSize: '0.7rem', // Smaller font
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      lineHeight: 1.2,
    },
    select: ({ theme }) => ({
      paddingLeft: 6, // Reduced padding
      paddingTop: 2, // Reduced padding
      paddingBottom: 2, // Reduced padding
      fontSize: '0.7rem', // Smaller font
      height: 24, // Reduced height
      display: 'flex',
      alignItems: 'center',
      lineHeight: 1,
      '&:focus': { borderRadius: theme.shape.borderRadius },
    }),
    selectIcon: {
      right: 2, // Adjusted position
      width: 14, // Smaller icon
      height: 14, // Smaller icon
      top: '50%', // Center vertically
      transform: 'translateY(-50%)', // Perfect centering
    },
  },
};

// ----------------------------------------------------------------------

export const table = {
  MuiTable,
  MuiTableRow,
  MuiTableCell,
  MuiTableContainer,
  MuiTablePagination,
};
