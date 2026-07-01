import React from 'react';

import { Card, Grid, Typography } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json';

import SignatureBlock from './signature-block';

const { view } = uiText.internalOfficeMemo;

type SignatureCardProps = {
  preparedBy: {
    name: string;
    role: string;
    signature?: string;
  };
  verifiedBy: {
    name: string;
    role: string;
    signature?: string;
  };
  approvedBy: {
    name: string;
    role: string;
    signature?: string;
  };
};

const SignatureCard = ({ preparedBy, verifiedBy, approvedBy }: SignatureCardProps) => (
    <Card sx={{ p: 2 }}>
      <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 2 }}>
        {view.signatures}
      </Typography>

      <Grid container>
        <Grid item xs={12} md={4} sx={{ pr: 2, borderRight: { lg: '1px solid #DADADA' } }}>
          <SignatureBlock
            title={view.preparedBySignature}
            {...preparedBy}
          />
        </Grid>

        <Grid item xs={12} md={4} sx={{ px: 2, borderRight: { lg: '1px solid #DADADA' } }}>
          <SignatureBlock
            title={view.verifiedBySignature}
            {...verifiedBy}
          />
        </Grid>

        <Grid item xs={12} md={4} sx={{ pl: 2 }}>
          <SignatureBlock
            title={view.approvedBySignature}
            {...approvedBy}
          />
        </Grid>
      </Grid>
    </Card>
  );

export default SignatureCard;