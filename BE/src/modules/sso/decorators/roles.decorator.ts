import { SetMetadata } from '@nestjs/common';

/**
 * Roles decorator to define roles allowed for a route.
 * @param roles - Array of roles
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
