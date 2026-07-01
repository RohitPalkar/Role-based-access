import React from 'react';

import { Box, Typography } from '@mui/material';

interface StatsCardProps {
  title: string;
  value: number | string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 2, // 8px
      boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
      p: 3,
      width: 256, // 64*4 = 256px
    }}
  >
    {/* Blue side bar */}
    <Box
      sx={{
        width: 8, // 2*4=8px
        height: '100%',
        borderRadius: '4px 0 0 4px',
        backgroundColor: 'rgba(26, 64, 125, 1)',
      }}
    />

    {/* Content */}
    <Box sx={{ ml: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 500, color: '#1A1A1A', lineHeight: 1.2 }}>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#0F172A', mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

export default StatsCard;
