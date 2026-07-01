// components/brand/BrandEditPopover.tsx

import React from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';

import { CustomPopover } from 'src/components/custom-popover';

type Props = Readonly<{
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onApply: () => void;
  value: string | number | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}>;

export function BrandEditPopover({ open, anchorEl, onClose, onApply, value, onChange }: Props) {
  const isError = Number(value) > 99;
  return (
    <CustomPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      slotProps={{ arrow: { placement: 'top-center' } }}
    >
      <Box sx={{ p: 2, width: { xs: '100%', sm: 320 } }}>
        <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
          Edit Salary Multiplier
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            value={value ?? ''}
            onChange={onChange}
            placeholder="Enter Salary Multiplier"
            name="salarymultiplier"
            fullWidth
            label="Salary Multiplier"
            type="number"
            error={isError}
            helperText={isError ? 'Value must not exceed 99' : ''}
          />
        </FormControl>

        <Button
          variant="contained"
          size="large"
          sx={{ width: '100%', margin: 'auto' }}
          className="primaryBtn"
          onClick={onApply}
          disabled={isError}
        >
          Apply
        </Button>
      </Box>
    </CustomPopover>
  );
}
