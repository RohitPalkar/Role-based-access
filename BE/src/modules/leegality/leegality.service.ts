import {
  Injectable,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { logger } from '../../logger/logger';
import { AwsService } from '../aws/aws.service';
import { PassThrough } from 'stream';
import { CustomConfigService } from 'src/config/custom-config.service';
import { SUCCESS } from 'src/config/constants';
@Injectable()
export class LeegalityService {
  private readonly baseUrl: string;
  private readonly authToken: string;
  private readonly profileId: string;
  private readonly referrerProfileId: string;
  private readonly agreementProfileId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: CustomConfigService,
    private readonly awsService: AwsService,
  ) {
    // Use config or environment variables to set the base URL and X-Auth-Token
    this.baseUrl = this.configService.get<string>('LEEGALITY_BASE_URL');
    this.authToken = this.configService.getDecrypted('LEEGALITY_AUTH_TOKEN');
    this.profileId = this.configService.getDecrypted('LEEGALITY_PROFILE_ID');
    this.referrerProfileId = this.configService.getDecrypted(
      'LEEGALITY_REF_PROFILE_ID',
    );
    this.agreementProfileId = this.configService.getDecrypted(
      'LEEGALITY_AGREEMENT_PROFILE_ID',
    );
  }

  // Upload a document and invite multiple invitees
  async sendInvitation(
    file: Buffer,
    fileName: string,
    invitees: any[],
    irn: string,
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/v3.0/sign/request`;
      let profileId: string | undefined;
      if (fileName.includes('Referrer_Form')) {
        profileId = this.referrerProfileId;
      } else if (fileName.includes('Booking_Application')) {
        profileId = this.profileId;
      } else if (fileName.includes('Agreement_Form')) {
        profileId = this.agreementProfileId;
      } else {
        profileId = this.profileId;
      }

      const payload = {
        profileId,
        file: {
          name: fileName,
          file: file.toString('base64'),
        },
        invitees,
        irn,
      };

      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': this.authToken,
          },
        }),
      );

      logger.info(`Invitation send for the :: ${irn}`, response.data);
      return response.data;
    } catch (error) {
      logger.error('Failed to send invitation:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to send invitation: ${error?.message}`,
      );
    }
  }

  // Activate the invitation to start the signing process for each invitee
  async activateInvitation(signUrl: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/v3.1/invitation/activate?signUrl=${encodeURIComponent(signUrl)}`;
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.put(url, null, {
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': this.authToken,
          },
        }),
      );
      return {
        message:
          response?.data?.messages?.[0]?.message ??
          'Invitation sent successfully.',
        data: response?.data.data,
      };
    } catch (error) {
      logger.error('Failed to activate invitation:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to activate invitation: ${error?.message}`,
      );
    }
  }

  // Resend the email notification to the invitee for sign later
  async resendNotifications(signUrls: string[]): Promise<any> {
    try {
      const url = `${this.baseUrl}/v3.0/sign/request/resend`;
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(
          url,
          { signUrls },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Auth-Token': this.authToken,
            },
          },
        ),
      );

      return {
        statusCode: SUCCESS,
        message:
          response?.data?.data?.invitations?.[0]?.message ??
          'Invitation sent successfully.',
        data: response?.data?.data,
      };
    } catch (error) {
      logger.error('Failed to send notification:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to send notification: ${error?.message}`,
      );
    }
  }

  // Method to download the signed document
  async downloadSignedDocument(
    documentId: string,
    filePath: string,
    oppId: string,
  ): Promise<string> {
    try {
      const url = `${this.baseUrl}/v3.3/document/fetchDocument?documentId=${documentId}&documentDownloadType=DOCUMENT`;
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.get(url, {
          headers: {
            'X-Auth-Token': this.authToken,
          },
        }),
      );
      const pdfBuffer = response?.data?.data?.file ?? null;
      const fileName = `signed-pdf/${oppId}/${filePath}`;
      if (pdfBuffer) {
        await this.downloadAndUploadToS3(pdfBuffer, fileName);
      }
      return `${fileName}`;
    } catch (error) {
      logger.error('Failed to download signed document:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to download signed document: ${error?.message}`,
      );
    }
  }

  //Download Signed Pdf and upload on s3
  async downloadAndUploadToS3(url: string, filePath: string): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(url, {
          responseType: 'stream',
        }),
      );

      const passThroughStream = new PassThrough();
      response.data.pipe(passThroughStream);
      await this.awsService.uploadToS3(filePath, passThroughStream);
    } catch (error) {
      logger.error('Failed to download and upload document:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to download and upload document: ${error?.message}`,
      );
    }
  }

  //upload pdf buffer to s3
  async uploadPdfBufferToS3(
    fileName: string,
    pdfBuffer: Buffer,
  ): Promise<string> {
    try {
      const passThroughStream = new PassThrough();
      passThroughStream.end(pdfBuffer); // Pass the buffer to the stream

      // Upload the buffer to S3
      await this.awsService.deleteFileFromS3(fileName);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.awsService.uploadToS3(fileName, passThroughStream);
      return `${fileName}`;
    } catch (error) {
      logger.error('Error uploading PDF buffer to S3:', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Error uploading PDF buffer to S3: ${error?.message}`,
      );
    }
  }

  async safeS3Cleanup(fileUrl: string) {
    try {
      await this.awsService.deleteFileFromS3(fileUrl);
    } catch (err) {
      logger.warn(`S3 cleanup failed: ${fileUrl}`);
    }
  }
}
