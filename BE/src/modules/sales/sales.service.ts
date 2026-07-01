import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Booking,
  BookingDocument,
  BookingOfficeUse,
  BookingPayment,
  MultiBooking,
  GroupBookingMapping,
  Users,
} from 'src/entities';
import { Brackets, DataSource, In, IsNull, Repository } from 'typeorm';
import { PreBookingDto } from './dto/pre-booking.dto';
import {
  BookingFormStatusEnum,
  FormType,
  SignatureTypeEnum,
} from 'src/enums/booking-form-status.enum';
import {
  BRAND_PURAVANKARA,
  GROUP_LISTING_URL,
  SUCCESS,
} from 'src/config/constants';
import { PostBookingDto } from './dto/post-booking.dto';
import { getBookingFileName } from 'src/utils/getBookingFileName';
import { BookingDocumentsService } from '../booking_documents/booking_documents.service';
import {
  BookingDocTypeEnum,
  BookingPDFTypeEnum,
  BookingStageEnum,
} from 'src/enums/booking-documents.enum';
import { PdfService } from '../pdf/pdf.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
} from 'src/enums/event-messages.enum';
import { ComposeEmailEvent } from 'src/events/email.events';
import { OfficeUseDto } from './dto/office-use.dto';
import { RecipientRolesEnum, RolesEnum } from 'src/enums/roles.enum';
import { logger } from 'src/logger/logger';
import {
  dedupe,
  generateFormUrlByType,
  getS3Url,
  isPdfPath,
  resolveSalesTeamInfo,
  safePickPdfPathsFromDocsSvc,
  stripQuery,
  toStringArray,
} from 'src/helpers/bookings.helper';
import { ConfigService } from '@nestjs/config';
import { SfdcService } from '../sfdc/sfdc.service';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import {
  encryptBookingApplicants,
  decryptBookingApplicants,
} from 'src/utils/encryption-decryption.util';
import { BookingsService } from '../bookings/bookings.service';
import { prepareOfficeUsePayload } from 'src/helpers/officeUse.helper';
import { CreateUpdateGroupDto } from './dto/multi-booking.dto';
import {
  ApplicantSlot,
  ManageApplicantsDto,
  parseValues,
  validateApplicantValue,
} from './dto/manage-applicant.dto';
import { safeString } from 'src/helpers';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';
import { ProjectUserMapping } from '../masters/projects/entities/project_user_mapping.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,

    @InjectRepository(BookingOfficeUse)
    private readonly officeUseRepository: Repository<BookingOfficeUse>,

    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    @InjectRepository(MultiBooking)
    private readonly multiBookingRepository: Repository<MultiBooking>,

    @InjectRepository(GroupBookingMapping)
    private readonly groupBookingMappingRepository: Repository<GroupBookingMapping>,

    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepository: Repository<ProjectUserMapping>,

    // @InjectRepository(BookingDocument)
    private readonly bookingDocumentsService: BookingDocumentsService,
    private readonly pdfService: PdfService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly sfdcService: SfdcService,
    private readonly bookingsService: BookingsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   *
   * @param user as User object
   * @param oppId as Opportunity ID
   * @param preBookingDto as PreBookingDto object
   * @description Submits pre-booking data and updates the booking status.
   * @returns Promise<any>
   */
  async submitPreBooking(
    user: any,
    oppId: string,
    preBookingDto: PreBookingDto,
  ): Promise<any> {
    try {
      logger.info(`Entered salesService/submitPreBooking, ${oppId}`);
      if (!oppId) {
        throw new BadRequestException('Opportunity ID is required.');
      }
      const {
        isPreBookingSubmitted,
        primarySourceDisabled,
        agreementValue,
        bookingAmount,
      } = preBookingDto;
      const booking = await this.bookingRepository.findOne({
        where: { opportunityId: oppId },
      });
      const userDetails = await this.usersRepository.findOne({
        where: { id: user.dbId },
        select: ['name', 'signatureImage'],
      });

      const updateData: Record<string, any> = {};
      if (booking && isPreBookingSubmitted) {
        updateData.primarySourceDisabled = primarySourceDisabled;
        updateData.closingRm = { id: user?.dbId } as Users;

        await this.bookingRepository.update(
          { opportunityId: oppId },
          updateData,
        );

        // Update closing_rm_id in booking_office_use table
        await this.updateOfficeUseClosingRm(oppId, user?.dbId);
      } else if (primarySourceDisabled !== undefined) {
        await this.updateOfficeUseClosingRm(
          oppId,
          user?.dbId,
          primarySourceDisabled,
        );
      }

      // Save agreement details in booking_office_use
      await this.officeUseRepository.update(
        { opportunityId: oppId },
        {
          agreementValue,
          ...(bookingAmount !== undefined && { bookingAmount }),
        },
      );

      const { data: docsList } =
        await this.bookingDocumentsService.getDocuments(
          oppId,
          BookingDocTypeEnum.PRE_BOOKING,
          BookingStageEnum.PRE_BOOKING,
          false, // fetch not signed docs
        );

      if (docsList && docsList.length > 0 && userDetails?.signatureImage) {
        const costSheetDoc = docsList.find((doc) => doc.name === 'Cost Sheet');
        if (costSheetDoc && !costSheetDoc?.isSigned) {
          await this.pdfService.placeSignature(
            costSheetDoc?.path,
            userDetails?.name,
            userDetails?.signatureImage,
          );

          await this.bookingDocumentsService.markAsSigned(costSheetDoc?.id);
        }
      }

      return {
        statusCode: SUCCESS,
        message: 'Data saved successfully.',
        data: {
          id: booking?.id,
          updateData,
        },
      };
    } catch (error) {
      logger.error(`Failed to save data: ${oppId}. Error: ${error}`);
      logsAndErrorHandling('salesService - submitPreBooking', error, {
        user,
        oppId,
        preBookingDto,
      });
    }
  }

  /**
   *
   * @param oppId as Opportunity ID
   * @param signedPdf as Base64 encoded signed PDF
   * @returns Promise<any>
   * @description Uploads the signed PDF for the given opportunity ID.
   *
   */
  async uploadSignPdf(oppId: string, signedPdf: string): Promise<any> {
    try {
      logger.info(`Entered salesService/uploadSignPdf', ${oppId}`);
      if (!oppId) throw new BadRequestException('Opportunity ID is required.');

      if (!signedPdf)
        throw new BadRequestException('Signed PDF data is required.');

      // Check if the booking exists and is completed
      const booking = await this.bookingRepository.findOne({
        where: { opportunityId: oppId },
        select: ['isCompleted'],
      });
      if (!booking) throw new NotFoundException('Invalid booking details.');

      if (!booking.isCompleted) {
        throw new BadRequestException(
          'Booking Form not completed. Please ask customer to complete.',
        );
      }
      // Update only the `signedPdf` column
      await this.bookingRepository.update(
        { opportunityId: oppId },
        { signedPdf },
      );

      return {
        statusCode: SUCCESS,
        message: 'Signed PDF updated successfully.',
        data: {
          id: booking?.id,
          signedPdf,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to update signed PDF for oppId: ${oppId}. Error: ${error.message}`,
      );
      logsAndErrorHandling('salesService - uploadSignPdf', error, {
        oppId,
        signedPdf,
      });
    }
  }

  /**
   * To merge Post booking data to main booking applicant data
   * @param currentData as Object from booking table
   * @param newData as form data
   * @returns Obj
   */
  private mergeObjects(currentData: any, newData: any): any {
    const mergedResult = { ...currentData }; // Start with all current data

    // Iterate over newData keys to merge/add them
    Object.keys(newData).forEach((key) => {
      if (newData[key] !== undefined && newData[key] !== null) {
        if (
          typeof newData[key] === 'object' &&
          !Array.isArray(newData[key]) &&
          currentData[key] &&
          typeof currentData[key] === 'object' &&
          !Array.isArray(currentData[key])
        ) {
          // Handle nested objects recursively (deep merge)
          mergedResult[key] = this.mergeObjects(currentData[key], newData[key]);
        } else {
          // Update primitive, array fields, or new fields
          mergedResult[key] = newData[key];
        }
      }
    });

    return mergedResult;
  }

  /**
   * Builds applicant updates by deep-merging incoming applicant payloads
   * into the corresponding applicants on the decrypted booking. Only
   * applicants present in the payload (and on the booking) are merged.
   *
   * @param booking - Decrypted booking object from the database
   * @param payload - Post-booking DTO containing partial applicant data
   * @returns An object with only applicantX keys that require updating
   */
  private buildApplicantUpdates(
    booking: any,
    payload: PostBookingDto,
  ): Record<string, any> {
    const updates: Record<string, any> = {};

    if (payload.applicant1 && booking.applicant1) {
      updates.applicant1 = this.mergeObjects(
        booking.applicant1,
        payload.applicant1,
      );
    }
    if (payload.applicant2 && booking.applicant2) {
      updates.applicant2 = this.mergeObjects(
        booking.applicant2,
        payload.applicant2,
      );
    }
    if (payload.applicant3 && booking.applicant3) {
      updates.applicant3 = this.mergeObjects(
        booking.applicant3,
        payload.applicant3,
      );
    }
    if (payload.applicant4 && booking.applicant4) {
      updates.applicant4 = this.mergeObjects(
        booking.applicant4,
        payload.applicant4,
      );
    }

    return updates;
  }

  /**
   * Persists payment proofs to individual booking payment rows.
   * Maps payload.paymentProofs by transactionId (which equals
   * booking_payments.id) and updates payment_details.paymentProof
   * without mutating bookings.paymentDetails JSON.
   *
   * @param booking - Decrypted booking with payments relation loaded
   * @param payload - Post-booking DTO containing paymentProofs array
   */
  private async applyPaymentProofs(
    booking: any,
    payload: PostBookingDto,
  ): Promise<void> {
    const proofObj: Record<string, string[] | undefined> = {};
    payload.paymentProofs.forEach((transaction) => {
      proofObj[transaction?.transactionId] = transaction?.paymentProof ?? [];
    });

    const payments = booking?.payments ?? [];
    for (const trans of payments) {
      const id = trans?.id;
      const proofs = proofObj[id];
      if (!proofs) continue;
      const details = trans?.paymentDetails || {};
      await this.bookingRepository.manager.update(
        BookingPayment,
        { id },
        { paymentDetails: { ...details, paymentProof: proofs } },
      );
    }
  }

  /**
   * To submit post booking documents
   *
   * @param oppId as Opportunity id
   * @param requestBody as Payload
   * @returns
   */
  async updatePostBooking(
    oppId: string,
    payload: PostBookingDto,
  ): Promise<any> {
    logger.info(`Entered salesService/updatePostBooking, ${oppId}`);
    try {
      // Always work with decrypted booking to merge plain objects safely
      const { data: booking } = await this.bookingsService.getBookingByOppId(
        oppId,
        true,
      );
      if (!booking) throw new NotFoundException('Booking Details not found.');
      const dataToBeUpdated = this.buildApplicantUpdates(booking, payload);

      // if payment details submitted (simple flow: map by transactionId = booking_payments.id)
      if (payload?.paymentProofs?.length) {
        await this.applyPaymentProofs(booking, payload);
      }

      if (!payload.saveForLater && !booking.signedPdf)
        throw new BadRequestException(
          'Booking form not signed. Please ask customer to sign or upload if signed offline.',
        );

      // Encrypt personalDetails before saving to database
      const encryptedData = await encryptBookingApplicants(dataToBeUpdated);

      await this.bookingRepository.update(
        { opportunityId: oppId },
        encryptedData,
      );
      if (!payload.saveForLater) {
        let mergedFileName = booking.signedPdf;

        const { data: docsList } =
          await this.bookingDocumentsService.getDocuments(
            oppId,
            BookingDocTypeEnum.ADDITIONAL_DOCS,
            BookingStageEnum.POST_BOOKING,
          );
        const smallPdfPaths = docsList
          .filter((doc) => doc?.path?.endsWith('.pdf'))
          .map((doc) => doc.path);

        // Create a merged PDF only if there are additional documents or payload data
        delete payload.saveForLater;
        if (Object.keys(payload).length > 0 || smallPdfPaths.length > 0) {
          const filePath = getBookingFileName(booking, oppId);
          mergedFileName = await this.pdfService.mergePostBookingDocs(
            booking,
            filePath,
            smallPdfPaths,
          );
        }

        const mergedPdf = mergedFileName ?? booking.mergedPdf;
        const bookingFormStatus = BookingFormStatusEnum.RM_UPLOAD_DONE;

        await this.bookingRepository.update(
          { opportunityId: oppId },
          {
            mergedPdf,
            bookingFormStatus,
          },
        );

        // Emit event to update opportunity in SFDC
        this.eventEmitter.emit(EventMessagesEnum.OPP_PUSH_TO_SFDC, {
          opportunityId: oppId,
        });
      }
      return {
        statusCode: SUCCESS,
        message: 'Booking updated successfully.',
        data: {
          id: booking?.id,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to update booking: ${oppId}. Error: ${error.message}`,
      );
      logsAndErrorHandling('salesService - updatePostBooking', error, {
        oppId,
        payload,
      });
    }
  }

  async updateOfficeUse(
    user: any,
    oppId: string,
    officeUseDto: OfficeUseDto,
  ): Promise<any> {
    try {
      logger.info(`Entered salesService/updateOfficeUse, ${oppId}`);
      if (!oppId) throw new BadRequestException('Opportunity ID is required.');

      const { topLevelPayload, officeInfoPayload } =
        prepareOfficeUsePayload(officeUseDto);

      const existingRecord = await this.officeUseRepository.findOne({
        where: { opportunityId: oppId },
      });

      const finalPayload: any = existingRecord
        ? {
            id: existingRecord.id,
            opportunityId: oppId,
            ...topLevelPayload,
            officeInfo: officeInfoPayload.officeInfo,
            closingRmId:
              officeInfoPayload?.officeInfo?.salesTeam?.[1]?.rmName?.id ??
              user.dbId,
          }
        : {
            opportunityId: oppId,
            ...topLevelPayload,
            officeInfo: officeInfoPayload,
            closingRmId:
              officeInfoPayload?.officeInfo?.salesTeam?.[1]?.rmName?.id ??
              user.dbId,
          };

      await this.officeUseRepository.upsert(finalPayload, ['opportunityId']);

      let officeUsePdf: string | null = null;
      let officeUseId = existingRecord?.id;
      // Generate Office Use PDF only if saveForLater is false
      if (!officeUseDto.saveForLater) {
        const bookingData = await this.bookingRepository.findOne({
          where: { opportunityId: oppId },
        });
        if (!bookingData)
          throw new NotFoundException('Invalid booking details.');
        if (!bookingData.signedPdf)
          throw new BadRequestException(
            'Booking form not signed. Please ask customer to sign or upload if signed offline.',
          );

        const { data: docsList } =
          await this.bookingDocumentsService.getDocuments(
            bookingData.opportunityId,
            [BookingDocTypeEnum.OFFICE_USE, BookingDocTypeEnum.REFERRER],
            BookingStageEnum.POST_BOOKING,
          );

        const { data: additionalDocs } =
          await this.bookingDocumentsService.getDocuments(
            bookingData.opportunityId,
            BookingDocTypeEnum.ADDITIONAL_DOCS,
            BookingStageEnum.OFFICE_USE,
          );

        let pdfDocs: string[] = safePickPdfPathsFromDocsSvc(docsList);

        if (Array.isArray(additionalDocs) && additionalDocs.length) {
          pdfDocs = [
            ...pdfDocs,
            ...safePickPdfPathsFromDocsSvc(additionalDocs),
          ];
        }

        // include PDFs from Office use.documents
        const officeUseRow = await this.officeUseRepository.findOne({
          where: { opportunityId: oppId },
          select: ['documents'],
        });

        officeUseId = officeUseRow?.id;
        const officeUseDocsStrings = toStringArray(officeUseRow?.documents);
        const officeUsePdfPaths = officeUseDocsStrings
          .map(stripQuery)
          .filter(isPdfPath);

        // Merge & remove duplicates
        pdfDocs = dedupe([...pdfDocs, ...officeUsePdfPaths]);

        logger.debug('PDFs gathered (docsSvc + officeUse.documents)', {
          fromDocsService:
            safePickPdfPathsFromDocsSvc(docsList).length +
            safePickPdfPathsFromDocsSvc(additionalDocs).length,
          fromOfficeUseDocuments: officeUsePdfPaths.length,
          totalPdfDocs: pdfDocs.length,
        });

        // ---- Generate Office Use PDF ----
        const filePath = getBookingFileName(
          bookingData,
          oppId,
          BookingPDFTypeEnum.OFFICE_USE,
        );
        officeUsePdf = await this.pdfService.generateOfficeUsePdf(
          bookingData,
          filePath,
          pdfDocs,
        );

        if (officeUsePdf) {
          const bookingFormStatus = BookingFormStatusEnum.OFFICE_USE_SUBMITTED;
          const closingRmId =
            officeInfoPayload?.officeInfo?.salesTeam?.[1]?.rmName?.id ??
            user.dbId;

          await this.bookingRepository.update(
            { opportunityId: oppId },
            {
              officeUsePdf,
              bookingFormStatus,
              closingRm: { id: closingRmId } as Users,
            },
          );

          bookingData.officeUsePdf = officeUsePdf;

          const formUrl = generateFormUrlByType(
            FormType.BOOKING,
            bookingData?.unitDetails?.projectBrandName,
            oppId,
            this.configService,
          );

          // Send emails asynchronously without blocking the API response
          // Office Use Review Email to TL
          this.sendOfficeUseReviewEmail({
            opportunityId: oppId,
            officeUsePdf: getS3Url(this.configService, officeUsePdf),
            formUrl,
            booking: bookingData,
            officeUseSectionUrl: getS3Url(
              this.configService,
              bookingData?.signedPdf,
            ),
            recipientRole: RecipientRolesEnum.TL,
          }).catch((error) => {
            logger.error(
              `Failed to send Office Use Review Email to TL for ${oppId}`,
              error,
            );
          });

          // Office Use Review Email to RSH
          this.sendOfficeUseReviewEmail({
            opportunityId: oppId,
            officeUsePdf: getS3Url(this.configService, officeUsePdf),
            formUrl,
            booking: bookingData,
            officeUseSectionUrl: getS3Url(
              this.configService,
              bookingData?.signedPdf,
            ),
            recipientRole: RecipientRolesEnum.RSH,
          }).catch((error) => {
            logger.error(
              `Failed to send Office Use Review Email to RSH for ${oppId}`,
              error,
            );
          });

          // File Login Email to CRM Team
          this.sendFileLoginEmail({
            opportunityId: oppId,
            formUrl,
            booking: bookingData,
          }).catch((error) => {
            logger.error(
              `Failed to send File Login Email to CRM Team for ${oppId}`,
              error,
            );
          });

          // Emit event to update opportunity in SFDC
          this.eventEmitter.emit(EventMessagesEnum.OPP_PUSH_TO_SFDC, {
            opportunityId: oppId,
          });
        }
      }

      // Mirror saved data for response
      const responseData = {
        id: officeUseId,
        opportunityId: oppId,
        officeInfo: officeInfoPayload.officeInfo,
        ...topLevelPayload,
      };

      return {
        statusCode: SUCCESS,
        message: 'Data saved successfully.',
        data: responseData,
      };
    } catch (error) {
      logger.error(`Failed to save data: ${oppId}. Error: ${error.message}`);
      logsAndErrorHandling('salesService - updateOfficeUse', error, {
        user,
        oppId,
        officeUseDto,
      });
    }
  }

  // Helper methods to reduce cognitive complexity
  private async getFirstApplicantName(booking: any): Promise<string> {
    const decryptedBooking = await decryptBookingApplicants(booking);
    const applicant1 = decryptedBooking?.applicant1;
    const firstName = applicant1?.personalDetails?.firstName || '';
    const lastName = applicant1?.personalDetails?.lastName || '';
    return `${firstName} ${lastName}`.trim() || '';
  }

  private buildKycDocumentLink(opportunityId: string): string {
    const baseUrl = this.configService.get<string>('KYC_PAGE_URL');
    return baseUrl && opportunityId
      ? `<a href="${baseUrl}/${opportunityId}" target="_blank">KYC Documents</a>`
      : '';
  }

  private getOfficeUseDocuments(officeUse: any): {
    allotmentLetterSigned: string;
    costSheetSigned: string;
    docs: any;
  } {
    const officeUseDocs = officeUse?.documents || {};
    return {
      allotmentLetterSigned:
        officeUseDocs?.allotmentLetterSigned ||
        officeUseDocs?.allotmentLetter ||
        'Yes',
      costSheetSigned:
        officeUseDocs?.costSheetSigned || officeUseDocs?.costSheet || 'Yes',
      docs: officeUseDocs,
    };
  }

  private formatEmployeeId(name: string, employeeId: string): string {
    return name && employeeId ? `${name} | ${employeeId}` : name || '';
  }

  private getEmployeeIds(
    officeUse: any,
    salesTeam: any,
  ): {
    rmNameEmployeeId: string;
    rshNameEmployeeId: string;
    projectHeadNameEmployeeId: string;
  } {
    const officeInfo = officeUse?.officeInfo || {};
    const salesTeamData = officeInfo?.salesTeam?.[1] || {};
    const rmEmployeeId = salesTeamData?.rmEmployeeId || '';
    const rshEmployeeId = salesTeamData?.rshEmployeeId || '';
    const projectHeadName = officeInfo?.projectHeadName?.userName || '';
    const projectHeadEmployeeId = officeInfo?.projectHeadName?.userId || '';

    const rmName = salesTeam?.RM?.name || '';
    const rshName = salesTeam?.RSH?.name || '';

    return {
      rmNameEmployeeId: this.formatEmployeeId(rmName, rmEmployeeId),
      rshNameEmployeeId: this.formatEmployeeId(rshName, rshEmployeeId),
      projectHeadNameEmployeeId: this.formatEmployeeId(
        projectHeadName,
        projectHeadEmployeeId,
      ),
    };
  }

  private formatBookingFormSigningDate(booking: any): string {
    return booking?.formSignedAt
      ? new Date(booking.formSignedAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '';
  }

  private buildPdfLink(pdfPath: string | undefined, linkText: string): string {
    if (!pdfPath) return '';
    const url = getS3Url(this.configService, pdfPath);
    if (!url?.trim() || url.endsWith('/')) return '';
    return `<a href="${url}" target="_blank">${linkText}</a>`;
  }

  private buildDocumentLinkFromArray(
    docArray: any[] | undefined,
    linkText: string,
  ): string {
    if (!Array.isArray(docArray) || docArray.length === 0) return '';
    const docUrl = docArray[0];
    if (!docUrl?.trim()) return '';
    const url = getS3Url(this.configService, docUrl);
    if (!url?.trim() || url.endsWith('/')) return '';
    return `<a href="${url}" target="_blank">${linkText}</a>`;
  }

  private buildPaymentPlanLinks(
    officeUseDocs: any,
    isPaymentPlan: boolean,
  ): string {
    if (!isPaymentPlan) return '';

    const paymentPlanLinks: string[] = [];
    const consentLetterLink = this.buildDocumentLinkFromArray(
      officeUseDocs?.bisPaymentPlanApproval,
      'Consent Letter',
    );
    if (consentLetterLink) paymentPlanLinks.push(consentLetterLink);

    const npvSheetLink = this.buildDocumentLinkFromArray(
      officeUseDocs?.npvSheetApproval,
      'NPV Calculation Sheet',
    );
    if (npvSheetLink) paymentPlanLinks.push(npvSheetLink);

    return paymentPlanLinks.length > 0 ? paymentPlanLinks.join('<br>') : '';
  }

  private formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
    if (!num || Number.isNaN(num)) return '₹ 0';
    return `₹ ${num.toLocaleString('en-IN')}`;
  }

  private buildUnitNumber(booking: any): string {
    const projectName = booking?.unitDetails?.projectName || '';
    const blockTower = booking?.unitDetails?.blockTower || '';
    const unitNumber = booking?.unitDetails?.unitNumber || '';
    const parts = [projectName, blockTower, unitNumber].filter(Boolean);
    return parts.length > 0 ? parts.join('/') : '';
  }

  private buildApplicationFormLink(formUrl: string): string {
    const trimmedUrl = formUrl?.trim();
    if (trimmedUrl && !formUrl.endsWith('/')) {
      return `<a href="${formUrl}" target="_blank">Application Form</a>`;
    }
    return '';
  }

  private buildEmailVariables(data: {
    booking: any;
    officeUse: any;
    opportunityId: string;
    formUrl: string;
    firstApplicantName: string;
    kycDocumentLink: string;
    officeUseDocs: { allotmentLetterSigned: string; costSheetSigned: string };
    employeeIds: {
      rmNameEmployeeId: string;
      rshNameEmployeeId: string;
      projectHeadNameEmployeeId: string;
    };
    bookingFormSigningDate: string;
    signedBookingFormPdfLink: string;
    bookingFormOfficeUsePdfLink: string;
    customisedPaymentPlanLink: string;
    salesTeam: any;
  }): Record<string, string> {
    const bookingVars = this.buildBookingVariables(data);
    const paymentVars = this.buildPaymentVariables(data);
    const officeUseVars = this.buildOfficeUseVariables(data);
    const employeeVars = this.buildEmployeeVariables(data);
    const linkVars = this.buildLinkVariables(data);
    const sourceVars = this.buildSourceVariables(data);

    return {
      ...bookingVars,
      ...paymentVars,
      ...officeUseVars,
      ...employeeVars,
      ...linkVars,
      ...sourceVars,
    };
  }

  private buildBookingVariables(data: {
    booking: any;
    opportunityId: string;
    firstApplicantName: string;
  }): Record<string, string> {
    const { booking, opportunityId, firstApplicantName } = data;
    return {
      PROJECT_NAME: safeString(booking?.unitDetails?.projectName),
      UNIT_NUMBER: this.buildUnitNumber(booking),
      FIRST_APPLICANT_NAME: safeString(firstApplicantName),
      ENQUIRY_ID: safeString(booking?.enquiryId),
      OPPORTUNITY_ID: safeString(opportunityId),
      CUSTOMER_CATEGORY: safeString(booking?.bookingAs || ''),
    };
  }

  private buildPaymentVariables(data: {
    booking: any;
  }): Record<string, string> {
    const { booking } = data;
    const agreementValueRaw =
      booking?.unitDetails?.totalAgreementValue ||
      booking?.paymentDetails?.agreementValue ||
      0;
    const bookingAmountRaw = booking?.paymentDetails?.amount || 0;

    return {
      AGREEMENT_VALUE: this.formatCurrency(agreementValueRaw),
      BOOKING_AMOUNT_SFDC: this.formatCurrency(bookingAmountRaw),
      BOOKING_AMOUNT_FORM: this.formatCurrency(bookingAmountRaw),
    };
  }

  private buildOfficeUseVariables(data: {
    officeUse: any;
    officeUseDocs: { allotmentLetterSigned: string; costSheetSigned: string };
    bookingFormSigningDate: string;
  }): Record<string, string> {
    const { officeUse, officeUseDocs, bookingFormSigningDate } = data;
    return {
      BOOKING_REGION: safeString(officeUse?.bookingRegionAsPerRM),
      ALLOTMENT_LETTER_SIGNED: safeString(officeUseDocs.allotmentLetterSigned),
      COST_SHEET_SIGNED: safeString(officeUseDocs.costSheetSigned),
      IS_UNIT_SOLD_BELOW_MTP: safeString(officeUse?.isUnitSoldMTP || ''),
      PDC_ENCLOSED: safeString(officeUse?.isPDCCollected || ''),
      RM_REMARKS: safeString(officeUse?.remarks || ''),
      BOOKING_FORM_SIGNING_DATE: safeString(bookingFormSigningDate),
    };
  }

  private buildEmployeeVariables(data: {
    employeeIds: {
      rmNameEmployeeId: string;
      rshNameEmployeeId: string;
      projectHeadNameEmployeeId: string;
    };
  }): Record<string, string> {
    const { employeeIds } = data;
    return {
      RM_NAME_EMPLOYEE_ID: safeString(employeeIds.rmNameEmployeeId),
      PROJECT_HEAD_NAME_EMPLOYEE_ID: safeString(
        employeeIds.projectHeadNameEmployeeId,
      ),
      RSH_NAME_EMPLOYEE_ID: safeString(employeeIds.rshNameEmployeeId),
    };
  }

  private buildLinkVariables(data: {
    formUrl: string;
    kycDocumentLink: string;
    signedBookingFormPdfLink: string;
    bookingFormOfficeUsePdfLink: string;
    customisedPaymentPlanLink: string;
  }): Record<string, string> {
    const {
      formUrl,
      kycDocumentLink,
      signedBookingFormPdfLink,
      bookingFormOfficeUsePdfLink,
      customisedPaymentPlanLink,
    } = data;
    return {
      APPLICATION_FORM_LINK: this.buildApplicationFormLink(formUrl),
      KYC_DOCUMENT_LINK: kycDocumentLink || '',
      CUSTOMISED_PAYMENT_PLAN_LINK: customisedPaymentPlanLink || '',
      SIGNED_BOOKING_FORM_PDF_LINK: signedBookingFormPdfLink || '',
      BOOKING_FORM_OFFICE_USE_PDF_LINK: bookingFormOfficeUsePdfLink || '',
    };
  }

  private buildSourceVariables(data: {
    officeUse: any;
    salesTeam: any;
  }): Record<string, string> {
    const { officeUse, salesTeam } = data;
    const bookingScheme =
      salesTeam?.bookingScheme || officeUse?.bookingSchemeName || '';
    const primarySource =
      salesTeam?.primarySource || officeUse?.primarySource || '';

    return {
      SCHEME_DETAILS: safeString(bookingScheme || 'NA'),
      BOOKING_SOURCE: safeString(primarySource),
      CHANNEL_PARTNER_NAME: safeString(officeUse?.cpName || ''),
    };
  }

  // Send file login email to CRM Team
  async sendFileLoginEmail({
    opportunityId,
    formUrl,
    booking,
  }: {
    opportunityId: string;
    formUrl: string;
    booking: any;
  }): Promise<void> {
    try {
      logger.info(`Entered salesService/sendFileLoginEmail`);
      const officeUse = await this.officeUseRepository.findOne({
        where: { opportunityId },
      });

      if (!officeUse) {
        logger.info(
          `No office use record found for opportunityId: ${opportunityId}. Skipping email sending.`,
        );
        return;
      }

      const salesTeam = resolveSalesTeamInfo(officeUse);
      const rmInfo = salesTeam?.[RecipientRolesEnum.RM];
      const tlInfo = salesTeam?.[RecipientRolesEnum.TL];
      const rshInfo = salesTeam?.[RecipientRolesEnum.RSH];
      const userIds = [rmInfo?.id, tlInfo?.id, rshInfo?.id].filter(Boolean);

      const recipient = await this.usersRepository.find({
        where: { userId: In(userIds) },
        select: ['email'],
      });

      const firstApplicantName = await this.getFirstApplicantName(booking);
      const kycDocumentLink = this.buildKycDocumentLink(opportunityId);
      const officeUseDocsData = this.getOfficeUseDocuments(officeUse);
      const employeeIds = this.getEmployeeIds(officeUse, salesTeam);
      const bookingFormSigningDate = this.formatBookingFormSigningDate(booking);
      const signedBookingFormPdfLink = this.buildPdfLink(
        booking?.signedPdf,
        'Cx signed booking form PDF',
      );
      const bookingFormOfficeUsePdfLink = this.buildPdfLink(
        booking?.officeUsePdf,
        'Booking form with Office use updated',
      );

      const isPaymentPlan =
        officeUse?.isPaymentPlan === 'Yes' ||
        officeUse?.isPaymentPlan === 'yes';
      const customisedPaymentPlanLink = this.buildPaymentPlanLinks(
        officeUseDocsData.docs,
        isPaymentPlan,
      );

      const emailVariables = this.buildEmailVariables({
        booking,
        officeUse,
        opportunityId,
        formUrl,
        firstApplicantName,
        kycDocumentLink,
        officeUseDocs: officeUseDocsData,
        employeeIds,
        bookingFormSigningDate,
        signedBookingFormPdfLink,
        bookingFormOfficeUsePdfLink,
        customisedPaymentPlanLink,
        salesTeam,
      });

      // Resolve CRM recipients from project_user_mapping using booking.projectId.
      const crmMappings = booking?.projectId
        ? await this.projectUserMappingRepository.find({
            where: {
              project: { id: booking.projectId },
              role: RolesEnum.CRM,
              removedAt: IsNull(),
            },
            relations: ['user'],
          })
        : [];
      const crmEmail = crmMappings
        .map((mapping) => mapping.user?.email)
        .filter((email): email is string => Boolean(email));

      await this.sendComposedEmail(
        ComposeEmailsEnum.EMAIL_TO_CRM,
        emailVariables,
        { to: crmEmail, cc: recipient.map((user) => user.email) },
        booking?.unitDetails?.projectBrandName,
      );
    } catch (error) {
      logger.error(
        `Failed to send office use review email to CRM Team.`,
        error,
      );
      logsAndErrorHandling('salesService - sendFileLoginEmail', error, {
        opportunityId,
        formUrl,
        booking,
      });
    }
  }

  private async sendComposedEmail(
    event: ComposeEmailsEnum,
    variables: Record<string, string>,
    recipients: { to: string | string[]; cc?: string[] },
    brand?: string,
  ) {
    logger.info(`Entered salesService/sendComposedEmail`);
    const response = await this.eventEmitter.emitAsync(
      EventMessagesEnum.COMPOSE_EMAIL,
      new ComposeEmailEvent(event, variables, brand ?? BRAND_PURAVANKARA, {
        to: recipients.to,
        cc: recipients.cc,
      }),
    );
    if (response.some((res) => res instanceof Error)) {
      throw new InternalServerErrorException(
        response[0]?.message || `Failed to send email`,
      );
    }
  }

  // Sends the office use review email to either TL or RSH
  async sendOfficeUseReviewEmail({
    opportunityId,
    officeUsePdf,
    formUrl,
    booking,
    officeUseSectionUrl,
    recipientRole,
  }: {
    opportunityId: string;
    officeUsePdf: string;
    formUrl: string;
    booking: any;
    officeUseSectionUrl: string;
    recipientRole: RecipientRolesEnum.TL | RecipientRolesEnum.RSH;
  }): Promise<void> {
    try {
      logger.info(`Entered salesService/sendOfficeUseReviewEmail`);

      const officeUse = await this.officeUseRepository.findOne({
        where: { opportunityId },
      });

      if (!officeUse) {
        logger.info(
          `No office use record found for opportunityId: ${opportunityId}. Skipping email sending.`,
        );
        return;
      }

      await this.processOfficeUseReviewEmail({
        officeUse,
        officeUsePdf,
        formUrl,
        booking,
        officeUseSectionUrl,
        recipientRole,
      });
    } catch (error) {
      logger.error(
        `Failed to send office use review email to ${recipientRole.toUpperCase()}.`,
        error,
      );
      logsAndErrorHandling('salesService - sendOfficeUseReviewEmail', error, {
        opportunityId,
        officeUsePdf,
        formUrl,
        booking,
        officeUseSectionUrl,
        recipientRole,
      });
    }
  }

  private async processOfficeUseReviewEmail({
    officeUse,
    officeUsePdf,
    formUrl,
    booking,
    officeUseSectionUrl,
    recipientRole,
  }: {
    officeUse: any;
    officeUsePdf: string;
    formUrl: string;
    booking: any;
    officeUseSectionUrl: string;
    recipientRole: RecipientRolesEnum.TL | RecipientRolesEnum.RSH;
  }): Promise<void> {
    const salesTeam = resolveSalesTeamInfo(officeUse);
    const recipientInfo = salesTeam?.[recipientRole];
    const bookingScheme = salesTeam?.bookingScheme;
    const primarySource = salesTeam?.primarySource;

    if (!recipientInfo?.id) {
      logger.info(
        `No ${recipientRole} found for opportunityId: ${officeUse.opportunityId}. Skipping email sending.`,
      );
      return;
    }

    const recipient = await this.usersRepository.findOne({
      where: { userId: recipientInfo.id },
      select: ['email'],
    });

    if (!recipient?.email) {
      logger.info(
        `Email not found for ${recipientRole} with userId: ${recipientInfo.id}. Skipping email sending.`,
      );
      return;
    }

    const isBookingAmountMatchingTransactions =
      booking?.paymentDetails?.amount >=
      (booking?.paymentDetails?.transactions?.reduce(
        (sum: number, txn: any) => sum + txn.amount,
        0,
      ) || 0);

    await this.sendComposedEmail(
      ComposeEmailsEnum.OFFICE_USE_REVIEW,
      {
        RECIPIENT_NAME: safeString(recipientInfo?.name),
        PROJECT_NAME: safeString(booking?.unitDetails?.projectName),
        UNIT_NUMBER: (() => {
          const projectName = booking?.unitDetails?.projectName || '';
          const blockTower = booking?.unitDetails?.blockTower || '';
          const unitNumber = booking?.unitDetails?.unitNumber || '';
          const parts = [projectName, blockTower, unitNumber].filter(Boolean);
          return parts.length > 0 ? parts.join('/') : '';
        })(),
        ENQUIRY_ID: safeString(booking?.enquiryId),
        BOOKING_FORM_LINK: safeString(formUrl),
        REVIEW_LINK: safeString(officeUseSectionUrl),
        OFFICE_USE_PDF: safeString(officeUsePdf),
        SIGNATURE_MODE:
          booking?.bookingFormStatus === BookingFormStatusEnum?.SIGNED
            ? SignatureTypeEnum.DIGITAL
            : SignatureTypeEnum.WET,
        BOOKING_AMOUNT: safeString(booking?.paymentDetails?.amount),
        AGREEMENT_VALUE: safeString(booking?.unitDetails?.totalAgreementValue),
        PRIMARY_SOURCE: safeString(primarySource),
        BOOKING_SCHEME: safeString(bookingScheme, 'NA'),
        RM_NAME: safeString(salesTeam?.RM?.name),
        RM_ID: safeString(salesTeam?.RM?.id),
        TL_NAME: safeString(salesTeam?.TL?.name),
        TL_ID: safeString(salesTeam?.TL?.id),
        RSH_NAME: safeString(salesTeam?.RSH?.name),
        RSH_ID: safeString(salesTeam?.RSH?.id),
        IS_BOOKING_AMOUNT_MATCHING: isBookingAmountMatchingTransactions
          ? 'Yes'
          : 'No',
      },
      { to: recipient.email },
      safeString(booking?.unitDetails?.projectBrandName),
    );
  }

  /**
   * Function to swap units
   *
   * @param user user obj
   * @param sourceOppId Old Opportunity Id
   * @param targetOppId New Opportunity Id
   * @returns string
   */
  async unitSwapping(
    user: any,
    sourceOppId: string,
    targetOppId: string,
  ): Promise<any> {
    logger.info(`Entered salesService/unitSwapping`);
    if (!sourceOppId || !targetOppId) {
      throw new BadRequestException(
        'Both source and new Opportunity IDs are required.',
      );
    }

    try {
      const result = await this.bookingRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Find source booking
          const sourceBooking = await transactionalEntityManager.findOne(
            Booking,
            {
              where: { opportunityId: sourceOppId },
            },
          );

          if (!sourceBooking) {
            throw new NotFoundException(
              `Source booking with ID ${sourceOppId} not found.`,
            );
          }

          // Check if target booking already exists
          const newBooking = await transactionalEntityManager.findOne(Booking, {
            where: { opportunityId: targetOppId },
          });

          if (newBooking) {
            throw new BadRequestException(
              `Target booking with ID ${targetOppId} already exists. You cannot swap units with an existing booking.`,
            );
          }

          // Clone source booking with targetOppId
          const bookingData: Partial<Booking> = {
            opportunityId: targetOppId,
            noOfApplicants: sourceBooking?.noOfApplicants,
            relationBtApplicants: sourceBooking?.relationBtApplicants,
            fillingAs: sourceBooking?.fillingAs,
            lastStep: sourceBooking?.noOfApplicants,
            applicant1: sourceBooking?.applicant1,
            applicant2: sourceBooking?.applicant2,
            applicant3: sourceBooking?.applicant3,
            applicant4: sourceBooking?.applicant4,
            bookingFormStatus: BookingFormStatusEnum.IN_PROGRESS,
            isCompleted: false,
          };

          const newBookingEntity = transactionalEntityManager.create(
            Booking,
            bookingData,
          );
          await transactionalEntityManager.save(newBookingEntity);

          // Delete old records
          await transactionalEntityManager.delete(Booking, {
            opportunityId: sourceOppId,
          });

          await transactionalEntityManager.delete(BookingOfficeUse, {
            opportunityId: sourceOppId,
          });

          await transactionalEntityManager.delete(BookingDocument, {
            opportunityId: sourceOppId,
          });

          return { sourceOppId, targetOppId };
        },
      );

      // Emit event to update opportunity in SFDC
      this.eventEmitter.emit(EventMessagesEnum.OPP_PUSH_TO_SFDC, {
        opportunityId: sourceOppId,
        isReset: true,
      });

      return {
        statusCode: SUCCESS,
        message: 'Unit swapping completed successfully.',
        data: result,
      };
    } catch (error) {
      logger.error(
        `Failed to swap units between ${sourceOppId} and ${targetOppId}. Error: ${error.message}`,
      );
      logsAndErrorHandling('salesService - unitSwapping', error, {
        user,
        sourceOppId,
        targetOppId,
      });
    }
  }

  /**
   * Function to fill multi unit form in one go
   * @param user as logged in user
   * @param sourceOppId as source bookings
   * @param targetOppIds as target ids array
   * @returns string
   */
  async cloneMultiUnitBookings(
    user: any,
    sourceOppId: string,
    targetOppIds: string[],
  ): Promise<any> {
    logger.info(`Entered salesService/cloneMultiUnitBookings`);
    if (!sourceOppId || !targetOppIds?.length) {
      throw new BadRequestException(
        'Both source and target Opportunity IDs are required.',
      );
    }

    try {
      const result = await this.bookingRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Fetch the source booking
          const sourceBooking = await transactionalEntityManager.findOne(
            Booking,
            {
              where: { opportunityId: sourceOppId },
            },
          );

          if (!sourceBooking) {
            throw new NotFoundException(
              `Source booking with Opportunity ID ${sourceOppId} not found.`,
            );
          }

          // Check if any of the target bookings already exist
          const existingBookings = await transactionalEntityManager.find(
            Booking,
            {
              where: { opportunityId: In(targetOppIds) },
            },
          );

          if (existingBookings?.length) {
            const existingIds = existingBookings
              .map((b) => b.opportunityId)
              .join(', ');
            throw new BadRequestException(
              `Bookings with the following Opportunity IDs already exist: ${existingIds}. Cannot clone into existing bookings.`,
            );
          }

          // Create and save cloned bookings for each target ID
          const newBookings: Booking[] = [];

          for (const targetOppId of targetOppIds) {
            const clonedBooking: Partial<Booking> = {
              opportunityId: targetOppId,
              enquiryId: sourceBooking.enquiryId,
              noOfApplicants: sourceBooking.noOfApplicants,
              relationBtApplicants: sourceBooking.relationBtApplicants,
              fillingAs: sourceBooking.fillingAs,
              lastStep: sourceBooking.noOfApplicants,
              applicant1: sourceBooking.applicant1,
              applicant2: sourceBooking.applicant2,
              applicant3: sourceBooking.applicant3,
              applicant4: sourceBooking.applicant4,
              bookingFormStatus: BookingFormStatusEnum.IN_PROGRESS,
              isCompleted: false,
            };

            const newBooking = transactionalEntityManager.create(
              Booking,
              clonedBooking,
            );
            newBookings.push(newBooking);
          }

          await transactionalEntityManager.save(newBookings);
          return newBookings;
        },
      );

      return {
        statusCode: SUCCESS,
        message: 'Booking cloned successfully for multiple units.',
        data: result,
      };
    } catch (error) {
      logger.error(
        `Failed to clone booking from ${sourceOppId} to multiple units. Error: ${error.message}`,
      );
      logsAndErrorHandling('salesService - cloneMultiUnitBookings', error, {
        user,
        sourceOppId,
        targetOppIds,
      });
    }
  }

  async getCancelledOpportunities(user: any, queryDto: any) {
    try {
      logger.info(`Entered salesService/getCancelledOpportunities`);
      const { page, limit, search } = queryDto;
      const query = this.bookingRepository.createQueryBuilder('b');

      // If search is provided then apply search
      if (search) {
        const searchTerm = `%${search?.trim()?.toLowerCase()}%`;

        query.andWhere(
          new Brackets((qb) => {
            qb.where('LOWER(b.opportunityId) LIKE :search', {
              search: searchTerm,
            })
              .orWhere('LOWER(b.enquiryId) LIKE :search', {
                search: searchTerm,
              })
              .orWhere(
                "LOWER(JSON_UNQUOTE(JSON_EXTRACT(b.unitDetails, '$.projectName'))) LIKE :search",
                { search: searchTerm },
              )
              .orWhere(
                "LOWER(JSON_UNQUOTE(JSON_EXTRACT(b.unitDetails, '$.unitNumber'))) LIKE :search",
                { search: searchTerm },
              )
              .orWhere(
                "LOWER(JSON_UNQUOTE(JSON_EXTRACT(b.applicant1, '$.personalDetails.firstName'))) LIKE :search",
                { search: searchTerm },
              );
          }),
        );
      }

      const [bookings, total] = await query
        .take(limit)
        .skip((page - 1) * limit)
        .orderBy('b.createdAt', 'DESC')
        .getManyAndCount();

      // Decrypt all bookings to get correct applicant1?.personalDetails
      const decryptedBookings = await Promise.all(
        bookings.map((booking) => decryptBookingApplicants(booking)),
      );

      const transformedBooking = decryptedBookings.map((b) => ({
        Id: b?.opportunityId,
        enqrefno: b?.enquiryId,
        unitno: b?.unitDetails?.projectName
          ? `${b?.unitDetails?.projectName ?? ''}/${b?.unitDetails?.unitNumber ?? ''}`
          : null,
        Project: b?.unitDetails?.projectName ?? null,
        Name: b?.applicant1?.personalDetails?.firstName ?? null,
        primarysource: b?.unitDetails?.primarySource ?? null,
        Amount: b?.paymentDetails?.amount ?? null,
        SalesValue: b?.unitDetails?.totalAgreementValue ?? null,
        BFstatus: b?.bookingFormStatus,
        status: b?.bookingFormStatus,
        isCompleted: b?.isCompleted,
        name: undefined, //remove key
      }));

      return {
        statusCode: SUCCESS,
        message: 'Opportunity List fetched successfully.',
        data: {
          opportunities: transformedBooking,
          totalRecords: total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching opportunities: ${error.message}`, {
        error,
      });
      logsAndErrorHandling('salesService - getCancelledOpportunities', error, {
        user,
        queryDto,
      });
    }
  }

  /**
   * Lists multi-booking groups with optional filtering and pagination.
   *
   * @param query - Query parameters for filtering and pagination
   * @returns Promise resolving to the list of groups and pagination info
   *
   * @remarks Errors are logged via `logsAndErrorHandling`
   */
  async listGroups(query: CommonFindAllQueryDto, user: any) {
    try {
      const { search, page = 1, limit = 10 } = query;
      const qb = this.multiBookingRepository
        .createQueryBuilder('gbm')
        .select([
          'gbm.id',
          'gbm.groupName',
          'gbm.noOfUnits',
          'gbm.paymentMethod',
          'gbm.amount',
          'gbm.status',
          'gbm.isDeleted',
        ])
        .orderBy('gbm.createdAt', 'DESC')
        .where('gbm.isDeleted = :isDeleted', { isDeleted: 0 })
        .andWhere('gbm.createdBy = :createdBy', { createdBy: user.dbId });

      if (search) {
        qb.andWhere('gbm.groupName LIKE :search', {
          search: `%${search?.trim()?.toLowerCase()}%`,
        });
      }

      qb.skip((page - 1) * limit).take(limit);

      const [groups, totalRecords] = await qb.getManyAndCount();

      // Fetch latest booking for each group in a single optimized query
      const groupIds = groups.map((g) => g.id);
      const bookingMap = new Map();

      if (groupIds.length) {
        // Fetch all bookings for these groups, ordered by createdAt DESC
        // Then pick the first (latest) one per group
        const bookings = await this.bookingRepository.find({
          where: { groupId: In(groupIds) },
          select: [
            'groupId',
            'applicant1',
            'unitDetails',
            'enquiryId',
            'createdAt',
          ],
          order: { createdAt: 'DESC' },
        });

        // Group by groupId and keep only the latest (first) booking per group
        bookings.forEach((booking) => {
          if (booking.groupId && !bookingMap.has(booking.groupId)) {
            bookingMap.set(booking.groupId, booking);
          }
        });
      }

      // Transform groups with booking data
      const transformedGroups = await Promise.all(
        groups.map(async (group) => {
          const booking = bookingMap.get(group.id);
          let primaryApplicant = '';
          let project = '';
          let unitNo = '';
          const enqRefNo = booking?.enquiryId || '';

          if (booking?.applicant1) {
            try {
              const decryptedBooking = await decryptBookingApplicants({
                applicant1: booking.applicant1,
              });
              const applicant1 = decryptedBooking?.applicant1;
              const firstName = applicant1?.personalDetails?.firstName || '';
              const lastName = applicant1?.personalDetails?.lastName || '';
              primaryApplicant = `${firstName} ${lastName}`.trim();
            } catch (error) {
              logger.warn(
                `Failed to decrypt applicant1 for group ${group.id}`,
                error,
              );
            }
          }

          if (booking?.unitDetails) {
            const unitDetails =
              typeof booking.unitDetails === 'string'
                ? JSON.parse(booking.unitDetails)
                : booking.unitDetails;
            project = unitDetails?.projectName || '';
            unitNo = unitDetails?.unitNo || '';
          }

          return {
            ...group,
            primaryApplicant,
            project,
            unitNo,
            enqRefNo,
          };
        }),
      );

      return {
        statusCode: SUCCESS,
        message: 'Group List fetched successfully.',
        data: {
          groups: transformedGroups,
          totalRecords,
          currentPage: page,
          limit,
          totalPages: Math.ceil(totalRecords / limit),
        },
      };
    } catch (error) {
      logger.error('Error saving group:', error);
      logsAndErrorHandling('bookingService - listGroups', error, {});
    }
  }

  /**
   * Creates a multi-booking group for the given set of opportunity IDs.
   *
   * Validation rules:
   * - Requires at least 2 opportunity IDs in `groupedOppoId`.
   * - The count of `groupedOppoId` must exactly match `noOfUnits`.
   *
   * @param data - Payload containing `groupedOppoId` and `noOfUnits`.
   * @returns Promise<MultiBooking> - The saved multi-booking group record.
   *
   * @throws BadRequestException - When validation fails for input constraints.
   * @remarks Errors are logged via `logsAndErrorHandling` before bubbling up.
   */
  async createBookingGroup(
    data: CreateUpdateGroupDto,
    user: any,
  ): Promise<any> {
    try {
      // Remove groupedOppoId from data as it's now stored in mappings table
      const { groupedOppoId, noOfUnits, ...groupData } = data;
      if (groupedOppoId?.length < 2) {
        throw new BadRequestException(
          'Please select atleast 2 records to create a group',
        );
      }

      if (groupedOppoId?.length !== noOfUnits) {
        throw new BadRequestException(
          `You need to select exactly ${noOfUnits} records.`,
        );
      }

      // Check if any oppId is already part of an existing group
      await this.validateOppIdsNotInOtherGroups(groupedOppoId);

      // Create mappings array
      const mappings = groupedOppoId.map((oppId) =>
        this.groupBookingMappingRepository.create({
          opportunity_id: oppId,
        }),
      );

      // Create group with mappings - cascade will save mappings automatically
      const group = this.multiBookingRepository.create({
        ...groupData,
        createdBy: user.dbId,
        mappings, // Assign mappings to the relation
      });
      const result = await this.multiBookingRepository.save(group);

      return {
        statusCode: SUCCESS,
        message: 'Group created successfully.',
        data: result,
      };
    } catch (error) {
      // Handle database unique constraint violation for groupName
      if (
        error?.code === 'ER_DUP_ENTRY' &&
        error?.message?.includes('group_name')
      ) {
        throw new ConflictException(
          `A group with the name "${data.groupName}" already exists. Please choose a different name.`,
        );
      }
      logger.error('Error saving group:', error);
      logsAndErrorHandling('bookingService - createGroup', error, data);
    }
  }

  /**
   * Updates an existing multi-booking group with new data.
   *
   * Validation rules:
   * - Requires a valid `groupId` to identify the group to update.
   * - Requires at least 2 opportunity IDs in `groupedOppoId`.
   * - The count of `groupedOppoId` must exactly match `noOfUnits`.
   *
   * @param groupId - The ID of the multi-booking group to update.
   * @param data - Payload containing updated `groupedOppoId` and `noOfUnits`.
   * @returns Promise<any> - Confirmation of successful update.
   * @throws BadRequestException - When validation fails for input constraints.
   * @throws NotFoundException - When the specified group does not exist.
   * @remarks Errors are logged via `logsAndErrorHandling` before bubbling up.
   */
  async updateBookingGroup(
    groupId: string,
    data: CreateUpdateGroupDto,
  ): Promise<any> {
    try {
      const { groupedOppoId, noOfUnits, ...groupData } = data;
      if (!groupId) {
        throw new BadRequestException('Group ID is required for update.');
      }

      const existingGroup = await this.multiBookingRepository.findOne({
        where: { id: groupId },
        relations: ['mappings'],
      });

      if (!existingGroup) {
        throw new NotFoundException(`Group with ID ${groupId} not found.`);
      }

      if (groupedOppoId?.length <= 1) {
        throw new BadRequestException(
          'Please select atleast 2 records to create a group',
        );
      }

      if (groupedOppoId?.length !== noOfUnits) {
        throw new BadRequestException(
          `You need to select exactly ${noOfUnits} records.`,
        );
      }

      // Check if any oppId is already part of another existing group (not the current one)
      await this.validateOppIdsNotInOtherGroups(groupedOppoId, groupId);

      // Get existing active mappings from loaded relations (filter out soft-deleted)
      const existingMappings = (existingGroup.mappings || []).filter(
        (m) => m.is_deleted === 0,
      );

      const existingOppIds = new Set(
        existingMappings.map((m) => m.opportunity_id),
      );
      const newOppIds = new Set(groupedOppoId);

      // Early exit: If mappings haven't changed, only update group fields if needed
      if (
        existingOppIds.size === newOppIds.size &&
        [...existingOppIds].every((id) => newOppIds.has(id))
      ) {
        // Mappings are identical, only update group fields if there are changes
        if (Object.keys(groupData).length > 0) {
          await this.multiBookingRepository.update({ id: groupId }, groupData);
        }
        return {
          statusCode: SUCCESS,
          message: 'Group updated successfully.',
          data: {
            id: groupId,
          },
        };
      }

      // Wrap all update operations in a transaction for atomicity and efficiency
      await this.dataSource.transaction(async (transactionalEntityManager) => {
        // Update group fields
        if (Object.keys(groupData).length > 0) {
          await transactionalEntityManager.update(
            MultiBooking,
            { id: groupId },
            { ...groupData, noOfUnits },
          );
        }

        // Soft delete mappings that are no longer in the new list
        const oppIdsToDelete = existingMappings
          .filter((m) => !newOppIds.has(m.opportunity_id))
          .map((m) => m.id);

        if (oppIdsToDelete.length > 0) {
          await transactionalEntityManager.update(
            GroupBookingMapping,
            { id: In(oppIdsToDelete) },
            { is_deleted: 1 },
          );
        }

        // Create only new mappings that don't exist yet
        const oppIdsToCreate = data.groupedOppoId.filter(
          (oppId) => !existingOppIds.has(oppId),
        );

        if (oppIdsToCreate.length > 0) {
          const newMappings = oppIdsToCreate.map((oppId) =>
            transactionalEntityManager.create(GroupBookingMapping, {
              group_id: groupId,
              opportunity_id: oppId,
            }),
          );
          await transactionalEntityManager.save(newMappings);
        }
      });

      return {
        statusCode: SUCCESS,
        message: 'Group updated successfully.',
        data: {
          id: groupId,
        },
      };
    } catch (error) {
      // Handle database unique constraint violation for groupName
      if (
        error?.code === 'ER_DUP_ENTRY' &&
        error?.message?.includes('group_name')
      ) {
        throw new ConflictException(
          `A group with the name "${data.groupName}" already exists. Please choose a different name.`,
        );
      }
      logger.error('Error saving group:', error);
      logsAndErrorHandling('salesService - updateBookingGroup', error, {
        groupId,
        ...data,
      });
    }
  }

  /**
   * Validates that the provided opportunity IDs are not already part of any existing group.
   * Queries mappings table directly for better performance.
   *
   * @param oppIds - Array of opportunity IDs to validate
   * @param excludeGroupId - Optional group ID to exclude from the check (useful for update operations)
   * @throws BadRequestException - When any oppId is already part of an existing group
   */
  private async validateOppIdsNotInOtherGroups(
    oppIds: string[],
    excludeGroupId?: string,
  ): Promise<void> {
    if (!oppIds || oppIds.length === 0) {
      return;
    }

    // Query mappings table directly to find groups containing these opportunity IDs
    const mappingsQuery = this.groupBookingMappingRepository
      .createQueryBuilder('mapping')
      .select(['mapping.group_id', 'mapping.opportunity_id'])
      .where('mapping.opportunity_id IN (:...oppIds)', { oppIds })
      .andWhere('mapping.is_deleted = 0');

    // Exclude the current group if provided (for update operations)
    if (excludeGroupId) {
      mappingsQuery.andWhere('mapping.group_id != :excludeGroupId', {
        excludeGroupId,
      });
    }

    const mappings = await mappingsQuery.getMany();

    if (!mappings || mappings.length === 0) {
      return; // No conflicts found
    }

    // Get conflicting opportunity IDs from mappings
    const conflictingOppIds = [
      ...new Set(mappings.map((m) => m.opportunity_id)),
    ];

    throw new BadRequestException(
      `The following opportunity IDs are already part of existing group(s): ${conflictingOppIds.join(', ')}`,
    );
  }

  /**
   * Fetches all applicants from bookings in a multi-booking group.
   * Returns a map of opportunityId/applicantNumber to applicant name.
   *
   * @param groupId - The ID of the multi-booking group
   * @returns Promise with object mapping "opportunityId/applicantNumber" to applicant name
   *
   * @throws NotFoundException - When the group doesn't exist
   * @remarks Errors are logged via `logsAndErrorHandling`
   */
  async getGroupApplicants(groupId: string): Promise<any> {
    try {
      logger.info(
        `Entered salesService/getGroupApplicants, groupId: ${groupId}`,
      );

      if (!groupId) {
        throw new BadRequestException('Group ID is required.');
      }

      // Fetch the group to verify it exists
      const group = await this.multiBookingRepository.findOne({
        where: { id: groupId },
      });

      if (!group) {
        throw new NotFoundException(`Group with ID ${groupId} not found.`);
      }

      // Fetch opportunity IDs from mappings table
      const mappings = await this.groupBookingMappingRepository.find({
        where: { group_id: groupId, is_deleted: 0 },
        select: ['opportunity_id'],
      });

      const groupedOppoIds = mappings.map((m) => m.opportunity_id);

      if (!groupedOppoIds.length) {
        return {
          statusCode: SUCCESS,
          message: 'No opportunities found in this group.',
          data: {
            applicants: [],
          },
        };
      }

      // Fetch only required fields from bookings in a single query
      const bookings = await this.bookingRepository.find({
        where: { opportunityId: In(groupedOppoIds) },
        select: [
          'opportunityId',
          'applicant1',
          'applicant2',
          'applicant3',
          'applicant4',
        ],
      });

      if (!bookings.length) {
        return {
          statusCode: SUCCESS,
          message: 'No bookings found for the opportunities in this group.',
          data: {
            applicants: [],
          },
        };
      }

      // Decrypt and extract applicant names in one pass
      const applicantsArray: Array<{
        value: string;
        name: string;
        isMinor: boolean;
      }> = [];
      const seenCombinations = new Set<string>();

      // Process bookings in parallel
      await Promise.all(
        bookings.map(async (booking) => {
          const decryptedBooking = await decryptBookingApplicants(booking);
          const oppId = decryptedBooking.opportunityId;

          const applicants = [
            decryptedBooking.applicant1,
            decryptedBooking.applicant2,
            decryptedBooking.applicant3,
            decryptedBooking.applicant4,
          ];

          applicants
            .filter((a) => a?.personalDetails?.firstName) // keep only valid applicants
            .forEach((applicant, index) => {
              const key = this.getApplicantCombinationKey(applicant);
              if (!key || seenCombinations.has(key)) return;

              seenCombinations.add(key);

              const fullName =
                `${applicant.personalDetails.firstName ?? ''} ${applicant.personalDetails.lastName ?? ''}`.trim();
              applicantsArray.push({
                value: `${oppId}/${index + 1}`,
                name: fullName,
                isMinor: applicant?.hasContinuedAsMinor ?? false,
              });
            });
        }),
      );

      return {
        statusCode: SUCCESS,
        message: 'Group applicants fetched successfully.',
        data: {
          applicants: applicantsArray,
        },
      };
    } catch (error) {
      logger.error(
        `Error fetching group applicants for group ${groupId}: ${error.message}`,
      );
      logsAndErrorHandling('salesService - getGroupApplicants', error, {
        groupId,
      });
    }
  }

  // Helper to normalize applicant contact/email and generate combination key
  private getApplicantCombinationKey(applicant: any): string | null {
    const email = (
      applicant?.contactDetails?.emailAddress ||
      applicant?.personalDetails?.emailAddress ||
      ''
    )
      .toLowerCase()
      .trim();
    const countryCode = (
      applicant?.contactDetails?.countryCode ||
      applicant?.personalDetails?.countryCode ||
      ''
    ).trim();
    const contactNumber = (
      applicant?.contactDetails?.contactNumber ||
      applicant?.personalDetails?.contactNumber ||
      ''
    ).trim();

    if (!email && !(countryCode && contactNumber)) return null;

    return `${email}|${countryCode}|${contactNumber}`;
  }

  async getBookingApplicants(oppId: string) {
    try {
      const applicants = await this.bookingRepository.findOne({
        where: { opportunityId: oppId },
        select: [
          'applicant1',
          'applicant2',
          'applicant3',
          'applicant4',
          'noOfApplicants',
        ],
      });

      if (!applicants) {
        return {
          data: {
            noOfApplicants: 0,
            applicants: {
              applicant1: null,
              applicant2: null,
              applicant3: null,
              applicant4: null,
            },
          },
        };
      }

      const result = await decryptBookingApplicants(applicants);

      const applicantsMap: Record<string, any> = {};

      for (let i = 1; i <= 4; i++) {
        const applicant = result[`applicant${i}`];
        if (!applicant) {
          applicantsMap[`applicant${i}`] = null;
          continue;
        }

        const firstName = applicant?.personalDetails?.firstName ?? '';
        const lastName = applicant?.personalDetails?.lastName ?? '';
        const fullName = `${firstName} ${lastName}`.trim();
        const isMinor = applicant?.hasContinuedAsMinor;

        if (!fullName) {
          applicantsMap[`applicant${i}`] = null;
          continue;
        }

        applicantsMap[`applicant${i}`] = {
          value: `${oppId}/${i}`,
          name: fullName,
          isMinor: isMinor,
        };
      }

      return {
        data: {
          noOfApplicants: applicants.noOfApplicants,
          applicants: applicantsMap,
        },
      };
    } catch (error) {
      logger.error('Error fetching applicants:', error);
      logsAndErrorHandling('salesService - getBookingApplicants', error, {
        oppId,
      });
    }
  }

  // Helper to handle per-applicant swap & validation
  private handleApplicantSwap(
    target: ApplicantSlot,
    key: string,
    payloadValue: any,
    bookingOppId: string,
    original: Record<ApplicantSlot, any>,
    usedSources: Set<ApplicantSlot>,
  ): any {
    const applicantType = validateApplicantValue(payloadValue, key);

    // clear applicant column for "null" or "new"
    if (applicantType.type === 'null' || applicantType.type === 'new')
      return null;

    // parse reference "<oppId>/<applicantNo>"
    const ref = parseValues(applicantType.value);
    if (!ref || ref.oppId !== bookingOppId)
      throw new BadRequestException(
        `${key} value "${payloadValue}" is invalid, expected format "<oppId>/<applicantNo>" or "New Applicant"`,
      );

    if (usedSources.has(ref.applicantNo))
      throw new BadRequestException(
        `Duplicate source applicantNo /${ref.applicantNo} used more than once (in ${key})`,
      );

    usedSources.add(ref.applicantNo);

    return structuredClone(original[ref.applicantNo]);
  }

  async manageApplicants(oppId: string, payload: ManageApplicantsDto) {
    try {
      return await this.dataSource.transaction(async (trx) => {
        const bookingRepo = trx.getRepository(Booking);
        const booking = await bookingRepo.findOne({
          where: { opportunityId: oppId },
        });

        if (!booking) throw new BadRequestException('Booking not found');

        const original: Record<ApplicantSlot, any> = {
          1: structuredClone(booking.applicant1 ?? null),
          2: structuredClone(booking.applicant2 ?? null),
          3: structuredClone(booking.applicant3 ?? null),
          4: structuredClone(booking.applicant4 ?? null),
        };
        const next: Record<ApplicantSlot, any> = { ...original };
        const usedSources = new Set<ApplicantSlot>();

        for (const target of [1, 2, 3, 4] as const) {
          const key = `applicant${target}` as const;
          if (!(key in payload)) continue;

          next[target] = this.handleApplicantSwap(
            target,
            key,
            payload[key],
            booking.opportunityId,
            original,
            usedSources,
          );
        }

        if (payload.noOfApplicants === 0)
          throw new BadRequestException('Primary applicant is required');

        Object.assign(booking, {
          isCompleted: false,
          signedPdf: null,
          mergedPdf: null,
          officeUsePdf: null,
          formFilledAt: null,
          formSignedAt: null,
          feedback: null,
          rating: null,
          unsignedPdf: null,
          leegalityData: null,
          isAgreedOnTerms: false,
          lastStep: payload.lastStep,
          noOfApplicants: payload.noOfApplicants,
          bookingFormStatus: BookingFormStatusEnum.IN_PROGRESS,
          applicant1: next[1],
          applicant2: next[2],
          applicant3: next[3],
          applicant4: next[4],
        });

        await bookingRepo.save(booking);

        return {
          data: {
            bookingId: booking.id,
            opportunityId: booking.opportunityId,
            noOfApplicants: booking.noOfApplicants,
            applicants: {
              applicant1: booking.applicant1 ?? null,
              applicant2: booking.applicant2 ?? null,
              applicant3: booking.applicant3 ?? null,
              applicant4: booking.applicant4 ?? null,
            },
          },
        };
      });
    } catch (error) {
      logger.error('Error managing applicants:', error);
      logsAndErrorHandling('salesService - manageApplicants', error, { oppId });
    }
  }

  async sendGroupLink(groupId: string, emailIds: string) {
    try {
      logger.info(`Entered salesService/sendGroupLink, groupId: ${groupId}`);
      const group = await this.multiBookingRepository.findOne({
        where: { id: groupId },
      });

      if (!group) {
        throw new NotFoundException('No group found with the given groupId');
      }

      let recipients: string[] = [];
      // Check if client provided emailIds
      if (emailIds) {
        recipients = emailIds
          .split(',')
          .map((email) => email.trim())
          .filter(Boolean); // Remove empty strings
      }

      // Generate group link
      const baseUrl = this.configService.get<string>('PURAVANKARA_BASE_URL');
      const groupLink = `${baseUrl}/${GROUP_LISTING_URL}/${groupId}`;

      // Send email to all recipients
      await this.sendComposedEmail(
        ComposeEmailsEnum.GROUP_LINK,
        {
          GROUP_NAME: group.groupName || 'Multi-Unit Booking',
          GROUP_LINK: groupLink,
        },
        { to: recipients },
        BRAND_PURAVANKARA,
      );

      return {
        statusCode: SUCCESS,
        message: 'Group link sent successfully.',
        data: {
          groupId,
          emailIds,
          groupLink,
        },
      };
    } catch (error) {
      logger.error('Error sending group link email', error);
      logsAndErrorHandling('salesService - sendGroupLink', error, {
        groupId,
        emailIds,
      });
    }
  }

  /**
   * Updates or creates a booking_office_use record with closing_rm_id.
   * @param opportunityId - The opportunity ID
   * @param closingRmId - The closing RM ID to set
   * @param primarySourceDisabled - Optional primary source disabled flag
   */
  private async updateOfficeUseClosingRm(
    opportunityId: string,
    closingRmId: number | undefined,
    primarySourceDisabled?: boolean,
  ): Promise<void> {
    const existingOfficeUse = await this.officeUseRepository.findOne({
      where: { opportunityId },
    });

    const officeUsePayload: any = existingOfficeUse
      ? {
          id: existingOfficeUse.id,
          opportunityId,
          officeInfo: existingOfficeUse.officeInfo,
          ...(primarySourceDisabled !== undefined && {
            primarySourceDisabled,
          }),
        }
      : {
          opportunityId,
          officeInfo: {},
          ...(primarySourceDisabled !== undefined && {
            primarySourceDisabled,
          }),
        };

    await this.officeUseRepository.upsert(officeUsePayload, ['opportunityId']);
  }
}
