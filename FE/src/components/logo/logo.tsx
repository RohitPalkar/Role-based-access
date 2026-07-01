import type { BoxProps } from '@mui/material/Box';

import { forwardRef } from 'react';

import Box from '@mui/material/Box';
import NoSsr from '@mui/material/NoSsr';

import { CONFIG } from 'src/config-global';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type LogoProps = BoxProps & {
  href?: string;
  disableLink?: boolean;
  renderNavMini?: boolean;
};

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  (
    { width = '192px', height = '24px', disableLink = false, className, href = '/', sx, renderNavMini, ...other },
    ref
  ) =>

  (
    <NoSsr
      fallback={
        <Box
          width={width}
          height={height}
          className={logoClasses.root.concat(className ? ` ${className}` : '')}
          sx={{ flexShrink: 0, display: 'inline-flex', verticalAlign: 'middle', ...sx }}
        />
      }
    >
      <Box
      >
        <img
          src={`${CONFIG.site.basePath}/assets/images/Puravankara.png`}
          alt="logo"
          style={{
            maxWidth: renderNavMini ? '85%' : '100%',
            paddingBottom: '1rem',
          }}
        />
      </Box>
    </NoSsr>
  )
);
