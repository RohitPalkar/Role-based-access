import React from 'react';

import { Box, Typography } from '@mui/material';

import { CONFIG } from 'src/config-global';

type SignatureBlockProps = {
  title: string;
  name: string;
  role: string;
  signature?: string; // image URL (optional)
};

const SignatureBlock = ({ title, name, role, signature }: SignatureBlockProps) => (
    <Box>
      {/* Title */}
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>

      {/* Signature */}
      <Box sx={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {signature ? (
          <img
            src={`${CONFIG.site.s3BasePath}/${signature}`}
            alt="signature" 
            style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML =
                  '<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;"><img src="/assets/icons/Signature.svg" alt="No signature" style="width: 48px; height: 48px; opacity: 0.5;" /><span style="color: #919EAB; font-size: 14px;">Invalid signature format</span></div>';
              }
            }}
          />
        ) : null}
      </Box>

      {/* Line */}
      <Box
        sx={{
          borderBottom: '1px solid #DADADA',
          mb: 1,
        }}
      />

      {/* Name */}
      <Typography sx={{ fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>
        {name}
      </Typography>

      {/* Role */}
      <Typography
        variant="caption"
        sx={{ textAlign: 'center', display: 'block' }}
      >
        {role}
      </Typography>
    </Box>
  );

export default SignatureBlock;