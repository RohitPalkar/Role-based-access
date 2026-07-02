import { Module } from '@nestjs/common';
import { SsoService } from './sso.service';
import { SsoController } from './sso.controller';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { SsoStrategy } from './sso.strategy';
import { LocalStrategy } from './local.strategy';
import { JwtService } from '@nestjs/jwt';
import { RmAdminJwtStrategy } from './rm-jwt.strategy';
import { SfdcService } from '../sfdc/sfdc.service';
import { HttpModule } from '@nestjs/axios';
import { SfdcModule } from '../sfdc/sfdc.module';
import { Users } from 'src/entities';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    SfdcModule,
    HttpModule,
    TypeOrmModule.forFeature([Users]),
  ],

  providers: [
    SsoService,
    JwtService,
    SfdcService,
    SsoStrategy,
    LocalStrategy,
    RmAdminJwtStrategy,
  ],
  controllers: [SsoController, AuthController],
})
export class SsoModule {}
