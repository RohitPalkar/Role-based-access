import React from 'react';

import { Box, Typography } from '@mui/material';

interface CPData {
  name: string;
  vouchers: number;
}

const sampleCPs: CPData[] = [
  { name: 'CP1', vouchers: 4 },
  { name: 'CP2', vouchers: 4 },
  { name: 'CP3', vouchers: 4 },
];

const TopCPsCard: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      height: '203px',
      borderRadius: '12px', // card/radius
      border: '1px solid #E0E0E0',
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'start',
      gap: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      bgcolor: '#fff',
    }}
  >
    {/* Header */}
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography variant="subtitle1" fontWeight={600}>
        Top CPs
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: '#000',
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        View all
      </Typography>
    </Box>

    {/* CP List */}
    <Box display="flex" flexDirection="column" gap={3}>
      {sampleCPs.map((cp, index) => (
        <Box
          key={index}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 1 }}
        >
          {/* Rank + Name */}
          <Typography variant="body1" fontWeight={600} sx={{ color: '#000', fontSize: '14px' }}>
            {index + 1}. {cp.name}
          </Typography>

          {/* Vouchers */}
          <Typography
            sx={{
              color: '#1A407D', // blue tone
              fontWeight: 600,
            }}
          >
            {cp.vouchers} Vouchers
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

export default TopCPsCard;
