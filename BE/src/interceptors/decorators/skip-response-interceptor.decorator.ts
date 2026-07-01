import { SetMetadata } from '@nestjs/common';

export const SkipResponseInterceptor = () =>
  SetMetadata('skipResponseInterceptor', true);
