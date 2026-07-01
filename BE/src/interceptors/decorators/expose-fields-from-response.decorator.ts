import { SetMetadata } from '@nestjs/common';

export const EXPOSE_FIELDS_METADATA_KEY = 'exposeFields';

export const ExposeFields = (...fields: string[]) =>
  SetMetadata(EXPOSE_FIELDS_METADATA_KEY, fields);
