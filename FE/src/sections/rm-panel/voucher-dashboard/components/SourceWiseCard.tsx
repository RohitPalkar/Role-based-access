import React from 'react';

import { Box, Typography } from '@mui/material';

interface SourceData {
  label: string;
  value: number;
  color: string;
}

const sampleData: SourceData[] = [
  { label: 'Channel Sales', value: 11, color: '#FF4B4B' },
  { label: 'Privilege Sales', value: 8, color: '#06D6A0' },
  { label: 'Direct Sales', value: 3, color: '#06B800' },
];

const SourceSplitCard: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      height: '203px',
      borderRadius: '12px',
      border: '1px solid #E0E0E0',
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      bgcolor: '#fff',
    }}
  >
    {/* Header */}
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography variant="subtitle1" fontWeight={600}>
        Source-wise Split
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: '#1E88E5',
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        View all
      </Typography>
    </Box>

    {/* Data Rows */}
    <Box display="flex" flexDirection="column" gap={1}>
      {sampleData.map((item, idx) => (
        <Box
          key={idx}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            px: 1.5,
            py: 1,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: item.color,
              }}
            />
            <Typography variant="body2" fontWeight={500}>
              {item.label}
            </Typography>
          </Box>
          <Typography variant="body1" fontWeight={600}>
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

export default SourceSplitCard;
