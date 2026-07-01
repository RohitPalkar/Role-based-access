import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Brackets } from 'typeorm';
import puppeteer from 'puppeteer';
import { logger } from 'src/logger/logger';
import { IncentiveBooking, UserIncentivePayout } from '../../../entities/index';
import { UnitStatusEnum } from 'src/enums/booking-list.enums';
import {
  DATE_LOCALE,
  LONG_DATE_FORMAT,
  SHORT_DATE_FORMAT,
} from 'src/config/constants';
import * as ExcelJS from 'exceljs';

@Injectable()
export class IncentiveReportsGenerator {
  constructor(
    @InjectRepository(IncentiveBooking)
    private readonly incentiveBookingRepository: Repository<IncentiveBooking>,

    @InjectRepository(UserIncentivePayout)
    private readonly userIncentivePayoutRepo: Repository<UserIncentivePayout>,
  ) {}

  async generateData(userName: string, startDate: Date, endDate: Date) {
    try {
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;

      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;
      const incentiveBookings = await this.incentiveBookingRepository.find({
        where: [
          {
            unitStatus: In([
              UnitStatusEnum.QUALIFIED,
              UnitStatusEnum.QUALIFIED_CANCELLED,
            ]),

            paidDate: Between(startDate, endDate),
            user: { userName: userName },
          },
        ],
        relations: ['projectPhase', 'user'],
      });

      const totalIncentiveAmountResult = await this.userIncentivePayoutRepo
        .createQueryBuilder('payout')
        .select('SUM(payout.incentive_paid)', 'totalIncentiveAmount')
        .leftJoin('payout.user', 'user')
        .where('user.username = :userName', { userName })
        .andWhere(
          new Brackets((qb) => {
            if (startYear === endYear) {
              qb.where('payout.year = :year', { year: startYear }).andWhere(
                'payout.month BETWEEN :startMonth AND :endMonth',
                {
                  startMonth,
                  endMonth,
                },
              );
            } else {
              qb.where(
                new Brackets((qb) => {
                  qb.where('payout.year = :startYear', { startYear }).andWhere(
                    'payout.month >= :startMonth',
                    { startMonth },
                  );
                }),
              )
                .orWhere(
                  new Brackets((qb) => {
                    qb.where('payout.year = :endYear', { endYear }).andWhere(
                      'payout.month <= :endMonth',
                      { endMonth },
                    );
                  }),
                )
                .orWhere(
                  'payout.year > :startYear AND payout.year < :endYear',
                  {
                    startYear,
                    endYear,
                  },
                );
            }
          }),
        )
        .getRawOne();

      // Convert the result safely to a number
      const totalIncentiveAmount = Number(
        totalIncentiveAmountResult?.totalIncentiveAmount ?? 0,
      );
      if (!incentiveBookings.length) {
        logger.error(
          `No incentives found for ${userName} in ${startDate} ${endDate}`,
        );
        return null;
      }

      // Basic data for the top portion of the PDF.
      const empCode = incentiveBookings[0]?.user?.empCode || 'N/A';

      const formatReadableDate = (date: Date): string =>
        date.toLocaleDateString(DATE_LOCALE, SHORT_DATE_FORMAT);
      // Split into “qualified” (i.e., incentives) and “unregularized” arrays:
      const incentives = incentiveBookings.filter((booking) =>
        [UnitStatusEnum.QUALIFIED, UnitStatusEnum.QUALIFIED_CANCELLED].includes(
          booking.unitStatus,
        ),
      );

      // Totals for “Paid + Payable” (Qualified) section.
      const incentivesIncPayableTotal = incentives.reduce(
        (sum, b) => sum + b.incentiveAmount,
        0,
      );
      // Build the data object passed into the template.
      const data = {
        name: incentiveBookings[0]?.user?.name,
        empCode: empCode,
        // “Grand Total” here is the sum of agreement values, but you can customize as needed:
        grandTotal: totalIncentiveAmount
          ? totalIncentiveAmount.toLocaleString(DATE_LOCALE)
          : 0,
        // “Paid till” can be the sum of totalReceived:
        paidTill: incentives
          .reduce((sum, b) => sum + b.totalReceived, 0)
          .toLocaleString(DATE_LOCALE),
        // Next month’s “Payable Incentive” is the sum of unpaid amounts:
        payableAmount: incentives
          .reduce(
            (sum, b) =>
              b.paymentStatus !== 'Paid' ? sum + b.payableAmount : sum,
            0,
          )
          .toLocaleString(DATE_LOCALE),

        // Paid + Payable
        incentives: incentives.map((booking, i) => ({
          slNo: i + 1,
          projectName: booking.projectPhase?.name ?? 'N/A',
          customerName: booking.customerName ?? 'N/A',
          propertyNo: booking.propertyNumber ?? 'N/A',
          bookingDate: this.formatLongDate(booking.bookingDate) ?? 'N/A',
          agreementRced:
            this.formatLongDate(booking.agreementReceivedDate) ?? 'N/A',
          rced9_9Percent: this.formatLongDate(booking.receivedDate) ?? 'N/A',
          percentAmtRecd: booking.receivedPercent ?? 'N/A',
          qualifiedDate:
            this.formatLongDate(booking.payableReceivedDate) ?? 'N/A',
          agreementValue: booking.grossTotalValue ?? 0,
          incentivePercent: booking.incentivePercentage ?? 0,
          incPayable: booking.incentiveAmount ?? 0,
          unitStatus: booking.status ?? 'N/A',
          paidDate: this.formatLongDate(booking.paidDate) ?? 'N/A',
        })),
      };
      return { data, formatReadableDate, incentivesIncPayableTotal };
    } catch (error) {
      logger.error(`Error generating PDF: ${error}`);
      throw error;
    }
  }

  async generatePDFBuffer(
    userName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    try {
      const generatedData = await this.generateData(
        userName,
        startDate,
        endDate,
      );

      if (!generatedData) return null;

      // Now the cleaned-up HTML that matches the original screenshot design:
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Monthly Incentive Statement</title>
          <link
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
            rel="stylesheet"
            integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
            crossorigin="anonymous"
          />
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              padding: 15px;
            }
            h2 {
              font-size: 18px;
              text-align: center;
              margin-bottom: 20px;
            }
            .header {

              justify-content: space-between;
              margin-bottom: 5px;
            }
            .header p {
              margin: 2px 0;
              font-weight: bold;
            }
            .note {
              font-size: 14px;
              margin-bottom: 15px;
              line-height: 1.2;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 2px solid #000;
              padding: 4px;
              color: #000;
              text-align: center;
            }
            th {
              background-color: #AEAEAE;
              font-weight: bold;
            }
            .grand-total {
              font-weight: bold;
            }
            .bg{
            background-color: #AEAEAE;
            }
          </style>
        </head>
        <body>
          <!-- Top info row -->
          <div class="header" style="width: 100%">
            <div>
    <div class="d-flex">
     <p style="width: 120px;">Name :</p>
     <p>${generatedData.data.name}</p>
    </div>
  <div class="d-flex">
    <p style="width: 120px;">Emp. Code:</p>
    <p>${generatedData.data.empCode}</p>
  </div>
  <div class="d-flex justify-content-between" style="100%">

  <div class="d-flex">
    <p style="width: 120px;">Total Incentive Paid:</p>
    <p>₹${generatedData.data.grandTotal} [${generatedData.formatReadableDate(startDate)} to ${generatedData.formatReadableDate(endDate)}]</p>
  </div>
            <div class="note">
              <p><strong>NOTE :</strong> 1. Taxes will be applicable at actuals on your Paid incentives.</p>
            </div>
  </div>
</div>
          </div>

          <!-- Notes -->
          <!-- Paid + Payable - Cases -->
          <h5>Paid Cases</h5>
          <table>
            <thead class="bg">
              <tr>
                <th>Sl No</th>
                <th>Project Name</th>
                <th>Customer Name</th>
                <th>Flat No</th>
                <th>Booking Date</th>
                <th>Agreement Recd. Date</th>
                <th>Reg. % Recd. Date</th>
                <th>Amount Received %</th>
                <th>Qualified Date</th>
                <th>Agreement Value</th>
                <th>Incentive %</th>
                <th>Inc. Paid</th>
                <th>Unit Status</th>
              </tr>
            </thead>
            <tbody>
              ${generatedData.data.incentives
                .map(
                  (item) => `
                  <tr>
                    <td>${item.slNo}</td>
                    <td>${item.projectName}</td>
                    <td>${item.customerName}</td>
                    <td>${item.propertyNo}</td>
                    <td>${item.bookingDate}</td>
                    <td>${item.agreementRced}</td>
                    <td>${item.rced9_9Percent}</td>
                    <td>${item.percentAmtRecd}%</td>
                    <td>${item.qualifiedDate}</td>
                    <td>₹${item.agreementValue.toLocaleString(DATE_LOCALE)}</td>
                    <td>${item.incentivePercent}%</td>
                    <td>₹${item.incPayable.toLocaleString(DATE_LOCALE)}</td>
                    <td>${item.unitStatus}</td>
                  </tr>
                `,
                )
                .join('')}
              <tr class="grand-total">
                <td colspan="11" style="text-align: right;">Grand Total</td>
                <td>₹${generatedData.incentivesIncPayableTotal.toLocaleString(DATE_LOCALE)}</td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `;

      // Generate PDF via puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdfBuffer = await page.pdf({
        // format: 'A4',
        landscape: true,
        printBackground: true,
      });
      await browser.close();

      return Buffer.from(pdfBuffer);
    } catch (error) {
      logger.error(`Error generating PDF: ${error}`);
      throw error;
    }
  }

  async generateExcelBuffer(
    userName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    try {
      const generatedData = await this.generateData(
        userName,
        startDate,
        endDate,
      );

      if (!generatedData) return null;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Incentive Report');

      worksheet.columns = [
        { header: 'Sl No', key: 'slNo', width: 6 },
        { header: 'Project Name', key: 'projectName', width: 20 },
        { header: 'Customer Name', key: 'customerName', width: 20 },
        { header: 'Flat No', key: 'propertyNo', width: 12 },
        { header: 'Booking Date', key: 'bookingDate', width: 15 },
        { header: 'Agreement Recd. Date', key: 'agreementRced', width: 20 },
        { header: 'Reg. % Recd. Date', key: 'rced9_9Percent', width: 20 },
        { header: 'Amount Received %', key: 'percentAmtRecd', width: 18 },
        { header: 'Qualified Date', key: 'qualifiedDate', width: 18 },
        { header: 'Agreement Value', key: 'agreementValue', width: 18 },
        { header: 'Incentive %', key: 'incentivePercent', width: 14 },
        { header: 'Inc. Paid', key: 'incPayable', width: 14 },
        { header: 'Unit Status', key: 'unitStatus', width: 15 },
      ];

      generatedData.data.incentives.forEach((item) => {
        worksheet.addRow({
          slNo: item.slNo,
          projectName: item.projectName,
          customerName: item.customerName || 'N/A',
          propertyNo: item.propertyNo || 'N/A',
          bookingDate: item.bookingDate,
          agreementRced: item.agreementRced,
          rced9_9Percent: item.rced9_9Percent,
          percentAmtRecd: item.percentAmtRecd ?? '',
          qualifiedDate: item.qualifiedDate,
          agreementValue: item.agreementValue ?? '',
          incentivePercent: item.incentivePercent ?? '',
          incPayable: item.incPayable ?? '',
          unitStatus: item.unitStatus ?? 'N/A',
        });
      });

      const totalRow = worksheet.addRow([]);
      const rowNum = totalRow.number;

      worksheet.getCell(`A${rowNum}`).value = 'Grand Total';
      worksheet.getCell(`L${rowNum}`).value =
        generatedData.incentivesIncPayableTotal.toLocaleString(DATE_LOCALE); // 12 = Column L

      // Merge from column A to column K (or adjust range as needed)
      worksheet.mergeCells(`A${rowNum}:K${rowNum}`);

      worksheet.getRow(rowNum).font = { bold: true };
      worksheet.getRow(rowNum).alignment = { horizontal: 'left' };

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      logger.error(`Error generating Excel: ${error}`);
      throw error;
    }
  }

  // Formats a Date object into a long date string (e.g., "March 01, 2025").
  private formatLongDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString(DATE_LOCALE, LONG_DATE_FORMAT);
  }
}
