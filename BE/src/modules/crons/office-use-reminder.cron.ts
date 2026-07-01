import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingOfficeUse } from '../bookings/entities/booking_office_use.entity';
import { Users } from '../users/entities/user.entity';
import { CronLog } from './entity/cron-log.entity';
import { CronLogsService } from './cron-logs.service';
import { CronStatus, CRONTYPES } from 'src/enums/crons.enum';
import { logger } from 'src/logger/logger';
import { CustomConfigService } from 'src/config/custom-config.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventMessagesEnum,
  ComposeEmailsEnum,
} from 'src/enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';
import {
  getS3Url,
  getFormUrl,
  getConfigOptionsByFormType,
} from 'src/helpers/bookings.helper';
import { PrimarySourceEnum } from 'src/enums/primary-sources.enum';
import { decryptBookingApplicants } from 'src/utils/encryption-decryption.util';
import {
  BookingFormStatusEnum,
  FormType,
} from 'src/enums/booking-form-status.enum';
import { ProjectUserMapping } from '../masters/projects/entities/project_user_mapping.entity';
import { RolesEnum } from 'src/enums/roles.enum';
import { safeString } from 'src/helpers';
import { format } from 'node_modules/date-fns';

interface BookingReminderData {
  projectName: string;
  unitNumber: string;
  firstApplicantName: string;
  enquiryId: string;
  closingRmName: string;
  bookingFormPdfLink: string;
  bookingFormSignedDate: string;
  referrerFormLink?: string;
  updateOfficeUseLink: string;
  opportunityId: string;
}

@Injectable()
export class OfficeUseReminderCron {
  private readonly cronType = CRONTYPES.OFFICE_USE_REMINDER;
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingOfficeUse)
    private readonly bookingOfficeUseRepository: Repository<BookingOfficeUse>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepository: Repository<ProjectUserMapping>,
    private readonly cronLogService: CronLogsService,
    private readonly configService: CustomConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.enabled =
      this.configService.get('OFFICE_USE_REMINDER_CRON') === 'true';
  }

  // Runs every day at 8:00 AM IST
  // Cron expression: minute hour day month dayOfWeek
  // '10 17 * * *' = 17:10 IST (5:10 PM)
  @Cron('00 08 * * *', { timeZone: 'Asia/Kolkata' })
  async handleOfficeUseReminder() {
    await this.executeOfficeUseReminder();
  }

  /**
   * Public method to manually trigger the office use reminder cron.
   * Can be called from a controller or test script.
   */
  async executeOfficeUseReminder() {
    logger.info('OfficeUseReminderCron: Job started...');
    if (!this.enabled) {
      logger.info(
        'Crons are disabled. Skipping execution. You can enable them via the OFFICE_USE_REMINDER_CRON config.',
      );
      return;
    }

    const startTime = new Date();
    const cronExecutionLog = this.createCronLog(startTime);

    try {
      const bookings = await this.fetchPendingBookings();
      if (!bookings || bookings.length === 0) {
        await this.logNoBookingsFound(cronExecutionLog, startTime);
        return;
      }

      logger.info(
        `Found ${bookings.length} bookings requiring office use reminder`,
      );

      const bookingsByRm = await this.groupBookingsByRm(bookings);
      await this.sendEmailsToRms(bookingsByRm);

      const bookingsByTl = await this.groupBookingsByTl(bookings, bookingsByRm);
      await this.sendEmailsToTls(bookingsByTl);

      this.logSuccess(
        cronExecutionLog,
        startTime,
        bookingsByRm.size + bookingsByTl.size,
      );
    } catch (error) {
      this.logError(cronExecutionLog, startTime, error);
    }

    await this.cronLogService.saveLog(cronExecutionLog);
  }

  private createCronLog(startTime: Date): Partial<CronLog> {
    return {
      cronType: this.cronType,
      cronName: 'Office Use Reminder',
      startTime,
      status: CronStatus.PASS,
      description: 'Office use reminder cron started successfully',
    };
  }

  private async fetchPendingBookings(): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: {
        bookingFormStatus: In([
          BookingFormStatusEnum.SIGNED_OFFLINE,
          BookingFormStatusEnum.SIGNED,
        ]),
        officeUsePdf: IsNull(),
      },
      relations: ['closingRm'],
      select: [
        'id',
        'opportunityId',
        'enquiryId',
        'projectId',
        'signedPdf',
        'formSignedAt',
        'applicant1',
        'unitDetails',
        'otherDetails',
        'referrerDetails',
        'closingRm',
      ],
    });
  }

  private async logNoBookingsFound(
    cronExecutionLog: Partial<CronLog>,
    startTime: Date,
  ): Promise<void> {
    logger.info('No bookings found requiring office use reminder');
    cronExecutionLog.description =
      'No bookings found requiring office use reminder';
    cronExecutionLog.status = CronStatus.PASS;
    cronExecutionLog.endTime = new Date();
    cronExecutionLog.durationMs =
      cronExecutionLog.endTime.getTime() - startTime.getTime();
    await this.cronLogService.saveLog(cronExecutionLog);
  }

  private async groupBookingsByRm(
    bookings: Booking[],
  ): Promise<Map<number, BookingReminderData[]>> {
    const bookingsByRm = new Map<number, BookingReminderData[]>();

    for (const booking of bookings) {
      const { closingRmId } = await this.resolveClosingRm(booking);
      if (!closingRmId) {
        continue;
      }

      const reminderData = await this.prepareBookingReminderData(booking);
      this.addBookingToGroup(bookingsByRm, closingRmId, reminderData);
    }

    // Fetch all RM names in bulk and update reminder data
    await this.updateRmNamesInReminderData(bookingsByRm);

    return bookingsByRm;
  }

  private async resolveClosingRm(booking: Booking): Promise<{
    closingRmId: number | null;
    officeUse: BookingOfficeUse | null;
  }> {
    if (booking.closingRm?.id) {
      const officeUse = await this.fetchOfficeUseForPrimarySource(
        booking.opportunityId,
      );
      return { closingRmId: booking.closingRm.id, officeUse };
    }

    const officeUse = await this.bookingOfficeUseRepository.findOne({
      where: { opportunityId: booking.opportunityId },
      select: ['closingRmId', 'primarySource'],
    });

    if (!officeUse?.closingRmId) {
      logger.warn(
        `No closing_rm_id found for booking ${booking.opportunityId}`,
      );
      return { closingRmId: null, officeUse: null };
    }

    return { closingRmId: officeUse.closingRmId, officeUse };
  }

  private async fetchOfficeUseForPrimarySource(
    opportunityId: string,
  ): Promise<BookingOfficeUse | null> {
    return this.bookingOfficeUseRepository.findOne({
      where: { opportunityId },
      select: ['primarySource'],
    });
  }

  private addBookingToGroup(
    bookingsByRm: Map<number, BookingReminderData[]>,
    closingRmId: number,
    reminderData: BookingReminderData,
  ): void {
    if (!bookingsByRm.has(closingRmId)) {
      bookingsByRm.set(closingRmId, []);
    }
    bookingsByRm.get(closingRmId)?.push(reminderData);
  }

  private async updateRmNamesInReminderData(
    bookingsByRm: Map<number, BookingReminderData[]>,
  ): Promise<void> {
    // Get all unique RM IDs
    const rmIds = Array.from(bookingsByRm.keys());

    if (rmIds.length === 0) {
      return;
    }

    // Fetch all RM names in one query
    const rms = await this.usersRepository.find({
      where: { id: In(rmIds) },
      select: ['id', 'name'],
    });

    // Create a map of RM ID to RM name
    const rmNameMap = new Map<number, string>();
    for (const rm of rms) {
      rmNameMap.set(rm.id, rm.name || 'N/A');
    }

    // Update all reminder data with correct RM names
    for (const [rmId, reminderDataList] of bookingsByRm.entries()) {
      const rmName = rmNameMap.get(rmId) || 'N/A';
      for (const reminderData of reminderDataList) {
        reminderData.closingRmName = rmName;
      }
    }
  }

  private async sendEmailsToRms(
    bookingsByRm: Map<number, BookingReminderData[]>,
  ): Promise<void> {
    const emailPromises: Promise<void>[] = [];

    for (const [rmId, bookingData] of bookingsByRm.entries()) {
      const rm = await this.usersRepository.findOne({
        where: { id: rmId },
        select: ['id', 'name', 'email'],
      });

      if (!rm?.email) {
        logger.warn(`RM with id ${rmId} not found or has no email`);
        continue;
      }

      emailPromises.push(
        this.sendReminderEmail(rm.email, rm.name, bookingData),
      );
    }

    await Promise.all(emailPromises);
  }

  private async groupBookingsByTl(
    bookings: Booking[],
    bookingsByRm: Map<number, BookingReminderData[]>,
  ): Promise<Map<number, BookingReminderData[]>> {
    const reminderDataByOpportunityId =
      this.buildReminderDataLookup(bookingsByRm);

    const projectIds = [
      ...new Set(
        bookings
          .filter(
            (b) =>
              b.projectId && reminderDataByOpportunityId.has(b.opportunityId),
          )
          .map((b) => b.projectId),
      ),
    ];

    if (projectIds.length === 0) {
      return new Map();
    }

    const tlMappings = await this.projectUserMappingRepository.find({
      where: {
        project: { id: In(projectIds) },
        role: RolesEnum.SALES_TL,
        removedAt: IsNull(),
      },
      relations: ['user', 'project'],
    });

    if (tlMappings.length === 0) {
      return new Map();
    }

    const tlsByProjectId = this.buildTlsByProjectIdMap(tlMappings);
    return this.buildBookingsByTlMap(
      bookings,
      reminderDataByOpportunityId,
      tlsByProjectId,
    );
  }

  private buildReminderDataLookup(
    bookingsByRm: Map<number, BookingReminderData[]>,
  ): Map<string, BookingReminderData> {
    const lookup = new Map<string, BookingReminderData>();
    for (const reminderDataList of bookingsByRm.values()) {
      for (const reminderData of reminderDataList) {
        lookup.set(reminderData.opportunityId, reminderData);
      }
    }
    return lookup;
  }

  private buildTlsByProjectIdMap(
    tlMappings: ProjectUserMapping[],
  ): Map<number, number[]> {
    const tlsByProjectId = new Map<number, number[]>();
    for (const mapping of tlMappings) {
      const projectId = mapping.project.id;
      const tlId = mapping.user.id;
      const existing = tlsByProjectId.get(projectId);
      if (existing) {
        existing.push(tlId);
      } else {
        tlsByProjectId.set(projectId, [tlId]);
      }
    }
    return tlsByProjectId;
  }

  private buildBookingsByTlMap(
    bookings: Booking[],
    reminderDataByOpportunityId: Map<string, BookingReminderData>,
    tlsByProjectId: Map<number, number[]>,
  ): Map<number, BookingReminderData[]> {
    const bookingsByTl = new Map<number, BookingReminderData[]>();
    for (const booking of bookings) {
      const reminderData = reminderDataByOpportunityId.get(
        booking.opportunityId,
      );
      if (!booking.projectId || !reminderData) {
        continue;
      }

      const tlIds = tlsByProjectId.get(booking.projectId) || [];
      for (const tlId of tlIds) {
        const tlBookings = bookingsByTl.get(tlId);
        if (tlBookings) {
          tlBookings.push(reminderData);
        } else {
          bookingsByTl.set(tlId, [reminderData]);
        }
      }
    }
    return bookingsByTl;
  }

  private async sendEmailsToTls(
    bookingsByTl: Map<number, BookingReminderData[]>,
  ): Promise<void> {
    const emailPromises: Promise<void>[] = [];

    for (const [tlId, bookingData] of bookingsByTl.entries()) {
      const tl = await this.usersRepository.findOne({
        where: { id: tlId },
        select: ['id', 'name', 'email'],
      });

      if (!tl?.email) {
        logger.warn(`TL with id ${tlId} not found or has no email`);
        continue;
      }

      emailPromises.push(
        this.sendReminderEmail(tl.email, tl.name, bookingData),
      );
    }

    await Promise.all(emailPromises);
  }

  private logSuccess(
    cronExecutionLog: Partial<CronLog>,
    startTime: Date,
    emailsSent: number,
  ): void {
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    logger.info(
      `OfficeUseReminderCron: Job completed in ${durationMs}ms. Sent ${emailsSent} reminder emails.`,
    );

    cronExecutionLog.endTime = endTime;
    cronExecutionLog.durationMs = durationMs;
    cronExecutionLog.description = `Successfully sent ${emailsSent} reminder emails`;
    cronExecutionLog.status = CronStatus.PASS;
  }

  private logError(
    cronExecutionLog: Partial<CronLog>,
    startTime: Date,
    error: any,
  ): void {
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    logger.error('OfficeUseReminderCron: Job failed', error);

    cronExecutionLog.endTime = endTime;
    cronExecutionLog.durationMs = durationMs;
    cronExecutionLog.status = CronStatus.FAIL;
    cronExecutionLog.description = `Error: ${error.message}`;
  }

  private async prepareBookingReminderData(
    booking: Booking,
  ): Promise<BookingReminderData> {
    // Decrypt booking applicants to access personalDetails
    const decryptedBooking = await decryptBookingApplicants(booking);

    const salesPortalUrl = this.configService.get<string>('SALES_PORTAL_URL');
    const opportunityId = booking.opportunityId;

    // Extract project name and unit number from unitDetails
    const unitDetails = booking.unitDetails || {};
    const projectName = safeString(unitDetails.projectName, 'N/A');
    const unitNumber = safeString(unitDetails.unitNumber, 'N/A');

    // Extract first applicant name from decrypted booking
    const applicant1 = decryptedBooking?.applicant1 || {};
    const personalDetails = applicant1.personalDetails || {};
    const firstName = safeString(personalDetails.firstName);
    const lastName = safeString(personalDetails.lastName);
    const firstApplicantName = `${firstName} ${lastName}`.trim() || 'N/A';

    // Enquiry ID
    const enquiryId = booking.enquiryId || 'N/A';

    // Closing RM name (will be set later in updateRmNamesInReminderData)
    const closingRmName = 'N/A'; // Placeholder, will be updated after fetching RM names

    // Booking form PDF link
    const bookingFormPdfLink = booking.signedPdf
      ? getS3Url(this.configService as any, booking.signedPdf)
      : 'N/A';

    // Booking form signed date
    const bookingFormSignedDate = booking.formSignedAt
      ? format(booking.formSignedAt, 'dd/MM/yyyy')
      : 'N/A';

    // Office Use update link
    const updateOfficeUseLink = `${salesPortalUrl}/rm-panel/bookings/post-booking-form/${opportunityId}`;

    // Determine if Privilege Lead
    // primarySource is stored in booking_office_use table
    const primarySource = booking?.unitDetails?.primarySource || '';

    // Referrer Form link (only if Privilege lead)
    let referrerFormLink: string | undefined;
    if (
      primarySource === PrimarySourceEnum.PURVA_PRIVILEGE ||
      primarySource === PrimarySourceEnum.PROVIDENT_PREMIER
    ) {
      try {
        const brandName = unitDetails.projectBrandName || '';
        // Access the underlying ConfigService from CustomConfigService
        const configService = (this.configService as any).configService;
        const configOptions = getConfigOptionsByFormType(
          FormType.REFERRAL,
          configService,
        );
        referrerFormLink = getFormUrl(
          FormType.REFERRAL,
          brandName,
          opportunityId,
          configOptions,
        );
      } catch (error) {
        logger.error(
          `Failed to generate referrer form URL for booking ${opportunityId}:`,
          error,
        );
        // Continue without referrer form link if generation fails
      }
    }

    return {
      projectName,
      unitNumber,
      firstApplicantName,
      enquiryId,
      closingRmName,
      bookingFormPdfLink,
      bookingFormSignedDate,
      referrerFormLink,
      updateOfficeUseLink,
      opportunityId,
    };
  }

  private async sendReminderEmail(
    rmEmail: string,
    rmName: string,
    bookings: BookingReminderData[],
  ): Promise<void> {
    try {
      // Build HTML table for bookings
      const tableRows = bookings
        .map((booking) => {
          const referrerFormCell = booking.referrerFormLink
            ? `<a href="${booking.referrerFormLink}" target="_blank">Referrer Form - Link</a>`
            : '-';

          const bookingFormPdfCell =
            booking.bookingFormPdfLink && booking.bookingFormPdfLink !== 'N/A'
              ? `<a href="${booking.bookingFormPdfLink}" target="_blank">Link</a>`
              : '-';

          return `
            <tr>
              <td>${this.escapeHtml(booking.projectName)}</td>
              <td>${this.escapeHtml(booking.unitNumber)}</td>
              <td>${this.escapeHtml(booking.firstApplicantName)}</td>
              <td>${this.escapeHtml(booking.enquiryId)}</td>
              <td>${this.escapeHtml(booking.closingRmName)}</td>
              <td>${bookingFormPdfCell}</td>
              <td>${booking.bookingFormSignedDate}</td>
              <td>${referrerFormCell}</td>
              <td>Update Now - <a href="${booking.updateOfficeUseLink}" target="_blank">Link</a></td>
            </tr>
          `;
        })
        .join('');

      const tableHtml = `
        <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th>Project Name</th>
              <th>Unit Number</th>
              <th>First Applicant's Name</th>
              <th>Enquiry ID</th>
              <th>Closing RM</th>
              <th>Booking Form PDF with Cx Sign</th>
              <th>Booking form Signed date</th>
              <th>Referrer Form</th>
              <th>Update Office Use</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;

      // Prepare email variables
      const emailVariables: Record<string, string> = {
        BOOKINGS_TABLE: tableHtml,
      };

      // Send email via event emitter
      await this.eventEmitter.emitAsync(
        EventMessagesEnum.COMPOSE_EMAIL,
        new ComposeEmailEvent(
          ComposeEmailsEnum.OFFICE_USE_REMINDER,
          emailVariables,
          'Puravankara', // Default brand
          { to: [rmEmail] },
        ),
      );

      logger.info(
        `Office use reminder email sent to ${rmEmail} for ${bookings.length} bookings`,
      );
    } catch (error) {
      logger.error(
        `Failed to send office use reminder email to ${rmEmail}:`,
        error,
      );
      throw error;
    }
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replaceAll(/[&<>"']/g, (m) => map[m]);
  }
}
