import type { BoxProps } from '@mui/material/Box';
import type { Breakpoint } from '@mui/material/styles';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

import { layoutClasses } from 'src/layouts/classes';

// ----------------------------------------------------------------------

type MainProps = BoxProps & {
  layoutQuery: Breakpoint;
};

export function Main({ sx, children, layoutQuery, ...other }: MainProps) {
  const theme = useTheme();

  return (
    <Box
      component="main"
      className={`${layoutClasses.main}`}
      sx={{
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        [theme.breakpoints.up(layoutQuery)]: {
          flexDirection: 'row',
        },
        ...sx,
      }}
      {...other}
    >
      {children}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function Content({ sx, children, layoutQuery, ...other }: MainProps) {
  const theme = useTheme();

  const renderContent = (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        // maxWidth: 'var(--layout-auth-content-width)',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          borderTopLeftRadius: '50px',
          borderBottomLeftRadius: '50px',
          overflow: {
            xs: 'inherit',
            sm: 'inherit',
            md: 'inherit',
            lg: 'hidden',
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );

  return (
    <Box
      className={`${layoutClasses.content} loginRightPanel`}
      sx={{
        maxWidth: {
          xs: '100%',
          sm: '100%',
          md: '55%',
          lg: '55%',
          xl: '55%',
        },
        position: 'relative',
        // px: 2,
        // py: 5,
        display: 'flex',
        flex: '1 1 auto',
        // alignItems: 'center',
        flexDirection: 'column',
        // justifyContent: 'center',
        [theme.breakpoints.up(layoutQuery)]: {
          px: 0,
          // py: 'calc(var(--layout-header-desktop-height) + 24px)',
        },
        ...sx,
      }}
      {...other}
    >
      {renderContent}
    </Box>
  );
}
