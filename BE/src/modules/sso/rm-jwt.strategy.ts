import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RmAdminJwtPayload } from './interfaces/rm-jwt-payload.interface';
import { CustomConfigService } from 'src/config/custom-config.service';

@Injectable()
export class RmAdminJwtStrategy extends PassportStrategy(
  Strategy,
  'rm-admin-jwt',
) {
  constructor(private readonly configService: CustomConfigService) {
    super({
      secretOrKey: configService.getDecrypted('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
    });
  }

  async validate(payload: RmAdminJwtPayload): Promise<any> {
    return {
      userId: payload.sub,
      username: payload.sub,
      dbId: payload.dbId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  }
}
