import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ExportIomExcelDto } from './export-iom-excel.dto';

describe('ExportIomExcelDto', () => {
  it('accepts array multiselect filters', async () => {
    const instance = plainToInstance(ExportIomExcelDto, {
      iomStatus: ['CRM_TL_APPROVAL_PENDING', 'IOM_CLOSED'],
      invoiceStatus: ['PENDING', 'APPROVED'],
      projects: [10, 11],
      fields: ['iomNo', 'projectName'],
    });

    const errors = await validate(instance);
    expect(errors).toEqual([]);
    expect(instance.iomStatus).toEqual([
      'CRM_TL_APPROVAL_PENDING',
      'IOM_CLOSED',
    ]);
    expect(instance.invoiceStatus).toEqual(['PENDING', 'APPROVED']);
    expect(instance.projects).toEqual([10, 11]);
  });

  it('rejects non-array iomStatus', async () => {
    const instance = plainToInstance(ExportIomExcelDto, {
      iomStatus: 'CRM_TL_APPROVAL_PENDING',
    });
    const errors = await validate(instance);
    expect(errors.some((error) => error.property === 'iomStatus')).toBe(true);
  });

  it('rejects non-array invoiceStatus', async () => {
    const instance = plainToInstance(ExportIomExcelDto, {
      invoiceStatus: 'PENDING',
    });
    const errors = await validate(instance);
    expect(errors.some((error) => error.property === 'invoiceStatus')).toBe(
      true,
    );
  });

  it('rejects non-integer project ids', async () => {
    const instance = plainToInstance(ExportIomExcelDto, {
      projects: [10, 'abc'],
    });
    const errors = await validate(instance);
    expect(errors.some((error) => error.property === 'projects')).toBe(true);
  });
});
