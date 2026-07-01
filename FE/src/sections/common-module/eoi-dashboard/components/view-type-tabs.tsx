import React from 'react';

import { Box, Tab, Grid } from '@mui/material';

import { CustomTabs } from 'src/components/custom-tabs';
import TabBadgeLabel from 'src/components/badge/tag-badge-label';

interface ViewTypeTabsProps {
  value: string;
  options?: { label: string; value: string }[];
  onChange: (event: React.SyntheticEvent, newValue: string) => void;
  tabCounts?: Record<string, number>;
  fullWidth?: boolean;
  noLeftMargin?: boolean;
}

export default function ViewTypeTabs({
  value,
  onChange,
  options = [],
  tabCounts = {},
  fullWidth = false,
  noLeftMargin = false,
}: Readonly<ViewTypeTabsProps>) {
  const safeOptions = options ?? [];
  let safeValue = '';
  if (safeOptions.length > 0) {
    if (safeOptions.some((o) => o.value === value)) {
      safeValue = value;
    } else {
      safeValue = safeOptions[0]?.value ?? '';
    }
  }

  if (safeOptions.length === 0 || safeValue === '') {
    return null;
  }

  return (
    <Grid container>
      <Grid item xs={12}>
        <Box
          sx={{
            bgcolor: '#F4F6F8',
            borderRadius: '16px',
            mt: { xs: 1.5, sm: 2.4 },
            mx: { xs: noLeftMargin ? 0 : 1, sm: noLeftMargin ? 0 : 2 },
            width: { xs: '100%', sm: fullWidth ? '100%' : 'max-content' },
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <CustomTabs
            value={safeValue}
            onChange={onChange}
            variant='scrollable'
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 38,
              bgcolor: 'transparent',
              '& .MuiTabs-flexContainer': { gap: 1 },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            {safeOptions.map((tab) => {
              const count = tabCounts[tab.value];
              const showBadge = count !== undefined && count !== null;

              return (
                <Tab
                  key={tab.value}
                  disableRipple
                  value={tab.value}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, minWidth: 'max-content' }}>
                      {tab.label}
                      {showBadge && (
                        <TabBadgeLabel
                          count={count}
                          bgColor="#EDD3CD"
                          textColor="#374151"
                          selectedBgColor="#B71D18"
                          selectedTextColor="#FFFFFF"
                        />
                      )}
                    </Box>
                  }
                  sx={{
                    textTransform: 'none',
                    fontSize: { xs: '13px', sm: '14px' },
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    color: safeValue === tab.value ? '#1C252E' : '#637381',
                    minHeight: 36,
                    ...(fullWidth
                    ? {
                        flex: 1,
                        maxWidth: 'none',
                        textAlign: 'center',
                      }
                    : {
                        minWidth: 'max-content',
                        flex: '0 0 auto',
                      }),
                    px: { xs: 1.5, sm: 2.5 },
                    py: 1,
                    borderRadius: '8px',
                    bgcolor: safeValue === tab.value ? '#FFFFFF' : 'transparent',
                    boxShadow:
                      safeValue === tab.value
                        ? '0px 1px 2px rgba(16, 24, 40, 0.05)'
                        : 'none',
                    '&:hover': {
                      bgcolor: safeValue === tab.value ? '#FFFFFF' : '#F3F4F6',
                    },
                  }}
                />
              );
            })}
          </CustomTabs>
        </Box>
      </Grid>
    </Grid>
  );
}
