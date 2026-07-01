import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as moment from 'moment';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CreateIncentiveBookingDto } from '../incentives/incentive_booking/dto/create_incentive_booking.dto';
import { IncentiveBookingService } from '../incentives/incentive_booking/incentive_booking.service';
import { UserService } from '../users/user.service';
import { CronStatus, CRONTYPES } from 'src/enums/crons.enum';
import { CronLog } from './entity/cron-log.entity';
import { CronLogsService } from './cron-logs.service';
import {
  CRON_SCHEDULE_11PM_IST_530PM_UTC,
  DATE_FORMAT,
  DATE_FORMAT_DD_MM_YYYY,
} from 'src/config/constants';
import { CustomConfigService } from 'src/config/custom-config.service';
import { SfdcService } from 'src/modules/sfdc/sfdc.service'; // Adjust the import path as needed
import { SapService } from 'src/modules/incentives/sap/sap.service'; // Adjust the import path as needed
import { IncentiveBookingOverridesService } from '../incentives/incentive_booking_overrides/incentive_booking_overrides.service';
import { logger } from 'src/logger/logger';

@Injectable()
export class BookingCronService {
  private readonly enabled: boolean;
  private readonly cronType = CRONTYPES.BOOKING_USER_REFRESH;

  constructor(
    private readonly userService: UserService,
    private readonly incentiveBookingService: IncentiveBookingService,
    private readonly cronLogService: CronLogsService,
    private readonly configService: CustomConfigService,
    private readonly sfdcService: SfdcService, // Service to fetch users
    private readonly sapService: SapService, // Service to fetch booking data
    private readonly bookingOverrideService: IncentiveBookingOverridesService,
  ) {
    this.enabled = this.configService.get('CRONS_ENABLED') === 'true';
  }

  @Cron(CRON_SCHEDULE_11PM_IST_530PM_UTC) // Runs at 12 AM local time (7 PM UTC)
  @Cron('41 17 * * *') // Runs at 2:55 PM IST every day
  async handleCron() {
    logger.info('Cron job started: Refreshing user and booking data');
    if (!this.enabled) {
      logger.info(
        'Crons are disabled. Skipping execution. You can enable them via the CRONS_ENABLED config.',
      );
      return;
    }

    const startTime = new Date();

    const cronExecutionLog: Partial<CronLog> = {
      cronType: this.cronType,
      cronName: this.cronType,
      startTime,
      status: CronStatus.PASS,
      description: 'Cron started successfully',
    };

    try {
      // Step 1: Refresh user data via SFDC API
      const sfdcResponse = await this.sfdcService.getUsers();
      if (sfdcResponse?.data?.length) {
        const users: CreateUserDto[] = sfdcResponse.data;
        await this.userService.refreshData(users);
      }

      const startDate = moment().subtract(1, 'year');
      const sapFromDate = moment(startDate).format(DATE_FORMAT_DD_MM_YYYY);
      const sapToDate = moment().format(DATE_FORMAT_DD_MM_YYYY);
      const fromDate = moment(startDate).format(DATE_FORMAT);
      const toDate = moment().format(DATE_FORMAT);

      const rmUsers = await this.userService.getRmUsers();

      const combinedBookingData = await this.fetchAndNormalizeSapBookingsForRms(
        rmUsers.data,
        sapFromDate,
        sapToDate,
        fromDate,
        toDate,
      );

      await this.incentiveBookingService.insertDataInMultipleTablesBasedOnApi(
        combinedBookingData,
      );

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      logger.info(`Total cron execution time: ${durationMs}ms`);

      cronExecutionLog.endTime = endTime;
      cronExecutionLog.durationMs = durationMs;
      cronExecutionLog.status = CronStatus.PASS;
      cronExecutionLog.description = 'Cron executed successfully';
    } catch (error) {
      logger.error('Cron job failed', error.stack);
      const endTime = new Date();
      cronExecutionLog.endTime = endTime;
      cronExecutionLog.durationMs = endTime.getTime() - startTime.getTime();
      cronExecutionLog.status = CronStatus.FAIL;
      cronExecutionLog.description = `Cron failed: ${error.message}`;
    }

    await this.cronLogService.saveLog(cronExecutionLog);
  }

  private async fetchAndNormalizeSapBookingsForRms(
    rmUsers: any[],
    sapFromDate: string,
    sapToDate: string,
    fromDate: string,
    toDate: string,
  ): Promise<CreateIncentiveBookingDto[]> {
    let combinedBookingData: CreateIncentiveBookingDto[] = [];

    for (const user of rmUsers) {
      if (!user.empCode) continue;

      try {
        const [sapResponse, overrideMap] = await Promise.all([
          this.sapService.getSapData(sapFromDate, sapToDate, user.empCode),
          this.bookingOverrideService.getLatestOverridesMap(fromDate, toDate),
        ]);

        const records = sapResponse.data?.root?.root;
        if (records?.length <= 0) continue;
        const validRecords = [];
        for (const record of records) {
          if (record?.brand?.trim() == '') continue;
          const overrideRecord = overrideMap.get(record.bookingId);
          if (overrideRecord) {
            record.sapBookingDate = record.bookingDate;
            record.bookingDate = overrideRecord.actualBookingDate;
          }
          validRecords.push(record);
        }
        combinedBookingData = combinedBookingData.concat(validRecords);
      } catch (sapError) {
        logger.error(
          `Error fetching SAP data for user ${user.id} with empCode ${user.empCode}:`,
          sapError,
        );
      }
    }

    return combinedBookingData;
  }
}
