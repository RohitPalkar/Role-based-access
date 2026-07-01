/* eslint-disable complexity */
import {
  BadRequestException,
  Body,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Booking } from './entities/booking.entity';
import { In, Repository, EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  AgreedOnTermsDto,
  BookingApplicantDto,
  DeleteBookingPaymentsDto,
  DocumentReviewDto,
  OtherDetailsDto,
  PaymentDetailsDto,
  ResetBookingDto,
  SubmitApplicationDto,
  UnitDetailsDto,
} from './dto/update-booking.dto';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { LeegalityService } from '../leegality/leegality.service';
import { ConfigService } from '@nestjs/config';
import {
  AmendmentStatus,
  AmountAdjustmentEnum,
  BookingFormStatusEnum,
  FormType,
  LegalGuardianEnum,
  MultiBookingStatusEnum,
  OccupationEnum,
  VoucherBookingStatusEnum,
} from '../../enums/booking-form-status.enum';
import { logger } from '../../logger/logger';
import { ReferralsService } from '../referrals/referrals.service';
import {
  INDIAN_COUNTRY_CODE,
  SUCCESS,
  DISPLAY_DATE_FORMAT,
  BRAND_PURAVANKARA,
  REFERRAL_FORM_URL,
  KVN_GROUP_LOGO_FILENAME,
} from 'src/config/constants';
import { SfdcService } from '../sfdc/sfdc.service';
import { ProjectTermsService } from '../project_terms/project_terms.service';
import { generateRandomNumber } from 'src/utils';
import { ReferrerDto } from './dto/update-referrer.dto';
import { PdfService } from '../pdf/pdf.service';
import { BookingDocumentsService } from '../booking_documents/booking_documents.service';
import {
  BookingDocTypeEnum,
  BookingPDFTypeEnum,
  BookingStageEnum,
} from 'src/enums/booking-documents.enum';
import { BookingOfficeUse } from './entities/booking_office_use.entity';
import { PrimarySourceEnum } from 'src/enums/primary-sources.enum';
import * as fs from 'fs/promises';
import { omit } from 'lodash';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
} from 'src/enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';
import {
  encryptBookingApplicants,
  decryptBookingApplicants,
} from 'src/utils/encryption-decryption.util';
import { getBookingFileName } from 'src/utils/getBookingFileName';
import {
  BookingPayment,
  MultiBooking,
  GroupBookingMapping,
  Users,
  VoucherPayment,
} from 'src/entities';
import {
  attachFullAddress,
  extractAllUserIds,
  generateFormUrlByType,
  getS3Url,
  mergeNested,
  updateInvitee,
  validateDuplicateContactDetails,
} from 'src/helpers/bookings.helper';
import { BookingAsEnum } from 'src/enums/booking-as.enum';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import {
  REQUIRED_DOCS_BY_BOOKING_AS,
  UpdateCompanyDocumentsDto,
} from './dto/update-company-documents.dto';
import {
  PaymentModeEnum,
  PaymentTxStatusEnum,
} from 'src/enums/payment-status.enum';
import { UpdateSignatoryDto } from './dto/update-corporate-applicant.dto';
import { UpdateCompanyDetailsDto } from './dto/update-company-details.dto';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { SameAddressEnum } from 'src/enums/same-address.enum';
import { ApplicantMappingDto } from './dto/applicant-mapping.dto';
import { WsPublisherService } from '../ws_publisher/ws_publisher.service';
import { MapVoucherApplicantsDto } from './dto/map-voucher-applicants.dto';
import { VoucherForm } from '../eoi_manager/voucher_forms/entities/voucher_form.entity';
import { PushApplicantDataDto } from './dto/push-applicant-data.dto';
import { EoiCampaignStageType } from 'src/enums/eoi-form.enums';
import { calculateAgreementTotalAmount } from 'src/utils/getAgreementValue';
import { BatchService } from '../eoi_manager/batch_manager/batch.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(VoucherForm)
    private readonly voucherRepository: Repository<VoucherForm>,
    @InjectRepository(VoucherPayment)
    private readonly voucherPaymentRepository: Repository<VoucherPayment>,

    @InjectRepository(BookingOfficeUse)
    private readonly officeUseRepository: Repository<BookingOfficeUse>,

    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    @InjectRepository(MultiBooking)
    private readonly multiBookingRepository: Repository<MultiBooking>,

    @InjectRepository(GroupBookingMapping)
    private readonly groupBookingMappingRepository: Repository<GroupBookingMapping>,

    @InjectRepository(BookingPayment)
    private readonly BookingPaymentRepository: Repository<BookingPayment>,

    private readonly leegalityService: LeegalityService,
    private readonly configService: ConfigService,
    private readonly referralsService: ReferralsService,
    private readonly sfdcService: SfdcService,
    private readonly projectTermsService: ProjectTermsService,
    private readonly bookingDocumentsService: BookingDocumentsService,
    private readonly pdfService: PdfService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER)
    private readonly cacheService: Cache,
    private readonly wsPublisherService: WsPublisherService,
    private readonly batchService: BatchService,
  ) {}

  //Get Booking Details using opportunity Id
  async getBookingByOppId(
    oppId: string,
    includeRelations: boolean = false,
  ): Promise<any> {
    logger.info(`getBookingByOppId service called: ${oppId}`);

    const booking = await this.fetchBooking(oppId, includeRelations);
    if (booking?.unitDetails) {
      const totalAgreementValue = booking?.unitDetails?.totalAgreementValue;
      const agreementPercentage = booking?.project?.agreementPercentage ?? 0;
      booking.unitDetails.agreementPercentage = agreementPercentage;
      booking.unitDetails.ninePercentOfAV =
        totalAgreementValue != null
          ? calculateAgreementTotalAmount(
              totalAgreementValue,
              agreementPercentage,
            )
          : null;
    }

    const decryptedBooking = await decryptBookingApplicants(booking);
    const isPhysicalDocSubmitted = this.checkPhysicalDocs(decryptedBooking);

    let groupPayments: BookingPayment[] | undefined;
    let remainingAmount: number | undefined;
    let voucherPayments: VoucherPayment[] = [];

    if (decryptedBooking.groupId) {
      const groupDetails = await this.fetchGroupPayments(
        decryptedBooking.groupId,
      );
      groupPayments = groupDetails.groupPayments;
      remainingAmount = groupDetails.remainingAmount;
    }

    if (decryptedBooking.voucherId) {
      voucherPayments = await this.voucherPaymentRepository.find({
        where: { voucher: { id: decryptedBooking.voucherId } },
        order: { createdAt: 'ASC' },
      });
    }

    return {
      message: 'Booking Details fetched successfully.',
      data: {
        ...decryptedBooking,
        availableGateways: decryptedBooking?.project?.availableGateways || null,
        isPhysicalDocSubmitted,
        groupPayments,
        remainingAmount,
        voucherPayments,
      },
    };
  }

  private async fetchGroupPayments(groupId: string): Promise<{
    groupPayments: BookingPayment[];
    remainingAmount: number | undefined;
  }> {
    logger.info(`fetchGroupPayments service called: ${groupId}`);
    const groupRow = await this.multiBookingRepository.findOne({
      where: { id: groupId, paymentMethod: AmountAdjustmentEnum.LUMPSUM },
    });

    if (!groupRow) {
      logger.info(`fetchGroupPayments: no groupRow found for ${groupId}`);
      return { groupPayments: [], remainingAmount: 0 };
    }

    logger.info(
      `fetchGroupPayments: groupRow found ${groupId}, amount=${groupRow.amount}`,
    );
    // Fetch opportunity IDs from mappings table
    const mappings = await this.groupBookingMappingRepository.find({
      where: { group_id: groupId, is_deleted: 0 },
      select: ['opportunity_id'],
    });

    if (!mappings?.length) {
      logger.info(
        `fetchGroupPayments: no mappings found for groupId ${groupId}`,
      );
      return { groupPayments: [], remainingAmount: Number(groupRow?.amount) };
    }

    const oppIds: string[] = mappings.map((m) => m.opportunity_id);

    const groupPayments =
      await this.BookingPaymentRepository.createQueryBuilder('payment')
        .innerJoin('payment.booking', 'booking')
        .where('booking.opportunityId IN (:...oppIds)', { oppIds })
        .getMany();

    const remainingAmount =
      Number(groupRow.amount) -
      (groupPayments.reduce(
        (acc, payment) => acc + Number(payment.paidAmount),
        0,
      ) || 0);

    return {
      groupPayments,
      remainingAmount: Math.max(0, remainingAmount),
    };
  }

  private async fetchBooking(
    oppId: string,
    includeRelations: boolean,
  ): Promise<Booking> {
    let booking: Booking | null;

    if (includeRelations) {
      booking = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.payments', 'payments')
        .leftJoinAndSelect('booking.closingRm', 'closingRm')
        .leftJoinAndSelect('booking.campaign', 'campaign')
        .leftJoinAndSelect('booking.voucher', 'voucher')
        .leftJoinAndSelect('booking.project', 'project')
        .leftJoinAndSelect('project.brand', 'brand')
        .select([
          'booking',
          'payments',
          'closingRm.id',
          'closingRm.name',
          'closingRm.email',
          'voucher.id',
          'voucher.voucherId',
          'campaign.id',
          'campaign.campaignName',
          'campaign.stage',
          'project.availableGateways',
          'project.jvPartnerLogo',
          'project.agreementPercentage',
          'brand.logo',
        ])
        .where('booking.opportunityId = :oppId', { oppId })
        .getOne();
    } else {
      booking = await this.bookingRepository.findOne({
        where: { opportunityId: oppId },
      });
    }

    if (!booking) {
      logger.info(`fetchBooking: booking not found for ${oppId}`);
      throw new NotFoundException(
        `Booking with Opportunity "${oppId}" not found`,
      );
    }

    return booking;
  }

  //Get Booking PDF using opportunity Id and mark booking form as signed offline
  async getBookingPDF(oppId: string): Promise<any> {
    logger.info(`getBookingPDF service called: ${oppId}`);
    try {
      // fetch booking details
      const { data: booking } = await this.getBookingByOppId(oppId, true);
      logger.info(`getBookingPDF: booking data fetched for ${oppId}`);

      // Fetch the filename
      const fileName = getBookingFileName(booking, oppId);

      // Update booking status if it is signed offline
      await this.bookingRepository.update(
        { opportunityId: oppId },
        {
          isCompleted: true,
          bookingFormStatus: BookingFormStatusEnum.SIGNED_OFFLINE,
          formSignedAt: new Date(),
        },
      );

      // Update Group status
      if (booking?.groupId) {
        await this.updateGroupStatus(booking?.groupId);
      }
      // Generate the form url
      const formUrl = generateFormUrlByType(
        FormType.BOOKING,
        booking?.unitDetails?.projectBrandName,
        oppId,
        this.configService,
      );
      const unsignedPdfUrl = getS3Url(this.configService, booking?.unsignedPdf);

      // Send the mail to RM
      this.sendSignedBookingEmailToRM({
        opportunityId: oppId,
        signedPdfUrl: unsignedPdfUrl,
        formUrl,
        booking,
        officeUseSectionUrl: `${this.configService.get<string>('SALES_PORTAL_URL')}/rm-panel/bookings/post-booking-form/${oppId}`,
        brandName: booking?.unitDetails?.projectBrandName ?? BRAND_PURAVANKARA,
        updatedBookingStatus: BookingFormStatusEnum.SIGNED_OFFLINE,
      });

      return {
        message: 'Booking Pdf fetched successfully.',
        data: {
          opportunityId: oppId,
          fileName,
          unsignedPdf: booking?.unsignedPdf,
        },
      };
    } catch (error) {
      logger.error('Error exporting user bookings:', error);
      logsAndErrorHandling('bookingService - getBookingPdf', error, { oppId });
    }
  }

  //Get opportunity Details from SFDC API
  async getOpportunityDetailById(
    oppId: string,
    isRefresh?: boolean,
  ): Promise<any> {
    logger.info(`getOpportunityDetailById service called: ${oppId}`);
    const oppData = await this.sfdcService.getOpportunityDetail(
      oppId,
      isRefresh,
    );
    // Extract all SFDC userIds
    const userFields = [
      'Project_Head',
      'PreSalesHeadName',
      'PreSales2Name',
      'PreSales1NameEMPNo',
      'Loyalty_Team',
      'businessHeadName',
    ];

    const sfdcUserIds = extractAllUserIds(oppData?.data, userFields);
    //Fetch all user data

    const users = await this.usersRepository.find({
      where: { userId: In(sfdcUserIds) },
      select: ['id', 'userId', 'signatureImage'],
    });

    // Create a map for quick lookup
    const userMap = new Map(users.map((u) => [u.userId, u]));

    // Step 4: Patch salesTeam
    if (Array.isArray(oppData?.data?.salesTeam)) {
      oppData?.data?.salesTeam.forEach((member) => {
        ['rmName', 'tlName', 'rshName'].forEach((role) => {
          const userObj = member[role];
          if (userObj?.userId && userMap.has(userObj.userId)) {
            const userDetails = userMap.get(userObj.userId);
            userObj.id = userDetails.id;
            userObj.signatureImage = userDetails.signatureImage;
          }
        });
      });
    }

    // Patch individual user fields
    userFields.forEach((field) => {
      const userObj = oppData?.data[field];
      if (userObj?.userId && userMap.has(userObj.userId)) {
        const userDetails = userMap.get(userObj.userId);
        userObj.id = userDetails.id;
        userObj.signatureImage = userDetails.signatureImage;
      }
    });
    return oppData;
  }

  //To update booking applicant data
  async updateBookingApplicant(
    opportunityId: string,
    applicantDto: BookingApplicantDto,
  ): Promise<any> {
    try {
      const oppId = applicantDto.opportunityId ?? opportunityId;
      if (!oppId) {
        throw new BadRequestException('opportunityId is required');
      }

      logger.info(`updateBookingApplicant service called: ${oppId}`);

      const { data: booking } = await this.getBookingByOppId(oppId);
      if (booking?.isCompleted)
        throw new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        );

      const applicantNumber = applicantDto?.applicantNumber ?? 1;
      const applicantKey = `applicant${applicantNumber}`;

      const contactDetails = applicantDto?.contactDetails;
      const contactNumber = contactDetails?.contactNumber ?? null;
      const emailAddress = contactDetails?.emailAddress ?? null;
      const countryCode = contactDetails?.countryCode ?? null;

      validateDuplicateContactDetails(
        applicantNumber,
        booking,
        contactNumber,
        emailAddress,
        countryCode,
      );

      // Address mirroring
      if (
        contactDetails?.isSameAddress == SameAddressEnum.YES &&
        contactDetails?.permanentAddress
      ) {
        applicantDto = {
          ...applicantDto,
          contactDetails: {
            ...contactDetails,
            communicationAddress: { ...contactDetails.permanentAddress },
          },
        };
      }

      const updateData: QueryDeepPartialEntity<Booking> = {
        [applicantKey]: {
          ...(booking[applicantKey] || {}),
          hasContinuedAsMinor: applicantDto?.hasContinuedAsMinor || false,
        },
        noOfApplicants: Math.max(booking.noOfApplicants || 0, applicantNumber),
      };

      if (applicantDto.personalDetails) {
        updateData[applicantKey].personalDetails = mergeNested(
          booking[applicantKey]?.personalDetails,
          applicantDto.personalDetails,
        );
      }

      if (applicantDto?.contactDetails) {
        applicantDto.contactDetails = attachFullAddress(
          applicantDto.contactDetails,
        );

        updateData[applicantKey].contactDetails = mergeNested(
          booking[applicantKey]?.contactDetails,
          applicantDto.contactDetails,
        );
      }

      if (applicantDto?.professionalDetails) {
        updateData[applicantKey].professionalDetails =
          booking[applicantKey]?.professionalDetails?.occupation ===
          applicantDto.professionalDetails?.occupation
            ? mergeNested(
                booking[applicantKey]?.professionalDetails,
                applicantDto.professionalDetails,
              )
            : applicantDto.professionalDetails;
      }

      if (applicantDto?.lastStep !== undefined) {
        updateData.lastStep = applicantDto.lastStep;
      }

      // If applicant is minor, remove professional details
      if (applicantDto?.hasContinuedAsMinor) {
        delete updateData[applicantKey].professionalDetails;
      }

      /**
       * If first applicant is minor and guardian is needed,
       * then move first applicant data to second applicant and
       * clear first applicant data
       */
      if (
        applicantDto?.isGuardianNeeded &&
        applicantNumber == 1 &&
        booking.applicant2 == null
      ) {
        updateData.applicant2 = updateData.applicant1;
        updateData.applicant1 = null;
        updateData.noOfApplicants = 2;
      }

      // Encrypt personalDetails before saving to database
      const encryptedData = await encryptBookingApplicants(updateData);

      await this.bookingRepository.update(
        { opportunityId: oppId },
        encryptedData,
      );

      return {
        message: 'Applicant details updated successfully.',
        data: updateData,
      };
    } catch (error) {
      logger.error('Error updating Individual applicant details: ', error);
      logsAndErrorHandling('delete-applicant-signatory', error, {
        opportunityId,
        applicantDto,
      });
    }
  }

  //To update booking other details
  async updateOtherDetails(
    opportunityId: string,
    otherDetails: OtherDetailsDto,
  ): Promise<any> {
    try {
      logger.info(`updateOtherDetails service called: ${opportunityId}`);
      const { data: booking } = await this.getBookingByOppId(opportunityId);
      if (!booking) throw new NotFoundException('Booking not found.');

      if (booking?.isCompleted)
        throw new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        );

      const { lastStep, ...cleanedOtherDetails } = otherDetails;
      delete cleanedOtherDetails.saveForLater;
      const updateData: Partial<Booking> = {
        otherDetails: cleanedOtherDetails,
        ...(lastStep && { lastStep }),
      };

      await this.bookingRepository.update({ opportunityId }, updateData);
      return {
        message: 'Other details updated successfully.',
        data: otherDetails,
      };
    } catch (error) {
      logger.error(error);
      logsAndErrorHandling('bookingService - updateOtherDetails', error, {
        opportunityId,
        otherDetails,
      });
    }
  }

  //To update booking unit details
  async updateUnitDetails(unitDetails: UnitDetailsDto): Promise<any> {
    try {
      const { opportunityId, lastStep, bookingAs, ...cleanedUnitDetails } =
        unitDetails;
      logger.info(`updateUnitDetails service called: ${opportunityId}`);
      const { data: booking } = await this.getBookingByOppId(opportunityId);
      if (!booking) throw new NotFoundException('Booking not found.');
      if (booking?.isCompleted)
        throw new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        );

      delete cleanedUnitDetails.saveForLater;
      const updateData: Partial<Booking> = {
        unitDetails: cleanedUnitDetails,
        bookingAs: bookingAs ?? booking.bookingAs,
        ...(lastStep && { lastStep }),
      };

      await this.bookingRepository.update({ opportunityId }, updateData);
      return {
        message: 'Unit details updated successfully.',
        data: unitDetails,
      };
    } catch (error) {
      logger.error(error);
      logsAndErrorHandling('bookingService - updateUnitDetails', error, {
        unitDetails,
      });
    }
  }

  //To update booking unit details
  async updatePaymentDetails(
    paymentDetailsDto: PaymentDetailsDto,
  ): Promise<any> {
    try {
      const {
        opportunityId,
        lastStep,
        amount,
        payments = [],
        isNinePercentAgreement,
        ...restDetails
      } = paymentDetailsDto;
      logger.info(`updatePaymentDetails service called: ${opportunityId}`);

      const { data: booking } = await this.getBookingByOppId(
        opportunityId,
        true,
      );
      logger.info('Booking fetched for payment update:', booking);
      if (!booking) throw new NotFoundException('Booking not found.');
      if (booking?.isCompleted) {
        throw new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        );
      }

      // Keep old gateway payments + new non-gateway ones
      const existingGatewayTx = booking?.payments?.filter(
        (tx) => tx?.paymentMode === PaymentModeEnum.GATEWAY,
      );
      const nonGatewayTx = payments?.filter(
        (tx) => tx?.paymentMode !== PaymentModeEnum.GATEWAY,
      );
      const mergedTransactions = [
        ...(existingGatewayTx || []),
        ...nonGatewayTx,
      ];

      // Calculate total paid amount
      const totalAmount = mergedTransactions.reduce(
        (sum, tx) => sum + Number(tx?.paidAmount || 0),
        0,
      );
      logger.info('Total amount calculated:', totalAmount);

      // Prepare cleaned details (remove saveForLater)
      const cleanedPaymentDetails: any = {
        amount,
        ...restDetails,
      };

      // Transaction
      await this.bookingRepository.manager.transaction(async (manager) => {
        logger.info('Transaction started for payment update');
        // Step 1: Upsert booking payments
        const paymentsToUpsert = nonGatewayTx.map((tx) => ({
          id: tx?.id ?? undefined,
          booking: { id: booking?.id },
          paymentMode: tx?.paymentMode ?? null,
          paidAmount: tx?.paidAmount ?? 0,
          paymentDate: tx?.paymentDate ?? new Date(),
          status: tx?.status ?? PaymentTxStatusEnum.UNVERIFIED,
          paymentDetails: {
            ...tx?.paymentDetails,
            paymentProof: tx?.paymentProof || [],
            isPhysicalPaymentProof: tx?.isPhysicalPaymentProof || false,
          } as any,
        }));

        if (paymentsToUpsert.length > 0) {
          logger.info('Upserting payments:', paymentsToUpsert);
          await manager.upsert(BookingPayment, paymentsToUpsert, {
            conflictPaths: ['id', 'booking'],
            skipUpdateIfNoValuesChanged: true,
          });
        }

        // Step 2: Update booking with payment details and lastStep
        await manager.update(
          Booking,
          { opportunityId },
          {
            paymentDetails: cleanedPaymentDetails,
            isNinePercentAgreement,
            ...(lastStep && { lastStep }),
          },
        );
        logger.info('Booking updated with payment details');
      });

      return {
        message: 'Payment details updated successfully.',
        data: {
          ...paymentDetailsDto,
          totalPaidAmount: totalAmount,
        },
      };
    } catch (error) {
      logger.error('Error updating payment details:', error);
      logsAndErrorHandling('bookingService - updatePaymentDetails', error, {
        paymentDetailsDto,
      });
    }
  }

  //To update booking document comment
  async updateDocumentComment(documentReview: DocumentReviewDto): Promise<any> {
    try {
      const { opportunityId, lastStep, documentsNote, bookingAs } =
        documentReview;
      logger.info(`updateDocumentComment service called: ${opportunityId}`);
      const { data: booking } = await this.getBookingByOppId(opportunityId);
      if (!booking) throw new NotFoundException('Booking not found.');
      if (booking?.isCompleted)
        throw new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        );

      const updateData: Partial<Booking> = {
        lastStep: lastStep,
        documentsNote: documentsNote,
        bookingAs: bookingAs ?? booking.bookingAs,
      };
      logger.info(
        `updateDocumentComment: updating booking for ${opportunityId}`,
      );
      await this.bookingRepository.update({ opportunityId }, updateData);
      logger.info(
        `updateDocumentComment: update complete for ${opportunityId}`,
      );
      return {
        message: 'Comment updated successfully.',
        data: documentReview,
      };
    } catch (error) {
      logger.error(error);
      logsAndErrorHandling('bookingService - updateDocumentComment', error, {
        documentReview,
      });
    }
  }

  //To Agree to terms and conditions
  async agreedOnTerms(termsDetails: AgreedOnTermsDto): Promise<any> {
    try {
      const { opportunityId, lastStep, isAgreedOnTerms, bookingAs } =
        termsDetails;
      logger.info(`agreedOnTerms service called: ${opportunityId}`);
      const { data: booking } = await this.getBookingByOppId(opportunityId);
      if (!booking) throw new NotFoundException('Booking not found.');
      if (booking?.isCompleted)
        throw new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        );

      const updateData: Partial<Booking> = {
        lastStep: lastStep,
        isAgreedOnTerms: isAgreedOnTerms,
        bookingAs: bookingAs ?? booking.bookingAs,
      };
      logger.info(`agreedOnTerms: applying terms consent for ${opportunityId}`);
      await this.bookingRepository.update({ opportunityId }, updateData);
      return {
        message: 'Terms and conditions consent submitted successfully.',
        data: booking,
      };
    } catch (error) {
      logger.error(error);
      logsAndErrorHandling('bookingService - agreedOnTerms', error, {
        termsDetails,
      });
    }
  }

  //To submit booking for signature
  async submitForSignature(submitDetails: SubmitApplicationDto): Promise<any> {
    const { opportunityId, isSignedOffline, isCompleted, bookingAs } =
      submitDetails;

    logger.info(`submitForSignature called: ${opportunityId}`);

    // STEP 1: ATOMIC LOCK (prevents duplicate execution)
    const lockResult = await this.bookingRepository.update(
      { opportunityId, isCompleted: false },
      { isCompleted: true },
    );

    if (lockResult.affected === 0) {
      throw new BadRequestException(
        'The booking form has already been submitted and is currently in the signature process',
      );
    }
    let unsignedPdfUrl: string | null = null;

    try {
      // STEP 2: FETCH AFTER LOCK
      const { data: booking } = await this.getBookingByOppId(
        opportunityId,
        true,
      );

      if (!booking) {
        throw new NotFoundException('Booking not found.');
      }

      const filePath = getBookingFileName(booking, opportunityId);
      const inviteesArray = this.getInvitees(booking);

      const pdfBuffer = await this.generateBookingPDF(
        booking,
        inviteesArray,
        isSignedOffline,
      );
      logger.info(`submitForSignature: PDF generated for ${opportunityId}`);

      const irnString = `IRN-${generateRandomNumber(4)}-${opportunityId}`;

      // STEP 3: UPLOAD PDF
      try {
        unsignedPdfUrl = await this.leegalityService.uploadPdfBufferToS3(
          `unsigned-pdf/${opportunityId}/${filePath}`,
          pdfBuffer.bufferPdf,
        );
      } catch (err) {
        logger.error('Failed to upload booking PDF.', err);
        throw new InternalServerErrorException('Failed to upload booking PDF.');
      }

      let leegalityData: any = null;
      const leegalityError =
        'Failed to proceed for online signature. Please try again or check with your RM.';

      // STEP 4: LEEGALITY CALL (ONLINE FLOW)
      if (!isSignedOffline) {
        try {
          leegalityData = await this.sendAndActivateInvitations(
            pdfBuffer.base64Pdf,
            filePath,
            inviteesArray,
            irnString,
          );

          //If not got proper response from leegality
          if (!leegalityData?.invitees) {
            logger.error(leegalityError);
            throw new ServiceUnavailableException(leegalityError);
          }
        } catch (err) {
          logger.error('Failed to proceed for online signature', err);
          if (unsignedPdfUrl) {
            await this.leegalityService.safeS3Cleanup(unsignedPdfUrl);
          }

          throw new ServiceUnavailableException(leegalityError);
        }
      }

      // STEP 5: FINAL DB UPDATE
      const updateResult = await this.bookingRepository.update(
        { opportunityId },
        {
          bookingFormStatus: isSignedOffline
            ? BookingFormStatusEnum.SIGNED_OFFLINE
            : BookingFormStatusEnum.NOT_SIGNED,
          isCompleted,
          bookingAs: bookingAs ?? booking.bookingAs,
          formFilledAt: new Date(),
          unsignedPdf: unsignedPdfUrl,
          leegalityData,
        },
      );

      if (updateResult.affected === 0) {
        const errMsg = 'Failed to update booking after processing.';
        logger.error(errMsg);
        throw new InternalServerErrorException(errMsg);
      }

      // OFFLINE FLOW -> BOOKED
      if (
        isSignedOffline &&
        booking?.voucherId &&
        booking?.id &&
        booking?.campaign?.stage === EoiCampaignStageType.LAUNCH
      ) {
        await this.batchService.updateVoucherStatusToBooked(
          booking?.voucherId,
          booking?.id,
        );
      }

      // STEP 6: FIRE-AND-FORGET post booking processes
      this.bookingPostProcessing({
        opportunityId,
        booking,
        unsignedPdfUrl,
        isSignedOffline,
      });

      return {
        message: 'Booking form submitted successfully.',
        data: {
          opportunityId,
          bookingFormStatus: isSignedOffline
            ? BookingFormStatusEnum.SIGNED_OFFLINE
            : BookingFormStatusEnum.NOT_SIGNED,
        },
      };
    } catch (error) {
      logger.error(error);

      // STEP 7: RECOVERY (avoid stuck PROCESSING state)
      await this.bookingRepository.update(
        { opportunityId },
        {
          bookingFormStatus: BookingFormStatusEnum.IN_PROGRESS,
          isCompleted: false,
        },
      );
      return logsAndErrorHandling(
        'BookingService - SubmitForSignature',
        error,
        {
          opportunityId,
        },
      );
    }
  }

  private async bookingPostProcessing({
    opportunityId,
    booking,
    unsignedPdfUrl,
    isSignedOffline,
  }) {
    try {
      if (isSignedOffline) {
        logger.info('Send email to RM');
        await this.sendSignedBookingEmailToRM({
          opportunityId,
          signedPdfUrl: unsignedPdfUrl,
          formUrl: `${this.configService.get<string>('SALES_PORTAL_URL')}/booking/${opportunityId}`,
          booking,
          officeUseSectionUrl: `${this.configService.get<string>('SALES_PORTAL_URL')}/rm-panel/bookings/post-booking-form/${opportunityId}`,
          brandName:
            booking?.unitDetails?.projectBrandName ?? BRAND_PURAVANKARA,
          updatedBookingStatus: BookingFormStatusEnum.SIGNED_OFFLINE,
        });
      }

      await this.sendBookingToSFDCApi(opportunityId);
    } catch (err) {
      logger.error('Post-processing failed', err);
    }
  }
  //To update referrer details from booking form
  async updateReferrerData(
    opportunityId: string,
    @Body() referrerDetails: ReferrerDto,
  ): Promise<any> {
    try {
      logger.info(`updateReferrerData service called: ${opportunityId}`);
      const booking = await this.bookingRepository.findOne({
        where: { opportunityId },
        select: ['referrerDetails', 'lastStep', 'isCompleted'], // fetch only required fields
      });
      if (!booking) throw new NotFoundException('Booking not found.');
      if (booking?.isCompleted)
        throw new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        );

      const {
        lastStep,
        pointsAdjustment,
        isSignedOffline,
        ...cleanedReferrerDetails
      } = referrerDetails;
      const updatedReferrerDetails = {
        ...booking.referrerDetails,
        ...cleanedReferrerDetails,
      };
      delete updatedReferrerDetails.saveForLater;
      const updateData: Partial<Booking> = {
        referrerDetails: updatedReferrerDetails,
        ...(lastStep && { lastStep }),
      };
      await this.bookingRepository.update({ opportunityId }, updateData);
      return {
        message: 'Referrer details updated successfully.',
        data: { ...referrerDetails, pointsAdjustment, isSignedOffline },
      };
    } catch (error) {
      logger.error(error);
      logsAndErrorHandling('bookingService - updateReferrerData', error, {
        opportunityId,
        referrerDetails,
      });
    }
  }

  /**
   * To reset booking form
   * 1. Clear all personal details and professional details of all applicants
   * 2. Clear all physical document flags in applicants and payments
   * 3. Reset booking status to IN_PROGRESS
   */
  async resetBookingForm(
    opportunityId: string,
    resetBookingDto: ResetBookingDto,
  ): Promise<any> {
    try {
      logger.info(`resetBookingForm service called: ${opportunityId}`);
      const { data: booking } = await this.getBookingByOppId(opportunityId);
      if (!booking) throw new NotFoundException('Booking not found.');

      const officeUse = await this.officeUseRepository.findOne({
        where: { opportunityId },
      });

      logger.info(resetBookingDto.reason, 'Reset Booking Form Reason');

      // helper to reset doc flags
      const resetPhysicalFlags = (applicant, docFields) => {
        if (!applicant) return applicant;
        docFields.forEach(([section, flag, image]) => {
          if (
            applicant?.[section]?.[flag] &&
            applicant?.[section]?.[image]?.length > 0
          ) {
            applicant[section][flag] = false;
          }
        });
        return applicant;
      };

      const applicantDocFields = [
        ['personalDetails', 'isPhysicalImage', 'image'],
        ['personalDetails', 'isPhysicalOCI', 'ociImage'],
        ['personalDetails', 'isPhysicalPassport', 'passportImage'],
        ['personalDetails', 'isPhysicalAadhaar', 'aadhaarImage'],
        ['personalDetails', 'isPhysicalPan', 'panImage'],
        ['personalDetails', 'isPhysicalOtherDoc', 'OCIAlternateDocImage'],
        ['personalDetails', 'isPhysicalAddressProof', 'addressProofImage'],
        ['personalDetails', 'isPhysicalLegalGuardianDoc', 'legalGuardianDoc'],
        ['professionalDetails', 'isPhysicalGST', 'gstCertificate'],
      ];

      const updateData: Partial<Booking> = {
        applicant1: resetPhysicalFlags(booking?.applicant1, applicantDocFields),
        applicant2: resetPhysicalFlags(booking?.applicant2, applicantDocFields),
        applicant3: resetPhysicalFlags(booking?.applicant3, applicantDocFields),
        applicant4: resetPhysicalFlags(booking?.applicant4, applicantDocFields),
        bookingFormStatus: BookingFormStatusEnum.IN_PROGRESS,
        isCompleted: false,
        signedPdf: null,
        mergedPdf: null,
        officeUsePdf: null,
        formFilledAt: null,
        formSignedAt: null,
        feedback: null,
        rating: null,
        leegalityData: null,
      };

      const isApprovalNeeded = !!booking?.signedPdf;
      logger.info(
        `resetBookingForm: isApprovalNeeded=${isApprovalNeeded} for ${opportunityId}`,
      );

      // Transaction starts
      await this.bookingRepository.manager.transaction(async (manager) => {
        const bookingRepo = manager.getRepository(Booking);
        const paymentRepo = manager.getRepository(BookingPayment);
        const officeRepo = manager.getRepository(BookingOfficeUse);

        // Step 1: Update booking
        await bookingRepo.update({ opportunityId }, updateData);

        // Step 2: Reset all physical payment-related flags in booking_payments
        const bookingRecord = await bookingRepo.findOne({
          where: { opportunityId },
          relations: ['payments'],
        });

        if (bookingRecord?.payments?.length > 0) {
          const updatedPayments = bookingRecord.payments.map((p) => {
            const paymentDetails = { ...p.paymentDetails };
            if (
              paymentDetails?.isPhysicalPaymentProof &&
              Array.isArray(paymentDetails?.paymentProof) &&
              paymentDetails.paymentProof.length > 0
            ) {
              paymentDetails.isPhysicalPaymentProof = false;
            }
            return { ...p, paymentDetails };
          });

          await paymentRepo.save(updatedPayments);
        }

        // Step 3: Reset Office Use section
        if (officeUse) {
          officeUse.primarySource = '';
          if (!officeUse.officeInfo) officeUse.officeInfo = {};
          officeUse.officeInfo.secondarySource = '';
          officeUse.officeInfo.tertiarySource = '';
          await officeRepo.save(officeUse);
        }

        // Step 4: Emit amendment event (inside txn; can move out if preferred)
        this.eventEmitter.emit(EventMessagesEnum.FORM_AMENDMENT_REQUEST, {
          opportunityId,
          formType: FormType.BOOKING,
          reason: resetBookingDto.reason,
          requestedBy: 1,
          formStatusAtRequest: booking?.bookingFormStatus,
          needsApproval: isApprovalNeeded,
          approvedBy: !isApprovalNeeded ? 1 : null,
          approvedAt: !isApprovalNeeded ? new Date() : null,
          status: isApprovalNeeded
            ? AmendmentStatus.PENDING
            : AmendmentStatus.APPROVED,
        });
      });

      return {
        statusCode: SUCCESS,
        message: 'Booking form reset successfully.',
        data: null,
      };
    } catch (error) {
      logger.error(error);
      logsAndErrorHandling('bookingService - resetBookingForm', error, {
        opportunityId,
        resetBookingDto,
      });
    }
  }

  /**
   * TO DO: Remove this function when Project completes as this is a test function
   */
  async downloadBookingPDF(oppId, isOffline) {
    try {
      logger.info(`downloadBookingPDF service called: ${oppId}`);
      const { data: booking } = await this.getBookingByOppId(oppId);
      if (!booking) throw new NotFoundException('Booking not found.');
      const inviteesArray = this.getInvitees(booking);
      const filePath = getBookingFileName(booking, oppId);
      const pdfBuffer = await this.generateBookingPDF(
        booking,
        inviteesArray,
        isOffline,
      );
      fs.writeFile(filePath, pdfBuffer.bufferPdf);
    } catch (error) {
      logger.error('Error downloading booking PDF:', error);
      logsAndErrorHandling('bookingService - downloadBookingPDF', error, {
        oppId,
        isOffline,
      });
    }
  }

  // Generate applicant PDF, upload to S3, and return file path
  async downloadApplicantPDF(oppId: string): Promise<any> {
    try {
      logger.info(`downloadApplicantPDF service called: ${oppId}`);
      const { data: booking } = await this.getBookingByOppId(oppId);
      if (!booking) throw new NotFoundException('Booking not found.');
      const inviteesArray = this.getInvitees(booking);
      const pdfBuffer = await this.generateBookingPDF(
        booking,
        inviteesArray,
        false,
        true,
      );
      const s3Key = `applicant-pdf/${oppId}/Booking_Application_${oppId}.pdf`;
      await this.leegalityService.uploadPdfBufferToS3(
        s3Key,
        pdfBuffer.bufferPdf,
      );

      return {
        message: 'Booking Form PDF downloaded successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('Error downloading applicant PDF:', error);
      logsAndErrorHandling('bookingService - downloadApplicanrPDF', error, {
        oppId,
      });
    }
  }

  private async generateBookingPDF(
    booking: Booking,
    inviteesArray: any[],
    isSignedOffline: boolean = false,
    applicantOnly: boolean = false,
  ) {
    logger.info('generateBookingPDF service called');
    let keys: string[] = [];

    // If generating full booking PDF, include pre-booking documents
    // If applicantOnly = true → skip attaching additional documents
    if (!applicantOnly) {
      const { data: docsList } =
        await this.bookingDocumentsService.getDocuments(
          booking.opportunityId,
          BookingStageEnum.PRE_BOOKING,
          BookingStageEnum.PRE_BOOKING,
        );

      keys = docsList.map((doc) => doc.path);
    }
    const pdfBuffer = await this.pdfService.generateBookingPdf({
      booking: booking,
      oppId: booking?.opportunityId,
      inviteesArray,
      smallPdfPaths: keys,
      isSignedOffline,
      applicantOnly,
    });

    return pdfBuffer;
  }

  async deleteBooking(oppId: string): Promise<any> {
    logger.info(`deleteBooking service called: ${oppId}`);
    const booking = await this.bookingRepository.findOne({
      where: { opportunityId: oppId },
      select: ['id', 'voucherId', 'isCompleted'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking?.isCompleted)
      throw new BadRequestException(
        'The booking form has already been submitted and is currently in the signature process. Deletion is not allowed.',
      );

    if (booking?.voucherId) {
      await this.voucherRepository.update(
        { id: booking.voucherId },
        { bookingStatus: VoucherBookingStatusEnum.PENDING },
      );
    }

    // Delete booking
    await this.bookingRepository.delete({ opportunityId: oppId });
    logger.info(`deleteBooking: delete complete for ${oppId}`);

    return {
      statusCode: SUCCESS,
      message: 'Booking deleted successfully.',
      data: null,
    };
  }

  async renderBookingPreview(
    oppId: string,
    applicantOnly: boolean,
  ): Promise<any> {
    try {
      logger.info(`renderBookingPreview service called: ${oppId}`);
      const { data: booking } = await this.getBookingByOppId(oppId, true);
      const projectName = booking?.unitDetails?.projectName ?? '';
      const brandName = booking?.unitDetails?.projectBrandName ?? '';
      const { data: termsCondition } =
        await this.projectTermsService.getTermsConditions(
          projectName,
          brandName,
        );
      let groupDetails;
      if (booking?.groupId)
        groupDetails = await this.getMultiBookingGroup(booking?.groupId);

      const { data: pickListData } = await this.getBookingFormMasters();
      return {
        booking,
        termsCondition,
        pickListData: pickListData,
        paymentModeEnum: PaymentModeEnum,
        occupationEnum: OccupationEnum,
        DISPLAY_DATE_FORMAT: DISPLAY_DATE_FORMAT,
        bookingAs: BookingAsEnum,
        legalGuardian: LegalGuardianEnum,
        groupDetails: groupDetails ?? null,
        IMAGE_BASE_URL: this.configService.get<string>('AWS_S3_ACCESS_URL'),
        PROJECT_IMAGES_URL:
          this.configService.get<string>('PROJECT_IMAGES_URL'),
        KVN_GROUP_LOGO_FILENAME,
        KVN_PROJECT_NAME: this.configService.get<string>('KVN_PROJECT_NAME'),
        applicantOnly,
      };
    } catch (error) {
      logger.error('error', error);
      logsAndErrorHandling('bookingService - renderBookingPreview', error, {
        oppId,
      });
    }
  }

  async renderPostBookingPreview(
    oppId: string,
    isOfficeUse: boolean,
  ): Promise<any> {
    try {
      logger.info(`renderPostBookingPreview service called: ${oppId}`);
      const bookingStage =
        isOfficeUse === true
          ? BookingStageEnum.OFFICE_USE
          : BookingStageEnum.POST_BOOKING;

      const [booking, officeUse, pickListData, docsList] = await Promise.all([
        this.getBookingByOppId(oppId, true),
        this.getOfficeUseByOppId(oppId),
        this.getBookingFormMasters(),
        await this.bookingDocumentsService.getDocuments(
          oppId,
          BookingDocTypeEnum.ADDITIONAL_DOCS,
          bookingStage,
        ),
      ]);
      const projectName = booking?.data?.unitDetails?.projectName ?? '';
      const brandName = booking?.data?.unitDetails?.projectBrandName ?? '';
      const { data: termsCondition } =
        await this.projectTermsService.getTermsConditions(
          projectName,
          brandName,
        );

      const additionalDocs = docsList?.data?.filter(
        (doc) => !doc?.path?.endsWith('.pdf'),
      );
      return {
        booking: booking?.data ?? null,
        officeUse: officeUse?.data ?? null,
        termsCondition,
        additionalDocs,
        isOfficeUse: isOfficeUse ?? false,
        pickListData: pickListData?.data ?? [],
        BookingSource: PrimarySourceEnum,
        DISPLAY_DATE_FORMAT: DISPLAY_DATE_FORMAT,
        IMAGE_BASE_URL: this.configService.get<string>('AWS_S3_ACCESS_URL'),
        PROJECT_IMAGES_URL:
          this.configService.get<string>('PROJECT_IMAGES_URL'),
        KVN_GROUP_LOGO_FILENAME,
        KVN_PROJECT_NAME: this.configService.get<string>('KVN_PROJECT_NAME'),
      };
    } catch (error) {
      logger.error('error', error);
      logsAndErrorHandling('bookingService - renderPostBookingPreview', error, {
        oppId,
        isOfficeUse,
      });
    }
  }

  // Render HTML for referrer form pdf
  async renderReferrerPreview(oppId: string): Promise<any> {
    try {
      logger.info(`renderReferrerPreview service called: ${oppId}`);
      const { data: booking } = await this.getBookingByOppId(oppId, true);
      const projectName = booking?.unitDetails?.projectName ?? '';
      const brandName = booking?.unitDetails?.projectBrandName ?? '';
      const { data: termsCondition } =
        await this.projectTermsService.getTermsConditions(
          projectName,
          brandName,
        );

      return {
        booking,
        termsCondition,
        BookingSource: PrimarySourceEnum,
        DISPLAY_DATE_FORMAT: DISPLAY_DATE_FORMAT,
        IMAGE_BASE_URL: this.configService.get<string>('AWS_S3_ACCESS_URL'),
        PROJECT_IMAGES_URL:
          this.configService.get<string>('PROJECT_IMAGES_URL'),
        KVN_GROUP_LOGO_FILENAME,
        KVN_PROJECT_NAME: this.configService.get<string>('KVN_PROJECT_NAME'),
      };
    } catch (error) {
      logger.error('error', error);
      logsAndErrorHandling('bookingService - renderReferrerPreview', error, {
        oppId,
      });
    }
  }

  // Separate function to send invitation and activate invites
  async sendAndActivateInvitations(
    base64Pdf: any,
    filePath: string,
    inviteesArray: any[],
    irnString: string,
  ): Promise<any> {
    try {
      logger.info('sendAndActivateInvitations service called');
      const response = await this.leegalityService.sendInvitation(
        base64Pdf,
        filePath,
        inviteesArray,
        irnString,
      );

      if (response && response.status === 1) {
        response.data.invitees = response.data.invitees.filter(
          (invitee) => invitee.name && invitee.email,
        );
      } else if (response?.status === 0) {
        throw new ServiceUnavailableException(
          response.messages?.[0]?.message ??
            'Failed to proceed leegality signature',
        );
      }
      return response.data;
    } catch (error) {
      logger.error(error);
      logsAndErrorHandling(
        'bookingService - sendAndActivateInvitations',
        error,
        {
          base64Pdf,
          filePath,
          inviteesArray,
          irnString,
        },
      );
    }
  }

  //To get master list from SFDC API
  async getBookingFormMasters(): Promise<any> {
    logger.info('getBookingFormMasters service called');
    const cacheKey = 'booking-form-value';

    try {
      // Check if the value exists in cache
      const cachedData = await this.cacheService.get<any>(cacheKey);

      if (cachedData) {
        return {
          message: 'Master pick list fetched successfully.',
          data: cachedData,
        };
      }

      const pickListData = await this.sfdcService.getPickList();
      await this.cacheService.set(cacheKey, pickListData, 900 * 1000); // Cache for 15 minutes

      return {
        message: 'Master pick list fetched successfully.',
        data: pickListData,
      };
    } catch (error) {
      if (error.response) {
        // Throw ServiceUnavailableException if there's an issue with the external API
        throw new ServiceUnavailableException(
          'Failed to fetch data from external API',
        );
      } else {
        // Throw InternalServerErrorException for other types of errors (like cache issues)
        throw new InternalServerErrorException(
          'An error occurred while processing the request',
        );
      }
    }
  }

  //Send transformed booking details to Salesforce system
  async sendBookingToSFDCApi(
    oppId: string,
    isReset: boolean = false,
  ): Promise<any> {
    try {
      logger.info(`sendBookingToSFDCApi service called: ${oppId}`);
      if (isReset) {
        return this.sfdcService.updateOpportunity(
          oppId,
          null,
          0,
          null,
          isReset,
        );
      }

      // Fetch booking (decrypted) and referral count in parallel for efficiency
      const [bookingResp, officeUse, referralCount] = await Promise.all([
        this.getBookingByOppId(oppId, true),
        this.getOfficeUseByOppId(oppId),
        this.referralsService.countReferralsByBooking(oppId),
      ]);

      const booking = bookingResp?.data;

      const parsedData = await this.sfdcService.updateOpportunity(
        oppId,
        booking,
        referralCount,
        officeUse?.data,
      );

      // Save contactIds from SFDC response
      if (parsedData?.contacts?.length) {
        const isUpdated = this.updateApplicantContactIds(
          booking,
          parsedData.contacts,
        );

        if (isUpdated) {
          await this.bookingRepository.save(booking);
        }
      }
    } catch (error) {
      logger.error('Error sending booking data to SFDC API:', error);
      logsAndErrorHandling('bookingService - sendBookingToSFDCApi', error, {
        oppId,
        isReset,
      });
    }
  }

  private updateApplicantContactIds(booking: any, contacts: any[]): boolean {
    let isUpdated = false;

    const applicantTypeMap = {
      'Primary Applicant': 'applicant1',
      'Second Applicant': 'applicant2',
      'Third Applicant': 'applicant3',
      'Fourth Applicant': 'applicant4',
    };

    for (const contact of contacts) {
      const applicantKey = applicantTypeMap[contact.applicantType];

      if (applicantKey && contact?.contactId && booking?.[applicantKey]) {
        booking[applicantKey].contactId = contact.contactId;
        isUpdated = true;
      }
    }

    return isUpdated;
  }

  /**
   * Pushes applicant booking data to SFDC for the given opportunity ID.
   *
   * - Fetches booking details using oppId
   * - Validates booking existence
   * - Calls SFDC updateOpportunity API
   * - Returns success response on successful push
   *
   * @param oppId Salesforce Opportunity ID
   * @returns Success message if data is pushed successfully
   * @throws NotFoundException if booking is not found
   */

  async pushApplicantData(dto: PushApplicantDataDto): Promise<any> {
    try {
      const { oppId } = dto;
      logger.info(`pushApplicantData called for oppId: ${oppId}`);
      const { data: booking } = await this.getBookingByOppId(oppId, true);

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      const parsedData = await this.sfdcService.updateOpportunity(
        oppId,
        booking,
        0,
        null,
        false,
      );

      if (parsedData?.contacts?.length) {
        const isUpdated = this.updateApplicantContactIds(
          booking,
          parsedData.contacts,
        );

        if (isUpdated) {
          await this.bookingRepository.save(booking);
        }
      }

      const voucherId = booking?.voucherId;
      if (voucherId) {
        await this.voucherRepository.update(
          { id: voucherId },
          { bookingStatus: VoucherBookingStatusEnum.PRE_FILLED },
        );
      }

      return {
        statusCode: SUCCESS,
        message: 'Applicant data successfully pushed to SFDC',
        data: null,
      };
    } catch (error) {
      logger.error('Error pushing applicant data to SFDC API:', error.message);
      logsAndErrorHandling(
        'bookingService - pushApplicantDataToSFDCApi',
        error,
        {
          dto,
        },
      );
    }
  }

  // Method to handle webhook notifications from leegality
  async handleWebhook(webhookData: any): Promise<void> {
    logger.info(`webhookData Data Received: ${JSON.stringify(webhookData)}`);
    const { webhookType, documentStatus, documentId, irn, request } =
      webhookData;
    logger.info(
      `handleWebhook: webhookType=${webhookType}, documentStatus=${documentStatus}, irn=${irn}`,
    );
    const bookingOppId = irn.split('-')[2];
    try {
      switch (webhookType) {
        case 'Success':
          if (documentStatus && documentStatus == 'Sent') {
            await this.updateBookingStatus({
              opportunityId: bookingOppId,
              bookingFormStatus: BookingFormStatusEnum.PARTIALLY_SIGNED,
              signedPdf: null,
              inviteeData: request,
            });
          } else if (documentStatus && documentStatus == 'Completed') {
            const { data: bookingData } = await this.getBookingByOppId(
              bookingOppId,
              true,
            );
            const filePath = getBookingFileName(bookingData, bookingOppId);
            const signedPdf =
              await this.leegalityService.downloadSignedDocument(
                documentId,
                filePath,
                bookingOppId,
              );

            if (!signedPdf) {
              throw new Error(
                `Invalid or missing signed PDF for documentId: ${documentId}`,
              );
            }

            await this.updateBookingStatus({
              opportunityId: bookingOppId,
              bookingFormStatus: BookingFormStatusEnum.SIGNED,
              signedPdf,
              inviteeData: request,
            });

            const groupId = bookingData?.groupId;
            if (groupId) {
              await this.updateGroupStatus(groupId);
            }
            // UPDATE CX/Batch VOUCHER STATUS
            if (
              (bookingData?.voucherId && bookingData?.id,
              bookingData?.campaign?.stage === EoiCampaignStageType.LAUNCH)
            ) {
              await this.batchService.updateVoucherStatusToBooked(
                bookingData.voucherId,
                bookingData.id,
              );
            }
          }

          logger.info(
            `Document ${documentId} ${irn} signed by ${webhookData.request.name}`,
          );
          break;

        case 'Failed':
          logger.info(
            `Document ${documentId} signing failed:`,
            JSON.stringify(webhookData),
          );
          break;

        default:
          logger.warn('Unhandled webhook event:', webhookType);
      }
    } catch (error) {
      logger.error(
        `Error processing webhook for documentId ${documentId}, IRN ${irn}: ${error.message}`,
        error.stack,
      );
      // Optional: throw or handle as per retry logic
      logsAndErrorHandling('bookingService - handleWebhook', error, {
        webhookData,
      });
    }
  }

  //Update booking status based on the leegality data
  async updateBookingStatus(leegalityData: {
    opportunityId: string;
    bookingFormStatus: BookingFormStatusEnum;
    signedPdf: any;
    inviteeData: any;
  }): Promise<boolean> {
    const { opportunityId, bookingFormStatus, signedPdf, inviteeData } =
      leegalityData;
    try {
      logger.info(`updateBookingStatus service called: ${opportunityId}`);

      // Query for a nested field within JSONB in PostgreSQL
      const { data: bookingData } = await this.getBookingByOppId(
        opportunityId,
        true,
      );
      if (!bookingData) return false;
      logger.info(
        `updateBookingStatus: bookingData fetched for ${opportunityId}`,
      );

      const filters = {
        email: inviteeData.email,
        ...(inviteeData.phone && { phone: inviteeData.phone }),
      };

      const updatedLeegality = updateInvitee(
        bookingData.leegalityData,
        filters,
        { signType: inviteeData.signType, isSigned: true },
      );
      const mergedPdf = signedPdf;
      const updateData: Record<string, any> = {
        bookingFormStatus,
        signedPdf,
        mergedPdf,
        isCompleted: true,
        leegalityData: updatedLeegality,
      };

      if (bookingFormStatus == BookingFormStatusEnum.SIGNED) {
        updateData.formSignedAt = new Date();

        const formUrl = generateFormUrlByType(
          FormType.BOOKING,
          bookingData?.unitDetails?.projectBrandName,
          opportunityId,
          this.configService,
        );
        const signedPdfUrl = getS3Url(
          this.configService,
          bookingData?.signedPdf,
        );

        await this.sendSignedBookingEmailToRM({
          opportunityId,
          signedPdfUrl: signedPdfUrl,
          formUrl,
          booking: bookingData,
          officeUseSectionUrl: `${this.configService.get<string>('SALES_PORTAL_URL')}/rm-panel/bookings/post-booking-form/${opportunityId}`,
          brandName:
            bookingData?.unitDetails?.projectBrandName ?? BRAND_PURAVANKARA,
        });
      }

      const result = await this.bookingRepository.update(
        { opportunityId },
        updateData,
      );

      // Emit websocket event for booking status update
      await this.wsPublisherService.publishBookingEvent({
        type: 'opportunity_update',
        opportunityId,
        data: {
          opportunityId,
          bookingFormStatus,
          email: inviteeData?.email,
          phone: inviteeData?.phone,
          name: inviteeData?.name,
        },
      });

      this.sendBookingToSFDCApi(opportunityId);
      logger.info(
        `updateBookingStatus: event and SFDC push triggered for ${opportunityId}`,
      );
      return result.affected > 0;
    } catch (error) {
      logger.error('Error exporting user bookings:', error);
      if (error instanceof BadRequestException) throw error;
      logsAndErrorHandling('bookingService - updateBookingStatus', error, {
        opportunityId,
        bookingFormStatus,
        signedPdf,
        inviteeData,
      });
    }
  }

  //Update booking referrer status based on the leegality data
  async updateReferrerSignStatus(leegalityData: {
    opportunityId: string;
    bookingFormStatus: BookingFormStatusEnum;
    signedPdf: any;
    inviteeData: any;
  }): Promise<boolean> {
    const { opportunityId, bookingFormStatus, signedPdf, inviteeData } =
      leegalityData;
    logger.info(`updateReferrerSignStatus service called: ${opportunityId}`);
    logger.info(
      `updateReferrerSignStatus: bookingFormStatus=${bookingFormStatus}`,
    );

    // Query for a nested field within JSONB in PostgreSQL
    const { data: bookingData } = await this.getBookingByOppId(opportunityId);
    if (!bookingData) return false;

    const filters = {
      email: inviteeData.email,
      ...(inviteeData.phone && { phone: inviteeData.phone }),
    };

    const { referrerDetails } = bookingData;
    const updatedLeegality = updateInvitee(
      referrerDetails.leegalityData,
      filters,
      { signType: inviteeData.signType, isSigned: true },
    );
    referrerDetails.leegalityData = updatedLeegality;
    referrerDetails.signedPdf = signedPdf;
    referrerDetails.signedStatus = bookingFormStatus;
    referrerDetails.signedAt = new Date();
    const result = await this.bookingRepository.update(
      { opportunityId },
      {
        referrerDetails,
      },
    );

    // Emit websocket event for referrer sign status update
    await this.wsPublisherService.publishBookingEvent({
      type: 'referrer_signed',
      opportunityId,
      data: {
        opportunityId,
        signedStatus: bookingFormStatus,
        email: inviteeData.email,
        name: inviteeData.name,
      },
    });
    logger.info(
      `updateReferrerSignStatus: event published for ${opportunityId}`,
    );
    const status = result.affected > 0;
    logger.info(`updateReferrerSignStatus: completion status ${status}`);
    return status;
  }

  //Update booking to delete images
  async updateBookingImages(
    opportunityId: string,
    imagePath: string,
    images: string[],
  ): Promise<any> {
    try {
      logger.info(`updateBookingImages service called: ${opportunityId}`);
      const { data: bookingData } = await this.getBookingByOppId(opportunityId);
      if (!bookingData) return false;

      const keys = imagePath.split('.');
      const rootKey = keys[0] as keyof typeof bookingData;
      let current: any = bookingData[rootKey];
      if (!current) return false;

      for (let i = 1; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) return false;
        current = current[key];
      }

      // Clear images at the final key in the path
      const finalKey = keys[keys.length - 1];
      if (!Array.isArray(current[finalKey])) return false;
      current[finalKey] = images;

      // Prepare updated data and persist changes
      const dataToBeUpdated: Partial<typeof bookingData> = {
        [rootKey]: bookingData[rootKey],
      };

      // If personalDetails is present in the root being updated, ensure it's encrypted
      if (
        (rootKey === 'applicant1' ||
          rootKey === 'applicant2' ||
          rootKey === 'applicant3' ||
          rootKey === 'applicant4') &&
        typeof (dataToBeUpdated as any)[rootKey]?.personalDetails === 'object'
      ) {
        const encrypted = await encryptBookingApplicants({
          [rootKey]: (dataToBeUpdated as any)[rootKey],
        });
        (dataToBeUpdated as any)[rootKey] = encrypted[rootKey];
      }

      const result = await this.bookingRepository.update(
        { opportunityId },
        dataToBeUpdated,
      );
      return {
        statusCode: SUCCESS,
        message:
          result?.affected > 0
            ? 'Images deleted successfully.'
            : 'Unable to delete images.',
        data: result.affected > 0,
      };
    } catch (error) {
      logger.error(`Failed to Update booking details.${error}`);
      logsAndErrorHandling('bookingService - updateBookingImages', error, {
        opportunityId,
        imagePath,
        images,
      });
    }
  }

  //Update sign later to status
  async updateSignLaterStatus(
    opportunityId: string,
    signUrls: string[],
    bookingAs?: string,
  ): Promise<boolean> {
    try {
      logger.info(`updateSignLaterStatus service called: ${opportunityId}`);
      const { data: bookingData } = await this.getBookingByOppId(opportunityId);
      if (!bookingData) return false;

      const updatedLeegality = updateInvitee(
        bookingData.leegalityData,
        { signUrl: signUrls[0] },
        { isSignLater: true },
      );
      updatedLeegality.isSignLater = true;
      // Prepare updated data and persist changes
      const dataToBeUpdated: Partial<typeof bookingData> = {
        leegalityData: updatedLeegality,
        bookingAs: bookingAs ?? bookingData.bookingAs,
      };
      await this.bookingRepository.update({ opportunityId }, dataToBeUpdated);

      return this.isRedirectable(updatedLeegality.invitees);
    } catch (error) {
      logger.error(`Failed to Update booking details.${error}`);
      logsAndErrorHandling('bookingService - updateSignLaterStatus', error, {
        opportunityId,
        signUrls,
        bookingAs,
      });
    }
  }

  //To check that booking page can be redirected to thank you page
  private isRedirectable(
    invitees: { isSigned?: boolean; isSignLater?: boolean }[],
  ): boolean {
    return invitees.every((invitee) => invitee.isSigned || invitee.isSignLater);
  }

  //Extract Invitees from booking details
  private getInvitees(
    data: any,
  ): { name: string; email: string; phone: string }[] {
    try {
      const invitees: { name: string; email: string; phone: string }[] = [];

      // Helper function to extract details from an applicant
      function extractInvitee(applicant: any) {
        // Individual flow: personalDetails + contactDetails
        if (applicant.contactDetails) {
          let name =
            `${applicant.personalDetails.firstName ?? ''} ${applicant.personalDetails.lastName ?? ''}`.trim();
          if (applicant?.hasContinuedAsMinor) {
            if (
              applicant?.personalDetails?.legalGuardian ==
              LegalGuardianEnum.MOTHER
            ) {
              name = applicant?.personalDetails?.motherName ?? name;
            } else {
              name = applicant?.personalDetails?.fatherName ?? name;
            }
          }

          const email = applicant.contactDetails.emailAddress;
          const countryCode = applicant.contactDetails.countryCode;
          let phone = applicant.contactDetails.contactNumber;

          if (
            countryCode != INDIAN_COUNTRY_CODE ||
            String(phone || '').length != 10
          ) {
            phone = '';
          }

          if (name && email) {
            invitees.push({ name, email, phone });
          }
          return;
        }

        // Corporate / Partnership flow: everything comes from personalDetails
        const pd = applicant.personalDetails;
        const name = `${pd.firstName ?? ''} ${pd.lastName ?? ''}`.trim();
        const email = pd.emailAddress;
        const countryCode = pd.countryCode;
        let phone = pd.contactNumber;

        if (
          countryCode != INDIAN_COUNTRY_CODE ||
          String(phone || '').length != 10
        ) {
          phone = '';
        }

        if (name && email) {
          invitees.push({ name, email, phone });
        }
      }

      // Keep explicit calls like your original
      if (data.applicant1?.personalDetails) extractInvitee(data.applicant1);
      if (data.applicant2?.personalDetails) extractInvitee(data.applicant2);
      if (data.applicant3?.personalDetails) extractInvitee(data.applicant3);
      if (data.applicant4?.personalDetails) extractInvitee(data.applicant4);

      return invitees;
    } catch (error) {
      logger.error('No Invitees extracted', error);
      return [];
    }
  }

  //Update booking to save rating and feedback
  async saveBookingFeedback(ratingData: {
    opportunityId: string;
    rating: number;
    feedback: string;
    bookingAs?: string;
  }): Promise<any> {
    try {
      const { opportunityId, rating, feedback, bookingAs } = ratingData;
      logger.info(`saveBookingFeedback service called: ${opportunityId}`);
      logger.info(`saveBookingFeedback: rating=${rating}`);

      const { data: bookingData } = await this.getBookingByOppId(opportunityId);
      if (!bookingData) throw new NotFoundException('Invalid booking details.');

      await this.bookingRepository.update(
        { opportunityId },
        { rating, feedback, bookingAs: bookingAs ?? bookingData.bookingAs },
      );
      return {
        statusCode: SUCCESS,
        message: 'Rating and feedback saved successfully.',
        data: ratingData,
      };
    } catch (error) {
      logger.error(`Failed to Save rating and Feedback.${error}`);
      logsAndErrorHandling(
        'bookingService - saveBookingFeedback',
        error,
        ratingData,
      );
    }
  }

  async getOfficeUseByOppId(oppId: string): Promise<any> {
    try {
      logger.info(`getOfficeUseByOppId service called: ${oppId}`);
      const officeUse = await this.officeUseRepository.findOne({
        where: { opportunityId: oppId },
      });

      if (!officeUse) {
        return {
          message: 'Office use data not found.',
          data: null,
        };
      }
      return {
        message: 'Office use data fetched successfully.',
        data: officeUse,
      };
    } catch (error) {
      logger.error(
        `Failed to fetch office use data for oppId: ${oppId}. Error: ${error}`,
      );
      logsAndErrorHandling('bookingService - getOfficeUseByOppId', error, {
        oppId,
      });
    }
  }

  async updateReferrer(
    oppId: string,
    referrerDto: ReferrerDto,
    toBeSigned: boolean = false,
  ): Promise<any> {
    try {
      logger.info(`updateReferrer service called: ${oppId}`);
      if (!oppId) {
        throw new BadRequestException('Opportunity ID is required.');
      }

      const { data: bookingData } = await this.getBookingByOppId(oppId);
      if (!bookingData) {
        throw new NotFoundException('Invalid booking details.');
      }

      // Always start from current persisted state
      const updateData: Record<string, any> = {};
      const existing = bookingData.referrerDetails ?? {};
      updateData.referrerDetails = { ...existing };

      // Fields that belong inside referrerDetails (whitelist)
      const referrerFields: (keyof ReferrerDto)[] = [
        'name',
        'email',
        'address',
        'houseNumber',
        'relation',
        'unitNumber',
        'countryCode',
        'mobileNumber',
        'propertyName',
        'altCountryCode',
        'altMobileNumber',
        'postAgreement',
        'pointsAdjustment',
        'tower',
        'primarySource',
        'ownerType',
        'isPhysicalSaleDeed',
        'saleDeedDocument',
        'isPhysicalRentalAgreement',
        'rentalAgreement',
        'residingAs',
        // NOTE: intentionally excluding: saveForLater, lastStep, bookingAs, signedStatus, isSignedOffline
      ];

      // Helper: assign only defined values
      const assignDefined = (target: any, source: any, keys: string[]) => {
        for (const k of keys) {
          const v = source[k];
          if (v !== undefined) target[k] = v;
        }
      };

      // Merge incoming DTO into referrerDetails
      if (referrerDto) {
        assignDefined(updateData.referrerDetails, referrerDto, referrerFields);
      }

      let signedStatus = BookingFormStatusEnum.NOT_SIGNED;
      if (referrerDto?.isSignedOffline) {
        signedStatus = BookingFormStatusEnum.SIGNED_OFFLINE;
        updateData.referrerDetails.signedAt = new Date(); // Update signed at time
      }
      updateData.referrerDetails.signedStatus = signedStatus; // Update signed status

      updateData.bookingAs = referrerDto?.bookingAs ?? bookingData.bookingAs;

      await this.bookingRepository.update({ opportunityId: oppId }, updateData);

      if (toBeSigned && !referrerDto?.saveForLater) {
        const filePath = getBookingFileName(
          bookingData,
          oppId,
          BookingPDFTypeEnum.REFERRER,
        );

        const invitee = {
          name: referrerDto?.name ?? updateData.referrerDetails?.name,
          email: referrerDto?.email ?? updateData.referrerDetails?.email,
          phone: `${referrerDto?.mobileNumber ?? updateData.referrerDetails?.mobileNumber ?? ''}`,
        };
        const inviteesArray = [invitee];

        const pdfBuffer = await this.pdfService.generateReferrerPDF({
          oppId: bookingData?.opportunityId,
          inviteesArray,
          isSignedOffline: !!referrerDto?.isSignedOffline,
        });

        const randomNumber = generateRandomNumber(4);
        const irnString = `IRN-${randomNumber}-REF-${oppId}`;

        const promises: Promise<any>[] = [
          this.leegalityService
            .uploadPdfBufferToS3(
              `unsigned-pdf/${oppId}/${filePath}`,
              pdfBuffer.bufferPdf,
            )
            .then((unsignedPdfUrl) => {
              updateData.referrerDetails.unsignedPdf = unsignedPdfUrl;
            }),
        ];

        if (!referrerDto?.isSignedOffline) {
          promises.push(
            this.sendAndActivateInvitations(
              pdfBuffer.base64Pdf,
              filePath,
              inviteesArray,
              irnString,
            ).then((leegalityData) => {
              updateData.referrerDetails.leegalityData = leegalityData;
            }),
          );
        }

        await Promise.all(promises);

        await this.bookingRepository.update(
          { opportunityId: oppId },
          updateData,
        );
      }

      return {
        statusCode: SUCCESS,
        message: 'Data saved successfully.',
        data: updateData,
      };
    } catch (error) {
      logger.error(`Failed to save data: ${oppId}. Error: ${error}`);
      logsAndErrorHandling('bookingService - updateReferrer', error, {
        oppId,
        referrerDto,
        toBeSigned,
      });
    }
  }

  // Method to handle referrer webhook notifications from leegality
  async referrerWebhook(webhookData: any): Promise<void> {
    logger.info(
      `Referrer webhookData Data Received: ${JSON.stringify(webhookData)}`,
    );
    const { webhookType, documentStatus, documentId, irn, request } =
      webhookData;
    logger.info(
      `referrerWebhook: webhookType=${webhookType}, documentStatus=${documentStatus}`,
    );
    const bookingOppId = irn.split('-')[3];
    switch (webhookType) {
      case 'Success':
        if (documentStatus && documentStatus == 'Completed') {
          const filePath = getBookingFileName(
            null,
            bookingOppId,
            BookingPDFTypeEnum.REFERRER,
          );
          const signedPdf = await this.leegalityService.downloadSignedDocument(
            documentId,
            filePath,
            bookingOppId,
          );
          this.updateReferrerSignStatus({
            opportunityId: bookingOppId,
            bookingFormStatus: BookingFormStatusEnum.SIGNED,
            signedPdf: signedPdf,
            inviteeData: request,
          });
        }
        logger.info(
          `Document ${documentId} ${irn} signed by ${webhookData.request.name}`,
        );
        break;

      case 'Failed':
        logger.info(
          `Document ${webhookData.documentId} is failed signed ${webhookData}`,
        );
        break;

      default:
        logger.info('Unhandled webhook event:', webhookType);
    }
  }

  /**
   * To merge Post booking data to main booking applicant data
   *
   * @param currentData as Object from booking table
   * @param newData as form data
   *
   * @returns Obj
   */
  private mergeObjects(currentData: any, newData: any): any {
    const mergedResult = {};
    Object.keys(currentData).forEach((key) => {
      if (currentData[key] !== undefined) {
        if (
          currentData[key] &&
          typeof currentData[key] === 'object' &&
          !Array.isArray(currentData[key]) &&
          newData[key]
        ) {
          // Handle nested objects recursively
          mergedResult[key] = this.mergeObjects(currentData[key], newData[key]);
        } else {
          // Update primitive or array fields
          mergedResult[key] = newData[key] ?? currentData[key];
        }
      }
    });
    return mergedResult;
  }

  async sendFormEmail(
    user: any,
    oppId: string,
    formType: FormType,
    emailIds?: string,
  ): Promise<any> {
    try {
      logger.info(`sendFormEmail service called: ${oppId}`);
      const { data: oppDetails } = await this.getOpportunityDetailById(oppId);
      let recipients: string[] = [];

      // Check if client provided emailIds
      if (emailIds) {
        recipients = emailIds
          .split(',')
          .map((email) => email.trim())
          .filter((email) => email); // Remove empty strings
      }
      logger.info(`sendFormEmail: recipients count=${recipients.length}`);

      // Throw error if no valid email addresses found
      if (!recipients.length) {
        throw new NotFoundException('No valid email address found.');
      }

      const formUrl = generateFormUrlByType(
        formType,
        oppDetails?.projectBrandName ?? BRAND_PURAVANKARA,
        oppId,
        this.configService,
      );

      const projectName = oppDetails?.ProjectName ?? 'your selected project!';
      const EnquiryNo = oppDetails?.EnquiryReferenceNo ?? '';
      const UnitNumber = oppDetails?.UnitNumber ?? '';
      let composeResponses: any;
      if (formType === FormType.BOOKING) {
        // Compose + send via event listener
        composeResponses = await this.eventEmitter.emitAsync(
          EventMessagesEnum.COMPOSE_EMAIL,
          new ComposeEmailEvent(
            ComposeEmailsEnum.BOOKING_FORM,
            {
              NAME: oppDetails?.Cname ?? 'Customer',
              PROJECT: projectName,
              FORM_URL: formUrl,
              BRAND: oppDetails?.projectBrandName ?? BRAND_PURAVANKARA,
              ENQUIRY_NO: EnquiryNo,
              UNIT_NUMBER: UnitNumber,
            },
            oppDetails?.projectBrandName ?? BRAND_PURAVANKARA,
            { to: recipients, bcc: [user?.email] },
          ),
        );
      } else if (formType === FormType.REFERRAL) {
        // Compose + send via event listener for referral too
        composeResponses = await this.eventEmitter.emitAsync(
          EventMessagesEnum.COMPOSE_EMAIL,
          new ComposeEmailEvent(
            ComposeEmailsEnum.REFERRAL_FORM,
            {
              NAME: oppDetails?.OppName ?? 'Referrer',
              PROJECT: projectName,
              FORM_URL: formUrl,
              BRAND: oppDetails?.projectBrandName ?? BRAND_PURAVANKARA,
              ENQUIRY_NO: EnquiryNo,
              UNIT_NUMBER: UnitNumber,
            },
            oppDetails?.projectBrandName ?? BRAND_PURAVANKARA,
            { to: recipients, bcc: [user?.email] },
          ),
        );
      }

      const composeResult = composeResponses?.find(
        (r: any) =>
          r && (r.data?.subject || r.subject) && (r.data?.body || r.body),
      );
      if (!composeResult) {
        throw new InternalServerErrorException('Failed to send email');
      }

      return {
        success: true,
        statusCode: SUCCESS,
        message:
          formType === FormType.BOOKING
            ? 'Booking form URL sent successfully.'
            : 'Referral form URL sent successfully to the referrer.',
        data: null,
      };
    } catch (error) {
      logger.error(`Failed to send ${formType} form URL:`, error);
      logsAndErrorHandling('bookingService - sendFormEmail', error, {
        user,
        oppId,
        formType,
        emailIds,
      });
    }
  }

  async resetReferrerForm(
    opportunityId: string,
    resetBookingDto: ResetBookingDto,
  ): Promise<any> {
    try {
      logger.info(`resetReferrerForm service called: ${opportunityId}`);
      const { data: booking } = await this.getBookingByOppId(opportunityId);
      if (!booking) throw new NotFoundException('Booking not found.');
      logger.info(resetBookingDto.reason, 'Reset Referrer Form Reason');

      const updateData: Partial<Booking> = {
        referrerDetails: omit(booking.referrerDetails ?? {}, [
          'unsignedPdf',
          'leegalityData',
          'isSignedOffline',
          'signedPdf',
          'signedAt',
          'signedStatus',
        ]),
      };
      await this.bookingRepository.update({ opportunityId }, updateData);

      const isApprovalNeeded = !!booking?.referrerDetails?.signedPdf;
      this.eventEmitter.emit(EventMessagesEnum.FORM_AMENDMENT_REQUEST, {
        opportunityId: opportunityId,
        formType: FormType.REFERRAL,
        reason: resetBookingDto.reason,
        requestedBy: 1,
        formStatusAtRequest: booking?.referrerDetails?.signedStatus ?? '',
        needsApproval: isApprovalNeeded,
        approvedBy: !isApprovalNeeded ? 1 : null,
        approvedAt: !isApprovalNeeded ? new Date() : null,
        status: isApprovalNeeded
          ? AmendmentStatus.PENDING
          : AmendmentStatus.APPROVED,
      });
      return {
        statusCode: SUCCESS,
        message: 'Referrer form reset successfully.',
        data: { ...booking, ...updateData },
      };
    } catch (error) {
      logger.error(error);
      logsAndErrorHandling('bookingService - resetReferrerForm', error, {
        opportunityId,
        resetBookingDto,
      });
    }
  }

  private checkPhysicalDocs(booking: any) {
    if (booking) {
      if (
        booking?.bookingFormStatus === BookingFormStatusEnum.RM_UPLOAD_DONE ||
        booking?.bookingFormStatus ===
          BookingFormStatusEnum.OFFICE_USE_SUBMITTED
      ) {
        return false; // No need to check physical docs if form is already signed or submitted
      }

      // Check if any of the applicants have physical documents
      if (
        booking?.applicant1?.personalDetails?.isPhysicalImage ||
        booking?.applicant1?.personalDetails?.isPhysicalPan ||
        booking?.applicant1?.personalDetails?.isPhysicalAadhaar ||
        booking?.applicant1?.personalDetails?.isPhysicalPassport ||
        booking?.applicant1?.personalDetails?.isPhysicalOCI ||
        booking?.applicant1?.personalDetails?.isPhysicalOtherDoc ||
        booking?.applicant1?.personalDetails?.isPhysicalAddressProof ||
        booking?.applicant1?.professionalDetails?.isPhysicalGST ||
        booking?.applicant2?.personalDetails?.isPhysicalImage ||
        booking?.applicant2?.personalDetails?.isPhysicalPan ||
        booking?.applicant2?.personalDetails?.isPhysicalAadhaar ||
        booking?.applicant2?.personalDetails?.isPhysicalPassport ||
        booking?.applicant2?.personalDetails?.isPhysicalOCI ||
        booking?.applicant2?.personalDetails?.isPhysicalOtherDoc ||
        booking?.applicant2?.personalDetails?.isPhysicalAddressProof ||
        booking?.applicant2?.professionalDetails?.isPhysicalGST ||
        booking?.applicant3?.personalDetails?.isPhysicalImage ||
        booking?.applicant3?.personalDetails?.isPhysicalPan ||
        booking?.applicant3?.personalDetails?.isPhysicalAadhaar ||
        booking?.applicant3?.personalDetails?.isPhysicalPassport ||
        booking?.applicant3?.personalDetails?.isPhysicalOCI ||
        booking?.applicant3?.personalDetails?.isPhysicalOtherDoc ||
        booking?.applicant3?.personalDetails?.isPhysicalAddressProof ||
        booking?.applicant3?.professionalDetails?.isPhysicalGST ||
        booking?.applicant4?.personalDetails?.isPhysicalImage ||
        booking?.applicant4?.personalDetails?.isPhysicalPan ||
        booking?.applicant4?.personalDetails?.isPhysicalAadhaar ||
        booking?.applicant4?.personalDetails?.isPhysicalPassport ||
        booking?.applicant4?.personalDetails?.isPhysicalOCI ||
        booking?.applicant4?.personalDetails?.isPhysicalOtherDoc ||
        booking?.applicant4?.personalDetails?.isPhysicalAddressProof ||
        booking?.applicant4?.professionalDetails?.isPhysicalGST
      )
        return true;

      if (booking?.payments) {
        booking?.payments?.map((record) => {
          if (record.isPhysicalPaymentProof) {
            return true;
          }
        });
      }
    }
    return false;
  }

  // Sends the signed booking form email to the RM (Relationship Manager)
  async sendSignedBookingEmailToRM({
    opportunityId,
    signedPdfUrl,
    formUrl,
    booking,
    officeUseSectionUrl,
    brandName,
    updatedBookingStatus,
  }: {
    opportunityId: string;
    signedPdfUrl: string;
    formUrl: string;
    booking: any;
    officeUseSectionUrl: string;
    brandName?: string;
    updatedBookingStatus?: BookingFormStatusEnum;
  }): Promise<void> {
    try {
      logger.info(
        `sendSignedBookingEmailToRM service called: ${opportunityId}`,
      );
      const rmId = booking?.closingRm?.id;

      if (!rmId) {
        logger.info(
          `RM ID not found for opportunity ${opportunityId}. Cannot send email.`,
        );
        return;
      }
      const rmName = booking?.closingRm?.name;
      const rmEmail = booking?.closingRm?.email;
      if (!rmEmail) {
        logger.info(
          `RM email not found for opportunity ${opportunityId}. Cannot send email.`,
        );
        return;
      }

      await this.sendEmailToRM({
        rmEmail,
        rmName,
        formUrl,
        signedPdfUrl,
        officeUseSectionUrl,
        booking,
        brandName,
        updatedBookingStatus,
      });
    } catch (error) {
      logger.error('Failed to send signed booking email to RM.', error);
      logsAndErrorHandling(
        'bookingService - sendSignedBookingEmailToRM',
        error,
        {
          opportunityId,
          signedPdfUrl,
          formUrl,
          booking,
          officeUseSectionUrl,
          brandName,
        },
      );
    }
  }

  private async sendEmailToRM({
    rmEmail,
    rmName,
    formUrl,
    signedPdfUrl,
    officeUseSectionUrl,
    booking,
    brandName,
    updatedBookingStatus,
  }: {
    rmEmail: string;
    rmName: string;
    formUrl: string;
    signedPdfUrl: string;
    officeUseSectionUrl: string;
    booking: any;
    brandName?: string;
    updatedBookingStatus?: BookingFormStatusEnum;
  }): Promise<void> {
    logger.info(`Sending signed booking email to RM: ${rmEmail}`);
    const referralFormUrl = this.getReferralFormUrl(brandName);
    const isReferralSource = [
      PrimarySourceEnum.PURVA_PRIVILEGE,
      PrimarySourceEnum.PROVIDENT_PREMIER,
    ].includes(booking?.unitDetails?.primarySource as PrimarySourceEnum);
    const referralUrl = `${referralFormUrl}/${booking?.opportunityId}`;
    const resp = await this.eventEmitter.emitAsync(
      EventMessagesEnum.COMPOSE_EMAIL,
      new ComposeEmailEvent(
        ComposeEmailsEnum.GET_SIGNED_PDF,
        {
          NAME: rmName,
          FORM_URL: formUrl,
          SIGNED_PDF_URL: signedPdfUrl,
          OFFICE_USE_URL: officeUseSectionUrl,
          SIGNATURE_MODE:
            updatedBookingStatus === BookingFormStatusEnum.SIGNED_OFFLINE
              ? '<br><strong>Customer Signature mode:</strong> Offline'
              : '',
          PROJECT_NAME: booking?.unitDetails?.projectName || '',
          UNIT_NUMBER: booking?.unitDetails?.unitNumber || '',
          ENQUIRY_ID: booking?.enquiryId || '',
          CUSTOMER_NAME:
            `${booking.applicant1?.personalDetails?.firstName || ''} ${booking.applicant1?.personalDetails?.lastName || ''}`.trim() ||
            'Customer',
          SOURCE: booking?.unitDetails?.primarySource || '',
          CHANNEL_PARTNER_DETAILS:
            booking?.unitDetails?.primarySource ===
            PrimarySourceEnum.CHANNEL_PARTNER
              ? '<li>Channel Partner details & lead registration proof (if applicable)</li>'
              : '',
          REFERRER_DETAILS: isReferralSource
            ? '<li>Referrer details are correctly captured and signed</li>'
            : '',
          REFERRAL_FORM_URL: isReferralSource
            ? `<p>
          <strong>Referral Form Link:</strong>
          <a href="${referralUrl}" target="_blank" rel="noopener">
          ${referralUrl}
          </a>
          </p>`
            : '',
          OFFLINE_INSTRUCTIONS_LIST:
            updatedBookingStatus === BookingFormStatusEnum.SIGNED_OFFLINE
              ? `
          <li>
          <strong>Scan & Prepare the PDF</strong> - Scan all pages of the booking form, combine them into one PDF file, and ensure the correct page order.
          </li>
          <li>
          <strong>Upload & Proceed</strong> - Upload the final combined PDF in the ‘Booking Form’ section and then proceed to update the ‘Office Use’ section.
          </li>
           `
              : '',
        },
        brandName ?? BRAND_PURAVANKARA,
        { to: rmEmail },
      ),
    );
    if (resp.some((r) => r instanceof Error)) {
      logger.info(`Failed to send signed booking email to RM: ${rmEmail}`);
      return;
    }
    logger.info(`Signed booking email sent to RM: ${rmEmail}`);
  }

  private getReferralFormUrl(brandName?: string): string {
    const puravankaraBaseUrl = this.configService.get<string>(
      'PURAVANKARA_BASE_URL',
    );
    const purvalandBaseUrl =
      this.configService.get<string>('PURVALAND_BASE_URL');
    const provientBaseUrl =
      this.configService.get<string>('PROVIDENT_BASE_URL');

    let baseUrl = puravankaraBaseUrl; // default

    if (brandName === 'Purva Land') {
      baseUrl = purvalandBaseUrl;
    } else if (brandName === 'Provident Limited') {
      baseUrl = provientBaseUrl;
    }

    return `${baseUrl}/${REFERRAL_FORM_URL}`;
  }

  async getStaticDropdown(): Promise<object> {
    try {
      logger.info('getStaticDropdown: returning static picklist object');
      const respObj = {
        resedential_status: ['Indian', 'NRI'],

        numberOf_homes_owned: ['1st Home', '2nd Home', '3rd Home'],
        project_source: [
          {
            Digital: ['Online ads', 'Online search', 'website'],
            'Channel Partner': ['Channel partner'],
            Referral: ['Existing Customer', 'Referred by Family/Friend'],
            Direct: ['Direct Walk-in'],
          },
        ],
        current_residence: [
          'Rented',
          'Owned',
          'Company provided',
          'Living with parents',
          'Living with children',
        ],
        current_residence_type: ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK'],
        purchase_reason: ['Self-use', 'Investment', 'For Relatives/Friends'],
        purchase_duration: ['< 2 Weeks', '1 Month', '2 Months', '> 2 Months'],
        marital_status: ['Single', 'Married'],
        finance_source: [
          'Own funds',
          'Home loan',
          'Sale of existing property',
          'Others',
        ],
        form_status: [
          'Form Submission Pending',
          'GRE Fields Pending',
          'GRE fields Updated ',
          'RM Fields Pending',
          'RM fields Updated ',
          'Completed',
        ],
        gender: ['Male', 'Female', 'Not listed'],
      };

      return respObj;
    } catch (error) {
      logger.error('Error fetching static dropdown data:', error);
      logsAndErrorHandling('bookingService - getStaticDropdown', error, null);
    }
  }

  /** Creates a new booking record.
   * Rules:
   * - Validates opportunity existence
   * - Resolves `primarySourceDisabled` with OfficeUse override
   * - Initializes all fields to null/defaults
   * - Returns the created booking record
   */
  async createBooking(dto: CreateBookingDto): Promise<any> {
    try {
      logger.info(
        `Starting booking creation with payload: ${JSON.stringify(dto)}`,
      );

      const {
        noOfApplicants,
        fillingAs,
        relationBtApplicants,
        opportunityId,
        enquiryId,
        lastStep,
        primarySourceDisabled,
        projectId,
        brandId,
        bookingAs = BookingAsEnum.INDIVIDUAL,
      } = dto;

      // 1) Validate opportunity
      logger.info(`Validating opportunity with ID: ${opportunityId}`);
      const { data: oppDetails } =
        await this.getOpportunityDetailById(opportunityId);

      if (!oppDetails)
        throw new BadRequestException('Invalid Opportunity details.');

      logger.info(`Opportunity validated successfully: ${opportunityId}`);
      const existingBooking = await this.bookingRepository.findOne({
        where: { opportunityId },
        select: ['id', 'opportunityId'],
      });

      if (existingBooking) {
        throw new BadRequestException(
          `Booking already exists for opportunityId: ${opportunityId}`,
        );
      }

      // 2) Resolve primarySourceDisabled with OfficeUse override
      let primarySourceDisabledFinal = primarySourceDisabled ?? false;
      const officeUse = await this.officeUseRepository.findOne({
        where: { opportunityId },
      });

      const closingRmId = officeUse?.closingRmId || null;
      if (officeUse?.primarySourceDisabled === true) {
        primarySourceDisabledFinal = true;

        logger.info(
          `Overriding primarySourceDisabled from OfficeUse for opportunityId: ${opportunityId}, value: ${primarySourceDisabledFinal}`,
        );
      }

      logger.info(
        `Creating booking bookingAs=${bookingAs}, opportunityId=${opportunityId}, enquiryId=${enquiryId}`,
      );

      const groupDetails = await this.findGroupByOpportunityId(opportunityId);
      const groupId = groupDetails?.id || null;
      if (groupDetails) {
        logger.info(
          `Multi-booking group found for opportunityId=${opportunityId}, groupId=${groupId}`,
        );

        // Check if booking already exists for this opportunity in the group
        const existingBookingInGroup = await this.bookingRepository.findOne({
          where: { groupId: groupId },
        });

        if (existingBookingInGroup) {
          throw new BadRequestException({
            message: `A booking already exists in this multi-booking group. Creating another booking is not allowed. Use the Applicant Mapping panel to add applicants to the this booking.`,
            data: `${groupId}`,
          });
        }
      }
      const bookingData = this.bookingRepository.create({
        opportunityId,
        enquiryId,
        projectId,
        brandId,
        lastStep: lastStep ?? 0,
        bookingAs,
        groupId: groupDetails ? groupId : null,
        companyDetails: null,
        noOfApplicants: noOfApplicants ?? 1,
        fillingAs: fillingAs ?? 1,
        relationBtApplicants: relationBtApplicants ?? null,
        primarySourceDisabled: primarySourceDisabledFinal,
        ...(closingRmId ? { closingRm: { id: closingRmId } as Users } : {}),
      });

      const saved = await this.bookingRepository.save(bookingData);
      logger.info(`Booking created successfully. ID: ${saved.id}`);

      return {
        message: 'Booking created successfully.',
        data: saved,
      };
    } catch (error: any) {
      logger.error('Error creating booking', error);
      logsAndErrorHandling('bookingService - createBooking', error, dto);
    }
  }

  /** Finds a multi-booking group by opportunity ID.
   * Rules:
   * - Searches group_booking_mappings table for the given opportunity ID
   * - Excludes deleted groups and mappings (`is_deleted = 0`)
   * - Returns the first matching group or null if not found
   */
  async findGroupByOpportunityId(opportunityId: string) {
    return this.multiBookingRepository
      .createQueryBuilder('group')
      .innerJoin(
        'group_booking_mappings',
        'mapping',
        'mapping.group_id = group.id AND mapping.opportunity_id = :opportunityId AND mapping.is_deleted = 0',
        { opportunityId },
      )
      .andWhere('group.is_deleted = 0')
      .getOne();
  }

  /** Updates company details for a booking.
   * Rules:
   * - Only for Corporate/Partnership bookings
   * - Validates booking existence by opportunityId
   * - Accepts partial payload; merges into `companyDetails`
   * - Overwrites `companyDetails` atomically
   * - Writes `bookingAs` and `lastStep` if provided
   */
  async updateCompanyDetails(dto: UpdateCompanyDetailsDto): Promise<any> {
    try {
      logger.info('Starting booking creation with payload:', dto);

      const {
        opportunityId,
        bookingAs = BookingAsEnum.INDIVIDUAL,
        lastStep,
        gstNumber,
        companyName,
        companyPan,
        companyAddress,
      } = dto;

      // Corporate or Partnership Firm
      if (
        bookingAs !== BookingAsEnum.CORPORATE &&
        bookingAs !== BookingAsEnum.PARTNERSHIP_FIRM
      ) {
        throw new BadRequestException(
          `Invalid bookingAs for company details update: ${bookingAs}`,
        );
      }

      logger.info(`Validating booking with opportunityId: ${opportunityId}`);
      const { data: booking } = await this.getBookingByOppId(opportunityId);
      if (!booking) throw new NotFoundException('Booking not found.');

      if (booking.bookingAs != bookingAs) {
        throw new BadRequestException(
          `Mismatched bookingAs. Expected: ${booking.bookingAs}, Received: ${bookingAs}`,
        );
      }

      logger.info(`Booking validated successfully: ${opportunityId}`);

      if (booking?.isCompleted)
        throw new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        );

      // Update company details atomically
      logger.info(
        `Updating details for Corporate/Partnership firm. bookingAs=${bookingAs}, opportunityId=${opportunityId}`,
      );

      await this.bookingRepository.update(
        {
          opportunityId,
        },
        {
          bookingAs,
          lastStep: lastStep ?? 0,
          companyDetails: {
            gstNumber: gstNumber ?? null,
            companyName: companyName ?? null,
            companyPan: companyPan ?? null,
            companyAddress: companyAddress ?? null,
            documents: booking?.companyDetails?.documents,
          },
        },
      );
      logger.info(
        `Corporate/Partnership) Details updated successfully. ID: ${opportunityId}`,
      );

      return {
        message: '(Corporate/Partnership) Details updated successfully.',
        data: null,
      };
    } catch (error) {
      logger.error('Error updating company details:', error);
      logsAndErrorHandling('bookingService - updateCompanyDetails', error, dto);
    }
  }

  /**
   * Updates company documents for a booking.
   * Rules:
   * - Validates booking existence
   * - All doc keys are mandatory; rejects partial/missing keys
   * - Accepts S3 paths only; no versioning
   * - Overwrites `companyDetails.documents` atomically
   */
  async updateCompanyDocuments(oppId: string, dto: UpdateCompanyDocumentsDto) {
    logger.info(`Validating booking with ID: ${oppId}`);

    try {
      // Fetch booking
      const booking = await this.bookingRepository.findOne({
        where: { opportunityId: oppId },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      logger.info(`Booking validated successfully: ${oppId}`);

      //fields validations based on bookingAs
      const bookingAs = (booking.bookingAs || '').trim() as
        | BookingAsEnum.CORPORATE
        | BookingAsEnum.PARTNERSHIP_FIRM;
      if (!REQUIRED_DOCS_BY_BOOKING_AS[bookingAs])
        throw new BadRequestException(
          `Unsupported bookingAs: ${bookingAs || 'N/A'}`,
        );

      const incoming = dto.documents;

      // Enforce mandatory only when not saving a draft
      if (dto.saveForLater === false) {
        const requiredKeys = REQUIRED_DOCS_BY_BOOKING_AS[bookingAs];
        const missing = this.findMissing(incoming, requiredKeys);
        if (missing.length > 0)
          throw new BadRequestException(
            `Missing mandatory documents: ${missing.join(', ')}`,
          );
      }

      // overwrite only documents
      const existing = booking.companyDetails ?? {};

      const newDocs = { ...incoming };

      booking.companyDetails = { ...existing, documents: newDocs };
      booking.lastStep = dto.lastStep;

      logger.info(
        `Updating company documents for opportunityId=${oppId}, bookingAs=${bookingAs}`,
      );
      const saved = await this.bookingRepository.save(booking);
      logger.info(
        `Company documents updated successfully for opportunityId=${oppId}`,
      );
      return {
        statusCode: SUCCESS,
        message: 'Company documents updated',
        data: {
          opportunityId: saved.opportunityId ?? oppId,
          companyDetails: {
            documents: saved.companyDetails?.documents,
          },
        },
      };
    } catch (error) {
      logger.error('Error updating company documents:', error);
      logsAndErrorHandling('bookingService - updateCompanyDocuments', error, {
        oppId,
        dto,
      });
    }
  }

  /**
   * Updates applicant details for a Corporate booking.
   * Rules:
   * - Validates booking existence by opportunityId
   * - Rejects updates if booking is already completed (signature in progress)
   * - Validates that contact number and email address combination is unique among all applicants
   * - Accepts partial applicant payload; merges into `applicant{N}`
   * - Writes GST fields into `otherDetails` if provided
   * - all fields are required unless `saveForLater === true`
   */
  async updateAuthorisedSignatory(dto: UpdateSignatoryDto): Promise<any> {
    const { lastStep, applicantNumber, opportunityId, ...cleanedApplicantDto } =
      dto;

    logger.info(`Validating booking with opportunityId: ${opportunityId}`);

    try {
      // Fetch booking
      const { data: booking } = await this.getBookingByOppId(opportunityId);
      if (!booking) throw new NotFoundException('Booking not found.');

      logger.info(`Booking validated successfully: ${opportunityId}`);

      if (booking?.isCompleted)
        throw new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        );

      delete cleanedApplicantDto?.saveForLater;

      const applicantKey = `applicant${applicantNumber}`;
      const existingApplicant = booking[applicantKey] || {};

      // Merge new applicant details into booking
      const mergedApplicant = {
        ...existingApplicant,
        ...cleanedApplicantDto,
      };

      //personalDetails
      if (cleanedApplicantDto.personalDetails) {
        mergedApplicant.personalDetails = {
          ...(existingApplicant.personalDetails || {}),
          ...cleanedApplicantDto.personalDetails,
        };

        // Validate duplicate contact details if contact number and email are provided
        const contactNumber = mergedApplicant.personalDetails?.contactNumber;
        const emailAddress = mergedApplicant.personalDetails?.emailAddress;
        const countryCode = mergedApplicant.personalDetails?.countryCode;

        validateDuplicateContactDetails(
          applicantNumber,
          booking,
          contactNumber,
          emailAddress,
          countryCode,
        );
      }

      // --- Build update data ---
      const updateData: Record<string, any> = {
        [applicantKey]: mergedApplicant,
        noOfApplicants: Math.max(booking.noOfApplicants || 0, applicantNumber),
        ...(lastStep && { lastStep }),
      };

      // Encrypt personalDetails before saving to database
      const encryptedData = await encryptBookingApplicants(updateData);

      await this.bookingRepository.update({ opportunityId }, encryptedData);
      logger.info(
        `Corporate applicant updated successfully: opportunityId=${opportunityId}, applicantKey=${applicantKey}`,
      );

      return {
        message: 'Applicant details updated successfully.',
        data: null,
      };
    } catch (error) {
      logger.error('Error updating corporate applicant:', error);
      logsAndErrorHandling(
        'bookingService - updateAuthorisedSignatory',
        error,
        {
          dto,
        },
      );
    }
  }

  /**
   * Function to delete applicant details from a booking.
   * Removes applicant data and decrements the total applicant count.
   * Sets customerLastUpdatedAt timestamp when customer makes changes.
   *
   * @param opportunityId - The opportunity ID (oppId)
   * @param applicantId   - The applicant number to delete (2-4)
   * @returns Success message and updated booking data
   * @throws BadRequestException when applicantId is invalid or applicant doesn't exist
   * @throws NotFoundException when booking is not found
   */
  async deleteAuthorisedSignatory(
    opportunityId: string,
    applicantId: number,
  ): Promise<any> {
    try {
      logger.info(`Validating opportunity with ID: ${opportunityId}`);
      const booking = await this.bookingRepository.findOne({
        where: { opportunityId },
      });

      if (!booking) throw new NotFoundException('Booking not found.');

      logger.info(`Opportunity validated successfully: ${opportunityId}`);

      // "isCompleted" guard, keept it consistent with other flows
      if ((booking as any)?.isCompleted)
        throw new BadRequestException(
          'The booking form has already been submitted and is currently in the signature process.',
        );

      // added validation to not delete 1st signatory
      if (applicantId < 2 || applicantId > 4)
        throw new BadRequestException('applicantId must be between 1 and 5');

      const applicantKey = `applicant${applicantId}`;

      if (!(applicantKey in booking))
        throw new BadRequestException(
          `Applicant key "${String(applicantKey)}" does not exist on booking`,
        );

      logger.info(
        `Deleting applicant details. opportunityId=${opportunityId}, applicantKey=${String(
          applicantKey,
        )}`,
      );

      // Null applicant and decrement count
      (booking as any)[applicantKey] = null;

      // Decrement by 1
      const currentCount = Number(booking.noOfApplicants ?? 0);
      booking.noOfApplicants = Math.max(1, currentCount - 1);

      const updatedBooking = await this.bookingRepository.save(booking);

      logger.info(
        `Applicant ${applicantId} deleted successfully. opportunityId=${opportunityId}, newNoOfApplicants=${updatedBooking.noOfApplicants}`,
      );

      return {
        statusCode: SUCCESS,
        message: `Applicant ${applicantId} details deleted successfully`,
        data: updatedBooking,
      };
    } catch (error) {
      logger.error('Error deleting applicant details:', error);
      logsAndErrorHandling(
        'bookingService - deleteAuthorisedSignatory',
        error,
        {
          opportunityId,
          applicantId,
        },
      );
    }
  }

  isNonEmptyStringArray = (v: unknown) =>
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((s) => typeof s === 'string' && s.trim().length > 0);

  findMissing = <T extends object>(obj: T, requiredKeys: (keyof T)[]) =>
    requiredKeys.filter((k) => !this.isNonEmptyStringArray((obj as any)[k]));

  /**
   * Function to delete a specific payment from a booking form.
   * Validates that the payment exists and belongs to the specified booking.
   *
   * @param deletePaymentsDto - DTO containing paymentId and opportunityId
   * @returns Success message and updated booking form data
   * @throws NotFoundException when booking form or payment not found
   * @throws BadRequestException when payment doesn't belong to the booking
   */
  async deletePaymentDetails(
    deletePaymentsDto: DeleteBookingPaymentsDto,
  ): Promise<any> {
    try {
      const { paymentId, opportunityId } = deletePaymentsDto;
      logger.info('Starting payment deletion for booking:', opportunityId);

      // First, verify the booking form exists
      const booking = await this.bookingRepository.findOne({
        where: { opportunityId },
        relations: ['payments'],
      });

      if (!booking) {
        throw new NotFoundException('Booking form not found');
      }

      // Find the specific payment
      const payment = await this.bookingRepository.manager.findOne(
        BookingPayment,
        {
          where: {
            id: paymentId,
            paymentMode: PaymentModeEnum.OFFLINE,
            booking: { id: booking.id },
          },
        },
      );

      if (!payment) {
        throw new NotFoundException(
          'Payment not found or does not belong to this booking',
        );
      }
      logger.info(
        `Deleting payment ID ${paymentId} for booking ID ${booking.id}`,
      );
      // Delete the payment
      await this.bookingRepository.manager.remove(payment);

      return {
        statusCode: SUCCESS,
        message: 'Payment deleted successfully',
        data: { id: booking?.id },
      };
    } catch (error) {
      logger.error('Error deleting payment details:', error);
      logsAndErrorHandling('bookingService - deletePaymentDetails', error, {
        deletePaymentsDto,
      });
    }
  }

  async mapApplicants(dto: ApplicantMappingDto) {
    const { groupMapping, groupId } = dto;
    logger.info(
      `mapApplicants service called: groupId=${groupId}, mappings=${groupMapping.length}`,
    );

    for (const group of groupMapping) {
      const { opportunityId, mapping, bookingAs, enquiryId } = group;
      logger.info(`mapApplicants: processing opportunityId=${opportunityId}`);
      // Check if target opportunity already exists.
      await this.ensureTargetNotExists(opportunityId);
      // Initialize a new target booking record.
      const target = this.initializeTargetRecord(
        opportunityId,
        groupId,
        enquiryId,
      );
      //Process applicant mappings dynamically
      const processedData = await this.processApplicantMapping(mapping, target);

      target.noOfApplicants = processedData.applicantNumber;
      target.bookingAs =
        bookingAs == BookingAsEnum.PARTNERSHIP_FIRM
          ? BookingAsEnum.PARTNERSHIP_FIRM
          : BookingAsEnum[bookingAs.toUpperCase()];

      // Compute lastStep based on booking type
      if (bookingAs == BookingAsEnum.INDIVIDUAL) {
        this.prepareDataForIndividual(target, processedData);
      } else {
        this.prepareDataForCorpOrPart(target, processedData);
        target.companyDetails = processedData.companyDetails[0];
      }

      await this.bookingRepository.save(target);
    }

    logger.info(`mapApplicants: completed mapping for groupId=${groupId}`);
    return {
      message:
        'All group mappings processed successfully and new records created.',
    };
  }

  async ensureTargetNotExists(opportunityId: string) {
    const existingTarget = await this.bookingRepository.findOne({
      where: { opportunityId },
    });

    if (existingTarget) {
      throw new NotFoundException(
        `Target opportunity ${opportunityId} already exists in Booking.`,
      );
    }
  }

  private initializeTargetRecord(
    opportunityId: string,
    groupId?: string,
    enquiryId?: string,
  ) {
    return this.bookingRepository.create({
      opportunityId,
      enquiryId,
      noOfApplicants: 0,
      fillingAs: 1,
      groupId: groupId ?? null,
    });
  }

  private async resolveApplicantMappingValue(
    sourceValue: string,
    targetApplicantKey: string,
    target: any,
    newApplicants: string[],
    validApplicants: string[],
    companyDetails: object[],
  ) {
    logger.info(
      `resolveApplicantMappingValue called for targetApplicantKey=${targetApplicantKey}, sourceValue=${sourceValue}`,
    );
    if (sourceValue.toLowerCase() === 'new_applicant') {
      target[targetApplicantKey] = null;
      newApplicants.push(targetApplicantKey);
      return;
    }

    const [sourceOppId, applicantNum] = sourceValue.split('/');

    if (!sourceOppId || !applicantNum) {
      throw new Error(
        `Invalid mapping format for ${targetApplicantKey}: ${sourceValue}`,
      );
    }

    const source = await this.bookingRepository.findOne({
      where: { opportunityId: sourceOppId },
    });

    if (!source) {
      throw new NotFoundException(
        `Source opportunity ${sourceOppId} not found for mapping ${targetApplicantKey}.`,
      );
    }

    const sourceApplicantKey = `applicant${applicantNum}`;
    if (!(sourceApplicantKey in source)) {
      throw new Error(
        `Field ${sourceApplicantKey} not found in source opportunity ${sourceOppId}.`,
      );
    }

    target[targetApplicantKey] = source[sourceApplicantKey];
    logger.info(
      `resolveApplicantMappingValue: mapped ${sourceApplicantKey} to ${targetApplicantKey}`,
    );
    if (companyDetails.length === 0) {
      companyDetails.push(source.companyDetails);
    }
    validApplicants.push(targetApplicantKey);
  }

  private async processApplicantMapping(
    mapping: Record<string, any>,
    target: any,
  ) {
    logger.info(
      `processApplicantMapping called with ${Object.keys(mapping).length} fields`,
    );
    let applicantNumber = 0;
    const newApplicants: string[] = [];
    const validApplicants: string[] = [];
    const companyDetails: object[] = [];

    for (const [targetApplicantKey, sourceValue] of Object.entries(mapping)) {
      if (sourceValue != null) {
        applicantNumber++;
        await this.resolveApplicantMappingValue(
          sourceValue,
          targetApplicantKey,
          target,
          newApplicants,
          validApplicants,
          companyDetails,
        );
      }
    }

    logger.info(
      `processApplicantMapping completed: applicantNumber=${applicantNumber}, newApplicants=${newApplicants.length}, validApplicants=${validApplicants.length}`,
    );
    return {
      applicantNumber,
      newApplicants,
      validApplicants,
      companyDetails,
    };
  }

  private prepareDataForIndividual(target: any, processedData: any) {
    const { applicantNumber, newApplicants } = processedData;

    if (newApplicants.length > 0) {
      // Take index of first new applicant - 1
      const firstNewApplicant = newApplicants[0];
      const index = parseInt(firstNewApplicant.replace('applicant', ''), 10);
      target.lastStep = index - 1;
    } else {
      target.lastStep = applicantNumber;
    }
  }

  private prepareDataForCorpOrPart(target: any, processedData: any) {
    const { newApplicants, validApplicants } = processedData;
    if (newApplicants.length > 0) {
      // Take index of first new applicant - 1
      const firstNewApplicant = newApplicants[0];
      const index = parseInt(firstNewApplicant.replace('applicant', ''), 10);
      target.lastStep = index;
    } else if (validApplicants.length > 0) {
      const lastApplicantKey = validApplicants[validApplicants.length - 1];
      const index = parseInt(lastApplicantKey.replace('applicant', ''), 10);
      target.lastStep = index;
    } else {
      target.lastStep = 0;
    }
  }

  /**
   * Retrieves a multi-booking group and returns a summarized list of its bookings.
   *
   * @param id - Identifier of the multi-booking group
   * @param user - User object for access control
   * @param page - Page number for pagination
   * @param limit - Number of records per page
   * @param search - Search term for filtering
   * @returns Promise with group data and paginated opportunities
   *
   * @throws NotFoundException - When the group doesn't exist
   * @remarks Errors are logged via `logsAndErrorHandling`
   */
  async getMultiBookingGroup(
    id: string,
    page?: number,
    limit?: number,
    search?: string,
    user?: any,
  ) {
    try {
      logger.info(`Fetching group details`, { id });
      // Fetch group and mappings in parallel for better performance
      const [group, mappings] = await Promise.all([
        this.multiBookingRepository.findOne({
          where: { id },
          relations: ['createdBy'],
        }),
        this.groupBookingMappingRepository.find({
          where: { group_id: id, is_deleted: 0 },
          select: ['opportunity_id'],
        }),
      ]);

      if (!group)
        throw new NotFoundException('No group exists with the given id');

      const groupedOppoId = mappings.map((m) => m.opportunity_id);

      const rmUser = user || group?.createdBy;
      rmUser.username = rmUser?.username || group?.createdBy?.userName;

      const { data } = await this.getAssignedOpportunities(rmUser, {
        page,
        limit,
        search,
        groupId: id,
        groupDetails: group, // Pass group to avoid duplicate fetch
        isCustomer: !user,
      });

      const { opportunities, totalRecords, currentPage, totalPages } = data;
      let remainingAmount: number | null;

      if (group?.paymentMethod === AmountAdjustmentEnum.LUMPSUM) {
        // get the opportunities array, groupDetails.amount, groupDetails.noOfUnits and distribute the amount to the opportunities
        const { amount, noOfUnits } = group;
        const amountPerUnit = Math.floor(amount / noOfUnits);
        remainingAmount = amount % noOfUnits;
        opportunities.forEach((e) => {
          e.Amount = amountPerUnit;
          remainingAmount--;
          if (remainingAmount > 0) {
            e.Amount += 1;
            remainingAmount--;
          }
        });
      }

      if (user) {
        return {
          statusCode: SUCCESS,
          message: 'Group data fetched successfully!',
          data: {
            opportunities: opportunities,
            groupDetails: {
              ...group,
              groupedOppoId,
            },
            totalRecords: totalRecords,
            currentPage: currentPage,
            limit,
            totalPages: totalPages,
          },
        };
      }

      // Check for completed opportunities synchronously (fast operation)
      const {
        isFirstFormFilled,
        isFirstFormInProgress,
        oppIds,
        isAllFormsFilled,
      } = this.findCompletedOpportunities(opportunities);

      // Only fetch firstFilledUnit if needed (lazy loading)
      const firstFilledUnitPromise =
        isFirstFormFilled && oppIds.length
          ? this.buildFirstFilledUnit(oppIds)
          : Promise.resolve(null);

      const firstFilledUnit = await firstFilledUnitPromise;

      return {
        statusCode: SUCCESS,
        message: 'Group data fetched successfully!',
        data: {
          opportunities: opportunities,
          groupDetails: {
            ...group,
            groupedOppoId,
          },
          totalRecords: totalRecords,
          currentPage: currentPage,
          limit,
          totalPages: totalPages,
          isFirstFormFilled,
          firstFilledUnit,
          isAllFormsFilled,
          isFirstFormInProgress,
        },
      };
    } catch (error) {
      logger.error('Error fetching bookings:', error);
      logsAndErrorHandling('bookingService - getMultiBookingGroup', error, {
        id,
      });
    }
  }

  /**
   * Finds completed opportunities and returns their IDs.
   */
  private findCompletedOpportunities(opportunities: any[]): {
    isFirstFormFilled: boolean;
    isFirstFormInProgress: boolean;
    oppIds: string[];
    isAllFormsFilled: boolean;
  } {
    const oppIds: string[] = [];
    const filledOppIds: string[] = [];
    const completedStatuses = new Set([
      BookingFormStatusEnum.SIGNED,
      BookingFormStatusEnum.SIGNED_OFFLINE,
      BookingFormStatusEnum.RM_UPLOAD_DONE,
      BookingFormStatusEnum.OFFICE_USE_SUBMITTED,
      BookingFormStatusEnum.NOT_SIGNED,
      BookingFormStatusEnum.PARTIALLY_SIGNED,
    ]);

    let isFormInProgress = false;
    for (const opportunity of opportunities) {
      if (completedStatuses.has(opportunity.status)) {
        oppIds.push(opportunity.Id);
      }

      if (opportunity.status == BookingFormStatusEnum.IN_PROGRESS) {
        isFormInProgress = true;
      }

      if (
        opportunity.status !== BookingFormStatusEnum.NEW &&
        opportunity.status !== BookingFormStatusEnum.PRE_BOOKING_SUBMITTED
      ) {
        filledOppIds.push(opportunity.Id);
      }
    }

    const isFirstFormFilled = oppIds.length > 0;
    return {
      isFirstFormFilled,
      isFirstFormInProgress: isFormInProgress && !isFirstFormFilled,
      oppIds,
      isAllFormsFilled: filledOppIds?.length === opportunities.length,
    };
  }

  /**
   * Builds the firstFilledUnit object from a decrypted booking unit.
   */
  private async buildFirstFilledUnit(oppIds: string[]): Promise<any> {
    if (!oppIds.length) return null;

    // Query for the most recent completed booking (optimized query)
    const filledUnit = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.opportunityId IN (:...oppIds)', { oppIds })
      .select([
        'booking.opportunityId',
        'booking.applicant1',
        'booking.applicant2',
        'booking.applicant3',
        'booking.applicant4',
        'booking.bookingAs',
      ])
      .orderBy('booking.createdAt', 'ASC')
      .limit(1)
      .getOne();

    if (!filledUnit) return null;

    const opp = filledUnit.opportunityId;
    const decryptedUnit = await decryptBookingApplicants(filledUnit);
    const mapping: Record<any, any> = {};

    // Extract applicant names
    for (let i = 1; i <= 4; i++) {
      const applicant = decryptedUnit[`applicant${i}`];
      if (
        applicant?.personalDetails?.firstName ||
        applicant?.personalDetails?.lastName
      ) {
        const firstName = applicant.personalDetails?.firstName || '';
        const lastName = applicant.personalDetails?.lastName || '';
        mapping[`applicant${i}`] = {
          value: `${opp}/${i}`,
          name: `${firstName} ${lastName}`.trim(),
        };
      } else {
        mapping[`applicant${i}`] = null;
      }
    }

    return {
      mapping,
      opportunityId: opp,
      bookingAs: filledUnit?.bookingAs ?? null,
    };
  }

  /**
   * To fetch assigned opportunities from SFDC
   * @param user User Obj
   * @param queryDto as Query params
   * @returns any
   */
  async getAssignedOpportunities(user: any, queryDto: any) {
    logger.info(`Entered salesService/getAssignedOpportunities`);
    const {
      page,
      limit,
      search = '',
      status,
      groupId,
      groupDetails,
    } = queryDto;
    const offset = page && limit ? (page - 1) * limit : null;
    const searchStr = search.toLowerCase();

    try {
      // Parallel fetch for performance
      const [oppAccess, fetchedGroupDetails] = await Promise.all([
        this.sfdcService.getUserOppAccess(user?.username),
        groupId && !groupDetails
          ? this.multiBookingRepository.findOne({ where: { id: groupId } })
          : Promise.resolve(groupDetails || null),
      ]);
      const groupDetailsToUse = groupDetails || fetchedGroupDetails;
      const oppList = oppAccess?.data?.opportunities ?? [];
      if (!oppList.length) {
        return {
          statusCode: SUCCESS,
          message: 'No opportunities found.',
          data: {
            opportunities: [],
            totalRecords: 0,
            currentPage: 1,
            totalPages: 0,
          },
        };
      }

      // Apply filters
      let filteredList = this.applyFilters(oppList, searchStr, status);

      // If groupId exists, prioritize grouped opportunities
      let groupedOppoIds: string[] = [];
      if (groupDetailsToUse) {
        const mappings = await this.groupBookingMappingRepository.find({
          where: { group_id: groupDetailsToUse.id, is_deleted: 0 },
          select: ['opportunity_id'],
        });
        groupedOppoIds = mappings.map((m) => m.opportunity_id);
      }
      if (groupedOppoIds?.length) {
        const groupedIds = new Set(groupedOppoIds);
        let groupedOpps = oppList
          .filter((opp) => groupedIds.has(opp.Id))
          .map((opp) => ({ ...opp, isSelected: true }));

        if (searchStr) {
          groupedOpps = this.applyFilters(groupedOpps, searchStr, null);
        }

        const otherOpps = groupDetails
          ? []
          : filteredList.filter((opp) => !groupedIds.has(opp.Id));
        filteredList = [...groupedOpps, ...otherOpps];
      }

      const totalRecords = filteredList.length;
      const paginatedList =
        offset || offset === 0
          ? filteredList.slice(offset, offset + limit)
          : filteredList;
      const oppIds = paginatedList.map((opp) => opp.Id);

      const { data: bookingList } = await this.getBookingsByOppIds(oppIds);

      const bookingMap = new Map(bookingList.map((b) => [b.opportunityId, b]));

      const opportunities = paginatedList.map((opp) => {
        const booking: any = bookingMap.get(opp.Id);
        return {
          ...opp,
          Name: booking?.applicantName || opp.Name,
          bookingAs: booking?.bookingAs,
          status: booking?.bookingFormStatus ?? 'New',
          isCompleted: booking?.isCompleted ?? false,
        };
      });

      return {
        statusCode: SUCCESS,
        message: 'Opportunity list fetched successfully.',
        data: {
          opportunities,
          totalRecords,
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
        },
      };
    } catch (error) {
      logger.error(
        `Error fetching assigned opportunities for user ${user?.name}: ${error.message}`,
        error.stack,
      );
      logsAndErrorHandling('salesService - getAssignedOpportunities', error, {
        user,
        queryDto,
      });
    }
  }

  // Helper: filter function (single-pass)
  private readonly applyFilters = (
    list: any[],
    searchStr: string,
    status: string,
  ) => {
    return list.filter((opp) => {
      const bfStatus = (opp.BFstatus || '').toLowerCase();
      const name = (opp.Name || '').toLowerCase();
      const id = (opp.Id || '').toLowerCase();
      const enqRef = (opp.enqrefno || '').toLowerCase();
      const unitNo = (opp.unitno || '').toLowerCase();
      const projectName = (opp.Project || '').toLowerCase();

      // Status filter
      let statusMatch: boolean;
      if (!status) {
        statusMatch = true;
      } else if (status === 'New') {
        statusMatch = bfStatus === '';
      } else {
        statusMatch = bfStatus.includes(status.toLowerCase());
      }

      // Search filter
      const searchMatch =
        !searchStr ||
        id.includes(searchStr) ||
        name.includes(searchStr) ||
        enqRef.includes(searchStr) ||
        unitNo.includes(searchStr) ||
        projectName.includes(searchStr);

      return statusMatch && searchMatch;
    });
  };

  async getBookingsByOppIds(oppIds: string[]): Promise<any> {
    logger.info(`Entered salesService/getBookingsByOppIds, ${oppIds}`);
    if (!oppIds.length) {
      return {
        message: 'No Bookings Found.',
        data: [],
      };
    }

    // Validate oppIds
    const [bookings, docsOppIds] = await Promise.all([
      this.bookingRepository.find({
        where: { opportunityId: In(oppIds) },
        select: [
          'opportunityId',
          'bookingFormStatus',
          'isCompleted',
          'bookingAs',
          'applicant1',
        ], // Add required fields here
      }),
      this.bookingDocumentsService.getOppWithDocuments(oppIds),
    ]);

    // Decrypt bookings and extract applicant names
    const decryptedBookings = await Promise.all(
      bookings?.map(async (booking) => {
        const decrypted = await decryptBookingApplicants(booking);
        const applicant1 = decrypted?.applicant1;
        const firstName = applicant1?.personalDetails?.firstName || '';
        const lastName = applicant1?.personalDetails?.lastName || '';
        const applicantName = `${firstName} ${lastName}`.trim() || null;

        return {
          ...booking,
          applicantName,
        };
      }) || [],
    );

    // Convert bookings to a Map for fast lookup
    const bookingMap = new Map(
      decryptedBookings.map((b) => [b.opportunityId, b]),
    );

    // Convert docsOppIds to a Set for quick existence check
    const docsSet = new Set(docsOppIds?.data);

    // Loop through oppIds and build the response
    const result = oppIds
      .filter((oppId) => bookingMap.has(oppId) || docsSet.has(oppId))
      .map((oppId) => {
        if (bookingMap.has(oppId)) {
          const booking = bookingMap.get(oppId);
          return {
            bookingAs: booking?.bookingAs,
            opportunityId: oppId,
            bookingFormStatus: booking?.bookingFormStatus,
            isCompleted: booking?.isCompleted,
            applicantName: booking?.applicantName,
          };
        } else {
          return {
            opportunityId: oppId,
            bookingFormStatus: BookingFormStatusEnum.PRE_BOOKING_SUBMITTED,
            isCompleted: false,
          };
        }
      });
    return {
      message: 'Bookings fetched successfully.',
      data: result,
    };
  }

  /**
   * Updates the status of a multi-booking group based on the completion status of its bookings.
   *
   * The function checks how many bookings in the group have completed statuses
   * (SIGNED, SIGNED_OFFLINE, RM_UPLOAD_DONE, or OFFICE_USE_SUBMITTED) and updates
   * the group status accordingly:
   * - PARTIALLY_SIGNED: If some (but not all) bookings are completed
   * - SIGNED: If all bookings in the group are completed
   * - No update: If the status hasn't changed or no bookings are completed
   *
   * @param groupId - The unique identifier of the multi-booking group to update
   * @returns Promise<void> - Resolves when the update is complete or silently returns if group not found
   *
   * @remarks
   * - The function uses database-level counting for optimal performance
   * - Only updates the group status if it has actually changed
   * - Errors are logged via `logsAndErrorHandling` before the function returns
   *
   * @example
   * ```typescript
   * await bookingsService.updateGroupStatus('group-uuid-123');
   * ```
   */
  async updateGroupStatus(groupId: string): Promise<void> {
    if (!groupId) return;

    try {
      logger.info(`updateGroupStatus service called: ${groupId}`);
      if (!groupId) return;

      // Fetch the group to verify it exists
      const group = await this.multiBookingRepository.findOne({
        where: { id: groupId },
        select: ['status'],
      });

      if (!group) return;

      // Fetch opportunity IDs from mappings table
      const mappings = await this.groupBookingMappingRepository.find({
        where: { group_id: groupId, is_deleted: 0 },
        select: ['opportunity_id'],
      });

      const oppIds = mappings.map((m) => m.opportunity_id);

      if (!oppIds?.length) return;

      const completedStatuses = [
        BookingFormStatusEnum.SIGNED,
        BookingFormStatusEnum.SIGNED_OFFLINE,
        BookingFormStatusEnum.RM_UPLOAD_DONE,
        BookingFormStatusEnum.OFFICE_USE_SUBMITTED,
      ];

      // Count completed bookings
      const count = await this.bookingRepository.count({
        where: {
          opportunityId: In(oppIds),
          bookingFormStatus: In(completedStatuses),
        },
      });

      // Determine the new status
      let newStatus: MultiBookingStatusEnum | null = null;
      if (count > 0 && count < oppIds.length) {
        newStatus = MultiBookingStatusEnum.PARTIALLY_SIGNED;
      } else if (count > 0 && count === oppIds.length) {
        newStatus = MultiBookingStatusEnum.SIGNED;
      }

      // Only update if status has changed
      if (newStatus && newStatus !== group.status) {
        await this.multiBookingRepository.update(groupId, {
          status: newStatus,
        });
      }

      return;
    } catch (error) {
      logger.error(`Error updating group status`, error.stack);
      logsAndErrorHandling('bookingService - updateGroupStatus', error, {
        groupId,
      });
    }
  }

  /**
   * Fetches booking documents for a given opportunity ID
   */
  async getBookingDocs(oppId: string) {
    logger.info(`getBookingDocs service called: ${oppId}`);
    const [officeUseRes, docsRes] = await Promise.all([
      this.getOfficeUseByOppId(oppId),
      this.bookingDocumentsService.getDocuments(
        oppId,
        BookingDocTypeEnum.ADDITIONAL_DOCS,
      ),
    ]);

    const officeUse = officeUseRes?.data;
    if (!officeUse) {
      throw new NotFoundException('Office use not found.');
    }
    const additionalDocs =
      docsRes?.data?.map((doc: any) => ({ name: doc.name, path: doc.path })) ||
      [];
    logger.info(`getBookingDocs: booking documents fetched for ${oppId}`);
    return {
      statusCode: SUCCESS,
      message: 'Booking documents fetched successfully.',
      data: {
        opportunityId: oppId,
        officeUseDocs: officeUse.documents || {},
        additionalDocs,
      },
    };
  }

  /**
   * Validates and parses mapping value to extract voucher applicant number
   * @param mappingValue - The mapping value (e.g., "voucherId/2" or "new_applicant")
   * @param bookingApplicantKey - The booking applicant key for error messages
   * @returns The voucher applicant number, or null if it's "new_applicant"
   * @throws BadRequestException if mapping format is invalid
   */
  private parseMappingValue(
    mappingValue: string,
    bookingApplicantKey: string,
  ): number | null {
    if (mappingValue.toLowerCase().trim() === 'new_applicant') {
      return null;
    }

    const parts = mappingValue.split('/');
    if (parts.length !== 2) {
      throw new BadRequestException(
        `Invalid mapping format for ${bookingApplicantKey}: ${mappingValue}. Expected format: "voucherId/applicantNumber" or "new_applicant"`,
      );
    }

    const voucherApplicantNumber = Number.parseInt(parts[1], 10);
    if (
      Number.isNaN(voucherApplicantNumber) ||
      voucherApplicantNumber < 1 ||
      voucherApplicantNumber > 4
    ) {
      throw new BadRequestException(
        `Invalid applicant number in mapping ${bookingApplicantKey}: ${mappingValue}. Applicant number must be between 1 and 4`,
      );
    }

    return voucherApplicantNumber;
  }

  /**
   * Transforms voucher applicant data structure to booking applicant structure
   * @param voucherApplicantData - The applicant data from voucher form
   * @param bookingAs - The booking type (Individual, Corporate, or Partnership Firm)
   * @returns Transformed applicant data in booking format
   */
  private transformVoucherApplicantToBooking(
    voucherApplicantData: any,
    bookingAs?: BookingAsEnum,
  ): any {
    const applicantData = structuredClone(voucherApplicantData);
    const isCorporateOrPartnership =
      bookingAs === BookingAsEnum.CORPORATE ||
      bookingAs === BookingAsEnum.PARTNERSHIP_FIRM;
    const fullName =
      applicantData?.personalDetails?.firstName &&
      applicantData?.personalDetails?.lastName
        ? applicantData?.personalDetails?.firstName +
          ' ' +
          applicantData?.personalDetails?.lastName
        : null;

    // Ensure personalDetails exists
    if (!applicantData.personalDetails) {
      applicantData.personalDetails = {};
    }

    if (isCorporateOrPartnership) {
      // For Corporate/Partnership Firm: Keep contact fields in personalDetails
      // Move document fields from contactDetails to personalDetails
      applicantData.personalDetails.panImage =
        applicantData.contactDetails?.panImage ?? null;
      applicantData.personalDetails.panNumber =
        applicantData.contactDetails?.panNumber ?? null;
      applicantData.personalDetails.aadhaarImage =
        applicantData.contactDetails?.aadhaarImage ?? null;
      applicantData.personalDetails.aadhaarNumber =
        applicantData.contactDetails?.aadhaarNumber ?? null;

      // Document physical flags
      applicantData.personalDetails.isPhysicalPan =
        applicantData.contactDetails?.isPhysicalPan ?? false;
      applicantData.personalDetails.isPhysicalAadhaar =
        applicantData.contactDetails?.isPhysicalAadhaar ?? false;
      applicantData.personalDetails.isPhysicalImage =
        applicantData.personalDetails?.isPhysicalImage ?? false;

      // Move permanentAddress from contactDetails to personalDetails
      applicantData.personalDetails.permanentAddress =
        applicantData.contactDetails?.permanentAddress ?? null;

      // Keep contact fields in personalDetails (they're already there from voucher)
      // Ensure they exist
      applicantData.personalDetails.countryCode =
        applicantData.personalDetails?.countryCode ||
        applicantData.contactDetails?.countryCode ||
        null;
      applicantData.personalDetails.contactNumber =
        applicantData.personalDetails?.contactNumber ||
        applicantData.contactDetails?.contactNumber ||
        null;
      applicantData.personalDetails.emailAddress =
        applicantData.personalDetails?.emailAddress ||
        applicantData.contactDetails?.emailAddress ||
        null;

      // Add missing fields to personalDetails (Corporate/Partnership Firm specific)
      applicantData.personalDetails.nameAsPerPan = fullName;
      applicantData.personalDetails.isPanVerified = false;
      applicantData.personalDetails.primaryDocument = null;
      applicantData.personalDetails.nameAsPerAadhaar = fullName;
      applicantData.personalDetails.isAadhaarVerified = false;

      // Remove contactDetails and professionalDetails for Corporate/Partnership Firm
      delete applicantData.contactDetails;
      delete applicantData.professionalDetails;

      return applicantData;
    }

    // For Individual: Use existing logic with contactDetails and professionalDetails
    // Ensure contactDetails exists
    if (!applicantData.contactDetails) {
      applicantData.contactDetails = {};
    }

    // Move contact fields from personalDetails to contactDetails
    applicantData.contactDetails.countryCode =
      applicantData.personalDetails?.countryCode ||
      applicantData.contactDetails?.countryCode ||
      null;
    applicantData.contactDetails.contactNumber =
      applicantData.personalDetails?.contactNumber ||
      applicantData.contactDetails?.contactNumber ||
      null;
    applicantData.contactDetails.emailAddress =
      applicantData.personalDetails?.emailAddress ||
      applicantData.contactDetails?.emailAddress ||
      null;
    applicantData.contactDetails.alternateCountryCode =
      applicantData.personalDetails?.alternateCountryCode || null;
    applicantData.contactDetails.alternateContactNumber =
      applicantData.personalDetails?.alternateContactNumber || null;

    // Move document fields from contactDetails to personalDetails
    applicantData.personalDetails.panImage =
      applicantData.contactDetails?.panImage ?? null;
    applicantData.personalDetails.panNumber =
      applicantData.contactDetails?.panNumber ?? null;
    applicantData.personalDetails.aadhaarImage =
      applicantData.contactDetails?.aadhaarImage ?? null;
    applicantData.personalDetails.aadhaarNumber =
      applicantData.contactDetails?.aadhaarNumber ?? null;
    applicantData.personalDetails.ociImage =
      applicantData.contactDetails?.ociImage ?? null;
    applicantData.personalDetails.ociNumber =
      applicantData.contactDetails?.ociNumber ?? null;
    applicantData.personalDetails.passportImage =
      applicantData.contactDetails?.passportImage ?? null;
    applicantData.personalDetails.passportNumber =
      applicantData.contactDetails?.passportNumber ?? null;

    // Document physical flags
    applicantData.personalDetails.isPhysicalPan =
      applicantData.contactDetails?.isPhysicalPan ?? false;
    applicantData.personalDetails.isPhysicalAadhaar =
      applicantData.contactDetails?.isPhysicalAadhaar ?? false;
    applicantData.personalDetails.isPhysicalOCI =
      applicantData.contactDetails?.isPhysicalOCI ?? false;
    applicantData.personalDetails.isPhysicalPassport =
      applicantData.contactDetails?.isPhysicalPassport ?? false;
    applicantData.personalDetails.isPhysicalOtherDoc =
      applicantData.contactDetails?.isPhysicalOtherDoc ?? false;

    // OCI alternate document fields
    applicantData.personalDetails.OCIAlternateDocType =
      applicantData.contactDetails?.OCIAlternateDocType ?? null;
    applicantData.personalDetails.OCIAlternateDocImage =
      applicantData.contactDetails?.OCIAlternateDocImage ?? null;

    // Move maritalStatus from personalDetails to contactDetails
    applicantData.contactDetails.maritalStatus =
      applicantData.personalDetails?.maritalStatus ?? null;

    // Add missing fields to contactDetails (booking-only fields)
    applicantData.contactDetails.anniversaryDate = null;
    applicantData.contactDetails.motherTongue = null;

    // Add missing fields to personalDetails (booking-only fields not in voucher)
    applicantData.personalDetails.dobAsPan = null;
    applicantData.personalDetails.dobAsAadhaar = null;
    applicantData.personalDetails.isPanOcrDone = false;
    applicantData.personalDetails.isPanSkipped = false;
    applicantData.personalDetails.nameAsPerPan = fullName;
    applicantData.personalDetails.ociCardImage = null;
    applicantData.personalDetails.isPanVerified = false;
    applicantData.personalDetails.legalGuardian = null;
    applicantData.personalDetails.primaryDocument = null;
    applicantData.personalDetails.addressProofType = null;
    applicantData.personalDetails.isAadhaarOcrDone = false;
    applicantData.personalDetails.isAadhaarSkipped = false;
    applicantData.personalDetails.legalGuardianDoc = null;
    applicantData.personalDetails.nameAsPerAadhaar = fullName;
    applicantData.personalDetails.addressProofImage = null;
    applicantData.personalDetails.isAadhaarVerified = false;
    applicantData.personalDetails.isPassportSkipped = false;
    applicantData.personalDetails.isPhysicalAddressProof = null;
    applicantData.personalDetails.isPhysicalLegalGuardianDoc = null;
    applicantData.personalDetails.fatherName = null;
    applicantData.personalDetails.motherName = null;
    applicantData.personalDetails.spouseDob = null;

    // Ensure professionalDetails exists
    if (!applicantData.professionalDetails) {
      applicantData.professionalDetails = {};
    }

    // Add missing fields to professionalDetails (booking-only fields not in voucher)
    applicantData.professionalDetails.gstNumber = null;
    applicantData.professionalDetails.gstLegalName = null;
    applicantData.professionalDetails.isGstClaimed = false;
    applicantData.professionalDetails.isPhysicalGST = false;
    applicantData.professionalDetails.gstCertificate = null;
    applicantData.professionalDetails.gstBusinessName = null;

    // Add top-level booking-only fields
    applicantData.hasContinuedAsMinor = null;

    // Clean up - remove moved fields from original locations
    delete applicantData.personalDetails.countryCode;
    delete applicantData.personalDetails.contactNumber;
    delete applicantData.personalDetails.emailAddress;
    delete applicantData.personalDetails.alternateCountryCode;
    delete applicantData.personalDetails.alternateContactNumber;
    delete applicantData.personalDetails.maritalStatus;

    delete applicantData.contactDetails.panImage;
    delete applicantData.contactDetails.panNumber;
    delete applicantData.contactDetails.aadhaarImage;
    delete applicantData.contactDetails.aadhaarNumber;
    delete applicantData.contactDetails.ociImage;
    delete applicantData.contactDetails.ociNumber;
    delete applicantData.contactDetails.passportImage;
    delete applicantData.contactDetails.passportNumber;
    delete applicantData.contactDetails.isPhysicalPan;
    delete applicantData.contactDetails.isPhysicalAadhaar;
    delete applicantData.contactDetails.isPhysicalOCI;
    delete applicantData.contactDetails.isPhysicalPassport;
    delete applicantData.contactDetails.isPhysicalOtherDoc;
    delete applicantData.contactDetails.OCIAlternateDocType;
    delete applicantData.contactDetails.OCIAlternateDocImage;

    return applicantData;
  }

  /**
   * Counts the number of actual applicants being mapped (excludes "new_applicant" and empty values)
   * @param mapping - The mapping object
   * @returns The count of actual applicants
   */
  private countMappedApplicants(mapping: Record<string, string>): number {
    return Object.values(mapping).filter(
      (value) => value && value.trim() !== '',
    ).length;
  }

  async resolveApplicantMappings(
    voucherForm: any,
    mapping: Record<string, string>,
    opportunityId: string,
    bookingAs?: BookingAsEnum,
    manager?: EntityManager,
  ): Promise<any> {
    try {
      logger.info(
        `resolveApplicantMappings called for opportunityId: ${opportunityId}`,
      );

      const mappedApplicantCount = this.countMappedApplicants(mapping);
      if (mappedApplicantCount === 0) {
        throw new BadRequestException(
          'At least one applicant mapping is required',
        );
      }

      const bookingRepo = manager
        ? manager.getRepository(Booking)
        : this.bookingRepository;

      // Find existing booking
      const existingBooking = await bookingRepo.findOne({
        where: { opportunityId },
      });

      if (!existingBooking) {
        throw new NotFoundException(
          `Booking not found for opportunityId: ${opportunityId}`,
        );
      }

      // Update booking data with mapped applicants - only noOfApplicants and mappings
      const bookingData: Partial<Booking> = {
        noOfApplicants: mappedApplicantCount,
        isEOIBooking: true,
        voucherId: voucherForm?.id || null,
        campaignId: voucherForm?.campaign?.id || null,
      };

      // Map applicants according to the mapping
      for (const [bookingApplicantKey, mappingValue] of Object.entries(
        mapping,
      )) {
        if (!mappingValue || mappingValue.trim() === '') {
          continue;
        }

        const voucherApplicantNumber = this.parseMappingValue(
          mappingValue,
          bookingApplicantKey,
        );

        if (voucherApplicantNumber === null) {
          bookingData[bookingApplicantKey] = null;
          continue;
        }

        const voucherApplicantKey = `applicant${voucherApplicantNumber}`;
        const voucherApplicantData = voucherForm[voucherApplicantKey];

        if (!voucherApplicantData) {
          logger.warn(
            `Voucher applicant ${voucherApplicantKey} not found for mapping ${bookingApplicantKey}`,
          );
          continue;
        }

        bookingData[bookingApplicantKey] =
          this.transformVoucherApplicantToBooking(
            voucherApplicantData,
            bookingAs,
          );
      }

      const encryptedBookingData = await encryptBookingApplicants(bookingData);

      // Update the existing booking
      const updatedBooking = await bookingRepo.update(
        { opportunityId },
        encryptedBookingData,
      );

      logger.info(
        `Booking updated successfully with ID: ${existingBooking.id} for opportunityId: ${opportunityId}`,
      );

      return updatedBooking;
    } catch (error) {
      logger.error('Error in resolveApplicantMappings:', error);
      logsAndErrorHandling(
        'BookingsService - resolveApplicantMappings',
        error,
        {
          opportunityId,
          mapping,
          bookingAs,
        },
      );
    }
  }

  async mapVoucherApplicants(dto: MapVoucherApplicantsDto): Promise<any> {
    try {
      const { voucherId, opportunityId, mapping, bookingAs } = dto;

      return await this.bookingRepository.manager.transaction(
        async (manager) => {
          const voucherFormRepo = manager.getRepository(VoucherForm);

          const voucherForm = await voucherFormRepo.findOne({
            where: { voucherId, isDeleted: false },
            select: [
              'id',
              'voucherId',
              'applicant1',
              'applicant2',
              'applicant3',
              'applicant4',
            ],
            relations: ['campaign'],
          });

          if (!voucherForm) {
            throw new NotFoundException('Voucher form not found');
          }

          await this.resolveApplicantMappings(
            voucherForm,
            mapping,
            opportunityId,
            bookingAs,
            manager,
          );

          // update voucher.bookingStatus to Pre Filled
          if (voucherForm.campaign.stage === EoiCampaignStageType.LAUNCH) {
            await voucherFormRepo.update(
              { voucherId },
              { bookingStatus: VoucherBookingStatusEnum.PRE_FILLED },
            );
          }

          return {
            statusCode: 200,
            message: 'Voucher applicants mapped successfully to booking.',
            data: null,
          };
        },
      );
    } catch (error) {
      logger.error(`Error fetching voucher applicants: ${error}`);
      logsAndErrorHandling(
        'VoucherFormsService - mapVoucherApplicants',
        error,
        {
          dto,
        },
      );
    }
  }
}
