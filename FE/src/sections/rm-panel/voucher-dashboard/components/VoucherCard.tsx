import { Box, Card, Typography } from '@mui/material';

import { formatNumberWithCommas } from 'src/utils/helper';

import DecorativeShape from '../../incentive-dashboard/incentive-view/component/incentive-cards/decorative-shape';

interface IncentiveCardProps {
  readonly title: string;
  readonly amount: number;
  readonly subtitle?: string;
  readonly gradientColor?: any;
  readonly onClick?: () => void;
}

export default function VoucherCard({
  title,
  amount,
  subtitle,
  gradientColor,
  onClick,
}: IncentiveCardProps) {
  // Tooltip content based on card type

  return (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative',
        width: '100%',
        // maxWidth: { xs: '100%', sm: '26%', md: '17.8%', lg: '18.8%' },
        height: '151px',
        padding: '24px 20px 24px 24px',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        cursor: 'pointer',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        background: 'none',
        color: '#1C252E',
        border: '1px solid white',
      }}
    >
      <Box>
        <Typography
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 600,
            fontSize: '14px',
            lineHeight: '22px',
            color: '#000',
          }}
        >
          {title}
        </Typography>
        <DecorativeShape gradientColor={gradientColor} />

        <Typography
          variant="h3"
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 700,
            fontSize: '28px !important',
            lineHeight: '48px',
            alignItems: 'center',
            display: 'flex',
          }}
        >
          {String(amount) !== '-' ? `${formatNumberWithCommas(amount)}` : amount}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 400,
            fontSize: '10px',
            lineHeight: '22px',
            color: '#637381',
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Card>
  );
}
