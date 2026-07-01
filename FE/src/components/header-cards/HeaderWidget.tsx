import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import { Typography } from '@mui/material';

// ----------------------------------------------------------------------

type HeaderWidgetProps = BoxProps & {
  headingName: string;
  value: string;
};

export function HeaderWidget({ headingName, value }: HeaderWidgetProps) {
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 1 },
        gap: 3,
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
        color: '#1A407D',
        bgcolor: '#F8F8F8',
        borderLeft: '5px solid #1A407D',
        minHeight: { xs: '100px', sm: '100px' },
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <Typography
        sx={{ 
          color: '#1A407D', 
          fontSize: { xs: '14px', sm: '16px' }, 
          fontWeight: '500', 
          lineHeight: { xs: '1.3', sm: '36px' }, 
          mb: 1,
          wordBreak: 'break-word',
          overflow: 'hidden'
        }}
      >
        {headingName}
      </Typography>
      <Typography 
        sx={{ 
          color: '#000000', 
          fontSize: { xs: '14px', sm: '16px' }, 
          fontWeight: '600',
          wordBreak: 'break-word',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: { xs: 3, sm: 2 },
          WebkitBoxOrient: 'vertical',
          lineHeight: '1.4'
        }}
        title={value} // Show full text on hover
      >
        {value}
      </Typography>
    </Box>
  );
}
