import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { SsoService } from './sso.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly ssoService: SsoService) {
    super({
      usernameField: 'usernameOrEmail',
      passwordField: 'password',
    });
  }

  async validate(usernameOrEmail: string, password: string): Promise<any> {
    const user = await this.ssoService.validateLocalUser(usernameOrEmail, password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    return user;
  }
}