import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-saml';
import * as fs from 'fs';
import { CustomConfigService } from 'src/config/custom-config.service';
import { SSO_PROFILE } from 'src/config/constants';

@Injectable()
export class SsoStrategy extends PassportStrategy(Strategy, 'sso') {
  constructor(private readonly configService: CustomConfigService) {
    const certPath = 'src/config/cert/Booking Form_RM Portal_B64.pem';
    const keyPath = 'src/config/cert/private-key.pem';

    let cert = '';
    let privateKey = '';

    try {
      if (fs.existsSync(certPath)) {
        cert = fs.readFileSync(certPath, 'utf8');
      }
      if (fs.existsSync(keyPath)) {
        privateKey = fs.readFileSync(keyPath, 'utf8');
      }
    } catch (error) {
      console.warn('SSO certificates not found, SSO strategy will not be available locally');
    }

    // For local development, use dummy cert/key if not provided
    const isLocalDev = configService.get<string>('NODE_ENV') === 'development';
    const certToUse = cert || (isLocalDev ? 'dummy-cert' : undefined);
    const keyToUse = privateKey || (isLocalDev ? 'dummy-key' : undefined);

    super({
      entryPoint: configService.get<string>('SSO_ENTRY_POINT') || 'https://login.microsoftonline.com/tenant-id/saml2',
      issuer: configService.get<string>('SSO_ISSUER_URL') || 'local-issuer',
      callbackUrl: configService.get<string>('SSO_CALLBACK_URL') || 'http://localhost:3001/api/sso/callback',
      cert: certToUse,
      privateKey: keyToUse,
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
