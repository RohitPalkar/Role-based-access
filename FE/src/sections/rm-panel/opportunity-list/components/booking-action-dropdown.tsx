import type { ISingleSelectOption } from 'src/components/single-select-dropdown';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, loadIcons } from '@iconify/react';

import { Box } from '@mui/material';

import { SingleSelectDropdown } from 'src/components/single-select-dropdown';

// ----------------------------------------------------------------------
loadIcons([
  'material-symbols:swap-horiz',
  'material-symbols:assignment-sharp',
]);

const BOOKING_OPTIONS: ISingleSelectOption[] = [
  { value: 'unit-swap', label: 'Unit Swap', disabled: false, icon: <Icon icon="material-symbols:swap-horiz" width={20} />
, },
  { value: 'multi-unit', label: 'Multi-Unit Booking', disabled: false, icon: <Icon icon="material-symbols:assignment-sharp" width={20} />
, },
  // { value: 'company', label: 'Company', disabled: true },
  // { value: 'partnership', label: 'Partnership', disabled: true },
];

interface BookingActionDropdownProps {
  readonly value?: string;
  readonly onChange?: (value: string) => void;
}

export function BookingActionDropdown({ value, onChange }: BookingActionDropdownProps) {
  const [selectedAction, setSelectedAction] = useState<string>(value || '');
  const navigate = useNavigate();

  const handleSelectionChange = (event: any) => {
    const newValue = event.target.value as string;
    setSelectedAction(newValue);

    if (onChange) {
      onChange(newValue);
    }

    // Navigate to Unit Swap page when Unit Swap is selected
    if (newValue === 'unit-swap') {
      navigate('/rm-panel/unit-swap');
      // Reset selection after navigation
      setTimeout(() => {
        setSelectedAction('');
        if (onChange) {
          onChange('');
        }
      }, 100);
    }
        if (newValue === 'multi-unit') {
      navigate('/rm-panel/group-list');
      // Reset selection after navigation
      setTimeout(() => {
        setSelectedAction('');
        if (onChange) {
          onChange('');
        }
      }, 100);
    }
  };

  return (
    <Box sx={{ minWidth: 200 }}>
      <SingleSelectDropdown
        label="Manage Bookings"
        options={BOOKING_OPTIONS}
        value={selectedAction}
        onChange={handleSelectionChange}
        placeholder="Select an action"
        size="small"
        formControlProps={{
          size: 'small',
          sx: { 
            minWidth: 200,
            '& .MuiInputBase-root': {
              minHeight: '36px',
            },
            '& .MuiInputBase-input': {
              padding: '8px 12px',
            },
          },
        }}
      />
    </Box>
  );
}
