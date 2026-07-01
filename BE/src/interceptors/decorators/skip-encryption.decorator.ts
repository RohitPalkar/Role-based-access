import { SetMetadata } from '@nestjs/common';

export const SKIP_ENCRYPTION_KEY = 'skip_encryption';
export const SkipEncryption = () => SetMetadata(SKIP_ENCRYPTION_KEY, true);
