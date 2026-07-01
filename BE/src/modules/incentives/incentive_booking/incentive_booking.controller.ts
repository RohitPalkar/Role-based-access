import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IncentiveBookingService } from './incentive_booking.service';
import { CreateIncentiveBookingDto } from './dto/create_incentive_booking.dto';
import { FindAllBookingsDto } from './dto/find_all_incentive_booking.dto';
import { Users } from 'src/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { User } from '../../sso/decorators/user.decorator';
import { SapService } from '../sap/sap.service';
import { NotificationService } from '../../notifications/notification.service';
import { logger } from 'src/logger/logger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { IncentiveBookingOverridesService } from '../incentive_booking_overrides/incentive_booking_overrides.service';
import * as fs from 'fs';
import { promises as fsPromise } from 'fs';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { format } from 'date-fns';
@Controller('incentive-bookings')
export class IncentiveBookingController {
  constructor(
    private readonly incentiveBookingService: IncentiveBookingService,
    private readonly sapService: SapService,
    private readonly notificationService: NotificationService,
    private readonly bookingOverrideService: IncentiveBookingOverridesService,

    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,

    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {}

  //Below Code is for api integration of SAP API

  @Post()
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async create(): Promise<any> {
    try {
      const cachedData = await this.cacheService.get<any>('bookingflag');
      if (cachedData) {
        return { message: 'Booking data collection is already in progress.' };
      }

      await this.cacheService.set('bookingflag', true, 60 * 10 * 1000);

      const startDate = '2025-04-01';

      const sapFromDate = format(startDate, 'dd-MM-yyyy');
      const sapToDate = format(new Date(), 'dd-MM-yyyy');

      const fromDate = format(startDate, 'yyyy-MM-dd');
      const toDate = format(new Date(), 'yyyy-MM-dd');

      const users = await this.usersRepo
        .createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .where('role.name = :rmRole', { rmRole: RolesEnum.RM })
        .getMany();

      logger.info('Total RM users fetched', users.length);
      // run async background
      setImmediate(() =>
        this.processInBackground(
          users,
          sapFromDate,
          sapToDate,
          fromDate,
          toDate,
        ),
      );

      return {
        message:
          'Booking data collection and processing has started. You will be notified once it is completed.',
      };
    } catch (error) {
      logsAndErrorHandling('IncentiveBookingController - create', error, null);
    }
  }

  private async processInBackground(
    users: any[],
    sapFromDate: string,
    sapToDate: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    let combinedData: CreateIncentiveBookingDto[] = [];
    const notifications: any[] = [];

    try {
      for (const user of users) {
        if (!user.empCode) continue;
        const userData = await this.fetchAndProcessUserData(
          user,
          sapFromDate,
          sapToDate,
          fromDate,
          toDate,
          notifications,
        );
        combinedData = combinedData.concat(userData);
      }

      logger.info('Data Fetched From SAP API');

      await this.incentiveBookingService.insertDataInMultipleTablesBasedOnApi(
        combinedData,
      );
      logger.info('Processing Completed');

      notifications.push(this.successNotification());
      await this.saveNotifications(notifications);
    } catch (err) {
      logger.error('Error processing incentive bookings in background:', err);
      await this.saveNotifications([this.failureNotification()]);
    } finally {
      await this.cacheService.del('bookingflag');
    }
  }

  private async fetchAndProcessUserData(
    user: any,
    sapFromDate: string,
    sapToDate: string,
    fromDate: string,
    toDate: string,
    notifications: any[],
  ): Promise<CreateIncentiveBookingDto[]> {
    try {
      const [sapResponse, overrideMap] = await Promise.all([
        this.sapService.getSapData(sapFromDate, sapToDate, user.empCode),
        this.bookingOverrideService.getLatestOverridesMap(fromDate, toDate),
      ]);

      const records = sapResponse.data?.root?.root;
      if (!Array.isArray(records) || records.length === 0) return [];

      return records
        .map((record) => this.processRecord(record, overrideMap, notifications))
        .filter((record): record is CreateIncentiveBookingDto => !!record);
    } catch (e) {
      logger.error(
        `Error fetching SAP data for user ${user.id} with empCode ${user.empCode}:`,
        e,
      );
      return [];
    }
  }

  private processRecord(
    record: any,
    overrideMap: Map<any, any>,
    notifications: any[],
  ): CreateIncentiveBookingDto | null {
    if (record.brand && record.brand.trim() !== '') {
      const overrideRecord = overrideMap.get(record.bookingId);
      if (overrideRecord) {
        record.sapBookingDate = record.bookingDate;
        record.bookingDate = overrideRecord.actualBookingDate;
      }
      return record;
    }

    notifications.push({
      title: 'Brand Mapping Alert',
      message: `Booking with ID: ${record.bookingId} was received, but no brand is mapped to the ${
        record.projectName || 'specified'
      } phase. Please take necessary actions.`,
      type: 'Brand Mapping Alert',
      isForAllAdmin: true,
    });
    return null;
  }

  private successNotification() {
    return {
      title: 'Incentive Booking Data Processing Completed',
      message: 'All booking data has been processed successfully.',
      type: 'Incentive Booking Processing',
      isForAllAdmin: true,
    };
  }

  private failureNotification() {
    return {
      title: 'Incentive Booking Data Processing Failed',
      message:
        'There was an error while processing booking data. Please check logs for details.',
      type: 'Incentive Booking Processing',
      isForAllAdmin: true,
    };
  }

  private async saveNotifications(notifications: any[]) {
    try {
      await this.notificationService.create({ notifications });
    } catch (notificationError) {
      logger.error('Failed to save notifications:', notificationError);
    }
  }

  @Post('create-from-file')
  async createFromFile(): Promise<any> {
    try {
      const fileContent = fs.readFileSync('assets/output1.json', 'utf-8');
      if (!fileContent.trim()) {
        throw new BadRequestException('Booking data file is empty.');
      }

      let bookingList: CreateIncentiveBookingDto[];

      try {
        bookingList = JSON.parse(fileContent);
      } catch (parseError) {
        throw new BadRequestException(
          'Failed to parse booking data. Ensure the JSON format is correct.',
          parseError,
        );
      }

      await this.incentiveBookingService.insertDataInMultipleTablesBasedOnApi(
        bookingList,
      );
    } catch (error) {
      logsAndErrorHandling(
        'IncentiveBookingController - createFromFile',
        error,
        {},
      );
    }
  }

  @Get('test/api')
  async testApi(): Promise<any> {
    try {
      const users = await this.usersRepo
        .createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .where('role.name = :rmRole', { rmRole: RolesEnum.RM })
        .andWhere('user.empCode IS NOT NULL')
        .andWhere('user.id IN(:specificUserId)', {
          specificUserId: [1486],
        })
        .getMany();
      let combinedData: any[] = [];

      for (const user of users) {
        // Skip users without an emp_code
        if (!user.empCode) {
          continue;
        }

        // Fetch SAP data using emp_code from the user
        const sapResponse = await this.sapService.getSapData(
          '01-06-2025', // Hardcoded 'from' date
          '30-06-2026', // Hardcoded 'to' date
          user.empCode, // Use emp_code as identifier for SAP data
        );
        // Extract the nested data assuming response structure: { data: { root: { root: [ ... ] } } }
        const records = sapResponse.data?.root?.root;
        if (Array.isArray(records) && records.length > 0) {
          combinedData = combinedData.concat(records);
        }
      }

      // Save the combined records into output1.json
      await fsPromise.writeFile(
        'assets/output11.json',
        JSON.stringify(combinedData, null, 2),
      );

      return {
        message: 'Test API call successful',
        data: combinedData,
      };
    } catch (error) {
      logsAndErrorHandling('IncentiveBookingController - testApi', error, {});
    }
  }

  @Post('update-payable-dates')
  async bulkUpdatePayableDates() {
    return await this.incentiveBookingService.bulkUpdatePayableReceivedDatesFromExcel();
  }

  @Post('update-payouts-dates')
  async bulkUpdatePayouts(@Query('updateOnlyDates') updateOnlyDates?: string) {
    const updateOnlyDatesFlag = ['true', '1'].includes(
      String(updateOnlyDates).toLowerCase(),
    );

    return await this.incentiveBookingService.bulkUpdatePayoutsFromExcel(
      updateOnlyDatesFlag,
    );
  }

  @Post('update-qualification-dates')
  async bulkUpdateQualifiedDates() {
    return await this.incentiveBookingService.bulkUpdateQualifiedDates();
  }

  @Get()
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async findAllBookings(@Query() query: FindAllBookingsDto, @User() user: any) {
    if (query.projectIds) {
      const projectIdsArray = query.projectIds
        .split(',')
        .map((id) => id.trim());
      const allValid = projectIdsArray.every((id) => !isNaN(Number(id)));
      if (!allValid) {
        throw new BadRequestException(
          'Invalid projectIds. All IDs must be numbers.',
        );
      }
    }

    let rmUserId = undefined;
    if (user?.role === RolesEnum.RM) {
      rmUserId = user?.dbId;
    } else {
      rmUserId = query?.rmId ? Number(query.rmId) : undefined;
    }

    return this.incentiveBookingService.findAllBookings({
      userId: rmUserId,
      page: query.page,
      limit: query.limit,
      type: query.type,
      incentiveFilter: query.incentiveFilter,
      projectIds: query.projectIds,
      month: query.month,
      year: query.year,
      search: query.search,
    });
  }
}
