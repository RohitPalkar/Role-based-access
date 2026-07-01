import { RolesEnum } from 'src/enums/roles.enum';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import { getAllowedIomStatusesByRole } from './iom-role-status.util';

describe('getAllowedIomStatusesByRole', () => {
  it.each([RolesEnum.CRM, RolesEnum.CRM_TL, RolesEnum.ADMIN])(
    'returns undefined for unrestricted role %s',
    (role) => {
      expect(getAllowedIomStatusesByRole(role)).toBeUndefined();
    },
  );

  it('returns CRM Head bucket statuses at TL_APPROVED and above', () => {
    const statuses = getAllowedIomStatusesByRole(RolesEnum.CRM_HEAD);

    expect(statuses).toContain(IomStatusCodeEnum.TL_APPROVED);
    expect(statuses).toContain(IomStatusCodeEnum.CRM_HEAD_REJECTED);
    expect(statuses).not.toContain(IomStatusCodeEnum.IOM_CREATED);
  });

  it('returns Finance User bucket statuses at FINANCE_VERIFICATION_PENDING and above', () => {
    const statuses = getAllowedIomStatusesByRole(RolesEnum.FINANCE_USER);

    expect(statuses).toContain(IomStatusCodeEnum.FINANCE_VERIFICATION_PENDING);
    expect(statuses).toContain(IomStatusCodeEnum.FINANCE_REJECTED);
    expect(statuses).not.toContain(IomStatusCodeEnum.CRM_HEAD_APPROVED);
  });

  it('returns Finance Head bucket statuses at FINANCE_VERIFIED and above', () => {
    const statuses = getAllowedIomStatusesByRole(RolesEnum.FINANCE_HEAD);

    expect(statuses).toContain(IomStatusCodeEnum.FINANCE_VERIFIED);
    expect(statuses).toContain(IomStatusCodeEnum.IOM_CLOSED);
    expect(statuses).not.toContain(
      IomStatusCodeEnum.FINANCE_VERIFICATION_PENDING,
    );
  });

  it('returns explicit Loyalty bucket statuses', () => {
    const statuses = getAllowedIomStatusesByRole(RolesEnum.LOYALTY);

    expect(statuses).toEqual([
      IomStatusCodeEnum.POINTS_TO_BE_UPLOADED,
      IomStatusCodeEnum.POINTS_UPLOADED,
      IomStatusCodeEnum.INVOICE_SUBMITTED,
      IomStatusCodeEnum.INVOICE_REQUESTED,
      IomStatusCodeEnum.IOM_CLOSED,
    ]);
  });
});
