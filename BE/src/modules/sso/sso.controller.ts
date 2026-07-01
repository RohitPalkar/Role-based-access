import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomConfigService } from 'src/config/custom-config.service';
import * as fs from 'fs';
import { COOKIE_CONFIG, SUCCESS } from 'src/config/constants';
import { Response } from 'express';
import { SsoService } from './sso.service';
import { RolesEnum } from 'src/enums/roles.enum';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { logger } from 'src/logger/logger';
import { SkipDecryption } from 'src/interceptors/decorators/skip-decryption.decorator';
import { SkipEncryption } from 'src/interceptors/decorators/skip-encryption.decorator';
import { OtpThrottleGuard } from 'src/guards/otp-throttle.guard';

@Controller('sso')
export class SsoController {
  constructor(
    private readonly configService: CustomConfigService,
    private readonly ssoService: SsoService,
  ) {}

  @Get('/metadata')
  getMetadata(@Res() res: Response) {
    try {
      const issuerURL = this.configService.get<string>('SSO_ISSUER_URL');
      const callbackURL = this.configService.get<string>('SSO_CALLBACK_URL');
      const cert = fs.readFileSync('src/config/cert/public-cert.pem', 'utf8');

      // Remove lines that contain 'CERTIFICATE'
      const certData = cert
        .split('\n') // Split by line
        .map((line) => line.trim()) // Trim whitespace
        .filter((line) => !line.includes('CERTIFICATE')) // Remove header/footer
        .join(''); // Join into a single string

      const metadata = fs
        .readFileSync('src/modules/sso/metadata/saml-metadata.xml', 'utf8')
        .replace('{SSO_ISSUER_URL}', issuerURL)
        .replace('{SSO_CALLBACK_URL}', callbackURL)
        .replace('{PUBLIC_KEY}', certData);

      res.type('application/xml').status(SUCCESS).send(metadata);
    } catch (err) {
      res.status(500).send({
        message: 'Could not retrieve metadata',
        error: err.message,
      });
    }
  }

  @Get('/login')
  @UseGuards(AuthGuard('sso'))
  login() {
    // Redirects to Azure AD for login
  }

  @Post('/callback')
  @UseGuards(AuthGuard('sso'))
  @SkipDecryption()
  @SkipEncryption()
  async callback(@Req() req, @Res() res) {
    const { data, statusCode } = await this.ssoService.generateAuthToken(
      req.user,
    );
    if (statusCode !== SUCCESS) {
      res.redirect(`${this.configService.get<string>('SALES_PORTAL_URL')}/401`);
    }
    // Set tokens in HTTP-only cookies
    res.cookie(COOKIE_CONFIG.ACCESS_TOKEN_NAME, data?.accessToken, {
      secure: COOKIE_CONFIG.SECURE,
      sameSite: COOKIE_CONFIG.SAME_SITE,
      maxAge: COOKIE_CONFIG.MAX_AGE,
      domain: COOKIE_CONFIG.DOMAIN,
    });

    res.cookie(COOKIE_CONFIG.REFRESH_TOKEN_NAME, data?.refreshToken, {
      secure: COOKIE_CONFIG.SECURE,
      sameSite: COOKIE_CONFIG.SAME_SITE,
      maxAge: COOKIE_CONFIG.REFRESH_MAX_AGE,
      domain: COOKIE_CONFIG.DOMAIN,
    });
    const normalizedRole = data?.userRole?.trim();

    if (normalizedRole === RolesEnum.SUPER_ADMIN) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/super-admin/user`,
      );
    } else if (normalizedRole === RolesEnum.ADMIN) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/admin/user`,
      );
    } else if (normalizedRole === RolesEnum.RM) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/rm-panel/bookings`,
      );
    } else if (normalizedRole === RolesEnum.FINANCE_ADMIN) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/finance-admin/employee-list`,
      );
    } else if (normalizedRole === RolesEnum.CRM) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/crm/dashboard`,
      );
    } else if (normalizedRole === RolesEnum.MIS) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/mis/eoi-dashboard`,
      );
    } else if (normalizedRole === RolesEnum.SALES_TL) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/sales-tl/bookings`,
      );
    } else if (normalizedRole === RolesEnum.SALES_RSH) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/sales-rsh/bookings`,
      );
    } else if (normalizedRole === RolesEnum.SALES_BH) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/sales-bh-panel/eoi-records`,
      );
    } else if (normalizedRole === RolesEnum.PROJECT_HEAD) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/project-head/eoi-dashboard`,
      );
    } else if (normalizedRole === RolesEnum.GRE) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/gre/dashboard`,
      );
    } else if (normalizedRole === RolesEnum.BIS) {
      res.redirect(
        `${this.configService.get<string>('SALES_PORTAL_URL')}/bis/bookings`,
      );
    } else {
      res.redirect(`${this.configService.get<string>('SALES_PORTAL_URL')}/404`);
    }
  }

  @Post('/refresh-token')
  async refreshAuthToken(@Body('refreshToken') refreshToken: string) {
    return this.ssoService.refreshAuthToken(refreshToken);
  }

  @Get('/logout')
  logout(@Req() req, @Res() res) {
    try {
      // Clear session if using session-based auth
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.status(SUCCESS).send({
        message: 'Logged out successfully.',
        response: { logout: true },
        error: null,
      });
    } catch (err) {
      logger.error('Logout error:', err);
      throw new InternalServerErrorException('Something went wrong');
    }
  }
  @Get('/logout-user')
  logoutUser(@Req() req, @Res() res) {
    try {
      // Clear session if using session-based auth
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.cookie(COOKIE_CONFIG.ACCESS_TOKEN_NAME, '', {
        secure: COOKIE_CONFIG.SECURE,
        sameSite: COOKIE_CONFIG.SAME_SITE,
        maxAge: 1,
        domain: COOKIE_CONFIG.DOMAIN,
      });

      res.cookie(COOKIE_CONFIG.REFRESH_TOKEN_NAME, '', {
        secure: COOKIE_CONFIG.SECURE,
        sameSite: COOKIE_CONFIG.SAME_SITE,
        maxAge: 1,
        domain: COOKIE_CONFIG.DOMAIN,
      });

      res.redirect(`${this.configService.get<string>('SALES_PORTAL_URL')}`);
    } catch (err) {
      logger.error('Logout user error:', err);
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  @Post('/send-otp')
  @UseGuards(OtpThrottleGuard)
  async sendOtp(@Body() dto: SendOtpDto) {
    const { email } = dto;
    return this.ssoService.sendOtp(email);
  }

  @Post('/verify-otp')
  @UseGuards(OtpThrottleGuard)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const { email, otp } = dto;
    return this.ssoService.verifyOtp(email, otp);
  }

  @Post('/resend-otp')
  async resendOtp(@Body() dto: SendOtpDto) {
    const { email } = dto;
    return this.ssoService.resendOtp(email);
  }
}
