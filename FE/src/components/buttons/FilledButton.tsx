import type { ReactNode } from 'react';

import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

type FilledButtonProps = Readonly<{
  label: string;
  onClick?: () => void;
  width?: string;
  type?: any;
  height?: string;
  isLoading?: boolean;
  icon?: ReactNode; // Optional icon prop
  endIcon?: ReactNode;
  disabled?: boolean;
}>;

export function FilledButton({
  label,
  onClick,
  width,
  type,
  height,
  isLoading,
  icon,
  endIcon,
  disabled,
}: FilledButtonProps) {
  return (
    <Button
      onClick={onClick}
      type={type || 'submit'}
      sx={{
        borderRadius: '8px',
        color: 'white',
        width,
        height,
        lineHeight: '24px',
        ...(disabled
              ? {backgroundColor: '#f1f1f1' }
              : {
                  backgroundColor: '#1A407D',
                  '&:hover': {
                    backgroundColor: '#174A9D',
                  },
                }),
      }}
      disabled={isLoading || disabled}
      startIcon={icon}
      endIcon={endIcon} // Conditionally render CircularProgress
    >
      {isLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : label}
    </Button>
  );
}
