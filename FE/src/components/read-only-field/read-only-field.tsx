import Info from '@mui/icons-material/Info';
import { Box, Grid, TextField, Typography } from '@mui/material';

type ReadOnlyFieldProps = {
  label: string;
  value?: string;
  showHelper?: boolean;
  helperText?: string;
};
const ReadOnlyField = ({ label, value, showHelper, helperText }: ReadOnlyFieldProps) => (
  <Grid item xs={12}>
    <TextField
      fullWidth
      label={label}
      value={value ?? ''}
      disabled
      className="requiredField custom-input"
      sx={
        showHelper
          ? {
              '& .MuiOutlinedInput-root.Mui-disabled': {
                backgroundColor: '#FFAB0029',
              },

              '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                borderColor: '#FFAB00',
                borderWidth: '1.5px',
              },
            }
          : undefined
      }
    />

    {showHelper && (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mt: '6px',
          color: '#7A4100',
        }}
      >
        <Info sx={{ fontSize: 16 }} />
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: '16px',
            color: '#7A4100',
          }}
        >
          {helperText}
        </Typography>
      </Box>
    )}
  </Grid>
);

export default ReadOnlyField;
