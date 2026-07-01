import type { Theme } from '@mui/material/styles';

import { Box, Chip } from '@mui/material';

type PaletteKey = 'primary' | 'success' | 'warning' | 'error' | 'info';

type TabBadgeLabelProps = Readonly<{
  count?: number;
  bgColor: string;
  textColor: string;
  selectedBgColor?: string;
  selectedTextColor?: string;
}>;

const resolveColor = (theme: Theme, value: string) => {
  if (theme.palette[value as PaletteKey]) {
    return theme.palette[value as PaletteKey].main;
  }
  return value;
};

export default function TabBadgeLabel({
  count,
  bgColor,
  textColor,
  selectedBgColor,
  selectedTextColor,
}: TabBadgeLabelProps) {
  return (
    <Box ml={1}>
      <Chip
        label={Number(count) > 99 ? '99+' : count}
        size="small"
        sx={(theme) => ({
          height: 25,
          width: 32,
          fontSize: 12,
          fontWeight: 700,
          borderRadius: '6px',
          transition: 'all 0.2s ease',
          alignContent: 'center',
          '& .MuiChip-label': {
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          },

          backgroundColor: resolveColor(theme, bgColor),
          color: resolveColor(theme, textColor),

          '&:hover': {
            backgroundColor: resolveColor(theme, bgColor),
            color: resolveColor(theme, textColor),
          },

          '.Mui-selected &': {
            backgroundColor: selectedBgColor
              ? resolveColor(theme, selectedBgColor)
              : resolveColor(theme, bgColor),
            color: selectedTextColor
              ? resolveColor(theme, selectedTextColor)
              : resolveColor(theme, textColor),
          },
        })}
      />
    </Box>
  );
}