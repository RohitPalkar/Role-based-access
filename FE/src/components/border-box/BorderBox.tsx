import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import { Typography } from '@mui/material';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  children?: React.ReactNode;
};

export function BorderBox({ title, children, sx, ...other }: Props) {
  return (
    <Box
      {...other}
      sx={{
        p: {
          xs: '16px 16px',
          md: '26px 39px',
        },
        borderRadius: '8px',
        border: '1px solid #1A407D4D',
        mt:2,
        mb:2,
        ...sx,
      }}
    >
      <Typography 
        sx={{ 
          fontSize: { xs: '14px', sm: '16px' }, 
          fontWeight: 600, 
          mb: 3, 
          textAlign: 'center',
          wordBreak: 'break-word',
          overflow: 'hidden'
        }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}
