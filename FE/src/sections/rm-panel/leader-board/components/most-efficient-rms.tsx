import Box from '@mui/material/Box';
import { Grid, Avatar, Divider, Tooltip, useTheme, Typography } from '@mui/material';

import { getInitials } from 'src/utils/helper';

import { Chart, useChart } from 'src/components/chart';
// ----------------------------------------------------------------------

type BoxData = {
  efficiency: number;
  id: number;
  name: string;
  qualifiedBookings: number;
  totalBookings: number;
};

type Props = Readonly<{
  mostEfficientRMList: BoxData[] | undefined;
}>;

export function MostEfficientRms({ mostEfficientRMList }: Props) {
  const theme = useTheme();

  const chartColors = [
    [theme.palette.primary.light, theme.palette.primary.dark],
    [theme.palette.warning.light, theme.palette.warning.main],
  ];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    stroke: { width: 0 },
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          { offset: 0, color: chartColors[0][0], opacity: 1 },
          { offset: 100, color: chartColors[0][1], opacity: 1 },
        ],
      },
    },
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: 6,
            fontSize:
              typeof theme.typography.caption.fontSize === 'number'
                ? `${theme.typography.caption.fontSize}px`
                : theme.typography.caption.fontSize,
            fontWeight: theme.typography.subtitle2.fontWeight,
          },
        },
      },
    },
  });

  const renderProgressBar = (user: any) => (
    <Box key={user?.name}>
      <Chart
        type="radialBar"
        series={[user?.efficiency]}
        options={{
          ...chartOptions,
        }}
        sx={{ width: 65, height: 65 }}
      />
    </Box>
  );

  return (
    <Grid
      container
      spacing={0}
      sx={{ m: 0, width: '100%', overflowX: 'auto', flexWrap: 'nowrap !important', pb: 2 }}
    >
      {mostEfficientRMList &&
        mostEfficientRMList.length > 0 &&
        mostEfficientRMList?.map((user: any, index) => (
          <Grid item key={index} xs={12} md={6} lg={3} sx={{ position: 'relative' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', px: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    sx={{
                      bgcolor: '#1A407D14',
                      color: '#637381',
                      width: 40,
                      height: 40,
                      mr: 2,
                      fontSize: 18,
                    }}
                  >
                    {getInitials(user?.name)}
                  </Avatar>
                  <Tooltip title={user?.name} arrow>
                    <Typography variant="subtitle2">{user?.name}</Typography>
                  </Tooltip>
                </Box>
                {user?.efficiency && <Box>{renderProgressBar(user)}</Box>}
              </Box>
              <Divider sx={{ borderStyle: 'dashed', borderWidth: '1.5px', m: 1 }} />

              <Grid container>
                <Grid item xs={6} md={6} lg={6}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 112 }}>
                      <Box sx={{ textAlign: 'center', fontSize: '10px' }}>Bookings</Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle2">{user?.totalBookings}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6} md={6} lg={6}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 112 }}>
                      <Box sx={{ textAlign: 'center', fontSize: '10px' }}>Qualified</Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle2">{user?.qualifiedBookings}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            {index < mostEfficientRMList.length - 1 && (
              <Divider
                orientation="vertical"
                flexItem
                sx={{
                  height: '100%',
                  borderStyle: 'dashed',
                  borderWidth: '1.5px',
                  width: '1px',
                  position: 'absolute',
                  right: 0,
                  top: 0,
                }}
              />
            )}
          </Grid>
        ))}
    </Grid>
  );
}
