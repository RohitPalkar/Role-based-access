import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, NextFunction } from 'express';
import { UserRequest } from '../entities/user-request.entity';
import { logger } from 'src/logger/logger';

@Injectable()
export class UserRequestMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(UserRequest)
    private readonly userRequestRepository: Repository<UserRequest>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ipAddress: string = (
      (req.headers['x-forwarded-for'] as string) || req.ip
    )
      .split(',')[0]
      .trim();

    const userAgent =
      req.headers['user-agent'] ||
      String(req?.headers?.['sec-ch-ua']) ||
      'unknown';
    const requestUrl = req.originalUrl;
    const method = req.method;

    // Store the details in the database
    const userRequest = this.userRequestRepository.create({
      ip_address: ipAddress,
      user_agent: userAgent,
      request_url: requestUrl,
      method: method,
    });
    this.userRequestRepository
      .save(userRequest)
      .catch((err) => logger.error('Failed to save user request log', err));

    next();
  }
}
