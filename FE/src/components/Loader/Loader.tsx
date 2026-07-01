import React from 'react';

import Box from '@mui/material/Box';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';

interface LoaderProps {
  isLoading: boolean;
}

const Loader: React.FC<LoaderProps> = ({ isLoading }) => (
  <Backdrop
    sx={{
      color: '#fff',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    }}
    open={isLoading}
  >
    <CircularProgress />
    <Box sx={{ mt: 2 }}>Loading...</Box>
  </Backdrop>
);

export default Loader;
