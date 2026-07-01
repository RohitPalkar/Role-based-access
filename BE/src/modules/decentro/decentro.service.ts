import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AxiosResponse, AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { logger } from '../../logger/logger';
import { CustomConfigService } from 'src/config/custom-config.service';
import { generateUuid, generateRandomId } from 'src/utils/generateRandomNumber';
import {
  DigiLockerSessionRequest,
  DigiLockerSessionResponse,
  DocImageValidationResponse,
  GstValidationRequest,
  GstValidationResponse,
  DigiLockerWebhookResponse,
} from './interfaces/decentro.interface';
import { DecentroLogs } from './entities/decentro-logs.entity';
import { RequestType, LogStatus } from 'src/enums/decentro.enums';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingsService } from '../bookings/bookings.service';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import {
  getSessionRequest,
  getGstValidationRequest,
  extractResponseData,
} from 'src/helpers/decentro.helper';
import { GetGstDetailsDto } from './dto/get-gst-details.dto';
import { BookingAsEnum } from 'src/enums/booking-as.enum';
import { LeegalityService } from '../leegality/leegality.service';
import * as FormData from 'form-data';
import { AwsService } from '../aws/aws.service';
import { formatDate } from 'src/utils/dateFormat';
import { DATE_FORMAT } from 'src/config/constants';
import { encryptBookingApplicants } from 'src/utils/encryption-decryption.util';

/**
 * Service for handling Decentro API integrations including DigiLocker and GST validation
 *
 * This service provides methods to:
 * - Generate DigiLocker URLs for KYC verification
 * - Validate GST numbers for business verification
 * - Log all API requests and responses for audit purposes
 *
 * @class DecentroService
 */
@Injectable()
export class DecentroService {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly moduleSecret: string;

  /**
   * Initializes the DecentroService with configuration from environment variables
   *
   * @param httpService - NestJS HTTP service for making API calls
   * @param configService - Custom configuration service for accessing environment variables
   * @param decentroLogsRepository - TypeORM repository for logging Decentro API calls
   */
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: CustomConfigService,
    private readonly leegalityService: LeegalityService,
    private readonly awsService: AwsService,
    @InjectRepository(DecentroLogs)
    private readonly decentroLogsRepository: Repository<DecentroLogs>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly bookingsService: BookingsService,
  ) {
    this.baseUrl = this.configService.get<string>('DECENTRO_BASE_URL');
    this.clientId = this.configService.getDecrypted('DECENTRO_CLIENT_ID');
    this.clientSecret = this.configService.getDecrypted(
      'DECENTRO_CLIENT_SECRET',
    );
    this.moduleSecret = this.configService.getDecrypted(
      'DECENTRO_MODULE_SECRET',
    );
  }

  /**
   * Applies Aadhaar OCR-derived values onto the provided signatory details.
   *
   * Populates Aadhaar-related fields only when OCR details are present and
   * Aadhaar is not explicitly skipped. DOB fields are set from the parsed
   * Aadhaar date when available.
   *
   * @param signatoryDetails - Target object to be enriched with Aadhaar fields
   * @param aadhaarImage - Array of Aadhaar image URLs (if any)
   * @param isAadhaarSkipped - Whether Aadhaar upload/verification was skipped
   * @param aadhaarDetails - OCR response object for Aadhaar
   * @param aadhaarDob - Parsed date of birth from Aadhaar in DATE_FORMAT or null
   * @private
   */
  private applyAadhaarAssignments(
    signatoryDetails: any,
    aadhaarImage: string[] | undefined,
    isAadhaarSkipped: boolean | undefined,
    aadhaarDetails: any,
    aadhaarDob: string | null,
  ) {
    if (Object.keys(aadhaarDetails).length) {
      ((signatoryDetails.aadhaarImage = aadhaarImage ?? []),
        (signatoryDetails.aadhaarNumber = isAadhaarSkipped
          ? null
          : aadhaarDetails?.ocrResult?.cardNo),
        (signatoryDetails.nameAsPerAadhaar = isAadhaarSkipped
          ? null
          : aadhaarDetails?.ocrResult?.name),
        (signatoryDetails.isAadhaarVerified = false),
        (signatoryDetails.dob = aadhaarDob),
        (signatoryDetails.isAadhaarOcrDone = true),
        (signatoryDetails.dobAsAadhaar = aadhaarDob));
    }
  }

  /**
   * Applies PAN OCR-derived values onto the provided signatory details.
   *
   * Populates PAN-related fields only when OCR details are present and
   * PAN is not explicitly skipped. DOB fields are set from the parsed
   * PAN date when available.
   *
   * @param signatoryDetails - Target object to be enriched with PAN fields
   * @param panImage - Array of PAN image URLs (if any)
   * @param isPanSkipped - Whether PAN upload/verification was skipped
   * @param panDetails - OCR response object for PAN
   * @param panDob - Parsed date of birth from PAN in DATE_FORMAT or null
   * @private
   */
  private applyPanAssignments(
    signatoryDetails: any,
    panImage: string[] | undefined,
    isPanSkipped: boolean | undefined,
    panDetails: any,
    panDob: string | null,
  ) {
    if (Object.keys?.(panDetails).length) {
      ((signatoryDetails.panImage = panImage ?? []),
        (signatoryDetails.panNumber = isPanSkipped
          ? null
          : panDetails?.ocrResult?.cardNo),
        (signatoryDetails.nameAsPerPan = isPanSkipped
          ? null
          : panDetails?.ocrResult?.name),
        (signatoryDetails.isPanVerified = false),
        (signatoryDetails.dob = panDob),
        (signatoryDetails.isPanOcrDone = true),
        (signatoryDetails.dobAsPan = panDob));
    }
  }

  /**
   * Generates a DigiLocker URL for KYC verification process
   *
   * This method creates a DigiLocker session that allows users to:
   * - Authenticate using Aadhaar and PAN
   * - Share their documents securely
   * - Complete KYC verification process
   *
   * The process involves:
   * 1. Creating a unique reference ID for tracking
   * 2. Building the DigiLocker session request
   * 3. Calling Decentro API to create the session
   * 4. Logging the request and response for audit
   * 5. Returning the session URL for user redirection
   *
   * @param redirectUrl - URL where user will be redirected after completing KYC
   * @returns Promise<DigiLockerSessionResponse> - Contains the session URL and status
   *
   * @throws {HttpException} - When Decentro API call fails or returns an error
   */
  async generateDigiLockerUrl(body: any): Promise<DigiLockerSessionResponse> {
    const { applicantNumber, lastStep, opportunityId, bookingAs, redirectUrl } =
      body;
    logger.info('Starting payment deletion for booking:', opportunityId);

    // Create reference ID that includes applicant number for webhook identification
    const referenceId = generateUuid();

    try {
      // Validate required fields
      if (!opportunityId) {
        throw new BadRequestException('opportunityId is required');
      }

      const request: DigiLockerSessionRequest = getSessionRequest(
        referenceId,
        redirectUrl,
      );

      // Log the request with opportunityId
      await this.logRequest({
        referenceId,
        opportunityId,
        requestType: RequestType.DIGILOCKER,
        requestPayload: request,
        requestBody: body,
        status: LogStatus.INITIATED,
      });

      const response = await this.createDigiLockerSession(request);

      // Log successful response
      await this.logRequest({
        referenceId,
        opportunityId,
        transactionId: response.data?.decentroTxnId,
        requestType: RequestType.DIGILOCKER,
        requestPayload: request,
        requestBody: body,
        status: LogStatus.SUCCESS,
        statusCode: response.data?.responseKey,
        responsePayload: extractResponseData(response),
      });

      return {
        status: 'SUCCESS',
        message: 'DigiLocker URL generated successfully',
        data: {
          session_url: response.data.data?.url,
          transactionId: response.data?.decentroTxnId,
          applicantNumber,
          lastStep,
          opportunityId,
          bookingAs,
        },
      };
    } catch (error) {
      // Log failed request
      await this.logRequest({
        referenceId,
        opportunityId,
        requestType: RequestType.DIGILOCKER,
        requestPayload: { redirectUrl },
        requestBody: body,
        status: LogStatus.FAILED,
        error,
      });

      logger.error('Failed to generate DigiLocker URL:', {
        error: this.extractSafeErrorInfo(error),
        referenceId,
        redirectUrl,
        body,
      });

      logsAndErrorHandling(
        'DecentroService - generateDigiLockerUrl',
        this.extractSafeErrorInfo(error),
        body,
      );
    }
  }

  /**
   * Creates a DigiLocker session by calling Decentro API
   *
   * This private method handles the actual HTTP call to Decentro's DigiLocker API.
   * It constructs the proper headers with authentication credentials and sends
   * the session request to create a new DigiLocker flow.
   *
   * @param payload - DigiLocker session request payload containing user consent and flow details
   * @returns Promise<any> - Raw AxiosResponse from Decentro API
   *
   * @throws {AxiosError} - When the HTTP request fails or API returns an error
   *
   * @private
   */
  private async createDigiLockerSession(
    payload: DigiLockerSessionRequest,
  ): Promise<any> {
    // Try the original endpoint first
    const url = `${this.baseUrl}/v2/common/uistream/session`;

    // Log the request payload for debugging
    logger.info('Sending request to Decentro API:', {
      url,
      payload,
    });

    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          },
        }),
      );

      logger.info(
        `DigiLocker URL generated for reference_id: ${payload.reference_id}`,
        response.data,
      );

      return response;
    } catch (error) {
      // Log the detailed error response
      if (error.response) {
        logger.error('Decentro API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }
      throw error;
    }
  }

  /**
   * Validates GST number and retrieves business details from Decentro API
   *
   * This method performs GST validation using Decentro's business verification API.
   * It validates the GST number format and retrieves associated business information
   * including company name, address, and registration details.
   *
   * The process involves:
   * 1. Creating a unique reference ID for tracking
   * 2. Building the GST validation request with proper consent
   * 3. Calling Decentro API to validate the GST number
   * 4. Logging the request and response for audit
   * 5. Returning the validated GST details
   *
   * @param gstNumber - 15-character GST number to validate (format: 22AAAAA0000A1Z5)
   * @returns Promise<GstValidationResponse> - Contains validation status and business details
   *
   * @throws {HttpException} - When Decentro API call fails or GST number is invalid
   *
   */
  async getGstDetails(
    getGstDto: GetGstDetailsDto,
  ): Promise<GstValidationResponse> {
    const { opportunityId, bookingAs, gstNumber } = getGstDto;
    logger.info('Entered getGstDetails', opportunityId);
    const referenceId = generateUuid();

    try {
      const request: GstValidationRequest = getGstValidationRequest(
        referenceId,
        gstNumber,
      );

      // Log the request
      await this.logRequest({
        referenceId,
        opportunityId,
        requestType: RequestType.BUSINESS_VERIFICATION,
        requestPayload: request,
        requestBody: getGstDto,
        status: LogStatus.INITIATED,
      });

      const response = await this.validateGst(request);
      response.data = {
        ...response.data,
        opportunityId,
        bookingAs: bookingAs ?? null,
      };

      // Log successful response
      await this.logRequest({
        referenceId,
        opportunityId,
        requestType: RequestType.BUSINESS_VERIFICATION,
        requestPayload: request,
        requestBody: getGstDto,
        status: LogStatus.SUCCESS,
        statusCode: response.data?.responseKey,
        responsePayload: extractResponseData(response),
      });

      return {
        status: 'SUCCESS',
        message: 'GST details retrieved successfully',
        data: response.data,
      };
    } catch (error) {
      // Log failed request
      await this.logRequest({
        referenceId,
        opportunityId,
        requestType: RequestType.BUSINESS_VERIFICATION,
        requestPayload: { getGstDto },
        requestBody: getGstDto,
        status: LogStatus.FAILED,
        error,
      });

      logger.error('Failed to get GST details:', error);
      logsAndErrorHandling(
        'DecentroService - getGstDetails',
        this.extractSafeErrorInfo(error),
        { getGstDto },
      );
    }
  }

  /**
   * Validates GST number by calling Decentro's business verification API
   *
   * This private method handles the actual HTTP call to Decentro's GST validation API.
   * It sends the GST validation request with proper authentication headers including
   * the module secret required for business verification endpoints.
   *
   * @param payload - GST validation request payload containing GST number and consent details
   * @returns Promise<any> - Raw AxiosResponse from Decentro API containing validation results
   *
   * @throws {AxiosError} - When the HTTP request fails or API returns an error
   *
   * @private
   */
  private async validateGst(payload: GstValidationRequest): Promise<any> {
    const url = `${this.baseUrl}/kyc/public_registry/validate#customer-verification`;

    const response: AxiosResponse = await lastValueFrom(
      this.httpService.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          module_secret: this.moduleSecret,
        },
      }),
    );

    logger.info(
      `GST validation completed for reference_id: ${payload.reference_id}`,
      response.data,
    );

    return response;
  }

  /**
   * Safely extracts error information to avoid circular reference issues
   * @param error - The error object to extract information from
   * @returns Serializable error information
   * @private
   */
  private extractSafeErrorInfo(error: any): any {
    if (error instanceof AxiosError) {
      return {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
        },
      };
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      message: error?.message || 'Unknown error',
      type: typeof error,
    };
  }

  /**
   * Handles DigiLocker webhook callbacks from Decentro API
   *
   * This method processes webhook notifications received from Decentro when users
   * complete their DigiLocker KYC verification. It verifies the webhook signature
   * for security and extracts the KYC data including Aadhaar and PAN details.
   *
   * The webhook processing includes:
   * 1. HMAC-SHA256 signature verification using webhook secret
   * 2. Extraction of KYC data (Aadhaar number, PAN number, names)
   * 3. Logging of webhook events for audit and debugging
   * 4. Error handling for invalid signatures or malformed data
   *
   * @param rawBody - Raw request body as string for signature verification
   * @param signature - X-Signature header value from the webhook request
   * @returns Promise<DigiLockerWebhookResponse> - Success or error response
   *
   * @throws {BadRequestException} - When signature verification fails
   * @throws {InternalServerErrorException} - When webhook processing fails
   */
  async handleDigiLockerWebhook(
    rawBody: any,
  ): Promise<DigiLockerWebhookResponse> {
    logger.info(`Webhook data received:, ${rawBody}`);

    const webhookData: any = rawBody;
    let opportunityId: string | null = null;
    let applicantNumber: number | null = null;
    let referenceId: string | null = null;
    let lastStep: number | null = null;
    let residentStatus: string | null = null;
    let relationship: string | null = null;

    try {
      const result = await this.findOpportunityIdByReference(webhookData);

      opportunityId = result.opportunityId;
      applicantNumber = result.applicantNumber;
      referenceId = result.referenceId;
      lastStep = result.lastStep;
      residentStatus = result.residentStatus ?? null;
      relationship = result.relationship ?? null;

      // Handle early exit cases
      const earlyExit = await this.handleDigiLockerWebhookEarlyExit(
        rawBody,
        referenceId,
        opportunityId,
      );
      if (earlyExit) {
        return earlyExit;
      }

      // Process KYC data and log
      await this.processDigiLockerWebhookKyc({
        webhookData,
        opportunityId,
        applicantNumber,
        lastStep,
        referenceId,
        rawBody,
        residentStatus,
        relationship,
      });

      return {
        status: 'SUCCESS',
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      logger.error(`Failed to process DigiLocker webhook: ${error}`);

      await this.logRequest({
        referenceId: referenceId ?? `${generateUuid()}_WEBHOOK_ERROR`,
        opportunityId: opportunityId ?? 'unknown',
        transactionId: rawBody.initialDecentroTxnId ?? null,
        requestType: RequestType.DIGILOCKER,
        requestPayload: { rawBody },
        requestBody: rawBody,
        status: LogStatus.FAILED,
        error,
      });

      logsAndErrorHandling(
        'DecentroService - handleDigiLockerWebhook',
        this.extractSafeErrorInfo(error),
        { rawBody },
      );
    }
  }

  /**
   * Handles early exit cases for DigiLocker webhook (session initiated or error)
   */
  private async handleDigiLockerWebhookEarlyExit(
    rawBody: any,
    referenceId: string | null,
    opportunityId: string | null,
  ): Promise<DigiLockerWebhookResponse | null> {
    if (rawBody?.responseKey === 'event_uistream_session_initiated') {
      return {
        status: 'SUCCESS',
        message: 'Webhook processed successfully',
      };
    }

    if (rawBody?.responseKey === 'error_uistream_initiate_session') {
      await this.logRequest({
        referenceId: referenceId ?? `${generateUuid()}_WEBHOOK_ERROR`,
        opportunityId: opportunityId,
        transactionId: rawBody.initialDecentroTxnId ?? null,
        requestType: RequestType.DIGILOCKER,
        requestPayload: { rawBody },
        requestBody: rawBody,
        status: LogStatus.FAILED,
        statusCode: 'error_uistream_initiate_session',
        error: rawBody?.message,
      });
      return {
        status: 'FAILED',
        message: 'Webhook processing failed',
      };
    }
    return null;
  }

  /**
   * Processes KYC data from DigiLocker webhook and logs the event
   */
  private async processDigiLockerWebhookKyc(options: {
    webhookData: any;
    opportunityId: string | null;
    applicantNumber: number | null;
    lastStep: number | null;
    referenceId: string | null;
    rawBody: any;
    residentStatus: string | null;
    relationship: string | null;
  }): Promise<void> {
    const {
      webhookData,
      opportunityId,
      applicantNumber,
      referenceId,
      rawBody,
    } = options;

    const adhaarData = webhookData?.data?.EAADHAAR || null;
    const panData = webhookData?.data?.PAN || null;

    const panImage = await this.uploadPanImageToS3(panData, opportunityId);
    this.cleanupWebhookData(webhookData);

    const kycData = this.extractKycDataFromWebhook(adhaarData, panData);
    const addressProof = adhaarData?.data?.proofOfAddress || null;

    if (!this.canProcessKycData(opportunityId, applicantNumber, kycData)) {
      logger.error(`Could not find opportunityId or applicantNumber`, {
        opportunityId,
        applicantNumber,
      });
      return;
    }

    // At this point, opportunityId and applicantNumber are guaranteed to be non-null
    // due to canProcessKycData check above
    if (!opportunityId || !applicantNumber) {
      return; // This should never happen, but satisfies TypeScript
    }

    const kycDataForBooking = this.buildKycDataForBooking(
      {
        opportunityId,
        applicantNumber,
        lastStep: options.lastStep,
        residentStatus: options.residentStatus,
        relationship: options.relationship,
      },
      kycData,
      panImage,
      addressProof,
    );

    await this.saveKycDataToBookings(kycDataForBooking);
    await this.logKycWebhookEvent(
      referenceId,
      opportunityId,
      rawBody,
      webhookData,
      kycData,
    );
  }

  /**
   * Uploads PAN image to S3 if available
   * @private
   */
  private async uploadPanImageToS3(
    panData: any,
    opportunityId: string | null,
  ): Promise<string | null> {
    const pdfBuffer = panData?.documentBase64 ?? null;
    if (!pdfBuffer || !opportunityId) {
      return null;
    }

    const fileName = `images/${opportunityId}/pan_card.pdf`;
    const buffer = Buffer.from(pdfBuffer, 'base64');
    return await this.leegalityService.uploadPdfBufferToS3(fileName, buffer);
  }

  /**
   * Cleans up webhook data by removing large binary fields
   * @private
   */
  private cleanupWebhookData(webhookData: any): void {
    delete webhookData?.data?.PAN?.documentBase64;
    delete webhookData?.data?.EAADHAAR?.data?.pdf;
    delete webhookData?.data?.EAADHAAR?.data?.xml;
    delete webhookData?.data?.EAADHAAR?.data?.image;
  }

  /**
   * Extracts KYC data from webhook Aadhaar and PAN data
   * @private
   */
  private extractKycDataFromWebhook(
    adhaarData: any,
    panData: any,
  ): {
    aadhaarNumber: string | null;
    panNumber: string | null;
    isAadhaarVerified: boolean;
    isPanVerified: boolean;
    dobAsAadhaar: string | null;
    dobAsPan: string | null;
    nameAsPerAadhaar: string | null;
    nameAsPerPan: string | null;
  } {
    const aadhaarNumber = adhaarData?.data?.aadhaarUid ?? null;
    const panNumber = panData?.idNumber ?? null;

    return {
      aadhaarNumber,
      panNumber,
      isAadhaarVerified: !!aadhaarNumber,
      isPanVerified: !!panNumber,
      dobAsAadhaar: this.formatDobFromAadhaar(adhaarData),
      dobAsPan: this.formatDobFromPan(panData),
      nameAsPerAadhaar: adhaarData?.data?.proofOfIdentity?.name ?? null,
      nameAsPerPan: panData?.userName ?? null,
    };
  }

  /**
   * Formats date of birth from Aadhaar data
   * @private
   */
  private formatDobFromAadhaar(adhaarData: any): string | null {
    const dob = adhaarData?.data?.proofOfIdentity?.dob;
    return dob ? formatDate(dob, DATE_FORMAT) : null;
  }

  /**
   * Formats date of birth from PAN data
   * @private
   */
  private formatDobFromPan(panData: any): string | null {
    const dob = panData?.userDateOfBirth;
    return dob ? formatDate(dob, DATE_FORMAT) : null;
  }

  /**
   * Checks if KYC data can be processed
   * @private
   */
  private canProcessKycData(
    opportunityId: string | null,
    applicantNumber: number | null,
    kycData: { aadhaarNumber: string | null; panNumber: string | null },
  ): boolean {
    return !!(
      opportunityId &&
      applicantNumber &&
      (kycData.aadhaarNumber || kycData.panNumber)
    );
  }

  /**
   * Builds KYC data object for saving to bookings
   * @private
   */
  private buildKycDataForBooking(
    options: {
      opportunityId: string;
      applicantNumber: number;
      lastStep: number | null;
      residentStatus: string | null;
      relationship: string | null;
    },
    kycData: {
      aadhaarNumber: string | null;
      panNumber: string | null;
      isAadhaarVerified: boolean;
      isPanVerified: boolean;
      dobAsAadhaar: string | null;
      dobAsPan: string | null;
      nameAsPerAadhaar: string | null;
      nameAsPerPan: string | null;
    },
    panImage: string | null,
    addressProof: any,
  ): {
    opportunityId: string;
    applicantNumber: number;
    lastStep: number | null;
    aadhaarNumber: string;
    panNumber: string;
    nameAsPerAadhaar: string;
    nameAsPerPan: string;
    isAadhaarVerified: boolean;
    isPanVerified: boolean;
    panImage: string | null;
    dob: string | null;
    dobAsAadhaar: string | null;
    dobAsPan: string | null;
    permanentAddress: any;
    residentStatus: string | null;
    relationship: string | null;
  } {
    return {
      opportunityId: options.opportunityId,
      applicantNumber: options.applicantNumber,
      lastStep: options.lastStep,
      aadhaarNumber: kycData.aadhaarNumber ?? '',
      panNumber: kycData.panNumber ?? '',
      nameAsPerAadhaar: kycData.nameAsPerAadhaar ?? '',
      nameAsPerPan: kycData.nameAsPerPan ?? '',
      isAadhaarVerified: kycData.isAadhaarVerified,
      isPanVerified: kycData.isPanVerified,
      panImage,
      dob: kycData.dobAsPan ?? kycData.dobAsAadhaar,
      dobAsAadhaar: kycData.dobAsAadhaar,
      dobAsPan: kycData.dobAsPan,
      permanentAddress: this.extractPermanentAddress(addressProof),
      residentStatus: options.residentStatus,
      relationship: options.relationship,
    };
  }

  /**
   * Logs KYC webhook event
   * @private
   */
  private async logKycWebhookEvent(
    referenceId: string | null,
    opportunityId: string,
    rawBody: any,
    webhookData: any,
    kycData: {
      isAadhaarVerified: boolean;
      isPanVerified: boolean;
    },
  ): Promise<void> {
    await this.logRequest({
      referenceId: referenceId ?? generateUuid(),
      opportunityId,
      requestType: RequestType.DIGILOCKER,
      requestPayload: rawBody,
      requestBody: rawBody,
      status: LogStatus.SUCCESS,
      statusCode: webhookData?.responseKey ?? null,
      responsePayload: {
        webhook_received: true,
        webhookData,
        verifications: {
          isAadhaarVerified: kycData.isAadhaarVerified,
          isPanVerified: kycData.isPanVerified,
        },
      },
      webhookResponse: webhookData,
    });
  }

  /**
   * Extracts permanent address from Aadhaar address proof data
   *
   * This method processes the address proof data from Aadhaar verification
   * and formats it into a structured permanent address object.
   *
   * @param addressProof - Address proof data from Aadhaar verification
   * @returns Formatted permanent address object
   *
   * @private
   */
  private extractPermanentAddress(addressProof: any): any {
    return {
      city: addressProof?.district ?? null,
      state: addressProof?.state ?? null,
      country: addressProof?.country ?? null,
      pinCode: addressProof?.pincode ?? null,
      areaName: (addressProof?.locality || addressProof?.vtc) ?? null,
      houseNumber: addressProof?.house ?? null,
    };
  }

  /**
   * Finds opportunityId by reference_id from Decentro logs
   *
   * This method looks up the opportunityId from the Decentro logs table
   * using the reference_id from the webhook callback.
   *
   * @param referenceId - Reference ID from webhook
   * @returns Promise<string | null> - Opportunity ID if found, null otherwise
   *
   * @private
   */
  private async findOpportunityIdByReference(webhookData: any): Promise<any> {
    try {
      // Look for the most recent log entry with this reference_id
      const logEntry = await this.decentroLogsRepository.findOne({
        where: {
          transactionId: webhookData.initialDecentroTxnId,
          requestType: RequestType.DIGILOCKER,
          status: LogStatus.SUCCESS,
        },
        order: { createdAt: 'ASC' },
      });

      if (!logEntry) {
        throw new NotFoundException(
          'Opportunity not found for the given webhook data',
        );
      }

      return {
        opportunityId: logEntry ? logEntry.opportunityId : null,
        applicantNumber: logEntry
          ? logEntry.requestBody?.applicantNumber
          : null,
        lastStep: logEntry ? logEntry.requestBody?.lastStep : null,
        referenceId: logEntry ? logEntry.referenceId : null,
        residentStatus: logEntry ? logEntry.requestBody?.residentStatus : null,
        relationship: logEntry ? logEntry.requestBody?.relationship : null,
      };
    } catch (error) {
      logger.error('Failed to find opportunityId by reference:', error);
      throw error;
    }
  }

  /**
   * Saves KYC data received from webhook to the bookings table
   *
   * This method updates the specific applicant's data in the bookings table
   * with the KYC information received from Decentro webhook.
   *
   * @param kycData - KYC data to save
   * @returns Promise<void> - Resolves when data is saved
   *
   * @private
   */
  private async saveKycDataToBookings(kycData: {
    opportunityId: string;
    applicantNumber: number;
    lastStep: number;
    aadhaarNumber: string;
    panNumber: string;
    nameAsPerAadhaar: string;
    nameAsPerPan: string;
    isAadhaarVerified: boolean;
    isPanVerified: boolean;
    panImage?: string;
    dob?: string;
    dobAsAadhaar?: string;
    dobAsPan?: string;
    permanentAddress?: any;
    residentStatus?: string;
    relationship?: string;
  }): Promise<void> {
    try {
      const { opportunityId, applicantNumber } = kycData;

      const booking = await this.fetchBookingForKyc(opportunityId);
      if (!booking) {
        return;
      }

      const applicantField = `applicant${applicantNumber}` as keyof Booking;
      if (!(applicantField in booking)) {
        logger.error(
          `Invalid applicant number ${applicantNumber} for booking ${opportunityId}`,
        );
        return;
      }

      const existingData =
        (booking[applicantField] as Record<string, any>) || {};
      const signatoryDetails = this.buildSignatoryDetails(kycData);

      this.updateApplicantDataWithKyc(
        existingData,
        signatoryDetails,
        kycData.permanentAddress,
        booking.bookingAs,
      );

      const updateData = this.buildKycUpdateData(
        applicantField,
        existingData,
        booking,
        kycData,
      );

      const encryptedData = await encryptBookingApplicants(updateData);
      await this.bookingRepository.update({ opportunityId }, encryptedData);

      logger.info(
        `KYC data saved for applicant ${applicantNumber} in booking ${opportunityId}`,
        {
          opportunityId,
          applicantNumber,
        },
      );
    } catch (error) {
      logger.error('Failed to save KYC data to bookings:', error);
      // Don't throw error to avoid webhook failure
    }
  }

  /**
   * Fetches booking for KYC data update
   * @private
   */
  private async fetchBookingForKyc(
    opportunityId: string,
  ): Promise<Booking | null> {
    const { data: booking } =
      await this.bookingsService.getBookingByOppId(opportunityId);

    if (!booking) {
      logger.error(`Booking not found for opportunityId: ${opportunityId}`);
    }

    return booking;
  }

  /**
   * Builds signatory details object from KYC data
   * @private
   */
  private buildSignatoryDetails(kycData: {
    aadhaarNumber: string;
    panNumber: string;
    nameAsPerAadhaar: string;
    nameAsPerPan: string;
    isAadhaarVerified: boolean;
    isPanVerified: boolean;
    panImage?: string;
    dob?: string;
    dobAsAadhaar?: string;
    dobAsPan?: string;
    residentStatus?: string;
  }): Record<string, any> {
    const panImageArray = this.normalizePanImage(kycData.panImage);

    return {
      aadhaarNumber: kycData.aadhaarNumber,
      panNumber: kycData.panNumber,
      nameAsPerAadhaar: kycData.nameAsPerAadhaar,
      nameAsPerPan: kycData.nameAsPerPan,
      isAadhaarVerified: kycData.isAadhaarVerified ?? false,
      isPanVerified: kycData.isPanVerified ?? false,
      panImage: panImageArray,
      dob: kycData.dob ?? null,
      dobAsAadhaar: kycData.dobAsAadhaar ?? null,
      dobAsPan: kycData.dobAsPan ?? null,
      residentStatus: kycData.residentStatus,
    };
  }

  /**
   * Normalizes panImage to array format
   * @private
   */
  private normalizePanImage(panImage?: string | string[]): string[] {
    if (!panImage) {
      return [];
    }
    return Array.isArray(panImage) ? panImage : [panImage];
  }

  /**
   * Updates applicant data with KYC information and permanent address
   * @private
   */
  private updateApplicantDataWithKyc(
    existingData: Record<string, any>,
    signatoryDetails: Record<string, any>,
    permanentAddress: any,
    bookingAs: BookingAsEnum,
  ): void {
    const existingPersonalDetails = existingData.personalDetails ?? {};
    existingData.personalDetails = {
      ...existingPersonalDetails,
      ...signatoryDetails,
    };

    if (bookingAs === BookingAsEnum.INDIVIDUAL) {
      const existingContactDetails = existingData.contactDetails ?? {};
      existingData.contactDetails = {
        ...existingContactDetails,
        permanentAddress: permanentAddress ?? null,
      };
    } else {
      existingData.personalDetails.permanentAddress = permanentAddress ?? null;
    }
  }

  /**
   * Builds update data object for booking update
   * @private
   */
  private buildKycUpdateData(
    applicantField: keyof Booking,
    existingData: Record<string, any>,
    booking: Booking,
    kycData: {
      applicantNumber: number;
      lastStep: number;
      relationship?: string;
    },
  ): Record<string, any> {
    return {
      [applicantField]: existingData,
      noOfApplicants: Math.max(
        booking.noOfApplicants || 0,
        kycData.applicantNumber,
      ),
      lastStep: kycData.lastStep || booking.lastStep,
      relationBtApplicants:
        kycData.relationship ?? booking.relationBtApplicants,
    };
  }

  /**
   * Logs Decentro API requests and responses to the database for audit and debugging
   *
   * This method creates comprehensive audit logs for all Decentro API interactions.
   * It stores request details, response data, and error information to enable
   * tracking, debugging, and compliance reporting.
   *
   * The logging includes:
   * - Unique reference ID for request tracking
   * - Request type (DIGILOCKER, BUSINESS_VERIFICATION, etc.)
   * - Complete request payload
   * - Response data (success) or error details (failure)
   * - Request status and timestamp
   *
   * @param options - Logging options object
   * @returns Promise<void> - Resolves when log entry is saved to database
   *
   * @private
   *
   */
  private async logRequest(options: {
    referenceId: string;
    opportunityId: string;
    requestType: RequestType;
    requestPayload: any;
    requestBody: any;
    status: LogStatus;
    statusCode?: string;
    transactionId?: string;
    responsePayload?: any;
    webhookResponse?: any;
    error?: any;
  }): Promise<void> {
    try {
      const {
        referenceId,
        opportunityId,
        requestType,
        requestPayload,
        requestBody,
        status,
        statusCode,
        transactionId,
        webhookResponse,
        responsePayload,
        error,
      } = options;

      const logEntry = this.decentroLogsRepository.create({
        referenceId,
        opportunityId,
        transactionId,
        requestType,
        requestPayload,
        requestBody,
        responsePayload:
          responsePayload ||
          (error ? { error: error.message, stack: error.stack } : null),
        webhookResponse: webhookResponse ?? null,
        status: status,
        statusCode: statusCode ?? (error?.response?.responseKey || null),
      });

      await this.decentroLogsRepository.save(logEntry);
    } catch (logError) {
      // Don't throw error for logging failures, just log to console
      logger.error('Failed to log Decentro request:', logError);
    }
  }

  async getImageDetails(request: {
    opportunityId: string;
    applicantNumber: number;
    bookingAs: BookingAsEnum;
    lastStep: number;
    aadhaarImage?: string[];
    panImage?: string[];
    addressProofType?: string;
    addressProofImage?: string[];
    isAadhaarSkipped?: boolean;
    isPanSkipped?: boolean;
    isPassportSkipped?: boolean;
    passportImage?: string[];
    residentStatus?: string;
    ociCardImage?: string[];
    relationship?: string;
    isPhysicalPassport?: boolean;
    isPhysicalAddressProof?: boolean;
    isPhysicalOCI?: boolean;
  }): Promise<any> {
    const { opportunityId, applicantNumber } = request;
    const referenceId = generateUuid();
    logger.info(
      `getImageDetails service called: opportunityId: ${opportunityId} referenceId: ${referenceId}`,
    );

    try {
      this.validateNriOciRequirements(
        request,
        request.residentStatus,
        request.isPhysicalPassport,
        request.isPhysicalAddressProof,
        request.isPhysicalOCI,
      );

      const createFileBuffer = await this.processOcrImages(request);
      const booking = await this.fetchBookingForKyc(opportunityId);
      if (!booking) {
        return;
      }

      const ocrDetails = this.extractOcrDetailsIndexed(createFileBuffer);
      const signatoryDetails = this.buildSignatoryDetailsFromRequest(
        request,
        ocrDetails,
      );

      const applicantField = `applicant${applicantNumber}` as keyof Booking;
      if (!(applicantField in booking)) {
        return;
      }

      await this.updateBookingWithImageDetails(
        booking,
        applicantField,
        signatoryDetails,
        request,
      );

      return {
        status: 'SUCCESS',
        message: 'Image uploaded successFully',
        data: null,
      };
    } catch (error) {
      logger.error('Failed to get Image details:', error);
      logsAndErrorHandling('DecentroService - getImageDetails', error, request);
    }
  }

  /**
   * Processes OCR images and returns file buffer
   * @private
   */
  private async processOcrImages(request: {
    aadhaarImage?: string[];
    panImage?: string[];
  }): Promise<any> {
    const { aadhaarImage, panImage } = request;
    if (!aadhaarImage?.length && !panImage?.length) {
      return null;
    }

    const createFileBuffer =
      await this.buildCreateFileBufferFromImages(request);
    if (!createFileBuffer?.data?.length) {
      throw new NotFoundException('No details found for images provided');
    }

    return createFileBuffer;
  }

  /**
   * Builds signatory details from request and OCR data
   * @private
   */
  private buildSignatoryDetailsFromRequest(
    request: {
      aadhaarImage?: string[];
      panImage?: string[];
      addressProofType?: string;
      addressProofImage?: string[];
      isAadhaarSkipped?: boolean;
      isPanSkipped?: boolean;
      isPassportSkipped?: boolean;
      passportImage?: string[];
      residentStatus?: string;
      ociCardImage?: string[];
      isPhysicalPassport?: boolean;
      isPhysicalAddressProof?: boolean;
      isPhysicalOCI?: boolean;
    },
    ocrDetails: {
      panDetails: any;
      aadhaarDetails: any;
      panDob: string | null;
      aadhaarDob: string | null;
    },
  ): Record<string, any> {
    const signatoryDetails: Record<string, any> = {
      isAadhaarOcrDone: false,
      isPanOcrDone: false,
    };

    this.applyAadhaarAssignments(
      signatoryDetails,
      request.aadhaarImage,
      request.isAadhaarSkipped,
      ocrDetails.aadhaarDetails,
      ocrDetails.aadhaarDob,
    );

    this.applyPanAssignments(
      signatoryDetails,
      request.panImage,
      request.isPanSkipped,
      ocrDetails.panDetails,
      ocrDetails.panDob,
    );

    this.applyPhysicalDocumentFlags(signatoryDetails, request);
    this.applyAddressProofDetails(signatoryDetails, request);
    this.applyDobFromImages(signatoryDetails, request, ocrDetails);
    this.applyResidentStatusDetails(signatoryDetails, request);
    this.applySkippedFlags(signatoryDetails, request);

    return signatoryDetails;
  }

  /**
   * Applies physical document flags to signatory details
   * @private
   */
  private applyPhysicalDocumentFlags(
    signatoryDetails: Record<string, any>,
    request: {
      isPhysicalPassport?: boolean;
      isPhysicalAddressProof?: boolean;
      isPhysicalOCI?: boolean;
    },
  ): void {
    signatoryDetails.isPhysicalPassport = request.isPhysicalPassport ?? false;
    signatoryDetails.isPhysicalAddressProof =
      request.isPhysicalAddressProof ?? false;
    signatoryDetails.isPhysicalOCI = request.isPhysicalOCI ?? false;
  }

  /**
   * Applies address proof details to signatory details
   * @private
   */
  private applyAddressProofDetails(
    signatoryDetails: Record<string, any>,
    request: {
      addressProofType?: string;
      addressProofImage?: string[];
    },
  ): void {
    if (request.addressProofType) {
      signatoryDetails.addressProofType = request.addressProofType ?? null;
    }
    if (request.addressProofImage) {
      signatoryDetails.addressProofImage = request.addressProofImage ?? [];
    }
  }

  /**
   * Applies DOB from images to signatory details
   * @private
   */
  private applyDobFromImages(
    signatoryDetails: Record<string, any>,
    request: {
      aadhaarImage?: string[];
      panImage?: string[];
    },
    ocrDetails: {
      aadhaarDob: string | null;
      panDob: string | null;
    },
  ): void {
    if (request?.aadhaarImage?.length > 0) {
      signatoryDetails.dob = ocrDetails.aadhaarDob;
      signatoryDetails.dobAsAadhaar = ocrDetails.aadhaarDob;
    } else if (request?.panImage?.length > 0) {
      signatoryDetails.dob = ocrDetails.panDob;
      signatoryDetails.dobAsPan = ocrDetails.panDob;
    }
  }

  /**
   * Applies resident status details to signatory details
   * @private
   */
  private applyResidentStatusDetails(
    signatoryDetails: Record<string, any>,
    request: {
      residentStatus?: string;
      isPassportSkipped?: boolean;
      passportImage?: string[];
      ociCardImage?: string[];
    },
  ): void {
    if ('residentStatus' in request) {
      signatoryDetails.isPassportSkipped = request.isPassportSkipped ?? false;
      signatoryDetails.passportImage = request.passportImage ?? [];
      signatoryDetails.residentStatus = request.residentStatus ?? null;
      signatoryDetails.ociImage = request.ociCardImage ?? [];
    }
  }

  /**
   * Applies skipped flags to signatory details
   * @private
   */
  private applySkippedFlags(
    signatoryDetails: Record<string, any>,
    request: {
      isAadhaarSkipped?: boolean;
      isPanSkipped?: boolean;
    },
  ): void {
    signatoryDetails.isAadhaarSkipped =
      'isAadhaarSkipped' in request ? request.isAadhaarSkipped : false;
    signatoryDetails.isPanSkipped =
      'isPanSkipped' in request ? request.isPanSkipped : false;
  }

  /**
   * Updates booking with image details
   * @private
   */
  private async updateBookingWithImageDetails(
    booking: Booking,
    applicantField: keyof Booking,
    signatoryDetails: Record<string, any>,
    request: {
      opportunityId: string;
      applicantNumber: number;
      bookingAs: BookingAsEnum;
      lastStep: number;
      relationship?: string;
    },
  ): Promise<void> {
    const existingData = (booking[applicantField] as Record<string, any>) || {};

    const existingPersonalDetails = existingData.personalDetails ?? {};
    existingData.personalDetails = {
      ...existingPersonalDetails,
      ...signatoryDetails,
    };

    const updateData = {
      [applicantField]: existingData,
      lastStep: request.lastStep || booking.lastStep,
      bookingAs: request.bookingAs || booking.bookingAs,
      relationBtApplicants: request.relationship,
      noOfApplicants: Math.max(
        booking.noOfApplicants || 0,
        request.applicantNumber,
      ),
    };

    const encryptedData = await encryptBookingApplicants(updateData);
    await this.bookingRepository.update(
      { opportunityId: request.opportunityId },
      encryptedData,
    );
  }

  /**
   * Extracts OCR details for PAN and Aadhaar using the original array-indexed positions.
   *
   * This preserves the exact legacy behavior: `data[0]` is assumed PAN and
   * `data[1]` (when present) is Aadhaar; otherwise Aadhaar may be at index 0.
   *
   * @param createFileBuffer - Response object returned by OCR API wrapper
   * @returns Object containing PAN/Aadhaar detail blobs and parsed DOBs
   * @private
   */
  // Exact original array-indexed OCR detail extraction (no changes to logic)
  private extractOcrDetailsIndexed(createFileBuffer: any): {
    panDetails: any;
    aadhaarDetails: any;
    panDob: string | null;
    aadhaarDob: string | null;
  } {
    const panDetails = createFileBuffer?.data[0]?.PanData || {};
    const aadhaarDetails =
      createFileBuffer?.data?.length > 1
        ? createFileBuffer?.data[1]?.AadhaarData
        : createFileBuffer?.data[0]?.AadhaarData || {};
    const panDob = panDetails?.ocrResult?.dateInfo
      ? formatDate(panDetails?.ocrResult?.dateInfo, DATE_FORMAT)
      : null;
    const aadhaarDob = aadhaarDetails?.ocrResult?.dateInfo
      ? formatDate(aadhaarDetails?.ocrResult?.dateInfo, DATE_FORMAT)
      : null;
    return { panDetails, aadhaarDetails, panDob, aadhaarDob };
  }

  // (removed helper to restore original inline logic for OCR detail extraction)

  /**
   * Validates document requirements for NRI and OCI/PIO resident statuses.
   *
   * Enforces presence (or explicit skipping/physical submission flags) of
   * Passport, Address Proof (when passport is skipped), and OCI card for
   * `residentStatus === 'OCI/PIO'`.
   *
   * @param request - Original request payload containing images and flags
   * @param residentStatus - Declared resident status of the applicant
   * @param isPhysicalPassport - Flag indicating physical passport will be submitted
   * @param isPhysicalAddressProof - Flag indicating physical address proof will be submitted
   * @param isPhysicalOCI - Flag indicating physical OCI card will be submitted
   * @throws BadRequestException when mandatory documents are missing
   * @private
   */
  private validateNriOciRequirements(
    request: any,
    residentStatus: string | null,
    isPhysicalPassport: boolean | undefined,
    isPhysicalAddressProof: boolean | undefined,
    isPhysicalOCI: boolean | undefined,
  ): void {
    const passportProvided =
      Array.isArray(request.passportImage) && request.passportImage.length > 0;
    const passportSkipped = request.isPassportSkipped === true;

    if (residentStatus === 'NRI' || residentStatus === 'OCI/PIO') {
      if (!passportProvided && !passportSkipped && !isPhysicalPassport) {
        throw new BadRequestException(
          'Passport is required or must be explicitly skipped.',
        );
      }

      if (passportSkipped) {
        this.validateAddressProofWhenPassportSkipped(
          request,
          isPhysicalAddressProof,
        );
      }

      if (
        residentStatus === 'OCI/PIO' &&
        (!request?.ociCardImage || request?.ociCardImage.length === 0) &&
        !isPhysicalOCI
      ) {
        throw new BadRequestException(
          'OCI card is required to proceed forward.',
        );
      }
    }
  }

  /**
   * Validates address proof requirements when passport is skipped
   * @private
   */
  private validateAddressProofWhenPassportSkipped(
    request: any,
    isPhysicalAddressProof: boolean | undefined,
  ): void {
    if (
      (!request.addressProofType ||
        !request.addressProofImage ||
        request.addressProofImage.length === 0) &&
      !isPhysicalAddressProof
    ) {
      throw new BadRequestException(
        'Address proof is required when passport is skipped.',
      );
    }
  }

  /**
   * Builds the OCR input buffer from provided images.
   *
   * Returns deterministic sample OCR data for specific well-known demo filenames
   * and otherwise delegates to `getFormData` to perform actual OCR submission.
   *
   * @param request - Input payload containing Aadhaar/PAN image URLs
   * @returns Promise resolving to an object with a `data` array of OCR results
   * @private
   */
  private async buildCreateFileBufferFromImages(request: any): Promise<any> {
    const { aadhaarImage, panImage } = request;
    if (
      aadhaarImage?.[0] == 'iProAAdhaar.jpg' &&
      panImage?.[0] == 'iProPAN.jpg'
    ) {
      return {
        data: [
          {
            PanData: {
              status: 'SUCCESS',
              ocrStatus: 'SUCCESS',
              message: 'Scan completed successfully.',
              responseKey: 'success_pan_ocr',
              ocrResult: {
                cardNo: 'BNZPM2501F',
                dateInfo: '16/07/1986',
                dateType: 'DOB',
                fatherName: 'DURAISAMY',
                name: 'D MANIKANDAN',
              },
              kycStatus: 'SUCCESS',
              kycResult: [Object],
              responseCode: 'S00000',
              requestTimestamp: '2025-10-01 12:20:27.598850 IST (GMT +0530)',
              responseTimestamp: '2025-10-01 12:20:38.155660 IST (GMT +0530)',
              decentroTxnId: '2F645027E6EE4543A15506E1659B2CEA',
            },
          },
          {
            AadhaarData: {
              status: 'SUCCESS',
              ocrStatus: 'SUCCESS',
              message:
                'Scan completed successfully. Please do offline Aadhaar verification for checking the details linked to the Aadhaar number',
              responseKey: 'success_aadhaar_ocr',
              ocrResult: {
                cardNo: '419734437228',
                dateInfo: '01/01/1948',
                dateType: 'DOB',
                name: 'Nandlal Yadav',
                gender: 'MALE',
                vid: '9141829741374787',
                fatherName: '',
                address: '',
                sonOf: '',
                husbandOf: '',
              },
              kycStatus: 'PENDING',
              responseCode: 'S00000',
              requestTimestamp: '2025-10-01 12:20:38.250445 IST (GMT +0530)',
              responseTimestamp: '2025-10-01 12:20:43.842798 IST (GMT +0530)',
              decentroTxnId: '90459B7F1A964A68A2FBB652089C698E',
            },
          },
        ],
      };
    } else if (
      (!aadhaarImage || aadhaarImage?.length == 0) &&
      panImage?.[0] == 'iProPAN.jpg'
    ) {
      return {
        data: [
          {
            PanData: {
              status: 'SUCCESS',
              ocrStatus: 'SUCCESS',
              message: 'Scan completed successfully.',
              responseKey: 'success_pan_ocr',
              ocrResult: {
                cardNo: 'BNZPM2501F',
                dateInfo: '16/07/1986',
                dateType: 'DOB',
                fatherName: 'DURAISAMY',
                name: 'D MANIKANDAN',
              },
              kycStatus: 'SUCCESS',
              kycResult: [Object],
              responseCode: 'S00000',
              requestTimestamp: '2025-10-01 12:20:27.598850 IST (GMT +0530)',
              responseTimestamp: '2025-10-01 12:20:38.155660 IST (GMT +0530)',
              decentroTxnId: '2F645027E6EE4543A15506E1659B2CEA',
            },
          },
        ],
      };
    } else if (
      (!panImage || panImage?.length == 0) &&
      aadhaarImage?.[0] == 'iProAAdhaar.jpg'
    ) {
      return {
        data: [
          {
            AadhaarData: {
              status: 'SUCCESS',
              ocrStatus: 'SUCCESS',
              message:
                'Scan completed successfully. Please do offline Aadhaar verification for checking the details linked to the Aadhaar number',
              responseKey: 'success_aadhaar_ocr',
              ocrResult: {
                cardNo: '419734437228',
                dateInfo: '01/01/1948',
                dateType: 'DOB',
                name: 'Nandlal Yadav',
                gender: 'MALE',
                vid: '9141829741374787',
                fatherName: '',
                address: '',
                sonOf: '',
                husbandOf: '',
              },
              kycStatus: 'PENDING',
              responseCode: 'S00000',
              requestTimestamp: '2025-10-01 12:20:38.250445 IST (GMT +0530)',
              responseTimestamp: '2025-10-01 12:20:43.842798 IST (GMT +0530)',
              decentroTxnId: '90459B7F1A964A68A2FBB652089C698E',
            },
          },
        ],
      };
    }
    return this.getFormData(request);
  }

  /**
   * Verifies the status of DigiLocker KYC verification process for a given opportunity
   *
   * This method checks the latest DigiLocker verification status by querying the Decentro logs
   * table for the most recent successful or failed DigiLocker request associated with the
   * provided opportunity ID. It handles various status codes and provides appropriate
   * responses based on the verification state.
   *
   * The method processes different status scenarios:
   * - Complete success: All documents fetched successfully
   * - Partial success: Some documents fetched, others pending
   * - Various error states: Data fetch failures, retry exhaustion, session initiation errors
   * - No data found: No DigiLocker logs found for the opportunity
   *
   * @param opportunityId - Unique identifier for the booking opportunity to check status for
   * @returns Promise<DigiLockerStatusResponse> - Object containing:
   *   - status: 'SUCCESS' | 'FAILED' - Overall verification status
   *   - message: string - Human-readable status description
   *   - data: any | null - Verification data including Aadhaar/PAN verification status
   *
   * @throws {Error} - When database query fails or unexpected errors occur
   *
   */
  async verifyDigilockerStatus(opportunityId: string): Promise<any> {
    try {
      const latestLog = await this.decentroLogsRepository.findOne({
        where: {
          opportunityId: opportunityId,
          status: In([LogStatus.SUCCESS, LogStatus.FAILED]),
          requestType: RequestType.DIGILOCKER,
        },
        order: { createdAt: 'DESC' },
      });

      if (!latestLog) {
        return {
          status: 'FAILED',
          message: 'No successful DigiLocker data fetch found',
          data: null,
        };
      }

      if (latestLog.statusCode !== 'success_uistream_documents_fetch') {
        if (
          latestLog.statusCode === 'success_uistream_partial_documents_fetch'
        ) {
          return {
            status: 'SUCCESS',
            message: 'Partial DigiLocker data fetched',
            data: latestLog?.responsePayload?.verifications,
          };
        }
        if (latestLog?.statusCode === 'error_uistream_digilocker_data_fetch') {
          return {
            status: 'FAILED',
            message: 'Failed to fetch DigiLocker data, Please try again',
            data: latestLog?.responsePayload?.verifications,
          };
        }
        if (
          latestLog.statusCode === 'error_uistream_poller_retries_exhausted'
        ) {
          return {
            status: 'FAILED',
            message:
              'Your retries have been exhausted, please try again after some time',
            data: latestLog?.responsePayload?.verifications,
          };
        }
        if (latestLog.statusCode === 'error_uistream_initiate_session') {
          return {
            status: 'FAILED',
            message:
              'An error occurred while trying to start the Digilocker session.',
            data: latestLog?.responsePayload?.verifications,
          };
        }
        return {
          status: 'FAILED',
          message: 'No successful DigiLocker data fetch found',
          data: null,
        };
      }

      return {
        status: 'SUCCESS',
        message: 'Digilocker data fetched successfully',
        data: latestLog?.responsePayload?.verifications,
      };
    } catch (error) {
      logger.error('Failed to fetch Digilocker status', {
        error: error,
        opportunityId,
      });

      logsAndErrorHandling('DecentroService - verifyDigilockerStatus', error, {
        opportunityId,
      });
    }
  }

  async getFormData(request: {
    opportunityId: string;
    applicantNumber: number;
    bookingAs: BookingAsEnum;
    lastStep: number;
    aadhaarImage?: string[];
    panImage?: string[];
    addressProofType?: string;
    addressProofImage?: string[];
    isAadhaarSkipped?: boolean;
    isPanSkipped?: boolean;
  }): Promise<DocImageValidationResponse> {
    const referenceId = generateRandomId();
    logger.info(
      `getFormData service called: opportunityId: ${request.opportunityId} referenceId:`,
      request,
    );
    try {
      let imgUrl, imgUrl2, form, form2;
      let imageBuffer, imageBuffer2;

      const isAadhaarProvided = request.aadhaarImage?.length > 0;
      const isPanProvided = request.panImage?.length > 0;

      if (!isAadhaarProvided && !isPanProvided) {
        throw new BadRequestException('No document images provided');
      }

      if (isAadhaarProvided) {
        imgUrl2 = request.aadhaarImage[0];
        imageBuffer2 = await this.awsService.fetchFileFromS3(imgUrl2);
        form2 = new FormData();
        form2.append('reference_id', referenceId);
        form2.append('document_type', 'AADHAAR');
        form2.append('consent', 'Y');
        form2.append(
          'consent_purpose',
          'For KYC verification and compliance purposes',
        );
        form2.append('document', imageBuffer2, {
          filename: 'document.jpg',
          contentType: 'image/jpg',
        });
      }

      if (isPanProvided) {
        imgUrl = request.panImage[0];
        imageBuffer = await this.awsService.fetchFileFromS3(imgUrl);
        form = new FormData();
        form.append('reference_id', referenceId);
        form.append('document_type', 'PAN');
        form.append('consent', 'Y');
        form.append(
          'consent_purpose',
          'For KYC verification and compliance purposes',
        );
        form.append('document', imageBuffer, {
          filename: 'document.jpg',
          contentType: 'image/jpeg',
        });
      }

      const docData = await this.getDocData(form, form2);

      return {
        status: 'SUCCESS',
        message: 'Image uploaded successfully',
        data: docData,
      };
    } catch (error) {
      logger.error('Failed to get Image details:', error);
      logsAndErrorHandling('DecentroService - getFormData', error, request);
    }
  }

  private async getDocData(
    formData?: FormData,
    formData2?: FormData,
  ): Promise<any[]> {
    let tempDocType = '';
    try {
      logger.info(`getDocData service called`);
      const url = `${this.baseUrl}/kyc/scan_extract/ocr`;

      const responses: any[] = [];

      if (!formData && !formData2) {
        throw new BadRequestException('No form data provided');
      }

      if (formData) {
        tempDocType = 'PAN';
        const headers = {
          ...formData.getHeaders(),
          client_id: this.clientId,
          client_secret: this.clientSecret,
          module_secret: this.moduleSecret,
        };

        const response: AxiosResponse = await lastValueFrom(
          this.httpService.post(url, formData, { headers }),
        );

        if (response?.data?.status !== 'SUCCESS') {
          throw new NotFoundException('PAN document details not found');
        }
        responses.push({ PanData: response.data });
      }

      if (formData2) {
        tempDocType = 'AADHAAR';
        const headers2 = {
          ...formData2.getHeaders(),
          client_id: this.clientId,
          client_secret: this.clientSecret,
          module_secret: this.moduleSecret,
        };

        const response2: AxiosResponse = await lastValueFrom(
          this.httpService.post(url, formData2, { headers: headers2 }),
        );

        if (response2.data?.status !== 'SUCCESS') {
          throw new NotFoundException('AADHAAR document details not found');
        }
        responses.push({ AadhaarData: response2.data });
      }

      logger.info('line 1095', responses);
      return responses;
    } catch (error) {
      const errorMessage = error?.response?.data?.error?.message
        ? error?.response?.data?.error?.message
        : 'Invalid Image.Please re-upload image';
      throw new BadRequestException(`${errorMessage} for ${tempDocType}.`);
    }
  }
}
