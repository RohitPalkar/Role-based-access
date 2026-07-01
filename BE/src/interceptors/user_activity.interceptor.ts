import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  mixin,
  Type,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, tap } from 'rxjs';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';

export function UserActivityInterceptor(
  action: string,
  entity: string,
): Type<NestInterceptor> {
  @Injectable()
  class UserActivityInterceptorMixin implements NestInterceptor {
    constructor(private readonly eventEmitter: EventEmitter2) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const req = context.switchToHttp().getRequest();
      const res = context.switchToHttp().getResponse();

      return next.handle().pipe(
        tap((result) => {
          this.eventEmitter.emit(EventMessagesEnum.CREATE_ACTIVITY_LOG, {
            userId: req.user?.dbId,
            action,
            entity,
            entityId: result?.data?.id ?? null,
            details: {
              body: req.body,
              query: req.query,
              params: req.params,
              apiEndpoint: req.originalUrl,
              method: req.method,
              userRole: req.user?.role,
              responseStatus: res.statusCode,
            },
            ipAddress: req.ip,
            deviceDetails: req.headers['user-agent'],
          });
        }),
      );
    }
  }

  return mixin(UserActivityInterceptorMixin);
}
