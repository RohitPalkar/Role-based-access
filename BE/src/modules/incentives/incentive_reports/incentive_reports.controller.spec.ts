import { BadRequestException } from '@nestjs/common';
import { IncentiveReportsController } from './incentive_reports.controller';
import { RolesEnum } from 'src/enums/roles.enum';
import { reportFormat } from 'src/enums/report-format.enum';

describe('IncentiveReportsController', () => {
  let controller: IncentiveReportsController;

  const mockIncentiveReportsService = {
    generateCustomReport: jest.fn(),
  };

  beforeEach(() => {
    mockIncentiveReportsService.generateCustomReport.mockReset();
    controller = new IncentiveReportsController(
      mockIncentiveReportsService as any,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateCustomReport - validation', () => {
    it('should throw BadRequestException for invalid startDate/endDate', async () => {
      const user = { role: RolesEnum.RM, dbId: 1 };
      await expect(
        controller.generateCustomReport(
          user,
          'invalid-date',
          '2025-05-01',
          '1',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.generateCustomReport(user, '2025-05-01', 'not-a-date', '1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when start and end dates are in different financial years', async () => {
      // start in FY 2024 (e.g., March 2025 => FY 2024) and end in FY 2025 (e.g., April 2025 => FY 2025)
      const user = { role: RolesEnum.RM, dbId: 1 };
      const start = '2025-03-31'; // FY 2024 (month 3 => FY = year - 1)
      const end = '2025-04-01'; // FY 2025 (month 4 => FY = year)
      await expect(
        controller.generateCustomReport(user, start, end, '1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateCustomReport - happy paths', () => {
    it('should call service.generateCustomReport with RM user dbId and default format', async () => {
      const user = { role: RolesEnum.RM, dbId: 10 };
      const start = '2025-04-01';
      const end = '2025-06-30';
      const mockResult = { success: true };
      mockIncentiveReportsService.generateCustomReport.mockResolvedValue(
        mockResult,
      );

      const result = await controller.generateCustomReport(
        user,
        start,
        end,
        '',
      );

      expect(result).toEqual(mockResult);
      expect(
        mockIncentiveReportsService.generateCustomReport,
      ).toHaveBeenCalledWith(
        10,
        new Date(start),
        new Date(end),
        reportFormat.PDF,
      );
    });

    it('should call service.generateCustomReport with admin-provided rmId (string) converted to number and provided format', async () => {
      const user = { role: RolesEnum.ADMIN };
      const start = '2025-04-01';
      const end = '2025-07-31';
      const rmId = '42';
      const format = reportFormat.PDF; // you can change to other formats if needed
      const mockResult = { success: true, rmIdUsed: 42 };
      mockIncentiveReportsService.generateCustomReport.mockResolvedValue(
        mockResult,
      );

      const result = await controller.generateCustomReport(
        user,
        start,
        end,
        rmId,
        format,
      );

      expect(result).toEqual(mockResult);
      expect(
        mockIncentiveReportsService.generateCustomReport,
      ).toHaveBeenCalledWith(42, new Date(start), new Date(end), format);
    });

    it('should accept different format values and pass them through', async () => {
      const user = { role: RolesEnum.ADMIN };
      const start = '2025-04-01';
      const end = '2025-04-30';
      const rmId = '7';
      const format = reportFormat.PDF; // or any other supported format
      const mockResult = { ok: true };
      mockIncentiveReportsService.generateCustomReport.mockResolvedValue(
        mockResult,
      );

      const result = await controller.generateCustomReport(
        user,
        start,
        end,
        rmId,
        format,
      );

      expect(result).toEqual(mockResult);
      expect(
        mockIncentiveReportsService.generateCustomReport,
      ).toHaveBeenCalledWith(7, new Date(start), new Date(end), format);
    });
  });
});
