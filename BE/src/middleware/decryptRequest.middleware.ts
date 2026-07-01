// src/common/guards/decrypt-request.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CustomConfigService } from 'src/config/custom-config.service';
import { SKIP_DECRYPTION_KEY } from 'src/interceptors/decorators/skip-decryption.decorator';
import { logger } from 'src/logger/logger';
import { decryptRequest } from 'src/utils/encryption-decryption.util';

@Injectable()
export class DecryptRequestGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: CustomConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    // If encryption is disabled globally → allow
    const isEncryptionEnabled =
      this.configService.get<string>('ENABLE_ENCRYPTION') === 'true';

    if (!isEncryptionEnabled) return true;

    // Allow opt-out via decorator (handler or controller)
    const skipDecryption =
      this.reflector.getAllAndOverride<boolean>(SKIP_DECRYPTION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    if (skipDecryption) return true;

    // If there is no body, or empty body → nothing to do
    if (!req.body || Object.keys(req.body).length === 0) return true;

    // Expect encrypted payload string
    const raw = req.body?.payload;
    if (typeof raw !== 'string' || !raw.trim()) {
      logger.warn('Missing or empty encrypted payload');
      throw new BadRequestException('Missing or empty encrypted payload');
    }

    // Decrypt
    let decrypted: string;
    try {
      decrypted = await decryptRequest(raw); // now allowed
    } catch (err) {
      logger.error('Decryption failed:', err);
      throw new BadRequestException('Invalid or tampered encrypted payload');
    }

    // Parse JSON
    try {
      req.body = JSON.parse(decrypted);
    } catch (err) {
      logger.error('Parsing decrypted JSON failed:', err);
      throw new BadRequestException('Invalid or tampered encrypted payload');
    }

    return true;
  }
}
