import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { logger } from 'src/logger/logger';
import { CustomConfigService } from 'src/config/custom-config.service';
import { JwtService } from '@nestjs/jwt';
import { SfdcService } from '../sfdc/sfdc.service';
import { RmAdminJwtPayload } from './interfaces/rm-jwt-payload.interface';
import {
  JWT_TTL,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_RESEND_COUNT,
  OPP_ACCESS_TTL,
  OTP_EXPIRY_TTL_MS,
  OTP_RESEND_TTL_MS,
  R_JWT_TTL,
  SUCCESS,
  UNAUTHORIZE,
  OTP_CACHE_TTL,
  OTP_REGEX,
} from 'src/config/constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from 'src/entities';
import { RolesEnum } from 'src/enums/roles.enum';
import { StatusEnum } from 'src/enums/status.enum';
import { generateOtp } from 'src/utils/generateRandomNumber';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
} from 'src/enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { logSecurityEvent, SecurityEventType } from 'src/utils/security-logger';
@Injectable()
export class SsoService {
  constructor(
    private readonly configService: CustomConfigService,
    private readonly jwtService: JwtService,
    private readonly sfdcService: SfdcService,
    private readonly eventEmitter: EventEmitter2,

    @Inject(CACHE_MANAGER)
    private readonly cacheService: Cache,

    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  /**
   * To generate JWT access token
   *
   * @param user as Login User
   * @returns Access token and Refresh token
   */
  async generateAuthToken(user: any): Promise<any> {
    try {
      const userDetails = await this.usersRepository.findOne({
        where: { userName: user?.name, status: StatusEnum.ACTIVE },
        relations: ['role'],
        select: {
          id: true,
          name: true,
          role: { id: true, name: true },
        },
      });
      const userId = userDetails?.id ?? '';
      const userRole = userDetails?.role?.name ?? '';

      const unauthorizedResponse = this.buildUnauthorizedResponse();
      if (!user || !userDetails || !userId || !userRole) {
        return unauthorizedResponse;
      }

      const staticOTP = this.configService.get<string>('STATIC_LOGIN_OTP');
      if (userRole === RolesEnum.RM) {
        const ok = await this.ensureRmOppAccessCached(user?.id);
        if (!ok && !staticOTP) return unauthorizedResponse;
      }
      const payload: RmAdminJwtPayload = {
        sub: user?.id?.toLowerCase() ?? user?.email,
        dbId: userId,
        name: userDetails?.name,
        email: user?.email,
        role: userRole,
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.getDecrypted('JWT_SECRET'),
        expiresIn: JWT_TTL,
        algorithm: 'HS256',
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.getDecrypted('JWT_SECRET'),
        expiresIn: R_JWT_TTL,
        algorithm: 'HS256',
      });

      return {
        statusCode: SUCCESS,
        message: 'Access Token Generated',
        data: { accessToken, refreshToken, userRole },
      };
    } catch (error) {
      logger.error('Error generating booking token:', error?.message || error);
      return {
        statusCode: UNAUTHORIZE,
        message: 'The login session is expired. Please login again.',
        data: null,
      };
    }
  }

  /**
   * Validate local user credentials (username/email + password)
   * @param usernameOrEmail - Username or email
   * @param password - Plain text password
   * @returns User object if valid, null otherwise
   */
  async validateLocalUser(usernameOrEmail: string, password: string): Promise<any> {
    try {
      // Find user by username or email
      const user = await this.usersRepository.findOne({
        where: [
          { userName: usernameOrEmail, status: StatusEnum.ACTIVE },
          { email: usernameOrEmail, status: StatusEnum.ACTIVE },
        ],
        relations: ['role'],
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: { id: true, name: true },
        },
      });

      if (!user || !user.password) {
        return null;
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error) {
      logger.error('Error validating local user:', error?.message || error);
      return null;
    }
  }

  /**
   * Local login with username/email and password
   * @param usernameOrEmail - Username or email
   * @param password - Plain text password
   * @returns Access token, refresh token, and user info
   */
  async localLogin(usernameOrEmail: string, password: string): Promise<any> {
    try {
      const user = await this.validateLocalUser(usernameOrEmail, password);

      if (!user) {
        return this.buildUnauthorizedResponse();
      }

      const userDetails = await this.usersRepository.findOne({
        where: { id: user.id, status: StatusEnum.ACTIVE },
        relations: ['role'],
        select: {
          id: true,
          name: true,
          role: { id: true, name: true },
        },
      });

      const userId = userDetails?.id ?? '';
      const userRole = userDetails?.role?.name ?? '';

      const unauthorizedResponse = this.buildUnauthorizedResponse();
      if (!userDetails || !userId || !userRole) {
        return unauthorizedResponse;
      }

      // For Super Admin, bypass RM opportunity check
      const staticOTP = this.configService.get<string>('STATIC_LOGIN_OTP');
      if (userRole === RolesEnum.RM) {
        const ok = await this.ensureRmOppAccessCached(user?.id);
        if (!ok && !staticOTP) return unauthorizedResponse;
      }

      const payload: RmAdminJwtPayload = {
        sub: user?.userName?.toLowerCase() ?? user?.email,
        dbId: userId,
        name: userDetails?.name,
        email: user?.email,
        role: userRole,
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.getDecrypted('JWT_SECRET'),
        expiresIn: JWT_TTL,
        algorithm: 'HS256',
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.getDecrypted('JWT_SECRET'),
        expiresIn: R_JWT_TTL,
        algorithm: 'HS256',
      });

      return {
        statusCode: SUCCESS,
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          userRole,
          user: {
            id: userId,
            name: userDetails?.name,
            email: user?.email,
            role: userRole,
          },
        },
      };
    } catch (error) {
      logger.error('Error in local login:', error?.message || error);
      return {
        statusCode: UNAUTHORIZE,
        message: 'The login session is expired. Please login again.',
        data: null,
      };
    }
  }

  /**
   * Generate JWT tokens for locally authenticated user
   * @param user - User object from local strategy validation
   * @returns Access token, refresh token, and user info
   */
  async generateLocalAuthToken(user: any): Promise<any> {
    try {
      if (!user) {
        return this.buildUnauthorizedResponse();
      }

      const userDetails = await this.usersRepository.findOne({
        where: { id: user.id, status: StatusEnum.ACTIVE },
        relations: ['role'],
        select: {
          id: true,
          name: true,
          role: { id: true, name: true },
        },
      });

      const userId = userDetails?.id ?? user.id;
      const userRole = userDetails?.role?.name ?? user.role?.name ?? '';

      const unauthorizedResponse = this.buildUnauthorizedResponse();
      if (!userId || !userRole) {
        return unauthorizedResponse;
      }

      // For Super Admin, bypass RM opportunity check
      const staticOTP = this.configService.get<string>('STATIC_LOGIN_OTP');
      if (userRole === RolesEnum.RM) {
        const ok = await this.ensureRmOppAccessCached(user?.userName);
        if (!ok && !staticOTP) return unauthorizedResponse;
      }

      const payload: RmAdminJwtPayload = {
        sub: user?.userName?.toLowerCase() ?? user?.email,
        dbId: userId,
        name: userDetails?.name ?? user.name,
        email: user?.email,
        role: userRole,
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.getDecrypted('JWT_SECRET'),
        expiresIn: JWT_TTL,
        algorithm: 'HS256',
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.getDecrypted('JWT_SECRET'),
        expiresIn: R_JWT_TTL,
        algorithm: 'HS256',
      });

      return {
        statusCode: SUCCESS,
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          userRole,
          user: {
            id: userId,
            name: userDetails?.name ?? user.name,
            email: user?.email,
            username: user?.userName,
            role: userRole,
          },
        },
      };
    } catch (error) {
      logger.error('Error generating local auth token:', error?.message || error);
      return {
        statusCode: UNAUTHORIZE,
        message: 'The login session is expired. Please login again.',
        data: null,
      };
    }
  }

  private buildUnauthorizedResponse() {
    return {
      statusCode: UNAUTHORIZE,
      message:
        'Your account has been deleted or blocked. Please contact the administrator for support.',
      data: null,
    };
  }

  private async ensureRmOppAccessCached(username: string): Promise<boolean> {
    const { data } = await this.sfdcService.getUserOppAccess(username);
    const userResponse = typeof data === 'string' ? JSON.parse(data) : data;
    const sfdcRole = userResponse?.userprofile ?? '';
    const isActive = userResponse?.userIsactive ?? false;
    const opportunities = userResponse?.opportunities?.map((opp) => opp.Id);

    if (!sfdcRole || !isActive) return false;

    await this.cacheService.set(
      `user:opps:${username}`,
      opportunities,
      OPP_ACCESS_TTL,
    );
    return true;
  }

  /**
   * To refresh access token
   *
   * @param refreshToken
   * @returns Access token and Refresh token
   */
  async refreshAuthToken(refreshToken: any): Promise<any> {
    try {
      if (!refreshToken) {
        throw new UnauthorizedException('No refresh token provided');
      }

      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getDecrypted('JWT_SECRET'),
        algorithms: ['HS256'],
      });

      const userDetails = await this.usersRepository.findOne({
        where: { userName: payload?.name, status: StatusEnum.ACTIVE },
        relations: ['role'],
        select: {
          id: true,
          role: { id: true, name: true },
        },
      });

      const userId = userDetails?.id ?? '';
      const userRole = userDetails?.role?.name ?? '';

      if (!payload || !userDetails || !userId || !userRole) {
        throw new UnauthorizedException(
          'Your account has been deleted or blocked. Please contact the administrator for support.',
        );
      }

      const tokenPayload: RmAdminJwtPayload = {
        sub: payload?.sub,
        dbId: payload?.dbId,
        email: payload?.email,
        name: userDetails?.name,
        role: userRole,
      };
      // Generate new tokens
      const accessToken = this.jwtService.sign(tokenPayload, {
        secret: this.configService.getDecrypted('JWT_SECRET'),
        expiresIn: JWT_TTL,
        algorithm: 'HS256',
      });

      return {
        message: 'Access Token Refreshed',
        data: { accessToken, refreshToken, userRole },
      };
    } catch (error) {
      logger.error(
        'The login session is expired. Please login again:',
        error?.message || error,
      );
      if (error instanceof HttpException) throw error;
      throw new UnauthorizedException(
        'The login session is expired. Please login again.',
      );
    }
  }

  // Sends an OTP to the given email, handling cool down and resend tracking
  async sendOtp(email: string): Promise<any> {
    try {
      // Get the redis key for otp
      const otpRedisKey = `otp:${email.toLowerCase()}`;

      // Check how many failed attempts were made
      await this.checkOtpAttemptLimit(email);

      // Check if user exists for the provided email
      const user = await this.usersRepository.findOne({
        where: { userName: email },
      });
      if (!user)
        throw new NotFoundException(
          'We could not find an account associated with this email address. Please check the email and try again, or contact support if you need assistance.',
        );

      const now = new Date();
      // Fetch the otp cache if already exists
      const existingOtpCache = await this.cacheService.get<any>(otpRedisKey);

      if (existingOtpCache) {
        // Calculate how much time has passed since the last OTP was sent
        const lastSentTime = new Date(existingOtpCache.lastSentAt);
        const milisecondsSinceLastSend = now.getTime() - lastSentTime.getTime();

        // Prevent sending another OTP too soon
        if (milisecondsSinceLastSend < OTP_RESEND_TTL_MS)
          throw new BadRequestException(
            'Please wait at least 60 seconds before requesting a new OTP. This helps keep your account secure and prevents spam.',
          );

        // Check how long the resend window has been open
        const windowAge =
          now.getTime() - new Date(existingOtpCache.windowStart).getTime();

        // Reset resend count if window expired, else increment AND reset the window start time and last otp sent at time.
        const updatedCache = {
          resendCount:
            windowAge >= OTP_EXPIRY_TTL_MS
              ? 1
              : existingOtpCache.resendCount + 1,
          windowStart:
            windowAge >= OTP_EXPIRY_TTL_MS
              ? now
              : new Date(existingOtpCache.windowStart),
          lastSentAt: now,
        };

        if (
          windowAge < OTP_EXPIRY_TTL_MS &&
          updatedCache.resendCount > OTP_MAX_RESEND_COUNT
        ) {
          throw new BadRequestException(
            'You have reached the maximum number of OTP resend attempts. Please try again later.',
          );
        }
        // Generate the OTP with updated cache
        await this.generateAndSendOtp(user.name, email, updatedCache);
      } else {
        // No existing cache, treat as fresh OTP request
        await this.generateAndSendOtp(user.name, email);
      }
      return {
        statusCode: SUCCESS,
        message:
          'We’ve sent a 6-digit confirmation code to your email. Please enter the code below to verify your email address. The code is valid for 10 minutes.',
        data: null,
      };
    } catch (error) {
      logger.error('Error in sending OTP', error?.message || error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'Something went wrong while sending the OTP. Please try again later.',
      );
    }
  }

  // Verifies the provided OTP and issues an auth token if valid
  async verifyOtp(email: string, otp: string): Promise<any> {
    try {
      // Get redis keys for otp and max otp attempts
      const otpRedisKey = `otp:${email.toLowerCase()}`;
      const maxOtpAttemptsRedisKey = `otp_attempts:${email.toLowerCase()}`;

      // Validate OTP format
      if (!OTP_REGEX.test(otp)) {
        throw new BadRequestException('Invalid OTP format.');
      }

      const hashedInputOtp = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

      // Check how many failed attempts were made
      await this.checkOtpAttemptLimit(email);

      // Get OTP cache from Redis
      const cached = await this.cacheService.get<any>(otpRedisKey);
      if (!cached)
        throw new BadRequestException(
          'This OTP is invalid. Please request a new one to continue.',
        );

      // Check OTP expiry
      if (new Date() > new Date(cached.expiresAt)) {
        await this.cacheService.del(otpRedisKey);
        throw new BadRequestException(
          'This OTP has expired. Please request a new one to continue.',
        );
      }

      // Validate OTP match
      if (cached.otp !== hashedInputOtp) {
        // Retrieve current attempt count and cache value
        let cacheValue = await this.cacheService.get<any>(
          maxOtpAttemptsRedisKey,
        );
        const now = new Date();
        if (
          !cacheValue ||
          (cacheValue.expiresAt && new Date() > new Date(cacheValue.expiresAt))
        ) {
          // First time or expired: reset attemptCount and expiresAt
          cacheValue = {
            attemptCount: 1,
            expiresAt: new Date(now.getTime() + OTP_EXPIRY_TTL_MS),
          };
        } else {
          // Increment attemptCount, keep original expiresAt
          cacheValue = {
            ...cacheValue,
            attemptCount: (cacheValue.attemptCount || 0) + 1,
          };
        }
        await this.cacheService.set(
          maxOtpAttemptsRedisKey,
          cacheValue,
          OTP_CACHE_TTL,
        );
        if (cacheValue.attemptCount >= OTP_MAX_ATTEMPTS) {
          logSecurityEvent(
            SecurityEventType.BRUTE_FORCE_OTP_GUESS,
            `Max OTP attempts exceeded for email: ${email}`,
            {
              email,
              attemptCount: cacheValue.attemptCount,
              maxAttempts: OTP_MAX_ATTEMPTS,
            },
          );
          throw new BadRequestException(
            'You have exceeded the maximum number of incorrect OTP attempts. Please request a new OTP after some time to continue.',
          );
        }
        throw new UnauthorizedException(
          'The OTP you entered is incorrect. Please try again.',
        );
      }

      // Cleanup cache keys on success
      await this.cacheService.del(otpRedisKey); // delete otp on success
      await this.cacheService.del(maxOtpAttemptsRedisKey); // delete attempts on success

      const user = await this.usersRepository.findOne({
        where: { userName: email },
      });
      if (!user) {
        logger.warn(`OTP requested for non-existent email: ${email}`);
        throw new NotFoundException(
          'We could not find an account associated with this email address. Please check the email and try again, or contact support if you need assistance.',
        );
      }

      // Return a valid auth token for this user
      return await this.generateAuthToken({
        id: user?.userName,
        name: user?.userName,
        email: user?.email,
      });
    } catch (error) {
      logger.error('Error in verifying OTP', error?.message || error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'An unexpected error occurred while verifying the OTP.',
      );
    }
  }

  // Handles logic for resending OTP with resend count tracking and rate limiting
  async resendOtp(email: string): Promise<any> {
    try {
      const otpRedisKey = `otp:${email.toLowerCase()}`;

      // Check how many failed attempts were made
      await this.checkOtpAttemptLimit(email);

      // Check if user exists for the provided email
      const user = await this.usersRepository.findOne({
        where: { userName: email },
      });
      if (!user) {
        logger.warn(`OTP requested for non-existent email: ${email}`);
        throw new NotFoundException(
          'We could not find an account associated with this email address. Please check the email and try again, or contact support if you need assistance.',
        );
      }

      const cached = await this.cacheService.get<any>(otpRedisKey);
      const now = new Date();

      if (cached) {
        const { resendCount, windowStart, lastSentAt } = cached;
        const windowAge = now.getTime() - new Date(windowStart).getTime();
        const milisecondsSinceLastSend =
          now.getTime() - new Date(lastSentAt).getTime();

        // Enforce minimum resend delay
        if (milisecondsSinceLastSend < OTP_RESEND_TTL_MS) {
          throw new BadRequestException(
            'You must wait at least 60 seconds before resending the OTP.',
          );
        }

        // Update resend tracking info
        const updatedCache = {
          resendCount: windowAge >= OTP_EXPIRY_TTL_MS ? 1 : resendCount + 1,
          windowStart:
            windowAge >= OTP_EXPIRY_TTL_MS ? now : new Date(windowStart),
          lastSentAt: now,
        };

        // Prevent excessive resends within the same time window
        if (
          windowAge < OTP_EXPIRY_TTL_MS &&
          updatedCache?.resendCount >= OTP_MAX_RESEND_COUNT
        ) {
          throw new BadRequestException(
            'You have reached the maximum number of OTP resend attempts. Please try again later.',
          );
        }

        await this.generateAndSendOtp(user.name, user.email, updatedCache);
      } else {
        // If no cached OTP exists, treat as a fresh request
        await this.generateAndSendOtp(user.name, user.email);
      }

      return {
        statusCode: SUCCESS,
        message: 'OTP has been resent to your email address.',
        data: null,
      };
    } catch (error) {
      logger.error('Error in resending OTP', error?.message || error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'Something went wrong while resending the OTP. Please try again later.',
      );
    }
  }

  /**
   * Checks if the user has exceeded the maximum allowed OTP attempts.
   * Throws BadRequestException if the limit is reached.
   * @param email The user's email address
   * @param cacheService The cache service instance
   * @param OTP_MAX_ATTEMPTS The maximum allowed attempts
   */
  private async checkOtpAttemptLimit(email: string): Promise<void> {
    const maxOtpAttemptsRedisKey = `otp_attempts:${email.toLowerCase()}`;
    // Check how many failed attempts were made

    const attemptCount = (await this.cacheService.get<any>(
      maxOtpAttemptsRedisKey,
    )) || {
      attemptCount: 0,
    };
    if (
      attemptCount?.attemptCount >= OTP_MAX_ATTEMPTS &&
      attemptCount?.expiresAt &&
      new Date() < new Date(attemptCount?.expiresAt)
    ) {
      logSecurityEvent(
        SecurityEventType.BRUTE_FORCE_OTP_GUESS,
        `Blocked action: Max OTP attempts already exceeded for email: ${email}`,
        { email, attemptCount: attemptCount.attemptCount },
      );
      throw new BadRequestException(
        'You have exceeded the maximum number of incorrect OTP attempts. Please request a new OTP after sometime to continue.',
      );
    }
  }

  // Generates a new OTP, stores it in cache, and emits an email event
  private async generateAndSendOtp(
    name: string,
    email: string,
    resendData?: { resendCount: number; windowStart: Date; lastSentAt: Date },
  ): Promise<any> {
    try {
      const otpRedisKey = `otp:${email.toLowerCase()}`;
      const staticOTP = this.configService.get<string>('STATIC_LOGIN_OTP');
      const otp = staticOTP || generateOtp();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + OTP_EXPIRY_TTL_MS); // 10 minutes validity

      const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

      const otpCache = {
        otp: hashedOtp,
        expiresAt,
        resendCount: resendData?.resendCount ?? 0,
        windowStart: resendData?.windowStart ?? now,
        lastSentAt: resendData?.lastSentAt ?? now,
      };

      // Save OTP data to Redis
      await this.cacheService.set(otpRedisKey, otpCache, OTP_CACHE_TTL); // 10 min TTL

      const composeResponses = await this.eventEmitter.emitAsync(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.SSO_OTP,
          { NAME: name, OTP: otp },
          'Puravankara',
          { to: email },
        ),
      );
      if (composeResponses.some((r) => r instanceof Error)) {
        logger.error('Email dispatch error', composeResponses);
        throw new InternalServerErrorException(
          composeResponses[0]?.message ||
            'Failed to send OTP. Please try again later.',
        );
      }

      return true;
    } catch (error) {
      logger.error('Error generating/sending OTP', error?.message || error);
      return logsAndErrorHandling('SssoService - generateAndSendOtp', error, {
        email,
      });
    }
  }
}
