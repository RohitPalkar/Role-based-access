import { Box, Card, Typography } from '@mui/material';

import { convertNumberToShortForm } from 'src/utils/helper';


interface ListingCardsProps {
  title: string;
  heading: string;
  subtitle?: string;
  subtitleAmount?: number;
  gradientColor?: any;
  isActive: boolean;
  onClick?: () => void;
  showRupeeSymbol?: boolean;
  borderBottom?: boolean;
  divider?: boolean;
  emphasizeSubtitle?: boolean;
  emphasizeTitle?: boolean;
  showHeadingRupeeSymbol?: boolean,
}

export function ListingCards({
  title,
  heading,
  subtitle,
  gradientColor,
  subtitleAmount,
  emphasizeSubtitle = false,
  emphasizeTitle = false,
  isActive,
  onClick,
  borderBottom = true,
  showRupeeSymbol = false,
  showHeadingRupeeSymbol = false,

}: Readonly<ListingCardsProps>) {
  const subtitleBaseStyles = {
    fontFamily: 'Poppins',
    fontWeight: 600,
    fontSize: '14px',
    lineHeight: '22px',
  };

  const subtitleEmphasizedStyles = {
    fontFamily: 'Poppins',
    fontWeight: 600,
    fontSize: '24px !important',
    lineHeight: '48px',
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: '24px 20px 24px 24px',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        color: '#1C252E',
        border: isActive ? `2px solid ${gradientColor}` : '2px solid white',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Box>
        <Box
          sx={{
            position: 'absolute',
            top: '-40px',
            right: '-100px',
            width: '160px',
            height: '160px',
            borderRadius: `calc(3 * var(--shape-borderRadius))`,
            transform: 'rotate(130deg)',
            background: `linear-gradient(180deg, #fff 0%, ${gradientColor} 100%)`,
            opacity: 0.12,
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Typography
            variant="h3"
            sx={{
              fontFamily: 'Poppins',
              fontWeight: 700,
              fontSize: emphasizeTitle ? '32px !important' : '28px !important',
              lineHeight: '48px',
            }}
          >
            {showHeadingRupeeSymbol ? `₹ ${convertNumberToShortForm(heading)}` : heading}
          </Typography>
          <Typography
            sx={{
              ...subtitleBaseStyles,
              ...(emphasizeSubtitle && subtitleEmphasizedStyles),
              borderBottom: borderBottom ? '1px dashed #DADADA' : 'none',
              paddingBottom: '3px',
              color: '#637381',
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 400,
                fontSize: '12px',
                lineHeight: '20px',
                color: '#637381',
              }}
            >
              {subtitle}
            </Typography>
          )}
          {subtitleAmount !== undefined && (
            <Typography
              sx={{
                fontFamily: 'Poppins',
                fontWeight: 600,
                fontSize: '14px',
                lineHeight: '22px',
                color: '#1C252E',
              }}
            >
              {showRupeeSymbol && '₹ '}{subtitleAmount.toLocaleString()}
            </Typography>
          )}
        </div>
      </Box>
    </Card>
  );
}
