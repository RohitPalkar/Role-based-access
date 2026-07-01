import type { Theme, Components, ComponentsVariants } from '@mui/material/styles';

import { avatarGroupClasses } from '@mui/material/AvatarGroup';

import { varAlpha } from '../../styles';

// ----------------------------------------------------------------------

// NEW VARIANT
declare module '@mui/material/AvatarGroup' {
  interface AvatarGroupPropsVariantOverrides {
    compact: true;
  }
}

const COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const;

const PRIMARY_LETTERS = new Set(['a', 'c', 'f']);
const SECONDARY_LETTERS = new Set(['e', 'd', 'h']);
const INFO_LETTERS = new Set(['i', 'k', 'l']);
const SUCCESS_LETTERS = new Set(['m', 'n', 'p']);
const WARNING_LETTERS = new Set(['q', 's', 't']);
const ERROR_LETTERS = new Set(['v', 'x', 'y']);

const colorByName = (name: string) => {
  const charAt = name.charAt(0).toLowerCase();

  if (PRIMARY_LETTERS.has(charAt)) return 'primary';
  if (SECONDARY_LETTERS.has(charAt)) return 'secondary';
  if (INFO_LETTERS.has(charAt)) return 'info';
  if (SUCCESS_LETTERS.has(charAt)) return 'success';
  if (WARNING_LETTERS.has(charAt)) return 'warning';
  if (ERROR_LETTERS.has(charAt)) return 'error';
  return 'default';
};

// ----------------------------------------------------------------------

const avatarColors: Record<string, ComponentsVariants<Theme>['MuiAvatar']> = {
  colors: COLORS.map((color) => ({
    props: ({ ownerState }) => ownerState.color === color,
    style: ({ theme }) => ({
      color: theme.vars.palette[color].contrastText,
      backgroundColor: theme.vars.palette[color].main,
    }),
  })),
  defaultColor: [
    {
      props: ({ ownerState }) => ownerState.color === 'default',
      style: ({ theme }) => ({
        color: theme.vars.palette.text.secondary,
        backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.24),
      }),
    },
  ],
};

const MuiAvatar: Components<Theme>['MuiAvatar'] = {
  /** **************************************
   * VARIANTS
   *************************************** */
  variants: [...[...avatarColors.defaultColor!, ...avatarColors.colors!]],

  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    rounded: ({ theme }) => ({ borderRadius: theme.shape.borderRadius * 1.5 }),
    colorDefault: ({ ownerState, theme }) => {
      const color = colorByName(`${ownerState.alt}`);

      return {
        ...(!!ownerState.alt && {
          ...(color !== 'default'
            ? {
                color: theme.vars.palette[color].contrastText,
                backgroundColor: theme.vars.palette[color].main,
              }
            : {
                color: theme.vars.palette.text.secondary,
                backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.24),
              }),
        }),
      };
    },
  },
};

// ----------------------------------------------------------------------

const MuiAvatarGroup: Components<Theme>['MuiAvatarGroup'] = {
  /** **************************************
   * DEFAULT PROPS
   *************************************** */
  defaultProps: { max: 4 },

  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ ownerState }) => ({
      justifyContent: 'flex-end',
      ...(ownerState.variant === 'compact' && {
        width: 40,
        height: 40,
        position: 'relative',
        [`& .${avatarGroupClasses.avatar}`]: {
          margin: 0,
          width: 28,
          height: 28,
          position: 'absolute',
          '&:first-of-type': { left: 0, bottom: 0, zIndex: 9 },
          '&:last-of-type': { top: 0, right: 0 },
        },
      }),
    }),
    avatar: ({ theme }) => ({
      fontSize: 16,
      fontWeight: theme.typography.fontWeightSemiBold,
      '&:first-of-type': {
        fontSize: 12,
        color: theme.vars.palette.primary.dark,
        backgroundColor: theme.vars.palette.primary.lighter,
      },
    }),
  },
};

// ----------------------------------------------------------------------

export const avatar = { MuiAvatar, MuiAvatarGroup };
