import { m } from 'framer-motion';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { ForbiddenIllustration } from 'src/assets/illustrations';

import { varBounce, MotionContainer } from 'src/components/animate';

import { usePermission } from '../hooks/use-permission';

import type { PermissionGuardProps } from '../types';

export function PermissionGuard({
  moduleCode,
  actionCode,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasModule, loading } = usePermission();

  if (loading) {
    return null;
  }

  const hasAccess = actionCode
    ? hasPermission(moduleCode, actionCode)
    : hasModule(moduleCode);

  if (!hasAccess) {
    return (
      <Container component={MotionContainer} sx={{ textAlign: 'center' }}>
        <m.div variants={varBounce().in}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Access denied
          </Typography>
        </m.div>
        <m.div variants={varBounce().in}>
          <Typography sx={{ color: 'text.secondary' }}>
            You do not have permission to access this page.
          </Typography>
        </m.div>
        <m.div variants={varBounce().in}>
          <ForbiddenIllustration sx={{ my: { xs: 5, sm: 10 } }} />
        </m.div>
      </Container>
    );
  }

  return <>{children}</>;
}
