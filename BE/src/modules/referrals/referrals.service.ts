import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLeadDto } from './dto/create-lead.dto';
import { Referral } from './entities/referral.entity';
import { logger } from 'src/logger/logger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralsRepository: Repository<Referral>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  //To create referrals and also create leads on the SFDC
  async createLeads(createLeadDtos: CreateLeadDto[]): Promise<any> {
    try {
      const referrals = createLeadDtos.map((dto) => {
        const {
          fullName,
          email,
          countryCode,
          mobileNumber,
          opportunityId,
          primarySource,
          secondarySource,
          projectName,
          referredApartment,
          projectCity,
        } = dto;

        return this.referralsRepository.create({
          fullName,
          email,
          countryCode,
          mobileNumber,
          opportunityId,
          primarySource,
          secondarySource,
          projectName,
          referredApartment,
          projectCity,
        });
      });

      await this.referralsRepository.save(referrals);
      await this.createLeadOnSFDC(referrals);
      return {
        message: 'Referrals created successfully.',
        data: referrals,
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        logger.error('Duplicate entry error: ', error);
        throw new BadRequestException(
          'This Contact Number is already associated with another referrer.',
        );
      }

      logger.error('Failed to save referral details:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to save referral details: ${error?.message}`,
      );
    }
  }

  //To create referral lead on salesforce system
  async createLeadOnSFDC(referrals: CreateLeadDto[]): Promise<any> {
    try {
      return await this.eventEmitter.emitAsync(
        EventMessagesEnum.LEAD_CREATED,
        referrals,
      );
    } catch (error) {
      logger.error('Failed to get referrer list:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to get referrer list: ${error?.message}`,
      );
    }
  }

  async countReferralsByBooking(opportunityId: string): Promise<number> {
    try {
      return await this.referralsRepository.count({
        where: { opportunityId },
      });
    } catch (error) {
      logger.error('Failed to get referrer list:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to get referrer list: ${error?.message}`,
      );
    }
  }

  //Get Referrals using opportunity Id
  async getReferralsByOppId(oppId: string): Promise<any> {
    try {
      const response = await this.referralsRepository.findAndCount({
        where: { opportunityId: oppId },
      });
      return {
        message: 'Referral list fetched successfully.',
        data: {
          count: response[1],
          referrals: response[0],
        },
      };
    } catch (error) {
      logger.error('Failed to get referrer list:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to get referrer list: ${error?.message}`,
      );
    }
  }
}
