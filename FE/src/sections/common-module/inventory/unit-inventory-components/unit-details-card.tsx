import type { UnitInventoryItemType } from 'src/redux/slices/rm-panel/unit-inventory-slice'

import React from 'react'

import { Card , Grid, Typography } from '@mui/material'

const UnitDetailsCard = ({ unitDetails }: { unitDetails: UnitInventoryItemType }) => (
    <Card sx={{ p: 3, mb: 2 }}>
      <Grid container spacing={3}>  
        {/* Campaign */}
        <Grid item xs={12} sm={4}>
          <Typography sx={{ fontSize: '14px', color: '#637381' }}>
            Campaign
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
            {unitDetails?.campaignName || '-'}
          </Typography>
        </Grid>
        {/* Tower */}
        <Grid item xs={12} sm={4}>
          <Typography sx={{ fontSize: '14px', color: '#637381' }}>
            Tower
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
            {unitDetails?.towerName || '-'}
          </Typography>
        </Grid>
        {/* Floor */}
        <Grid item xs={12} sm={4}>
          <Typography sx={{ fontSize: '14px', color: '#637381' }}>
            Floor
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
            {unitDetails?.floor || '-'}
          </Typography>
        </Grid>
        {/* Unit Type */}
        <Grid item xs={12} sm={4}>
          <Typography sx={{ fontSize: '14px', color: '#637381' }}>
            Unit Type
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
            {unitDetails?.configuration || '-'}
          </Typography>
        </Grid>
        {/* Facing */}
        <Grid item xs={12} sm={4}>
          <Typography sx={{ fontSize: '14px', color: '#637381' }}>
            Facing Direction
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
            {unitDetails?.facing || '-'}
          </Typography>
        </Grid>
        {/* Series */}
        <Grid item xs={12} sm={4}>
          <Typography sx={{ fontSize: '14px', color: '#637381' }}>
            Series
          </Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>
            {unitDetails?.series || '-'}
          </Typography>
        </Grid>
      </Grid>
    </Card>
  )

export default UnitDetailsCard