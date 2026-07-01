import type { BoxProps } from '@mui/material/Box';
import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { LinearProgress } from '@mui/material';
import Typography from '@mui/material/Typography';

import { Carousel, useCarousel, CarouselDotButtons } from 'src/components/carousel';

// ----------------------------------------------------------------------

type Props = CardProps & {
  list: {
    id: string;
    title: string;
    coverUrl: string;
    description: string;
    progress: string;
    targetSales: string;
    boosterName: string;
  }[];
};

export function AppFeatured({ list, sx, ...other }: Props) {
  const carousel = useCarousel({ loop: true });

  return (
    <Card
      sx={{
        bgcolor: 'common.white',
        height: '100px',
        position: 'relative',
        boxShadow: 'none !important',
        ...sx,
      }}
      {...other}
    >
      <CarouselDotButtons
        scrollSnaps={carousel.dots.scrollSnaps}
        selectedIndex={carousel.dots.selectedIndex}
        onClickDot={carousel.dots.onClickDot}
        sx={{ top: 0, left: 13, position: 'absolute', color: 'primary' }}
      />

      <Carousel carousel={carousel} sx={{ boxShadow: 'none !important' }}>
        {list.map((item) => (
          <CarouselItem key={item.id} item={item} />
        ))}
      </Carousel>
    </Card>
  );
}

// ----------------------------------------------------------------------

type CarouselItemProps = BoxProps & {
  item: Props['list'][number];
};

const renderPrize = (obj: any) => {
  switch (obj.type) {
    case 'Percentage':
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mr: 3, alignItems: 'center' }}>
          <Typography variant="body2" color="black" sx={{ mr: 1 }}>
            {obj.type}:
          </Typography>{' '}
          {obj.title}
        </Box>
      );
    case 'Cash Prize':
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mr: 3, alignItems: 'center' }}>
          <Typography variant="body2" color="black" sx={{ mr: 1 }}>
            {obj.type}:
          </Typography>
          ₹ {obj.title}
        </Box>
      );
    case 'Perks':
      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mr: 3, alignItems: 'center' }}>
          <Typography variant="body2" color="black" sx={{ mr: 1 }}>
            {obj.type}:
          </Typography>{' '}
          {obj.title}
        </Box>
      );
    default:
      // eslint-disable-next-line react/jsx-no-useless-fragment
      return <></>;
  }
};

function CarouselItem({ item, ...other }: CarouselItemProps) {
  return (
    <Box sx={{ width: 1, m: '0 auto', position: 'relative' }}>
      <Box
        sx={{
          px: 2,
          gap: 1,
          width: 1,
          display: 'flex',
          color: 'common.white',
          flexDirection: 'column',
          boxShadow: 'none !important',
        }}
      >
        <Typography variant="body2" color="black" sx={{ display: 'block', textAlign: 'right' }}>
          {renderPrize(item)}
        </Typography>

        {/* Progress bar */}
        <Box sx={{ position: 'relative', width: 1 }}>
          <LinearProgress
            key={item.id} // 🔹 This forces a re-render when item changes
            variant="determinate"
            value={Number.parseInt(item.progress, 10)}
            sx={{
              width: 1,
              height: '22px',
              borderRadius: '10px',
              backgroundColor: '#919EAB29',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#1A407D',
              },
            }}
          />

          {/* Centered Progress Percentage */}
          <Typography
            key={`progress-${item.id}`} // 🔹 Ensures React resets the text correctly
            variant="body2"
            sx={{
              position: 'absolute',
              top: '50%',
              left:
                Number(item.progress) === 100 || Number(item.progress) === 0
                  ? '50%'
                  : `calc(${Number(item.progress)}% - 20%)`,

              transform: 'translate(-50%, -50%)',
              color: Number(item.progress) === 0 ? 'black' : 'white', // 🔹 Change text color to black if 0%
              fontWeight: 'bold',
            }}
          >
            {item.progress}%
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ color: '#1A407D', fontWeight: 'bold', fontSize: '16px' }}>
            {item.boosterName}
          </Typography>
          {/* Progress and target sales */}
          <Box sx={{ display: 'flex', justifyContent: 'end' }}>
            <Typography
              variant="body2"
              color="black"
              sx={{
                display: 'block',
                textAlign: 'right',
                color: '#1A407D',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              {item.targetSales} Cr
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
