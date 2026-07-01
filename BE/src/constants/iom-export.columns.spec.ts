import { BadRequestException } from '@nestjs/common';

import { RolesEnum } from 'src/enums/roles.enum';
import {
  getRoleAllowedExportColumnKeys,
  IOM_EXPORT_BASE_COLUMN_KEYS,
  resolveExportColumns,
} from './iom-export.columns';

describe('getRoleAllowedExportColumnKeys', () => {
  it('returns base columns for unlisted roles', () => {
    expect(getRoleAllowedExportColumnKeys(RolesEnum.CRM)).toEqual([
      ...IOM_EXPORT_BASE_COLUMN_KEYS,
    ]);
  });

  it('adds crmCreatedByName for CRM TL', () => {
    const keys = getRoleAllowedExportColumnKeys(RolesEnum.CRM_TL);
    expect(keys).toContain('crmCreatedByName');
    expect(keys).not.toContain('crmVerifiedByName');
  });

  it('adds crmCreatedByName and crmVerifiedByName for CRM Head', () => {
    const keys = getRoleAllowedExportColumnKeys(RolesEnum.CRM_HEAD);
    expect(keys).toEqual([
      ...IOM_EXPORT_BASE_COLUMN_KEYS,
      'crmCreatedByName',
      'crmVerifiedByName',
    ]);
  });

  it('adds finance approval columns for Loyalty', () => {
    const keys = getRoleAllowedExportColumnKeys(RolesEnum.LOYALTY);
    expect(keys).toContain('financeApprovedByName');
    expect(keys).toContain('financeVerifiedByName');
    expect(keys).toContain('crmApprovedByName');
  });
});

describe('resolveExportColumns', () => {
  it('returns role-based default columns for CRM', () => {
    const columns = resolveExportColumns(undefined, RolesEnum.CRM);
    const keys = columns.map((column) => column.key);

    expect(keys).toEqual([...IOM_EXPORT_BASE_COLUMN_KEYS]);
    expect(keys).not.toContain('crmCreatedByName');
    expect(keys).not.toContain('statusCode');
  });

  it('returns role-based default columns when fields is empty', () => {
    const columns = resolveExportColumns([], RolesEnum.CRM_TL);
    const keys = columns.map((column) => column.key);

    expect(keys).toEqual([...IOM_EXPORT_BASE_COLUMN_KEYS, 'crmCreatedByName']);
  });

  it('includes CRM TL role columns by default', () => {
    const columns = resolveExportColumns(undefined, RolesEnum.CRM_TL);
    const keys = columns.map((column) => column.key);

    expect(keys).toContain('crmCreatedByName');
    expect(keys).not.toContain('crmVerifiedByName');
  });

  it('excludes financeVerifiedByName for Finance User by default', () => {
    const columns = resolveExportColumns(undefined, RolesEnum.FINANCE_USER);
    const keys = columns.map((column) => column.key);

    expect(keys).toContain('crmApprovedByName');
    expect(keys).not.toContain('financeVerifiedByName');
  });

  it('returns only requested columns that pass role gate', () => {
    const columns = resolveExportColumns(
      ['iomNo', 'statusLabel', 'crmCreatedByName'],
      RolesEnum.CRM_TL,
    );
    const keys = columns.map((column) => column.key);

    expect(keys).toEqual(['iomNo', 'statusLabel', 'crmCreatedByName']);
  });

  it('silently drops role-disallowed fields', () => {
    const columns = resolveExportColumns(
      ['financeApprovedByName', 'iomNo'],
      RolesEnum.CRM_TL,
    );
    const keys = columns.map((column) => column.key);

    expect(keys).toEqual(['iomNo']);
  });

  it('drops statusCode when explicitly requested but not allowed for role', () => {
    const columns = resolveExportColumns(['statusCode'], RolesEnum.CRM);
    const keys = columns.map((column) => column.key);

    expect(keys).toEqual([]);
  });

  it('throws BadRequestException for unknown fields', () => {
    expect(() => resolveExportColumns(['notAField'], RolesEnum.CRM)).toThrow(
      BadRequestException,
    );
  });

  it('preserves deterministic ordering for default CRM Head export', () => {
    const columns = resolveExportColumns(undefined, RolesEnum.CRM_HEAD);
    const keys = columns.map((column) => column.key);

    expect(keys).toEqual([
      ...IOM_EXPORT_BASE_COLUMN_KEYS,
      'crmCreatedByName',
      'crmVerifiedByName',
    ]);
  });
});
