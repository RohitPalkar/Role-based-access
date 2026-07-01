import React from 'react'

import { Box, Button, Typography } from '@mui/material'

import { Iconify } from '../iconify';
import { CustomPopover } from '../custom-popover'

import type { UsePopoverReturn } from '../custom-popover';

interface IProps {
  onApply: () => void;
  onReset: () => void;
  menuActions: UsePopoverReturn;
  children: React.ReactNode;
  title?: string
}

const FilterToolbar = (props: IProps) => {
  const { menuActions, onApply, onReset, children, title = 'Filter' } = props
  return (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'top-center' } }}
    >
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5, alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontSize: '14px' }}>{title}</Typography>
          <Button 
            onClick={onReset} 
            startIcon={<Iconify icon="material-symbols:refresh" sx={{ cursor: 'pointer', width: 16, height: 16 }} />}
            size="small"
            sx={{ minHeight: '28px', fontSize: '12px', px: 1 }}
          >
            Reset
          </Button>
        </Box>
        {children}
        <Button onClick={() => {
          onApply()
          menuActions.onClose()
        }} variant="contained" size='large' sx={{ width: '90%', margin: 'auto' }} className='primaryBtn'>Apply</Button>
      </Box>
    </CustomPopover>
  )
}

export default FilterToolbar