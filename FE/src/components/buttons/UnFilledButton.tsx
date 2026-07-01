import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
// Import MUI icon

type UnFilledButtonProps = Readonly<{
  label: string;
  onClick?: () => void;
  width?: string;
  endIcon?: React.ReactNode; // Optional icon prop
}>;

export function UnFilledButton({ label, onClick, width, endIcon }: UnFilledButtonProps) {
  return (
    <Button
      onClick={onClick}
      sx={{
        background: 'white',
        borderRadius: '8px',
        width,
        marginRight: '10px',
        '&:hover': {
          background: '#1A407D',
        },
      }}
      endIcon={endIcon}
    >
      <Typography
        sx={{
          fontWeight: '700',
          color: 'white',
          '&:hover': {
            color: 'white',
          },
        }}
      >
        {label}
      </Typography>

    </Button>
  );
}
