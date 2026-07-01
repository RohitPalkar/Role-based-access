import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class OppAccessGuard implements CanActivate {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheService: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userEmail = request?.user?.email;
    const requestedOppId = request?.params?.oppId;

    if (!userEmail) {
      throw new ForbiddenException('Unauthorized access');
    }
    // Fetch opportunity IDs from cache
    const cachedOpportunities: string[] = await this.cacheService.get(
      `user:opps:${userEmail}`,
    );

    if (!cachedOpportunities) {
      throw new ForbiddenException(
        'Session expired or opportunities not found',
      );
    }

    if (cachedOpportunities && !cachedOpportunities.includes(requestedOppId)) {
      throw new ForbiddenException('Access denied to this opportunity');
    }

    return true;
  }
}
