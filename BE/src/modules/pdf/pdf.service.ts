import { BadRequestException, Injectable } from '@nestjs/common';
import { AwsService } from '../aws/aws.service';
import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import { CustomConfigService } from 'src/config/custom-config.service';
import { PassThrough } from 'stream';
import { logger } from 'src/logger/logger';
import * as fs from 'fs/promises';
import puppeteer from 'puppeteer';
import { formatDate } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { IST_TIME_ZONE } from 'src/config/constants';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { getApplicantSignatureLabels } from 'src/helpers/bookings.helper';

@Injectable()
export class PdfService {
  constructor(
    private readonly awsService: AwsService,
    private readonly configService: CustomConfigService,
  ) {}

  private readonly generatePdf = async (
    options: any,
    download: boolean = false,
  ) => {
    try {
      // Launch a new browser session
      const browser = await puppeteer.launch({
        headless: true, // Enable headless mode for better performance
        args: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-software-rasterizer',
          '--disk-cache-size=0',
        ],
      });

      const page = await browser.newPage();
      // Navigate to the URL
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });
      await page.setCacheEnabled(false);
      await page.goto(options.url, {
        waitUntil: 'networkidle2', // Wait until the network is idle
        timeout: 60000,
      });

      await page.emulateMediaType('print');
      await page.evaluate(() => {
        document.querySelector('div.applicantDetailsCard').scrollIntoView();
      });

      await page.addStyleTag({
        content: `
          .page-break {
            page-break-before: always;
          }

          .kyc-document-row .document-images{
            display:block !important;
          }
          .kyc-document-row .document-images .img-bg{
            margin-top:10px !important;
            height: 1050px;
            width: 100%
          }
          .kyc-document-row .document-images .img-bg .img{
            min-height: 500px;
            min-width: 70%
            max-height: 950px;
            max-width: 100%
            object-fit: contain;
          }

          .payment-document-row .document-images{
            display:block !important;
          }
          .payment-document-row .document-images .img-bg{
            margin-top:10px !important;
            height: 550px;
            width: 100%
          }
          .payment-document-row .document-images .img-bg .img{
            min-height: 470px;
            min-width: 70%
            max-height: 750px;
            max-width: 100%
            object-fit: fill;
          }
        `,
      });

      const { footerText, pageNumberText } = this.buildFooter(options);

      // Generate PDF from the page content
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        scale: 0.76,
        width: '1900px',
        height: 'auto',
        landscape: false,
        displayHeaderFooter: true,
        footerTemplate: `
            <div style="margin: 0px; ${options?.isReferrerPdf ? 'margin-bottom: 120px;' : ''} padding: 12px; display: block; width: 100%; ">
              <div style="margin: 0px; padding: 0px; display: flex; justify-content: flex-end; gap: 16px;  width: 100%; ">
                ${footerText}
              </div>
              ${pageNumberText}
            </div>
            </div>
          `,
        margin: {
          top: '0px',
          right: '0px',
          bottom:
            options?.isOfficeUse || options?.isReferrerPdf ? '0px' : '110px',
          left: '0px',
        },
      });

      // Close the browser session
      await browser.close();

      const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
      const bufferPdf = Buffer.from(pdfBuffer);
      if (download) {
        fs.writeFile(options.filePath, pdfBuffer);
        return {
          message: 'PDF file generated and saved on server.',
          base64Pdf,
          bufferPdf,
        };
      }

      return { base64Pdf, bufferPdf };
    } catch (error) {
      logger.error('Failed to generate pdf.', error);
      logsAndErrorHandling('PdfService: generatePdf', error, {
        options,
      });
    }
  };

  /**
   * Render an HTML template to a PDF buffer (IOM and similar flows).
   * When css is omitted, HTML is rendered as-is (inline styles).
   */
  async generatePdfFromInlineHtml(html: string, css?: string): Promise<Buffer> {
    let content = html;
    if (css) {
      const styleTag = `<style>${css}</style>`;
      if (/<link\s+rel=["']stylesheet["']/i.test(content)) {
        content = content.replace(
          /<link\s+rel=["']stylesheet["'][^>]*>/i,
          styleTag,
        );
      } else {
        content = content.replace('</head>', `${styleTag}</head>`);
      }
    }

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-software-rasterizer',
          '--disk-cache-size=0',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });
      await page.setCacheEnabled(false);
      await page.setContent(content, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });
      await page.emulateMediaType('print');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '16mm',
          bottom: '16mm',
          left: '16mm',
          right: '16mm',
        },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (error) {
      logger.error('Failed to generate pdf from HTML.', error);
      logsAndErrorHandling('PdfService: generatePdf', error, {});
      throw error;
    }
  }

  private buildFooter(options: any) {
    let footerText = ``;
    let pageNumberText = ``;

    if (!options?.inviteesArray?.length) return { footerText, pageNumberText };

    const applicantTxt = options.applicantTxt;

    for (let i = 4; i >= 0; i--) {
      const applicant = options.inviteesArray[i] || {};
      footerText += `<div style="margin-bottom: -10px; width: 25%;">`;

      if (applicant.name) {
        footerText += `
        <p style="margin: 0px; padding: 0px; display: block; height: 50px; background-color: yellowgreen;"></p>
        <span style="margin: 0px; padding: 5px 0px 0px 0px; display: block; font-size:7px; position: relative; text-align:left;">
          <span style="margin-left:13px;">${applicant.name}</span>
          <span style="content: ''; position: absolute; top: 0; left: 10%; width: 80%; border-top: 1px dashed #000000;"></span>
        </span>`;

        if (applicantTxt)
          footerText += `<span style="margin: 0px; margin-left:13px; padding: 4px 0px 0px 0px; display: block; font-size:7px; position: relative; text-align:left;">${applicantTxt[i]}</span>`;

        if (options.isSignedOffline)
          footerText += `<span style="margin: 0px; margin-left:13px; padding: 3px 0px 0px 0px; display: block; font-size:7px; position: relative; text-align:left;"> Date _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _</span>`;

        pageNumberText = `<div style="font-size:8px; width:100%; text-align:left; position:absolute; bottom:10px; left:15px"><span class="pageNumber"></span>/<span class="totalPages"></span>`;
      }

      footerText += `</div>`;
    }
    if (options?.applicantOnly) {
      footerText = '';
    }

    return { footerText, pageNumberText };
  }

  async mergeWithMainPdf(
    mainPdfBuffer: Buffer,
    smallPdfBuffer: Buffer,
  ): Promise<Buffer> {
    try {
      const mainPdfDoc = await PDFDocument.load(mainPdfBuffer, {
        ignoreEncryption: true,
      });
      const mergedSmallPdfDoc = await PDFDocument.load(smallPdfBuffer, {
        ignoreEncryption: true,
      });
      const mainPageSize = mainPdfDoc.getPage(0).getSize();
      const copiedPages = await mainPdfDoc.copyPages(
        mergedSmallPdfDoc,
        mergedSmallPdfDoc.getPageIndices(),
      );

      copiedPages.forEach((page) => {
        page.setWidth(mainPageSize.width);
        page.setHeight(mainPageSize.height);
        mainPdfDoc.addPage(page);
      });

      const mergedPdfUint8Array = await mainPdfDoc.save();
      return Buffer.from(mergedPdfUint8Array);
    } catch (error) {
      logger.error('Failed to merge in Main PDFs:', error);
      logsAndErrorHandling('PdfService: mergeWithMainPdf', error, {});
    }
  }

  /**
   *
   * @param options as object
   * @returns Promise<any>
   * @description Generates the booking PDF.
   *  If applicantOnly is true, generates applicant copy only.
   * Otherwise, merges main PDF with additional documents.
   */
  async generateBookingPdf(options: {
    booking: any;
    oppId: string;
    inviteesArray: any[];
    smallPdfPaths: string[];
    isSignedOffline: boolean;
    applicantOnly: boolean;
  }): Promise<any> {
    try {
      logger.info(
        `generateBookingPdf service called inside pdf service: ${options.oppId}`,
      );
      const {
        booking,
        oppId,
        inviteesArray,
        smallPdfPaths,
        isSignedOffline,
        applicantOnly,
      } = options;

      const applicantTxt = getApplicantSignatureLabels(booking);
      if (
        booking?.professionalDetails?.gstCertificate?.length &&
        booking?.professionalDetails?.gstCertificate[0]
          ?.toLowerCase()
          .endsWith('.pdf')
      ) {
        smallPdfPaths.unshift(booking?.professionalDetails?.gstCertificate[0]);
      }
      if (
        booking?.companyDetails?.gstCertificate?.length &&
        booking?.companyDetails?.gstCertificate[0]
          ?.toLowerCase()
          .endsWith('.pdf')
      ) {
        smallPdfPaths.unshift(booking.companyDetails?.gstCertificate[0]);
      }

      // Loop applicants in reverse order
      ['applicant4', 'applicant3', 'applicant2', 'applicant1'].forEach(
        (applicantKey) => {
          const applicant = booking?.[applicantKey];

          if (
            applicant?.personalDetails?.panImage?.length &&
            applicant.personalDetails.panImage[0]
              ?.toLowerCase()
              .endsWith('.pdf')
          ) {
            smallPdfPaths.unshift(applicant?.personalDetails?.panImage[0]);
          }
          if (
            booking?.personalDetails?.legalGuardianDoc?.length &&
            booking?.personalDetails?.legalGuardianDoc[0]
              ?.toLowerCase()
              .endsWith('.pdf')
          ) {
            smallPdfPaths.unshift(
              applicant.personalDetails?.legalGuardianDoc[0],
            );
          }
          if (
            booking?.personalDetails?.addressProofImage?.length &&
            booking?.personalDetails?.addressProofImage[0]
              ?.toLowerCase()
              .endsWith('.pdf')
          ) {
            smallPdfPaths.unshift(
              applicant.personalDetails?.addressProofImage[0],
            );
          }
        },
      );

      //if applicant true
      if (applicantOnly) {
        return await this.generatePdf({
          url: `${this.configService.get<string>('BOOKING_PDF_URL')}/${oppId}?applicantOnly=true&t=${Date.now()}`,
          filePath: `booking.pdf`,
          inviteesArray: inviteesArray,
          isSignedOffline: false,
          applicantTxt,
          applicantOnly: true,
        });
      }

      // Generate main PDF & merge additional PDFs
      const [mainPdf, preBookingBuffer] = await Promise.all([
        this.generatePdf({
          url: `${this.configService.get<string>('BOOKING_PDF_URL')}/${oppId}?applicantOnly=${applicantOnly}&t=${Date.now()}`,
          filePath: `booking.pdf`,
          inviteesArray: inviteesArray,
          isSignedOffline,
          applicantTxt,
          applicantOnly,
        }),
        this.mergeMultiplePDFs(smallPdfPaths),
      ]);
      if (!smallPdfPaths || smallPdfPaths.length == 0) return mainPdf;

      const mainPdfDoc = await PDFDocument.load(mainPdf.bufferPdf, {
        ignoreEncryption: true,
      });

      // Create a new PDF document
      const newPdfDoc = await PDFDocument.create();
      const copiedPages = await newPdfDoc.copyPages(
        mainPdfDoc,
        mainPdfDoc.getPageIndices(),
      );

      copiedPages.forEach((page) => {
        newPdfDoc.addPage(page);
      });

      // **Copy & add pages from the second PDF**
      if (preBookingBuffer) {
        const secondPdfDoc = await PDFDocument.load(preBookingBuffer, {
          ignoreEncryption: true,
        });
        const copiedSecondPdfPages = await newPdfDoc.copyPages(
          secondPdfDoc,
          secondPdfDoc.getPageIndices(),
        );
        const font = await newPdfDoc.embedFont('Helvetica'); // embed font once

        for (const page of copiedSecondPdfPages) {
          // Get dimensions of the first page of the main PDF
          const [firstPage] = mainPdfDoc.getPages();
          const { width: mainWidth, height: mainHeight } = firstPage.getSize();

          // Get current dimensions of the inserted page
          const { width: pageWidth, height: pageHeight } = page.getSize();

          const scale = Math.min(
            mainWidth / pageWidth,
            mainHeight / pageHeight,
          );
          page.setSize(pageWidth * scale, pageHeight * scale);
          // Loop through available invitees and place them in fixed slots
          const inviteePositions = [0.83, 0.62, 0.42, 0.2, 0.01];
          inviteesArray.slice(0, 5).forEach((invitee, i) => {
            const xCenter = mainWidth * inviteePositions[i];
            const fontSizeFirstLine = 8;
            const fontSizeOtherLines = 5.5;

            const lines = [
              '----------------------------------',
              invitee.name,
              applicantTxt[i] || '',
            ];

            if (isSignedOffline) lines.push('Date _ _ _ _ _ _ _ _ _ _ _ _ ');

            // calculate starting Y
            const yStart = isSignedOffline ? 40 : 34;

            lines.forEach((line, idx) => {
              const size = idx === 0 ? fontSizeFirstLine : fontSizeOtherLines;
              page.drawText(line, {
                x: xCenter,
                y: yStart - idx * (size + 2), // add small spacing between lines
                size,
                font,
                color: rgb(0, 0, 0),
              });
            });
          });
          newPdfDoc.addPage(page);
        }
      }

      // Save the final merged PDF
      const mergedPdfBytes = await newPdfDoc.save();
      const base64Pdf = Buffer.from(mergedPdfBytes).toString('base64');
      const bufferPdf = Buffer.from(mergedPdfBytes);
      return { base64Pdf, bufferPdf };
    } catch (error) {
      logger.error('Failed to generate Booking PDF:', error);
      logsAndErrorHandling(
        'Failed to generate Booking PDF: generateBookingPdf',
        error,
        {
          oppId: options.oppId,
        },
      );
    }
  }

  /**
   *
   * @param options as object
   * @returns Promise<any>
   * @description Generates the referrer PDF and define signature placement.
   */
  async generateReferrerPDF(options: {
    oppId: string;
    inviteesArray: any[];
    isSignedOffline: boolean;
  }): Promise<any> {
    try {
      const { oppId, inviteesArray, isSignedOffline } = options;
      const applicantTxt = ['Signature of Referrer'];
      // Generate referrer PDF
      const mainPdfBuffer = await this.generatePdf({
        url: `${this.configService.get<string>('REFERRER_PDF_URL')}/${oppId}?t=${Date.now()}`,
        filePath: `referrer.pdf`,
        inviteesArray: inviteesArray,
        isSignedOffline,
        isReferrerPdf: true,
        applicantTxt,
      });

      return mainPdfBuffer;
    } catch (error) {
      logger.error('Failed to generate Referrer PDF:', error);
      logsAndErrorHandling('PdfService: generateReferrerPDF', error, {
        options,
      });
    }
  }

  async mergeMultiplePDFs(pdfKeys: string[]): Promise<Buffer> {
    try {
      if (pdfKeys && pdfKeys.length == 0) return null;
      const mergedPdf = await PDFDocument.create();
      const a4Width = PageSizes.A4[0];
      const a4Height = PageSizes.A4[1];
      let pdfMerged = false;
      for (const key of pdfKeys) {
        try {
          const pdfBuffer = await this.awsService.fetchFileFromS3(key);
          if (pdfBuffer) {
            pdfMerged = true;
            const pdfDoc = await PDFDocument.load(pdfBuffer, {
              ignoreEncryption: true,
            });
            const copiedPages = await mergedPdf.copyPages(
              pdfDoc,
              pdfDoc.getPageIndices(),
            );
            copiedPages.forEach(async (originalPage) => {
              const { width, height } = originalPage.getSize();

              // Calculate scaling factor to maintain aspect ratio
              const scaleX = a4Width / width;
              const scaleY = a4Height / height;
              const scaleFactor = Math.min(scaleX, scaleY); // Maintain aspect ratio

              // Create a new A4-sized page in the merged PDF
              const newPage = mergedPdf.addPage([a4Width, a4Height]);
              const embeddedPage = await mergedPdf.embedPage(originalPage);
              // Draw the original page onto the new A4 page
              newPage.drawPage(embeddedPage, {
                x: (a4Width - width * scaleFactor) / 2,
                y: (a4Height - height * scaleFactor) / 2,
                width: width * scaleFactor,
                height: height * scaleFactor,
              });
            });
          }
        } catch (err) {
          logger.error(`Failed to load PDF: ${key}`, err);
          if (pdfKeys?.length > 1) continue;
          else throw err;
        }
      }
      if (!pdfMerged) return null;

      const mergedPdfUint8Array = await mergedPdf.save();
      return Buffer.from(mergedPdfUint8Array);
    } catch (error) {
      logger.error('Failed to merge Doc PDFs:', error);
      logsAndErrorHandling(
        'Failed to merge Doc PDFs: mergeMultiplePDFs',
        error,
        { pdfKeys },
      );
    }
  }

  /**
   *
   * @param booking as any
   * @param fileName as string
   * @param smallPdfPaths as string[]
   * @description Merges the post booking documents with the main booking applicant data and uploads the final PDF to S3.
   * @returns string - The S3 key of the merged PDF file.
   */
  async mergePostBookingDocs(
    booking: any,
    fileName: string,
    smallPdfPaths: string[],
  ): Promise<string> {
    try {
      const { opportunityId, signedPdf } = booking;

      // Check if GST certificate is present and add it to the smallPdfPaths array
      if (
        booking?.professionalDetails?.isPhysicalGST &&
        booking?.professionalDetails?.gstCertificate?.length &&
        booking?.professionalDetails?.gstCertificate[0]
          ?.toLowerCase()
          .endsWith('.pdf')
      ) {
        smallPdfPaths.unshift(booking?.professionalDetails?.gstCertificate[0]);
      }

      // Generate main PDF & merge additional PDFs
      const [pdfBuffer, additionalBuffer] = await Promise.all([
        this.generatePdf({
          url: `${this.configService.get<string>('POST_BOOKING_PDF_URL')}/${opportunityId}?t=${Date.now()}`,
          filePath: `booking.pdf`,
          inviteesArray: [],
        }),
        this.mergeMultiplePDFs(smallPdfPaths),
      ]);

      const s3BasePath = this.configService.get<string>('AWS_S3_ACCESS_URL');
      const signedPdfKey = signedPdf.replace(s3BasePath, '');
      const mainPdfBuffer = await this.awsService.fetchFileFromS3(signedPdfKey);
      if (!mainPdfBuffer)
        throw new BadRequestException(
          'Signed Pdf is not found, Please upload.',
        );

      let mergedPdfBuffer = await this.mergeWithMainPdf(
        mainPdfBuffer,
        pdfBuffer.bufferPdf,
      );

      if (smallPdfPaths && smallPdfPaths.length > 0 && additionalBuffer) {
        mergedPdfBuffer = await this.mergeWithMainPdf(
          mergedPdfBuffer,
          additionalBuffer,
        );
      }
      const passThroughStream = new PassThrough();
      passThroughStream.end(mergedPdfBuffer); // Pass the buffer to the stream

      const fileKey = `signed-pdf/${opportunityId}/${fileName.replace('.pdf', '_merged.pdf')}`;
      // Upload the buffer to S3
      await this.awsService.deleteFileFromS3(fileKey);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.awsService.uploadToS3(fileKey, passThroughStream);
      return fileKey;
    } catch (error) {
      logger.error('Failed to generate Post booking PDF:', error);
      logsAndErrorHandling('PdfService: mergePostBookingDocs', error, {
        booking,
        fileName,
        smallPdfPaths,
      });
    }
  }

  /**
   *
   * @param booking as any
   * @param fileName as string
   * @param smallPdfPaths as string[]
   * @returns any
   * @description Generates the office use PDF by merging the main PDF with additional documents and referrer PDF if available.
   *
   */
  async generateOfficeUsePdf(
    booking: any,
    fileName: string,
    smallPdfPaths: string[],
  ): Promise<string> {
    try {
      const { opportunityId, mergedPdf, referrerDetails } = booking;
      const [mainPdf, docBuffer, mainPdfBuffer] = await Promise.all([
        this.generatePdf({
          url: `${this.configService.get<string>('POST_BOOKING_PDF_URL')}/${opportunityId}?isOfficeUse=true&t=${Date.now()}`,
          filePath: fileName,
          inviteesArray: [],
          isOfficeUse: true,
        }),
        this.mergeMultiplePDFs(smallPdfPaths),
        this.awsService.fetchFileFromS3(mergedPdf),
      ]);
      if (!mainPdfBuffer)
        throw new BadRequestException(
          'Signed Pdf is not found, Please upload.',
        );

      let officeUsePdfBuffer: Buffer = mainPdf.bufferPdf;
      if (smallPdfPaths && smallPdfPaths.length > 0 && docBuffer) {
        officeUsePdfBuffer = await this.mergeWithMainPdf(
          mainPdf.bufferPdf,
          docBuffer,
        );
      }

      let pdfWithReferrer = mainPdfBuffer;
      if (referrerDetails?.signedPdf) {
        const referrerBuffer = await this.awsService.fetchFileFromS3(
          referrerDetails?.signedPdf,
        );
        if (referrerBuffer) {
          pdfWithReferrer = await this.mergeWithMainPdf(
            mainPdfBuffer,
            referrerBuffer,
          );
        }
      }
      const finalPdfBuffer = await this.mergeWithMainPdf(
        pdfWithReferrer,
        officeUsePdfBuffer,
      );

      const passThroughStream = new PassThrough();
      passThroughStream.end(finalPdfBuffer); // Pass the buffer to the stream

      const fileKey = `signed-pdf/${opportunityId}/${fileName}`;
      // Upload the buffer to S3
      await this.awsService.deleteFileFromS3(fileKey);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.awsService.uploadToS3(fileKey, passThroughStream);
      return fileKey;
    } catch (error) {
      logger.error('Failed to generate Post booking PDF:', error);
      logsAndErrorHandling('PdfService: generateOfficeUsePdf', error, {
        booking,
        fileName,
        smallPdfPaths,
      });
    }
  }

  /**
   *
   * @param pdfPath as string
   * @param name Applicant name
   * @param signaturePath Signature image path
   * @returns string
   * @description Places signature on the PDF at the bottom left corner with name and date.
   *
   */
  async placeSignature(pdfPath: string, name: string, signaturePath: string) {
    try {
      const pdfBuffer = await this.awsService.fetchFileFromS3(pdfPath);
      const signatureBuffer =
        await this.awsService.fetchFileFromS3(signaturePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
      });
      const signatureImage = await pdfDoc.embedPng(signatureBuffer);

      if (!signatureImage && !pdfBuffer) return pdfPath;

      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont('Helvetica');
      for (const page of pages) {
        // Draw signature image
        page.drawImage(signatureImage, {
          x: 41, // 50px from left
          y: 40, // 50px from bottom
          width: 100,
          height: 40,
        });

        // Draw a line below the signature
        page.drawLine({
          start: { x: 41, y: 35 },
          end: { x: 130, y: 35 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });

        // Draw the name below the line
        page.drawText(name, {
          x: 41,
          y: 25,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        });

        // Draw the date below the name
        const today = new Date();
        const zonedDate = toZonedTime(today, IST_TIME_ZONE);
        const dateStr = formatDate(zonedDate, 'dd/MM/yyyy hh:mm:ss a');
        page.drawText(`Date: ${dateStr}`, {
          x: 41,
          y: 15,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        });
      }

      const modifiedPdf = await pdfDoc.save();
      const passThroughStream = new PassThrough();
      passThroughStream.end(Buffer.from(modifiedPdf)); // Pass the buffer to the stream
      await this.awsService.uploadToS3(pdfPath, passThroughStream);
      return pdfPath;
    } catch (error) {
      logger.error('Failed to place signature in PDF:', error);
      logsAndErrorHandling('PdfService: placeSignature', error, {
        pdfPath,
        name,
        signaturePath,
      });
    }
  }

  /**
   * To generate voucher pdf
   * @param options as object
   * @returns Promise<any>
   * @description Generates the voucher form PDF.
   */
  async generateVoucherFormPDF(
    voucherId: string,
    smallPdfPaths: string[],
    hideEmailMobile?: boolean,
    skipMasking?: boolean,
    maskApplicantEmailMobile?: boolean,
  ): Promise<any> {
    try {
      const [mainPdf, docBuffer] = await Promise.all([
        this.generatePdf({
          url: `${this.configService.get<string>('API_BASE_URL')}vouchers/voucher-preview/${voucherId}?hideEmailMobile=${hideEmailMobile ? 'true' : 'false'}&skipMasking=${skipMasking ? 'true' : 'false'}&maskApplicantEmailMobile=${maskApplicantEmailMobile ? 'true' : 'false'}&t=${Date.now()}`,
          filePath: `voucher.pdf`,
        }),
        this.mergeMultiplePDFs(smallPdfPaths),
      ]);

      if (!smallPdfPaths || smallPdfPaths.length == 0)
        return mainPdf?.bufferPdf;

      const mergedPdfBuffer = await this.mergeWithMainPdf(
        mainPdf?.bufferPdf,
        docBuffer,
      );

      return mergedPdfBuffer;
    } catch (error) {
      logger.error('Failed to generate Referrer PDF:', error);
      logsAndErrorHandling('PdfService: generateVoucherFormPDF', error, {
        voucherId,
        smallPdfPaths,
      });
    }
  }
}
