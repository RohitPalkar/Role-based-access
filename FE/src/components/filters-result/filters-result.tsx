import type { ChipProps } from '@mui/material/Chip';
import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const chipProps: ChipProps = {
  size: 'small',
  variant: 'soft',
  sx: {
    backgroundColor: '#1A407D',
    color: '#FFFFFF',
    '&:hover': {
      backgroundColor: '#174A9D',
    },
  }
};
export type FiltersResultProps = React.ComponentProps<'div'> & {
  totalResults: number;
  onReset?: () => void;
  sx?: SxProps<Theme>;
};

export function FiltersResult({ totalResults, onReset, sx, children }: FiltersResultProps) {
  return (
    <Box sx={sx}>
      {/* <Box sx={{ mb: 1.5, typography: 'body2' }}>
        <strong>{totalResults}</strong>
        <Box component="span" sx={{ color: 'text.secondary', ml: 0.25 }}>
        &nbsp; Results found
        </Box>
      </Box> */}

      <Box 
        flexGrow={1} 
        gap={1} 
        display="flex" 
        flexWrap="wrap" 
        alignItems="center"
        sx={{ minHeight: 32 }}
      >
        {children}

        <Button
          color="error"
          onClick={onReset}
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
          sx={{ height: 32 }}
        >
          Clear
        </Button>
      </Box>
    </Box>
  );
}
