import {
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { compressImage } from './utils/image.utils';
import { Response } from 'express';
import { ImageCompression } from './enums/image-compression.enum';
import { File } from 'multer';
import { UPLOAD_LIMIT } from './config/constants';
import * as path from 'path';
import { SkipDecryption } from './interceptors/decorators/skip-decryption.decorator';
import { SkipEncryption } from './interceptors/decorators/skip-encryption.decorator';

@Controller()
export class AppController {
  constructor() {}

  @Get('health')
  checkHealth() {
    return {
      message: 'Api service is up and running',
      data: { timestamp: new Date().toISOString() },
    };
  }

  @Get('/debug-sentry')
  sentryTest() {
    throw new Error('My first Sentry error!');
  }

  @Post('compress-image')
  @SkipDecryption()
  @SkipEncryption()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: UPLOAD_LIMIT,
      },
    }),
  )
  async compressImage(
    @UploadedFile() file: File,
    @Body() body: { width?: string; height?: string },
    @Res() res: Response,
  ) {
    const width = parseInt(body?.width) || ImageCompression?.width;
    const height = parseInt(body?.height) || ImageCompression?.height;

    const buffer = await compressImage(file.buffer, width, height);
    const base64 = buffer.toString('base64');

    const originalName = file.originalname;
    const baseName = path.parse(originalName).name;
    const newFileName = `${baseName}.jpeg`;
    return res.status(200).json({
      filename: newFileName || 'CompressedImage.jpeg',
      success: true,
      message: 'Image compressed successfully',
      data: base64,
    });
  }
}
