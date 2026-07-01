import React from 'react';

import { Box, Button, Typography } from '@mui/material';

interface QuickAction {
  label: string;
  buttonText: string;
}

const actions: QuickAction[] = [
  { label: 'New Expression of Interest', buttonText: 'Create' },
  { label: 'Generate new CP link', buttonText: 'Generate' },
];

const QuickActionsCard: React.FC = () => (
    <Box
      sx={{
        width: '100%',
        height: '203px',
        borderRadius: '12px',
        border: '1px solid #E0E0E0',
        p: '13px 16px',
        bgcolor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Quick Actions
      </Typography>

      {/* Actions */}
      <Box display="flex" flexDirection="column" gap="16px">
        {actions.map((action, index) => (
          <Box key={index} display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              variant="body1"
              fontWeight={600}
              sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {index + 1}. {action.label}
            </Typography>

            <Button
              variant="contained"
              sx={{
                bgcolor: '#002D72',
                textTransform: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                px: 2,
                py: 0.5,
                '&:hover': { bgcolor: '#00285f' },
              }}
            >
              {action.buttonText}
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  );

export default QuickActionsCard;
