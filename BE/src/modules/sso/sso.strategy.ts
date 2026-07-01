import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-saml';
import * as fs from 'fs';
import { CustomConfigService } from 'src/config/custom-config.service';
import { SSO_PROFILE } from 'src/config/constants';

@Injectable()
export class SsoStrategy extends PassportStrategy(Strategy, 'sso') {
  constructor(private readonly configService: CustomConfigService) {
    super({
      entryPoint: configService.get<string>('SSO_ENTRY_POINT'),
      issuer: configService.get<string>('SSO_ISSUER_URL'),
      callbackUrl: configService.get<string>('SSO_CALLBACK_URL'),
      cert: fs.readFileSync(
        'src/config/cert/Booking Form_RM Portal_B64.pem',
        'utf8',
      ),
      privateKey: fs.readFileSync('src/config/cert/private-key.pem', 'utf8'),
    });
  }

  validate(profile: any, done: any) {
    return done(null, {
      issuer: profile.issuer,
      sessionIndex: profile.sessionIndex,
      id: profile.nameID,
      tenantId: profile[SSO_PROFILE.TENANT_ID],
      displayName: profile[SSO_PROFILE.DISPLAY_NAME],
      name: profile[SSO_PROFILE.NAME],
      email: profile[SSO_PROFILE.EMAIL],
    });
  }
}
