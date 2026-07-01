import type { MotionProps } from 'framer-motion';
import type { BoxProps } from '@mui/material/Box';

import { m } from 'framer-motion';
import { forwardRef } from 'react';

import Box from '@mui/material/Box';

import { varContainer } from './variants';

// ----------------------------------------------------------------------

export type MotionContainerProps = BoxProps &
  MotionProps & {
    animate?: boolean;
    action?: boolean;
  };

export const MotionContainer = forwardRef<HTMLDivElement, MotionContainerProps>(
  ({ animate, action = false, children, ...other }, ref) => {

    const animationState = action && !animate ? 'exit' : 'animate';   

    const commonProps = {
      ref,
      component: m.div,
      variants: varContainer(),
      initial: action ? false : 'initial',
      animate: animationState,
      exit: action ? undefined : 'exit',
      ...other,
    };

    return <Box {...commonProps}>{children}</Box>;
  }
);
