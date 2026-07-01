import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgreementSignature } from './entities/agreement_signatures.entity';
import { Repository, Not, In } from 'typeorm';
import { AgreementSignatureDto } from './dto/create-form.dto';
import { logger } from 'src/logger/logger';
import { Users, Role, Department, Booking } from 'src/entities';
import { StatusEnum } from 'src/enums/status.enum';
import { InviteesDto } from './dto/update-invitees.dto';
import {
  AgreementSignatory,
  InternalSignatorySignature,
  DocumentStatus,
  DocumentFilterStatuses,
  E_SIGNER_MODULE_ACCESS_ROLES,
} from 'src/enums/agreement-signature.enum';
import { QueryAgreementSignatureDto } from './dto/query-agreement-signature.dto';
import { UserDto } from './dto/user.dto';
import { formatDate, generateRandomNumber } from 'src/utils';
import {
  BRAND_PURAVANKARA,
  DATE_FORMAT_DMY,
  DISPLAY_DATE_TIME_FORMAT_FOR_FILE_NAME,
  EMPTY_SLOTS,
  THREE_DAYS_AGO,
} from 'src/config/constants';
import { PdfService } from '../pdf/pdf.service';
import { LeegalityService } from 'src/modules/leegality/leegality.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ComposeEmailsEnum,
  EventMessagesEnum,
} from 'src/enums/event-messages.enum';
import { S3FileFetchEvent } from 'src/events/aws.events';
import { ComposeEmailEvent } from 'src/events/email.events';
import { updateInvitee } from 'src/helpers/bookings.helper';
import { EmployeeStatus } from 'src/enums/employee-status.enum';
import { generateRandomId } from 'src/utils/generateRandomNumber';
import { ConfigService } from '@nestjs/config';
import { buildAgreementExcelSheet } from 'src/helpers/agreementExport.helper';
import * as ExcelJS from 'exceljs';
import * as moment from 'moment';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { PassThrough } from 'stream';
import { AwsService } from '../aws/aws.service';
import { filterAgreementList } from 'src/utils/agreement-field-permissions';
import { RolesEnum } from 'src/enums/roles.enum';
import { EoiCampaignStageType } from 'src/enums/eoi-form.enums';
import { BatchService } from '../eoi_manager/batch_manager/batch.service';
interface Invitee {
  name: string;
  email?: string;
  [key: string]: any;
}

@Injectable()
export class AgreementSignatureFormService {
  constructor(
    @InjectRepository(AgreementSignature)
    private readonly agreementSignatureRepository: Repository<AgreementSignature>,

    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,

    private readonly configService: ConfigService,

    private readonly pdfService: PdfService,
    private readonly leegalityService: LeegalityService,
    private readonly eventEmitter: EventEmitter2,
    private readonly awsService: AwsService,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly batchService: BatchService,
  ) {}

  /**
   * Creates a new agreement signature form in the database.
   * Builds form data from DTO, fetches related RM details, and saves the form.
   * If mergeDocs is false, creates multiple forms, one for each document.
   * @param dto The agreement signature form data transfer object
   * @param createdBy The user ID of the person creating the form
   * @returns Promise containing success status, message, and created form data
   */
  async createForm(
    dto: AgreementSignatureDto,
    createdBy: number,
  ): Promise<any> {
    try {
      if (dto.opportunityId) {
        await this.validateDocumentNameUniqueness(
          dto.opportunityId,
          dto.documents,
          null,
        );
      }

      const creator = await this.usersRepository.findOne({
        where: { id: createdBy },
      });

      if (!creator) {
        throw new NotFoundException(`User not found`);
      }
      if (dto.mergeDocs) {
        await this.validateMergedDocument(dto);
      }

      const createdForms = [];

      const isMultipleDocs =
        !dto.mergeDocs && dto.documents && dto.documents.length > 1;

      if (isMultipleDocs) {
        for (const document of dto.documents) {
          const form = await this.createSingleForm(dto, creator, [document]);
          createdForms.push(form);
        }
      } else {
        const form = await this.createSingleForm(dto, creator);
        createdForms.push(form);
      }

      return {
        success: true,
        message: 'Agreement signature form(s) created successfully.',
        data: createdForms.length === 1 ? createdForms[0] : createdForms,
      };
    } catch (error: unknown) {
      logger.error(error);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to create agreement signature form. Please try again later.`,
      );
    }
  }

  private async createSingleForm(
    dto: AgreementSignatureDto,
    creator: Users,
    documentsOverride?: any[],
  ) {
    const formData = await this.buildFormData(dto);

    if (documentsOverride) {
      formData.documents = documentsOverride;
    }
    if (dto.mergeDocs) {
      formData.documentType = 'Merged Document';
      formData.documentName = dto.documentName;
    } else {
      const currentDoc = documentsOverride?.[0] || dto.documents?.[0];
      formData.documentType = currentDoc?.type;
      formData.documentName = currentDoc?.name;
    }

    formData.createdBy = creator;

    const newForm = this.agreementSignatureRepository.create(formData);

    if (!newForm) {
      throw new BadRequestException('Error creating the form');
    }

    await this.agreementSignatureRepository.save(newForm);

    // Handle invitees
    if (!newForm.internalSignatoryRequired) {
      const externalInvitees = [
        newForm.applicant1,
        newForm.applicant2,
        newForm.applicant3,
        newForm.applicant4,
      ].filter(Boolean);

      if (externalInvitees.length > 0) {
        newForm.invitees = {
          internal: [],
          external: externalInvitees,
        };

        await this.processInviteesAndSendToLeegality(newForm);
      }
    }

    return newForm;
  }

  /**
   * Updates an existing agreement signature form in the database.
   * Finds the form by ID, validates its existence, builds updated data, and saves changes.
   * @param id The unique identifier of the agreement signature form to update
   * @param dto The updated agreement signature form data transfer object
   * @returns Promise containing success status, message, and updated form data
   */
  async updateForm(id: number, dto: AgreementSignatureDto): Promise<any> {
    try {
      // Find the existing form by ID
      const existingForm = await this.agreementSignatureRepository.findOne({
        where: { id },
      });

      if (!existingForm) {
        throw new NotFoundException(
          `Agreement-Signature form not found for id: ${id}`,
        );
      }

      // Check for existing forms with same opportunityId and validate document name uniqueness
      if (dto.opportunityId) {
        await this.validateDocumentNameUniqueness(
          dto.opportunityId,
          dto.documents,
          id,
        );
      }

      // Build updated form data from DTO and related entities
      const formData = await this.buildFormData(dto, existingForm);

      if (dto.mergeDocs) {
        const docName = dto.documentName?.trim();
        if (!docName) {
          throw new BadRequestException(
            'Document name is required when merging documents',
          );
        }

        const existing = await this.agreementSignatureRepository
          .createQueryBuilder('form')
          .where('LOWER(TRIM(form.documentName)) = LOWER(TRIM(:docName))', {
            docName,
          })
          .andWhere('form.id != :id', { id })
          .getOne();

        if (existing) {
          throw new BadRequestException(`Document name already exists`);
        }
        formData.documentType = 'Merged Document';
        formData.documentName = docName;
      } else {
        const firstDoc = dto.documents?.[0] || existingForm.documents?.[0];
        if (firstDoc) {
          formData.documentType = firstDoc.type;
          formData.documentName = firstDoc.name?.trim();
        }
      }

      // Merge new data into the existing form
      const updatedForm = this.agreementSignatureRepository.merge(
        existingForm,
        formData,
      );

      // Save the updated form to the database
      await this.agreementSignatureRepository.save(updatedForm);

      // If internal signatory is not required and not already processed, process invitees automatically
      if (
        !updatedForm.internalSignatoryRequired &&
        updatedForm.documentStatus !== DocumentStatus.SENT_FOR_SIGNATURE
      ) {
        const externalInvitees = [
          updatedForm.applicant1,
          updatedForm.applicant2,
          updatedForm.applicant3,
          updatedForm.applicant4,
        ].filter(Boolean);

        if (externalInvitees.length > 0) {
          updatedForm.invitees = {
            internal: [],
            external: externalInvitees,
          };

          await this.processInviteesAndSendToLeegality(updatedForm);
        }
      }

      return {
        success: true,
        message: 'Agreement signature form updated successfully.',
        data: updatedForm,
      };
    } catch (error) {
      logger.error(error);
      return logsAndErrorHandling(
        'AgreementSignatureFormService - updateForm',
        error,
        { id, dto },
      );
    }
  }

  /**
   * Retrieves a specific agreement signature form by its ID.
   * Validates the form exists and returns the complete form data.
   * @param id The unique identifier of the agreement signature form to retrieve
   * @returns Promise containing success status, message, and form data
   */
  async getForm(id: number): Promise<any> {
    try {
      const form = await this.agreementSignatureRepository.findOne({
        where: { id },
      });
      if (!form) {
        throw new NotFoundException(
          `Agreement-Signature form not found for id: ${id}`,
        );
      }
      return {
        success: true,
        message: 'Agreement signature form fetched successfully.',
        data: form,
      };
    } catch (error) {
      logger.error(error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch agreement signature form',
      );
    }
  }

  /**
   * Lists agreement signature forms with pagination and filtering for CRM dashboard.
   * Supports filtering by document status, search terms, creator, date range, and internal signatory.
   * Includes dashboard summary metrics and pagination information.
   * @param filters Query parameters for filtering, pagination, and search
   * @returns Promise containing paginated results, summary metrics, and pagination details
   */
  async listAgreementSignatures(
    filters: QueryAgreementSignatureDto,
    user: any,
    isExcel?: boolean,
  ): Promise<any> {
    try {
      const { startDate, endDate, page, limit } = filters;

      if ((startDate && !endDate) || (!startDate && endDate)) {
        throw new BadRequestException('Start Date & End Date both required');
      }

      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        throw new BadRequestException('Start Date cannot be after End Date');
      }

      const [{ agreements, total }, summary] = await Promise.all([
        this.buildAgreementSignatureQuery(filters, user, isExcel),
        this.getDashboardSummary(user),
      ]);

      const result = this.mapAgreementsForListing(agreements);
      const filteredResult = filterAgreementList(result, user.role);

      return {
        message: 'Agreement signature forms fetched successfully.',
        data: {
          result: filteredResult,
          summary,
          total,
          page,
          pageSize: limit,
          pageCount: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(error);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fetch agreement signature forms',
      );
    }
  }

  async exportAgreement(query, user): Promise<any> {
    try {
      const exportFilter = { ...query };
      delete exportFilter.page;
      delete exportFilter.limit;

      const agreementsResult = await this.listAgreementSignatures(
        exportFilter,
        user,
        true,
      );
      const agreements = agreementsResult?.data?.result ?? [];
      if (!agreements || agreements.length === 0) {
        return {
          message: 'No agreements found to export',
          data: [],
        };
      }
      const workbook = new ExcelJS.Workbook();
      buildAgreementExcelSheet(workbook, { agreements });
      const buffer = await workbook.xlsx.writeBuffer();

      const timeStamp = moment().format(DISPLAY_DATE_TIME_FORMAT_FOR_FILE_NAME);
      const s3Key = `exports/agreements/agreements-${timeStamp}.xlsx`;

      const stream = new PassThrough();
      stream.end(buffer);

      await this.awsService.uploadToS3(s3Key, stream, true);
      return {
        message: 'Agreements exported successfully',
        data: { filePath: s3Key },
      };
    } catch (error) {
      logger.error('Agreements export failed:', error);
      logsAndErrorHandling('agreementsService - exportAgreements', error, {
        query,
      });
    }
  }

  private async buildAgreementSignatureQuery(
    filters: QueryAgreementSignatureDto,
    user: any,
    isExcel?: boolean,
  ): Promise<{ agreements: any[]; total: number }> {
    const {
      documentStatus,
      search,
      createdBy,
      startDate,
      endDate,
      sortBy,
      page,
      limit,
      documentType,
      internalSignatory,
    } = filters;
    const { sortField, sortDirection } = this.parseSortBy(sortBy);

    const query = this.agreementSignatureRepository
      .createQueryBuilder('agreement')
      .leftJoinAndSelect('agreement.createdBy', 'createdBy')
      .leftJoin('createdBy.role', 'role');

    if (E_SIGNER_MODULE_ACCESS_ROLES.includes(user.role)) {
      query.andWhere('agreement.createdBy = :createdBy', {
        createdBy: user.dbId,
      });
    }
    if (user.role === RolesEnum.CRM) {
      query.andWhere('role.name = :crmRole', {
        crmRole: RolesEnum.CRM,
      });
    }

    if (documentStatus) {
      if (documentStatus === DocumentFilterStatuses.TOTAL_AGREEMENT_SENT) {
        query.andWhere(`agreement.documentStatus != :inProgressStatus`, {
          inProgressStatus: DocumentStatus.IN_PROGRESS,
        });
      } else if (
        documentStatus === DocumentFilterStatuses.CX_SIGN_DUE_FOR_THREE_DAYS
      ) {
        query.andWhere(
          `agreement.sentDate < :threeDaysAgo AND agreement.documentStatus IN (:...includedStatuses)`,
          {
            threeDaysAgo: THREE_DAYS_AGO,
            includedStatuses: [
              DocumentStatus.SENT_FOR_SIGNATURE,
              DocumentStatus.CUSTOMER_PARTIALLY_SIGNED,
            ],
          },
        );
      } else {
        query.andWhere('agreement.documentStatus = :documentStatus', {
          documentStatus,
        });
      }
    }

    if (search) {
      query.andWhere(
        '(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(agreement.applicant1, "$.name")), "") LIKE :search OR agreement.unitNo LIKE :search OR agreement.enquiryReferenceNumber LIKE :search  OR agreement.documentName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (createdBy) {
      query.andWhere('agreement.createdBy = :createdBy', { createdBy });
    }

    if (startDate && endDate) {
      query.andWhere('agreement.sentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (internalSignatory) {
      query.andWhere(
        'JSON_EXTRACT(agreement.invitees, "$.internal[0].id") = :internalSignatory AND JSON_LENGTH(JSON_EXTRACT(agreement.invitees, "$.internal")) > 0',
        { internalSignatory },
      );
    }

    if (sortField === 'applicantName') {
      query.addSelect(
        `COALESCE(JSON_UNQUOTE(JSON_EXTRACT(agreement.applicant1, '$.name')), '')`,
        'applicantName',
      );
      query.orderBy('applicantName', sortDirection);
    } else {
      query.orderBy(`${sortField}`, sortDirection);
    }

    if (documentType) {
      query.andWhere('agreement.documentType = :documentType', {
        documentType,
      });
    }

    if (!isExcel) {
      query.skip((page - 1) * limit).take(limit);
    }
    const [agreements, total] = await query.getManyAndCount();
    return { agreements, total };
  }

  private parseSortBy(sortBy?: string): {
    sortField: string;
    sortDirection: 'ASC' | 'DESC';
  } {
    // Default sort configuration
    let sortField = 'agreement.createdAt';
    let sortDirection: 'ASC' | 'DESC' = 'DESC';

    if (!sortBy) return { sortField, sortDirection };

    const [field, direction = 'DESC'] = sortBy.split(':');
    const dir = direction.toUpperCase() as 'ASC' | 'DESC';

    const sortFieldMap: Record<string, string> = {
      projectName: 'agreement.projectName',
      unitNo: 'agreement.unitNo',
      salesOrderId: 'agreement.salesOrderId',
      enquiryReferenceNumber: 'agreement.enquiryReferenceNumber',
      opportunityId: 'agreement.opportunityId',
      numberOfApplicants: 'agreement.numberOfApplicants',
      documentStatus: 'agreement.documentStatus',
      sentDate: 'agreement.sentDate',
      signedAt: 'agreement.signedAt',
      rmName: 'agreement.createdBy',
      createdAt: 'agreement.createdAt',
      updatedAt: 'agreement.updatedAt',
      applicantName: 'applicantName',
    };

    if (field in sortFieldMap && (dir === 'ASC' || dir === 'DESC')) {
      sortField = sortFieldMap[field];
      sortDirection = dir;
    }

    return { sortField, sortDirection };
  }

  private mapAgreementsForListing(agreements: AgreementSignature[]): any[] {
    return agreements.map((form) => {
      const signedPdf = form?.internalSignatoryRequired
        ? form?.signedPdf
        : form.customerSignedPdf;
      return {
        id: form.id,
        projectName: form.projectName,
        unitNo: form.unitNo,
        salesOrderId: form?.salesOrderId ?? null,
        enquiryReferenceNumber: form?.enquiryReferenceNumber ?? null,
        applicantName: this.extractApplicantNames(form.applicant1),
        numberOfApplicants: form?.numberOfApplicants,
        documentStatus: form?.documentStatus,
        sentDate: form?.sentDate ?? null,
        signedAt: form?.signedAt ?? null,
        internalSignatory: this.extractInternalInviteeNames(form.invitees),
        internalSignatorySignature: this.determineInternalSignatorySignature(
          form?.documentStatus,
          form?.internalSignatoryRequired,
        ),
        rmName: form?.createdBy?.name ?? null,
        signedPdf: signedPdf ?? null,
        internalSignatoryRedirection: this.fetchInternalSignatoryRedirectionUrl(
          form?.documentStatus,
          form?.leegalityData,
        ),
        documents: form?.documents ?? null,
        documentType: form?.documentType ?? null,
        documentName: form?.documentName ?? null,
        opportunityId: form?.opportunityId ?? null,
        inviteesData:
          form?.leegalityData?.invitees?.map((invitee) => ({
            name: invitee.name,
            signUrl: invitee.signUrl,
          })) ?? [],
      };
    });
  }

  /**
   * Fetches internal signatories for dropdown selection.
   * Returns users with isSignatory=true including their name, email, and contact information.
   * @returns Promise containing array of internal signatories
   */
  async getInternalSignatories(): Promise<any> {
    try {
      // Fetch internal signatories with required fields
      const users = await this.usersRepository.find({
        where: { isSignatory: true },
        select: ['id', 'name', 'userName', 'contactNumber'],
        order: { name: 'ASC' },
      });

      const internalSignatories = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.userName,
        contactNumber: u.contactNumber,
      }));

      // Validate that we got an array (defensive programming)
      const validatedInternalSignatories = Array.isArray(internalSignatories)
        ? internalSignatories
        : [];

      return {
        success: true,
        message: 'Internal signatories fetched successfully',
        data: validatedInternalSignatories,
      };
    } catch (error) {
      logger.error('Error fetching internal signatories:', error);

      // Check if it's a database connection issue
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new InternalServerErrorException(
          'Database connection failed. Please try again later.',
        );
      }

      // Check if it's a query syntax issue
      if (
        error.code === 'ER_PARSE_ERROR' ||
        error.code === 'ER_BAD_FIELD_ERROR'
      ) {
        throw new InternalServerErrorException(
          'Database query error. Please contact support.',
        );
      }

      // Generic error for other cases
      throw new InternalServerErrorException(
        'Failed to fetch internal signatories. Please try again later.',
      );
    }
  }

  /**
   * Fetches both internal signatories and CRM users for dropdown filters in listing page.
   * Returns users with isSignatory=true and users with roleId=59 in a single response.
   * @returns Promise containing both internal signatories and CRM users
   */
  async getDropdownUsers(): Promise<any> {
    try {
      // Fetch both internal signatories and CRM users in parallel
      const [internalSignatories, crmUsers] = await Promise.all([
        this.usersRepository.find({
          where: { isSignatory: true },
          select: ['userId', 'id', 'name'],
          order: { name: 'ASC' },
        }),
        this.usersRepository.find({
          where: { role: { id: 59 } },
          select: ['userId', 'id', 'name'],
          order: { name: 'ASC' },
        }),
      ]);

      // Validate that we got arrays (defensive programming)
      const validatedInternalSignatories = Array.isArray(internalSignatories)
        ? internalSignatories
        : [];
      const validatedCrmUsers = Array.isArray(crmUsers) ? crmUsers : [];

      return {
        success: true,
        message: 'Dropdown users fetched successfully',
        data: {
          internalSignatories: validatedInternalSignatories,
          crmUsers: validatedCrmUsers,
        },
      };
    } catch (error) {
      logger.error('Error fetching dropdown users:', error);

      // Check if it's a database connection issue
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new InternalServerErrorException(
          'Database connection failed. Please try again later.',
        );
      }

      // Check if it's a query syntax issue
      if (
        error.code === 'ER_PARSE_ERROR' ||
        error.code === 'ER_BAD_FIELD_ERROR'
      ) {
        throw new InternalServerErrorException(
          'Database query error. Please contact support.',
        );
      }

      // Generic error for other cases
      throw new InternalServerErrorException(
        'Failed to fetch dropdown users. Please try again later.',
      );
    }
  }

  /**
   * Returns dashboard summary metrics for agreement signatures.
   * Calculates key performance indicators for the CRM dashboard using a single optimized query.
   * - totalSent: Agreements that have been sent (not in progress)
   * - totalSigned: Agreements signed by internal signatory
   * - dueFor3Days: Agreements sent for signature but not signed for more than 3 days
   * - pendingInternal: Agreements pending with internal signatory
   * @returns Promise containing summary metrics as numbers
   */
  async getDashboardSummary(user): Promise<any> {
    try {
      const signedStatus =
        user.role === RolesEnum.CRM
          ? DocumentStatus.SIGNED
          : DocumentStatus.CRM_SIGN_PENDING;
      // Run a single SQL query to get all summary metrics
      const query = this.agreementSignatureRepository
        .createQueryBuilder('agreement')
        .leftJoin('agreement.createdBy', 'createdBy')
        .leftJoin('createdBy.role', 'role')
        .select([
          'SUM(CASE WHEN agreement.documentStatus != :inProgressStatus THEN 1 ELSE 0 END) as totalSent',
          'SUM(CASE WHEN agreement.documentStatus = :signedStatus THEN 1 ELSE 0 END) as totalSigned',
          'SUM(CASE WHEN agreement.sentDate < :threeDaysAgo AND agreement.documentStatus IN (:...includedStatuses) THEN 1 ELSE 0 END) as dueFor3Days',
          'SUM(CASE WHEN agreement.documentStatus = :pendingInternalStatus THEN 1 ELSE 0 END) as pendingInternal',
        ]);
      //  E-Signer roles -> only own agreements
      if (E_SIGNER_MODULE_ACCESS_ROLES.includes(user.role)) {
        query.andWhere('agreement.createdBy = :loggedInUserId', {
          loggedInUserId: user.dbId,
        });
      }

      // CRM -> only CRM created agreements
      if (user.role === RolesEnum.CRM) {
        query.andWhere('role.name = :crmRole', {
          crmRole: RolesEnum.CRM,
        });
      }
      query.setParameters({
        inProgressStatus: DocumentStatus.IN_PROGRESS,
        signedStatus,
        threeDaysAgo: THREE_DAYS_AGO,
        includedStatuses: [
          DocumentStatus.SENT_FOR_SIGNATURE,
          DocumentStatus.CUSTOMER_PARTIALLY_SIGNED,
        ],
        pendingInternalStatus: DocumentStatus.CRM_SIGN_PENDING,
      });
      const result = await query.getRawOne();

      if (!result) {
        return {
          totalSent: 0,
          totalSigned: 0,
          dueFor3Days: 0,
          pendingInternal: 0,
        };
      }

      return {
        totalSent: Number(result.totalSent),
        totalSigned: Number(result.totalSigned),
        dueFor3Days: Number(result.dueFor3Days),
        pendingInternal: E_SIGNER_MODULE_ACCESS_ROLES.includes(user.role)
          ? 0
          : Number(result.pendingInternal),
      };
    } catch (error) {
      logger.error(error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch dashboard summary metrics',
      );
    }
  }

  /**
   * Updates invitees for an existing agreement signature form.
   * Merges PDFs, uploads to S3, sends invitations to external signatories, and activates the signing process.
   * Updates document status to SENT_FOR_SIGNATURE and sets the sent date.
   * @param id The unique identifier of the agreement signature form
   * @param dto The invitees data transfer object containing internal and external signatories
   * @returns Promise containing success status, message, and updated invitees data
   */
  async updateInvitees(dto: InviteesDto): Promise<any> {
    const { agreementIds } = dto;
    const context = { agreementIds, dto };

    try {
      logger.info(`updateInvitees started`, context);

      if (!agreementIds || agreementIds.length === 0) {
        throw new BadRequestException(
          'No agreement IDs provided for invitee update',
        );
      }

      const existingForms = await this.agreementSignatureRepository.find({
        where: { id: In(agreementIds) },
      });

      if (!existingForms || existingForms.length === 0) {
        throw new NotFoundException(
          `Agreement signature form(s) not found for ids: ${agreementIds.join(
            ', ',
          )}`,
        );
      }

      const processedIds: number[] = [];
      const skippedIds: number[] = [];
      const failedRecords: Array<{ id: number; reason: string }> = [];

      for (const form of existingForms) {
        if (!form.internalSignatoryRequired) {
          skippedIds.push(form.id);
          continue;
        }

        const externalInvitees = [
          form.applicant1,
          form.applicant2,
          form.applicant3,
          form.applicant4,
        ].filter(Boolean);

        if (externalInvitees.length === 0) {
          failedRecords.push({
            id: form.id,
            reason: 'At least one applicant must be present',
          });
          continue;
        }

        form.invitees = {
          internal: dto.internal || [],
          external: externalInvitees,
        };

        logger.info(`Invitees prepared`, {
          agreementId: form.id,
          internalCount: form.invitees.internal.length,
          externalCount: externalInvitees.length,
        });

        try {
          await this.processInviteesAndSendToLeegality(form);
          processedIds.push(form.id);
        } catch (error) {
          logger.error(`Processing failed for agreement id ${form.id}`, error);
          failedRecords.push({
            id: form.id,
            reason: error?.message || 'Failed to process invitees',
          });
        }
      }

      if (processedIds.length === 0 && failedRecords.length > 0) {
        throw new BadRequestException(
          `Unable to update any invitees: ${failedRecords
            .map((item) => `${item.id}: ${item.reason}`)
            .join('; ')}`,
        );
      }

      return {
        success: true,
        message: failedRecords.length
          ? 'Invitees processed with partial failures.'
          : 'Invitees updated successfully.',
        data: { id: agreementIds[0], processedIds, skippedIds, failedRecords },
      };
    } catch (error) {
      logger.error(`updateInvitees failed`, error, context);

      return logsAndErrorHandling(
        'AgreementSignatureFormService - updateInvitees',
        error,
        context,
      );
    }
  }

  /**
   * Processes invitees, prepares PDF, sends to Leegality, and activates signing for a form.
   * Assumes form.invitees is already set.
   * @param form The agreement signature form entity
   */
  private async processInviteesAndSendToLeegality(
    form: AgreementSignature,
  ): Promise<void> {
    // STEP 3: Prepare PDF
    const filePath = this.getAgreementFileName(form);
    const irnString = `IRN-${generateRandomNumber(4)}-${form.agreementId}`;

    logger.info(`Preparing PDF`, { filePath });
    const pdfBuffer = await this.preparePdfForSigning(form.documents);
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
    logger.info(`PDF prepared`);

    // STEP 4: Upload to S3
    let unsignedPdfUrl: string;
    try {
      unsignedPdfUrl = await this.leegalityService.uploadPdfBufferToS3(
        `unsigned-pdf/${form.agreementId}/${filePath}`,
        pdfBuffer,
      );

      logger.info(`PDF uploaded to S3`, { unsignedPdfUrl });
    } catch (error) {
      logger.error(`S3 upload failed`, error);
      throw new InternalServerErrorException('Failed to upload document.');
    }

    // STEP 5: Send to Leegality
    let leegalityData: any;
    try {
      leegalityData = await this.sendAndActivateInvitations(
        base64Pdf,
        filePath,
        form.invitees.external,
        irnString,
      );

      logger.info(`Leegality invitation sent`, {
        inviteeCount: leegalityData?.invitees?.length,
      });
    } catch (error) {
      logger.error(`Leegality failed`, error);

      // CLEANUP S3
      await this.leegalityService.safeS3Cleanup(unsignedPdfUrl);

      throw new BadRequestException(
        'Failed to proceed for online signature. Please try again or check with your RM.',
      );
    }

    // STEP 6: Activate invitations
    try {
      await this.activateInvitations(leegalityData.invitees);
      logger.info(`Invitations activated`);
    } catch (error) {
      logger.error(`Activation failed`, error);

      // optional: decide if this should fail or not
      throw new InternalServerErrorException('Failed to activate invitations.');
    }

    // STEP 7: Update DB
    form.unsignedPdf = unsignedPdfUrl;
    form.leegalityData = leegalityData;
    form.documentStatus = DocumentStatus.SENT_FOR_SIGNATURE;
    form.sentDate = new Date();
    form.updatedAt = new Date();

    await this.agreementSignatureRepository.save(form);
    logger.info(`Form updated successfully`, { id: form.id });
  }

  /**
   * Prepares PDF buffer for signing by merging multiple PDFs.
   * @param documents Array of document objects with URLs
   * @returns Promise containing the merged PDF buffer
   */
  private async preparePdfForSigning(documents: any): Promise<Buffer> {
    if (!documents || (Array.isArray(documents) && documents.length === 0)) {
      throw new BadRequestException('No documents found to merge');
    }

    const documentUrls = Array.isArray(documents)
      ? documents.map((doc) => doc.url)
      : [];
    return await this.pdfService.mergeMultiplePDFs(documentUrls);
  }

  /**
   * Activates invitations for multiple invitees in parallel.
   * @param invitees Array of invitee objects
   * @returns Promise containing array of sign URLs that were activated
   */
  private async activateInvitations(invitees: any[]): Promise<void> {
    // Create activation promises for all invitees that need activation
    const activationPromises = invitees?.map(async (invitee) => {
      if (invitee.signUrl && !invitee.active) {
        try {
          const res = await this.leegalityService.activateInvitation(
            invitee.signUrl,
          );
          logger.info(`Activation response for ${invitee.signUrl}:`, res);

          // Always set active to true
          invitee.active = true;
        } catch (error) {
          logger.error(
            `Failed to activate invitation for ${invitee.signUrl}:`,
            error,
          );
          invitee.active = false;
        }
      }
    });

    // Execute all activations in parallel
    await Promise.all(activationPromises);
  }

  /**
   * Sends invitation and activates invites for agreement signature forms.
   * Integrates with Leegality service to send digital signature invitations to signatories.
   * Filters out invitees with missing name or email before processing.
   * @param base64Pdf The PDF document in base64 format
   * @param filePath The file path for the document
   * @param inviteesArray Array of invitee objects with name, email, and contact details
   * @param irnString The unique IRN (Internal Reference Number) for tracking
   * @returns Promise containing the Leegality service response data
   */
  async sendAndActivateInvitations(
    base64Pdf: any,
    filePath: string,
    inviteesArray: Invitee[],
    irnString: string,
  ): Promise<any> {
    try {
      // change contactNumber to phone for leegality api
      const updatedInvitees = inviteesArray.map(
        ({ contactNumber, ...rest }) => {
          let phone: string | null;

          if (contactNumber) {
            // Remove +91 country code if present
            let cleanedNumber = contactNumber.replace(/^\+91/, '');

            // Check if there's still a country code (+ followed by digits)
            if (cleanedNumber.match(/^\+\d+/)) {
              phone = null;
            } else {
              // Remove any non-digit characters
              cleanedNumber = cleanedNumber.replace(/\D/g, '');

              // Validate if it's exactly 10 digits
              if (cleanedNumber.length === 10) {
                phone = cleanedNumber;
              }
            }
          } else {
            phone = null;
          }

          return {
            ...rest,
            phone,
          };
        },
      );

      // Send invitation and activate invites
      const response = await this.leegalityService.sendInvitation(
        base64Pdf,
        filePath,
        updatedInvitees,
        irnString,
      );

      // Filter out invitees with no name or email
      if (response?.status === 1) {
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
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to invite signatories.');
    }
  }

  /**
   * Handles webhook notifications for internal signatory events from Leegality.
   * Processes webhook data based on event type (Success/Failed) and document status.
   * Updates agreement status to SIGNED when document is completed and downloads signed PDF.
   * @param webhookData The webhook payload from Leegality containing event details
   * @returns Promise that resolves when webhook processing is complete
   */
  async internalWebhook(webhookData: any): Promise<void> {
    logger.info('webhookData Data Received', webhookData);
    const { webhookType, documentStatus, documentId, irn, request } =
      webhookData;
    const agreementId = irn.split('-')[2];
    try {
      // Process webhook based on type and document status
      switch (webhookType) {
        case 'Success':
          if (documentStatus && documentStatus == 'Completed') {
            const agreementData =
              await this.agreementSignatureRepository.findOne({
                where: {
                  agreementId: agreementId,
                },
              });
            if (!agreementData) {
              throw new NotFoundException(
                `Agreement signature Form not found for agreementId: ${agreementId}`,
              );
            }
            const filePath = this.getAgreementFileName(agreementData);
            const signedPdf =
              await this.leegalityService.downloadSignedDocument(
                documentId,
                filePath,
                agreementId,
              );
            if (!signedPdf) {
              throw new Error(
                `Invalid or missing signed PDF for documentId: ${documentId}`,
              );
            }
            await this.updateAgreementStatus({
              agreementId: agreementId,
              documentStatus: DocumentStatus.SIGNED,
              signedPdf,
              inviteeData: request,
              context: AgreementSignatory.INTERNAL,
            });

            // Send signed agreement email to applicants (non-blocking)
            await this.sendSignedAgreementEmailToApplicants(
              agreementData,
              signedPdf,
            ).catch((error) => {
              logger.error(
                `Failed to send signed agreement email for ${agreementId}:`,
                error,
              );
            });
          }

          logger.info(
            `Document ${documentId} ${irn} signed by ${webhookData.request.name}`,
          );
          break;

        case 'Failed':
          // Log failed signing attempts
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
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Webhook handling failed.');
    }
  }

  /**
   * Handles webhook notifications for external (customer) signatory events from Leegality.
   * Processes webhook data based on event type (Success/Failed) and document status.
   * Updates agreement status to CUSTOMER_PARTIALLY_SIGNED or CUSTOMER_DIGITALLY_SIGNED(CRM_SIGN_PENDING) based on completion.
   * Downloads signed PDF when document is completed by external signatory.
   * @param webhookData The webhook payload from Leegality containing event details
   * @returns Promise that resolves when webhook processing is complete
   */
  async externalWebhook(webhookData: any): Promise<void> {
    logger.info('webhookData Data Received', webhookData);
    const { webhookType, documentStatus, documentId, irn, request } =
      webhookData;
    const agreementId = irn.split('-')[2];
    try {
      // Process webhook based on type and document status
      switch (webhookType) {
        case 'Success':
          if (documentStatus && documentStatus == 'Sent') {
            await this.updateAgreementStatus({
              agreementId: agreementId,
              documentStatus: DocumentStatus.CUSTOMER_PARTIALLY_SIGNED,
              customerSignedPdf: null,
              inviteeData: request,
              context: AgreementSignatory.EXTERNAL,
            });
            // If document is completed, update status to CUSTOMER_DIGITALLY_SIGNED(CRM_SIGN_PENDING) and attach signed PDF
          } else if (documentStatus && documentStatus == 'Completed') {
            const agreementData =
              await this.agreementSignatureRepository.findOne({
                where: {
                  agreementId: agreementId,
                },
              });
            if (!agreementData) {
              throw new NotFoundException(
                `Agreement signature Form not found for agreementId: ${agreementId}`,
              );
            }
            const filePath = this.getAgreementFileName(agreementData, true);
            const customerSignedPdf =
              await this.leegalityService.downloadSignedDocument(
                documentId,
                filePath,
                agreementId,
              );
            if (!customerSignedPdf) {
              throw new Error(
                `Invalid or missing signed PDF for documentId: ${documentId}`,
              );
            }

            await this.updateAgreementStatus({
              agreementId: agreementId,
              documentStatus: DocumentStatus.CRM_SIGN_PENDING,
              customerSignedPdf,
              inviteeData: request,
              context: AgreementSignatory.EXTERNAL,
            });

            // UPDATE BATCH VOUCHER STATUS -> AGREEMENT_SIGNED - // Only for launched campaign vouchers mapped with booking
            if (agreementData?.opportunityId) {
              logger.info(
                `Agreement generated. Updating voucher status for opportunityId: ${agreementData.opportunityId}`,
              );
              await this.updateAgreementVoucherStatus(
                agreementData.opportunityId,
              );
            }

            await this.signInternalSignatory(agreementData);
          }

          logger.info(
            `Document ${documentId} ${irn} signed by ${webhookData.request.name}`,
          );
          break;

        case 'Failed':
          // Log failed signing attempts
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
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Webhook handling failed.');
    }
  }

  /**
   * Updates the agreement status and related fields in the database.
   * Handles both internal and external signatory updates, including signed PDF and invitee data.
   * Updates leegalityData with invitee information and signType, then saves to database.
   * @param leegalityData Object containing opportunityId, documentStatus, PDF data, invitee data, and context
   * @returns Promise that resolves to true when update is successful
   */
  async updateAgreementStatus(leegalityData: {
    agreementId: string;
    documentStatus: DocumentStatus;
    customerSignedPdf?: any;
    signedPdf?: any;
    inviteeData: any;
    context?: AgreementSignatory;
  }): Promise<boolean> {
    try {
      const {
        agreementId,
        documentStatus,
        customerSignedPdf,
        signedPdf,
        inviteeData,
        context,
      } = leegalityData;
      // Find the agreement by agreementId
      const agreementData = await this.agreementSignatureRepository.findOne({
        where: { agreementId },
      });

      if (!agreementData) {
        throw new NotFoundException('Agreement signature form not found');
      }

      const filters = {
        email: inviteeData.email,
        ...(inviteeData.phone && { phone: inviteeData.phone }),
      };

      const updatedLeegality = updateInvitee(
        agreementData.leegalityData,
        filters,
        { signType: inviteeData.signType, isSigned: true },
      );

      const updateData: Record<string, any> =
        context === AgreementSignatory.INTERNAL
          ? {
              documentStatus,
              signedPdf,
              signedAt:
                documentStatus === DocumentStatus.SIGNED ? new Date() : null,
              leegalityData: updatedLeegality,
            }
          : {
              documentStatus,
              customerSignedPdf,
              leegalityData: updatedLeegality,
            };

      await this.agreementSignatureRepository.update(
        { agreementId },
        updateData,
      );
      return true;
    } catch (error) {
      logger.error(
        `Error updating agreement status, ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Webhook handling failed.');
    }
  }

  /**
   * Handles the signing process for an internal signatory.
   * Finds the agreement by id, checks for internal invitees, and initiates the signature process.
   * Creates invitee array with empty slots and actual invitee, sends signed PDF to Leegality service,
   * and updates document status to CRM_SIGN_PENDING.
   * @param id The agreement signature form ID
   * @returns Promise containing success status and message
   */
  async signInternalSignatory(agreementData: any): Promise<any> {
    try {
      // Validate customer signed PDF exists
      const signedKey = agreementData?.customerSignedPdf;
      if (!signedKey) {
        throw new BadRequestException('Customer signatures are still pending!');
      }

      // Validate and prepare internal invitee
      const internalInvitee = agreementData?.invitees?.internal?.[0];
      if (!internalInvitee) {
        throw new NotFoundException('No internal invitees found');
      }

      // Create invitee array with empty slots and actual invitee
      const invitee = this.createInviteeArray(EMPTY_SLOTS, internalInvitee);
      if (!invitee?.length) {
        throw new NotFoundException('No internal invitees found');
      }

      // Prepare IRN string
      const irnString = `IRN-${generateRandomNumber(4)}-${agreementData.agreementId}`;

      // Start PDF fetch immediately (this is the slowest operation)
      const pdfFetchPromise = this.eventEmitter.emitAsync(
        EventMessagesEnum.FETCH_FILE_FROM_S3,
        new S3FileFetchEvent(signedKey),
      );

      // Wait for PDF fetch to complete and convert to base64
      const signedPdf = await pdfFetchPromise;
      const base64Pdf = signedPdf?.[0]?.toString('base64');

      // Send and activate invitations
      const leegalityData = await this.sendAndActivateInvitations(
        base64Pdf,
        signedKey,
        invitee,
        irnString,
      );

      //If not got proper response from leegality
      const leegalityError =
        'Failed to proceed for online signature. Please try again or check with your RM.';
      if (!leegalityData?.invitees) {
        logger.error(leegalityError);
        throw new ServiceUnavailableException(leegalityError);
      }

      // Update leegality data
      agreementData.leegalityData = leegalityData;

      // Activate invitations in parallel
      await this.activateInvitations(leegalityData.invitees);

      // Update the agreement status to CRM_SIGN_PENDING
      agreementData.documentStatus = DocumentStatus.CRM_SIGN_PENDING;

      await this.agreementSignatureRepository.save(agreementData);

      return {
        success: true,
        message:
          'Signature process for Internal Signatory initiated successfully.',
        data: null,
      };
    } catch (error) {
      logger.error('Error in signInternalSignatory:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Internal Signatory Signature failed',
      );
    }
  }

  /**
   * Creates a new user in the system with role and project assignments.
   * Validates user data, checks for existing users, and creates user record with signatory status.
   * @param dto The user data transfer object containing user details and assignments
   * @returns Promise containing success status, message, and created user data
   * @throws BadRequestException if user already exists or validation fails
   * @throws InternalServerErrorException if database operation fails
   */
  async addUser(dto: UserDto, createdBy: number): Promise<any> {
    try {
      const {
        name,
        email,
        empCode,
        contactNumber,
        role,
        reportingTo,
        crmProjects,
        isSignatory,
        department,
        getOfficeUseMail,
      } = dto;

      // Check if user already exists with the same email
      const existingUser = await this.usersRepository.findOne({
        where: { userName: email },
      });

      if (existingUser) {
        throw new BadRequestException(
          'User with this email address already exists',
        );
      }

      // Fetch the role entity first if role is provided
      const roleEntity = role ? await this.validateAndGetRole(role) : null;

      // Fetch the department entity first if department is provided
      const departmentEntity = department
        ? await this.validateAndGetDepartment(department)
        : null;

      // Validate reporter if provided
      await this.validateReporter(reportingTo);

      // Create new user object matching the Users entity structure
      const newUser = {
        name,
        Username: email,
        email: email.toLowerCase(),
        empCode,
        contactNumber,
        role: roleEntity, // Assign the role entity
        reportingTo,
        crmProjects,
        isSignatory,
        department: departmentEntity, // Assign the department entity
        status: StatusEnum.ACTIVE, // Default status set to ACTIVE
        EmployeeStatus: EmployeeStatus.AVAILABLE, // Default employee status set to AVAILABLE
        createdBy,
        getOfficeUseMail,
      };

      // Save user to database
      const savedUser = await this.usersRepository.save(newUser);

      return {
        success: true,
        message: 'User added successfully.',
        data: savedUser,
      };
    } catch (error) {
      logger.error(error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to add user. ${error?.message}`,
      );
    }
  }

  /**
   * Updates an existing user in the system.
   * Validates user data, checks for existing users, and updates user record.
   * @param id The unique identifier of the user to update
   * @param dto The updated user data transfer object
   * @returns Promise containing success status, message, and updated user data
   * @throws BadRequestException if user not found or validation fails
   * @throws InternalServerErrorException if database operation fails
   */
  async updateUser(id: number, dto: UserDto): Promise<any> {
    try {
      // Check if user exists with given id
      const existingUser = await this.usersRepository.findOne({
        where: { id },
      });
      if (!existingUser) throw new BadRequestException('User not found');

      const { role, reportingTo, department } = dto;

      // Check if user already exists with the same email (excluding the current user)
      await this.checkEmailUniqueness(dto.email, id);

      // Fetch the role entity first if role is provided
      const roleEntity = role ? await this.validateAndGetRole(role) : null;

      // Fetch the department entity first if department is provided
      const departmentEntity = department
        ? await this.validateAndGetDepartment(department)
        : null;

      // Validate reporter if provided
      await this.validateReporter(reportingTo);

      // Update user object with only provided fields
      const updatedUser = this.buildUpdatedUser(
        existingUser,
        dto,
        roleEntity,
        departmentEntity,
      );

      // Save user to database
      const savedUser = await this.usersRepository.save({
        ...existingUser,
        ...updatedUser,
      });

      return {
        success: true,
        message: 'User updated successfully.',
        data: savedUser,
      };
    } catch (error) {
      logger.error(error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to update user. ${error?.message}`,
      );
    }
  }

  /**
   * Validates that a role exists and returns the role entity
   * @param roleId The role ID to validate
   * @returns Promise<Role> The role entity if found
   * @throws BadRequestException if role not found
   */
  private async validateAndGetRole(roleId: number): Promise<Role> {
    const roleEntity = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!roleEntity) {
      throw new BadRequestException('Role not found');
    }

    return roleEntity;
  }

  /**
   * Validates that a department exists and returns the department entity (optional)
   * @param departmentId The department ID to validate (optional)
   * @returns Promise<Department | null> The department entity if found, null if not provided
   * @throws BadRequestException if department not found when provided
   */
  private async validateAndGetDepartment(
    departmentId?: number,
  ): Promise<Department | null> {
    if (!departmentId) return null;

    const departmentEntity = await this.departmentRepository.findOne({
      where: { id: departmentId },
    });

    if (!departmentEntity) {
      throw new BadRequestException('Department not found');
    }

    return departmentEntity;
  }

  /**
   * Validates that a reporter exists (optional)
   * @param reporterId The reporter ID to validate (optional)
   * @throws BadRequestException if reporter not found when provided
   */
  private async validateReporter(reporterId?: number): Promise<void> {
    if (!reporterId) return;

    const reporter = await this.usersRepository.findOne({
      where: { id: reporterId },
    });

    if (!reporter) {
      throw new BadRequestException('Reporter not found');
    }
  }

  private async checkEmailUniqueness(
    email: string,
    userId: number,
  ): Promise<void> {
    if (!email) return;
    const user = await this.usersRepository.findOne({
      where: { userName: email, id: Not(userId) },
    });
    if (user)
      throw new BadRequestException(
        'User with this email address already exists',
      );
  }

  private buildUpdatedUser(
    existingUser: Users,
    dto: UserDto,
    roleEntity: Role | null,
    departmentEntity: Department | null,
  ): Partial<Users> {
    const {
      name,
      email,
      empCode,
      contactNumber,
      reportingTo,
      crmProjects,
      isSignatory,
      getOfficeUseMail,
    } = dto;

    return {
      ...existingUser,
      ...(name && { name }),
      ...(email && { Username: email, email: email.toLowerCase() }),
      ...(empCode !== undefined && { empCode }),
      ...(contactNumber && { contactNumber }),
      ...(roleEntity && { role: roleEntity }),
      ...(reportingTo !== undefined && { reportingTo }),
      ...(crmProjects && { crmProjects }),
      ...(isSignatory !== undefined && { isSignatory }),
      ...(getOfficeUseMail !== undefined && { getOfficeUseMail }),
      ...(departmentEntity && { department: departmentEntity }),
    };
  }

  /**
   * Builds form data object from DTO and fetches related RM details.
   * Extracts form fields from DTO, queries booking_office_use table for RM information,
   * and constructs the complete form data object for database operations.
   * @param dto The agreement signature form data transfer object
   * @param existingForm Optional existing form data to avoid unnecessary DB queries
   * @returns Promise containing the constructed form data object
   */
  // eslint-disable-next-line
  private async buildFormData(
    dto: AgreementSignatureDto,
    existingForm?: AgreementSignature,
  ): Promise<Partial<AgreementSignature>> {
    const {
      salesOrderId,
      enquiryReferenceNumber,
      opportunityId,
      projectName,
      unitNo,
      numberOfApplicants,
      applicant1,
      applicant2,
      applicant3,
      applicant4,
      documents,
      internalSignatoryRequired,
      mergeDocs,
    } = dto;

    // Validate required fields
    if (!numberOfApplicants) {
      throw new BadRequestException('Number of applicants is required');
    }

    const agreementId = existingForm?.agreementId ?? generateRandomId();

    // Return the constructed form data object
    return {
      salesOrderId: salesOrderId ?? null,
      enquiryReferenceNumber: enquiryReferenceNumber ?? null,
      opportunityId: opportunityId ?? null,
      projectName: projectName ?? null,
      unitNo: unitNo ?? null,
      numberOfApplicants: numberOfApplicants ?? null,
      signedAt: null,
      applicant1: applicant1 ?? null,
      applicant2: applicant2 ?? null,
      applicant3: applicant3 ?? null,
      applicant4: applicant4 ?? null,
      documents: documents ?? null,
      internalSignatoryRequired:
        internalSignatoryRequired ??
        existingForm?.internalSignatoryRequired ??
        false,
      mergeDocs: mergeDocs ?? existingForm?.mergeDocs ?? false,
      agreementId: agreementId,
    };
  }

  /**
   * Generates a standardized filename for agreement PDF documents.
   * Constructs filename using project name, reference numbers, unit number, and formatted date.
   * Replaces spaces with underscores for file system compatibility.
   * @param existingForm The agreement signature form object containing project details
   * @returns Formatted filename string for the agreement PDF
   */
  private getAgreementFileName(
    existingForm: any,
    isCustomerSignedPdf = false,
  ): string {
    const prefix = isCustomerSignedPdf ? 'CX_' : '';
    const { projectName, unitNo } = existingForm || {};
    const date = formatDate(existingForm?.updatedAt, DATE_FORMAT_DMY);
    const fileName = `Agreement_Form_${projectName}_${prefix}${unitNo}_${date}.pdf`;
    return fileName.replaceAll(' ', '_');
  }

  /**
   * Extracts and formats applicant names as a comma-separated string.
   * Combines names from applicant1 and applicant2 objects, filtering out empty or null values.
   * Used for display purposes in listing and dashboard views.
   * @param applicant1 The first applicant object containing name property
   * @param applicant2 The second applicant object containing name property
   * @returns Comma-separated string of applicant names
   */
  private extractApplicantNames(
    applicant1?: { name?: string },
    applicant2?: { name?: string },
  ): string {
    const names = [];
    if (applicant1?.name) names.push(applicant1.name);
    if (applicant2?.name) names.push(applicant2.name);
    return names.join(', ');
  }

  /**
   * Determines the internal signatory signature status based on document status.
   * Maps document status to appropriate internal signatory signature status.
   * @param documentStatus The current document status
   * @returns The corresponding internal signatory signature status
   */
  private determineInternalSignatorySignature(
    documentStatus: DocumentStatus,
    internalSignatoryRequired: boolean,
  ): InternalSignatorySignature {
    if (!internalSignatoryRequired) return InternalSignatorySignature.NA;

    switch (documentStatus) {
      case DocumentStatus.IN_PROGRESS:
      case DocumentStatus.SENT_FOR_SIGNATURE:
      case DocumentStatus.CUSTOMER_PARTIALLY_SIGNED:
        return InternalSignatorySignature.NA; // -

      case DocumentStatus.CRM_SIGN_PENDING:
        return InternalSignatorySignature.NOT_SIGNED; // Not Signed

      case DocumentStatus.SIGNED:
        return InternalSignatorySignature.SIGNED;

      default:
        return InternalSignatorySignature.NA;
    }
  }

  /**
   * Extracts and formats internal invitee names as a comma-separated string.
   * Processes the internal invitees array from the invitees object, filtering out empty names.
   * Used for display purposes in listing and dashboard views.
   * @param invitees Object containing internal invitees array
   * @returns Comma-separated string of internal invitee names
   */
  private extractInternalInviteeNames(invitees?: {
    internal?: Invitee[];
  }): string {
    if (invitees && Array.isArray(invitees.internal)) {
      return invitees.internal
        .map((inv) => inv.name)
        .filter(Boolean)
        .join(', ');
    }
    return '';
  }

  /**
   * Fetches the internal signatory redirection URL based on document status.
   * Returns the sign URL for internal signatories when status is NOT_SIGNED, otherwise returns null.
   * @param documentStatus The current document status
   * @param leegalityData The leegality data containing invitees information
   * @returns The sign URL for internal signatory or null
   */
  private fetchInternalSignatoryRedirectionUrl(
    documentStatus: DocumentStatus,
    leegalityData?: any,
  ): string | null {
    // Only return sign URL when status is NOT_SIGNED
    if (documentStatus === DocumentStatus.CRM_SIGN_PENDING) {
      return leegalityData?.invitees?.[0]?.signUrl || null;
    }

    return null;
  }

  /**
   * Creates an invitee array with empty slots and an actual invitee.
   * Generates a standardized array structure for Leegality service integration.
   * Creates empty invitee objects with null values and appends the actual invitee at the end.
   * @param emptySlots Number of empty invitee objects to create
   * @param actualInvitee The actual invitee object to add at the end
   * @returns Array with empty invitee objects followed by the actual invitee
   */
  private createInviteeArray(emptySlots: number, actualInvitee?: any): any[] {
    const emptyInvitee = {
      id: null,
      name: null,
      email: null,
      contactNumber: null,
    };

    // Create array with empty slots
    const inviteeArray = new Array(emptySlots)
      .fill(null)
      .map(() => ({ ...emptyInvitee }));

    // Add the actual invitee at the end if provided
    if (actualInvitee) {
      inviteeArray.push(actualInvitee);
    }

    return inviteeArray;
  }

  /**
   * Sends signed agreement email with PDF URL to all applicants.
   * Sends individual emails to each applicant with their respective names.
   * @param agreementData The agreement signature form data
   * @param signedPdfUrl The signed PDF URL
   * @private
   */
  private async sendSignedAgreementEmailToApplicants(
    agreementData: any,
    signedPdfUrl: string,
  ): Promise<void> {
    try {
      // Extract applicant data with names and emails
      const applicants = this.extractApplicantData(agreementData);
      const baseUrl = this.configService.get<string>('AWS_S3_ACCESS_URL');
      const signedPdf = `${baseUrl}${signedPdfUrl}`;

      if (applicants.length === 0) {
        logger.info(
          `No applicant emails found for agreement ${agreementData.agreementId}`,
        );
        return;
      }

      if (!signedPdf) {
        logger.error(
          `No signed PDF URL found for agreement ${agreementData.agreementId}`,
        );
        return;
      }

      // Send individual emails to each applicant
      const emailPromises = applicants.map(async (applicant) => {
        try {
          await this.eventEmitter.emitAsync(
            EventMessagesEnum.COMPOSE_EMAIL,
            new ComposeEmailEvent(
              ComposeEmailsEnum.SIGNED_AGREEMENT_URL,
              {
                NAME: applicant.name,
                PROJECT_NAME: agreementData.projectName || '',
                SIGNED_PDF_URL: signedPdf,
              },
              BRAND_PURAVANKARA,
              { to: [applicant.email] },
            ),
          );

          logger.info(
            `Signed agreement email sent to ${applicant.name} (${applicant.email}) for agreement ${agreementData.agreementId}`,
          );
        } catch (error) {
          logger.error(
            `Failed to send email to ${applicant.name} (${applicant.email}) for agreement ${agreementData.agreementId}:`,
            error,
          );
        }
      });

      // Wait for all emails to be sent (or fail)
      await Promise.allSettled(emailPromises);

      logger.info(
        `Signed agreement email process completed for agreement ${agreementData.agreementId}`,
      );
    } catch (error) {
      logger.error(
        `Error sending signed agreement email for ${agreementData.agreementId}:`,
        error,
      );
    }
  }

  /**
   * Extracts applicant data (name and email) from all applicants in the agreement form.
   * @param agreementData The agreement signature form data
   * @returns Array of applicant objects with name and email
   * @private
   */
  private extractApplicantData(
    agreementData: any,
  ): Array<{ name: string; email: string }> {
    const applicants: Array<{ name: string; email: string }> = [];

    const applicantFields = [
      agreementData.applicant1,
      agreementData.applicant2,
      agreementData.applicant3,
      agreementData.applicant4,
    ];

    for (const applicant of applicantFields) {
      if (
        applicant?.email &&
        typeof applicant.email === 'string' &&
        applicant.email.trim()
      ) {
        const name = applicant.name || 'Customer';
        const email = applicant.email.trim();

        // Avoid duplicates based on email
        if (!applicants.some((app) => app.email === email)) {
          applicants.push({ name, email });
        }
      }
    }

    return applicants;
  }

  /**
   * Validates that document names are unique within the same opportunity.
   * @param opportunityId The opportunity ID to check against
   * @param documents Array of document objects with name property
   * @param excludeFormId Optional form ID to exclude from the check (for updates)
   * @throws BadRequestException if duplicate document names are found
   * @private
   */
  private async validateDocumentNameUniqueness(
    opportunityId: string,
    documents: any[],
    excludeFormId?: number,
  ): Promise<void> {
    if (!documents?.length) return;

    // Get current document names
    const currentNames = documents
      .map((doc) => doc?.name?.trim())
      .filter(Boolean);

    if (!currentNames.length) return;

    // Find existing forms with same opportunityId
    const whereCondition: any = { opportunityId };
    if (excludeFormId) {
      whereCondition.id = Not(excludeFormId);
    }

    const existingForms = await this.agreementSignatureRepository.find({
      where: whereCondition,
      select: ['documents'],
    });

    // Check for duplicates
    for (const form of existingForms) {
      if (!Array.isArray(form.documents)) continue;

      for (const doc of form.documents) {
        const existingName = doc?.name?.trim();
        if (existingName && currentNames.includes(existingName)) {
          throw new BadRequestException(
            `Document name "${existingName}" already exists for this opportunity. Please use a unique document name.`,
          );
        }
      }
    }
  }

  /**
   * Validates merged document name by ensuring it is provided and unique (case-insensitive).
   * Throws an error if the name is missing or already exists in the system.
   */
  private async validateMergedDocument(
    dto: AgreementSignatureDto,
  ): Promise<string> {
    const docName = dto.documentName?.trim();

    if (!docName) {
      throw new BadRequestException(
        'Document name is required when merging documents',
      );
    }

    const existing = await this.agreementSignatureRepository
      .createQueryBuilder('form')
      .where('LOWER(TRIM(form.documentName)) = LOWER(TRIM(:docName))', {
        docName,
      })
      .getOne();

    if (existing) {
      throw new BadRequestException(
        `Document name '${docName}' already exists`,
      );
    }

    return docName;
  }

  async updateAgreementVoucherStatus(opportunityId: string): Promise<void> {
    logger.info(
      `Starting agreement voucher status update for opportunityId: ${opportunityId}`,
    );
    const booking = await this.bookingRepository.findOne({
      where: {
        opportunityId,
      },
      relations: ['campaign'],
    });
    if (
      booking?.voucherId &&
      booking?.campaign?.stage === EoiCampaignStageType.LAUNCH
    ) {
      await this.batchService.updateVoucherStatusToAgreementSigned(
        booking.voucherId,
      );
    }
  }
}
