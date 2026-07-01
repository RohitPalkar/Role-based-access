import { SetMetadata } from '@nestjs/common';
export const SKIP_DECRYPTION_KEY = 'skip_decryption';
export const SkipDecryption = () => SetMetadata(SKIP_DECRYPTION_KEY, true);
