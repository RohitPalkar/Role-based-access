import { Box, Card, Tooltip, Typography } from '@mui/material';

import { TYPE } from 'src/utils/constant';
import { formatNumberWithCommas } from 'src/utils/helper';

import DecorativeShape from './decorative-shape';

type CardType = 'paid_ytd' | 'payable' | 'paid' | 'risk';

interface IncentiveCardProps {
  readonly title: string;
  readonly amount: number;
  readonly subtitle?: string;
  readonly subtitleAmount?: any;
  readonly gradientColor?: any;
  readonly isActive: boolean;
  readonly dateRange?: any;
  readonly onClick?: () => void;
  readonly type: string;
  readonly showRupeeSymbol?: boolean;
}

const TOOLTIP_TEXT: Record<CardType, string> = {
  paid_ytd: 'The total incentives paid to date within the current financial year.',
  payable: 'The incentives that are due for payment based on sales qualified in the last month.',
  paid: 'The total amount of incentives that have been disbursed in the last payment cycle.',
  risk: ' This incentive amount may be forfeited if the booking is not regularized in accordance with company policy',
};

/** Helper to format amount with optional rupee symbol and commas */
function formatAmountValue(amount: any, showRupeeSymbol: boolean) {
  if (String(amount) === '-') return amount;
  const symbol = showRupeeSymbol ? '₹ ' : '';
  return `${symbol}${formatNumberWithCommas(amount)}`;
}

export function IncentiveCard({
  title,
  amount,
  subtitle,
  subtitleAmount,
  gradientColor,
  isActive,
  dateRange,
  onClick,
  type,
  showRupeeSymbol = true,
}: IncentiveCardProps) {
  const isRisk = type === TYPE.Risk;

  const renderMainContent = () => {
    if (isRisk) {
      return (
        <>
          <Typography
            sx={{
              fontFamily: 'Poppins',
              fontWeight: 600,
              fontSize: '14px',
              lineHeight: '22px',
              color: '#590000',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontFamily: 'Poppins',
              fontWeight: 700,
              fontSize: '28px !important',
              lineHeight: '48px',
              alignItems: 'center',
              display: 'flex',
              borderBottom: subtitle ? '1px dashed #590000' : 'none',
            }}
          >
            {formatAmountValue(amount, true)}
          </Typography>
        </>
      );
    }

    return (
      <>
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
          {formatAmountValue(amount, showRupeeSymbol)}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 600,
            fontSize: '14px',
            lineHeight: '22px',
            borderBottom: dateRange ? '1px dashed #DADADA' : 'none',
            paddingBottom: dateRange ? '3px' : '0',
            color: '#637381',
          }}
        >
          {title}
        </Typography>
      </>
    );
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative',
        width: '100%',
        height: '151px',
        padding: '24px 20px 24px 24px',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        cursor: 'pointer',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        background: isRisk
          ? 'linear-gradient(135deg, rgba(255, 122, 122, 0.24) 0%, rgba(231, 5, 5, 0.24) 100%)'
          : 'none',
        color: isRisk ? '#590000' : '#1C252E',
        border: isActive ? `2px solid ${gradientColor}` : '2px solid white',
      }}
    >
      <Tooltip title={TOOLTIP_TEXT[type as CardType]} arrow placement="top" enterTouchDelay={0}>
        <Box>
          <DecorativeShape gradientColor={gradientColor} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {renderMainContent()}

            {subtitle && (
              <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', marginTop: '4px' }}>
                <Typography
                  sx={{
                    fontFamily: 'Poppins',
                    fontWeight: 600,
                    fontSize: '14px',
                    lineHeight: '22px',
                  }}
                >
                  {subtitle} {' - '}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'Poppins',
                    fontWeight: 600,
                    fontSize: '14px',
                    lineHeight: '22px',
                    color: isRisk ? '#590000' : '#1C252E',
                  }}
                >
                  {String(subtitleAmount) !== '-' &&
                    `₹ ${formatNumberWithCommas(subtitleAmount ?? 0) || 0} ${dateRange || ''}`}
                </Typography>
              </div>
            )}

            {dateRange && !subtitle && (
              <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', marginTop: '4px', marginBottom: '4px' }}>
                <Typography
                  sx={{
                    fontFamily: 'Poppins',
                    fontWeight: 600,
                    fontSize: '12px',
                    lineHeight: '22px',
                  }}
                >
                  {dateRange}
                </Typography>
              </div>
            )}
          </div>
        </Box>
      </Tooltip>
    </Card>
  );
}
