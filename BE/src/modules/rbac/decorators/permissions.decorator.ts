import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (module: string, ...actions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { module, actions });
