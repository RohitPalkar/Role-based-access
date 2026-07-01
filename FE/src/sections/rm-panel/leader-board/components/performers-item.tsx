import React from 'react';

import { Box, Stack, Typography } from '@mui/material';

import { Iconify } from 'src/components/iconify';

interface Performer {
  readonly name: string;
  readonly initials: string;
  readonly amount: string;
  readonly rank?: number;
  readonly isHighestUnitsSold?: boolean;
  readonly totalCancellations: string;
}

function PerformerItem({ name, initials, amount, rank, isHighestUnitsSold = false, totalCancellations }: Performer) {

  // Function to get badge image based on rank
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const getBadgeImage = (rank: number) => {
    switch (rank) {
      case 1:
        return "/assets/icons/home/performer-1.svg"; // Gold badge
      case 2:
        return "/assets/icons/home/performer-2.svg"; // Silver badge
      case 3:
        return "/assets/icons/home/performer-3.svg"; // Bronze badge
      default:
        return "";
    }
  };
  return (
    <Stack
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row',
        py: 1
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            background: '#1A407D14',
            borderRadius: 4,
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
            fontSize: '14px',
            fontWeight: '600',
            color: '#637381'
          }}
        >
          {initials}
        </Box>
        <Box className="performer-details">
          <Typography variant='subtitle2'>{name}</Typography>
          <Box sx={{ display: "flex" }}>
            <Typography
              variant='caption'
              sx={{
                mr: 1,
                display: 'flex',
                alignItems: 'center',
                color: '#1A407D',
                fontSize: '12px',
                minWidth: "70px"
              }}
            >
              <Iconify sx={{ mx: isHighestUnitsSold ? 1 : 0 }} icon={isHighestUnitsSold ? "mdi:building" : "healthicons:rupee"} />
              <Box sx={{ pt: isHighestUnitsSold ? '3px' : '0' }}> {`${amount} ${isHighestUnitsSold ? "" : "Cr"}`}</Box>
            </Typography>
            {totalCancellations && <Typography
              variant='caption'
              sx={{
                mr: 1,
                display: 'flex',
                alignItems: 'center',
                color: '#1A407D',
                fontSize: '12px'
              }}
            >
              <Iconify sx={{ mx: 1 }} icon="mdi:building" />
              <Box > {totalCancellations}</Box>
            </Typography>}
          </Box>
        </Box>
      </Box>


      {/* Show badge only for top 3 ranks */}
      {rank && rank <= 3 && (
        <Box
          component="img"
          src={getBadgeImage(rank)}
          alt={`Rank ${rank}`}
          sx={{
            width: 40,
            height: 40,
            objectFit: 'contain'
          }}
        />
      )}
    </Stack>
  );
}

export default PerformerItem;
