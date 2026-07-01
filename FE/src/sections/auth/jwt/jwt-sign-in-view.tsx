
import { Box } from '@mui/material';

import loginSlider from '../../../assets/images/login-slider-img.jpg';

export function JwtSignInView() {

  return (
      <Box className="LoginSlider" sx={{ height: '100vh', overflow: 'hidden' }}>
        <img
          src={loginSlider}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Box>
  );
}
