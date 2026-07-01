import { Body, Controller, Post } from '@nestjs/common';
import { GetPreSignedURLDto } from './dto/get-presigned-url.dto';
import { AwsService } from './aws.service';
import { OnEvent } from '@nestjs/event-emitter';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { EmailNotifyEvent, S3FileFetchEvent } from 'src/events/aws.events';

@Controller('aws')
export class AwsController {
  constructor(private readonly awsService: AwsService) {}

  @Post('/pre-signed-url')
  async getPreSignedURL(
    @Body() getPreSignedURLDto: GetPreSignedURLDto,
  ): Promise<any> {
    const { key, folder } = getPreSignedURLDto;
    return this.awsService.getPreSignedURL(key, folder);
  }

  @Post('/delete-file')
  async deleteFileFromS3(@Body('key') key: string): Promise<void> {
    return this.awsService.deleteFileFromS3(key);
  }

  @OnEvent(EventMessagesEnum.FETCH_FILE_FROM_S3)
  async fetchFileFromS3(s3Event: S3FileFetchEvent): Promise<any> {
    return await this.awsService.fetchFileFromS3(s3Event.key);
  }

  @OnEvent(EventMessagesEnum.SEND_EMAIL)
  async sendEmail(emailEvent: EmailNotifyEvent): Promise<any> {
    return await this.awsService.sendEmail(emailEvent);
  }
}
