import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import UploadFoldersEnum from '../../enums/upload-folders.enum';
import { logger } from '../../logger/logger';
import { PassThrough, Readable } from 'stream';
import { Upload } from '@aws-sdk/lib-storage';
import { CustomConfigService } from 'src/config/custom-config.service';
import { SUCCESS } from 'src/config/constants';
import { generateRandomNumber } from 'src/utils';
import { EmailOptions } from './interface/email-options.interface';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';

@Injectable()
export class AwsService {
  private readonly s3Client: S3Client;
  private readonly sesClient: SESClient;
  private readonly bucketName: string;
  private readonly fromEmail: string;
  constructor(private readonly configService: CustomConfigService) {
    // S3 Client Configuration
    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: this.configService.getDecrypted('AWS_S3_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getDecrypted(
          'AWS_S3_ACCESS_SECRET',
        ),
      },
      region: this.configService.get<string>('AWS_S3_REGION'),
    });
    this.bucketName = this.configService.getDecrypted('AWS_S3_ASSETS_BUCKET');

    // SES Client Configuration
    this.sesClient = new SESClient({
      credentials: {
        accessKeyId: this.configService.getDecrypted('AWS_SES_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getDecrypted(
          'AWS_SES_SECRET_ACCESS_KEY',
        ),
      },
      region: this.configService.get<string>('AWS_SES_REGION'),
    });
    this.fromEmail = this.configService.get<string>('AWS_SES_FROM_EMAIL');
  }

  //To generate and return presigned URL to the frontend
  async getPreSignedURL(key: string, folder: UploadFoldersEnum): Promise<any> {
    try {
      const random = generateRandomNumber(5);
      const extension = key.substring(key.lastIndexOf('.'));
      const keyName = key.substring(0, key.lastIndexOf('.')).slice(0, 15);

      const objectKey = `${random}${keyName}${extension}`;
      const fullPath = `${folder}/${objectKey}`;
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: `puravankara/${fullPath}`,
        ContentType: 'application/pdf',
      });

      const signedUrl: string = await getSignedUrl(this.s3Client, command, {
        expiresIn: 1800, // URL expiration time in seconds (e.g., 30min)
      });
      return {
        message: 'Presigned URL created successfully.',
        data: {
          s3Basepath: this.configService.get<string>('AWS_S3_ACCESS_URL'),
          key: fullPath,
          signedUrl: signedUrl,
        },
      };
    } catch (error) {
      logger.error(`Failed to generate Presigned URL file ${key} :`, error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to generate Presigned URL file ${error?.message}`,
      );
    }
  }

  //To upload files to s3 directly from backend like booking pdf or signed pdf
  async uploadToS3(
    key: string,
    file: PassThrough,
    isExcel: boolean = false,
  ): Promise<void> {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: `puravankara/${key}`,
          Body: file,
          ContentType: isExcel
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf', // Adjust based on the content type
          CacheControl: 'no-cache, no-store, must-revalidate',
        },
      });

      await upload.done();
      logger.info(`File uploaded successfully to ${this.bucketName}/${key}`);
    } catch (error) {
      logger.error(`Error uploading to S3 ${key} :`, error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Error uploading to S3 ${error?.message}`,
      );
    }
  }

  //To delete the files from S3 directly
  async deleteFileFromS3(key: string): Promise<any> {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: `puravankara/${key}`,
      });

      const response = await this.s3Client.send(deleteCommand);

      logger.info(`File ${key} deleted successfully.`, response);
      return {
        statusCode: SUCCESS,
        message: 'File deleted successfully.',
        data: null,
      };
    } catch (error) {
      logger.error(`Failed to delete file ${key} :`, error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed to delete file ${key} : ${error?.message}`,
      );
    }
  }

  // To fetch files from S3
  async fetchFileFromS3(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: `puravankara/${key}`,
      });
      const { Body } = await this.s3Client.send(command);

      if (!Body) {
        return null;
      }

      // Case 1: Body is already a Buffer
      if (Buffer.isBuffer(Body)) {
        return Body as Buffer;
      }

      // Case 2: Body is Uint8Array
      if (Body instanceof Uint8Array) {
        return Buffer.from(Body) as Buffer;
      }

      // Case 3: Body is ReadableStream (most common)
      if (Body instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of Body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const finalBuffer: Buffer = Buffer.concat(chunks);

        if (finalBuffer.length === 0) {
          throw new Error('Fetched file is empty');
        }

        return finalBuffer;
      }

      throw new Error(`Unsupported S3 Body type: ${typeof Body}`);
    } catch (error) {
      if (error.name === 'NoSuchKey') return null;
      logger.error(`Failed to fetch file ${key} :`, error);
      logsAndErrorHandling('AwsService - fetchFileFromS3', error, { key });
    }
  }

  // To send email using AWS SES
  async sendEmail(options: EmailOptions): Promise<any> {
    try {
      const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
      let ccAddresses: string[] = [];
      if (options.cc) {
        ccAddresses = Array.isArray(options.cc) ? options.cc : [options.cc];
      }
      let bccAddresses: string[] = [];
      if (options.bcc) {
        bccAddresses = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
      }

      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: toAddresses,
          CcAddresses: ccAddresses.length > 0 ? ccAddresses : undefined,
          BccAddresses: bccAddresses.length > 0 ? bccAddresses : undefined,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: options.textBody
              ? {
                  Data: options.textBody,
                  Charset: 'UTF-8',
                }
              : undefined,
            Html: options.htmlBody
              ? {
                  Data: options.htmlBody,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
      });

      const response = await this.sesClient.send(command);
      const recipients = Array.isArray(options.to)
        ? options.to.join(',')
        : options.to;

      logger.info(`Email sent successfully to: ${recipients}`, {
        messageId: response.MessageId,
      });

      return {
        data: {
          messageId: response.MessageId,
          recipients: recipients,
        },
      };
    } catch (error) {
      logger.error(`Failed to send email:`, error);
      if (error instanceof HttpException) return error;
      return new InternalServerErrorException(
        `Failed to send email: ${error?.message}`,
      );
    }
  }
}
