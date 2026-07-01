import { it, expect, describe } from 'vitest';

import { paths } from 'src/routes/paths';

import { ROLES } from './constant';
import { getProfileSettingsPath, getRoleSignatureSectionTitle } from './profile-settings-path';

describe('getProfileSettingsPath', () => {
  it('resolves rm-panel profile settings', () => {
    expect(getProfileSettingsPath('/rm-panel/dashboard')).toBe(paths.profile.settings);
  });

  it('resolves crm profile settings', () => {
    expect(getProfileSettingsPath('/crm/iom-management')).toBe(paths.crm.profile.settings);
  });

  it('resolves crm-tl before crm prefix', () => {
    expect(getProfileSettingsPath('/crm-tl/iom-management')).toBe(paths.crmTl.profile.settings);
  });

  it('resolves crm-head before crm prefix', () => {
    expect(getProfileSettingsPath('/crm-head/iom-management')).toBe(paths.crmHead.profile.settings);
  });

  it('returns undefined for roles without profile settings', () => {
    expect(getProfileSettingsPath('/admin/dashboard')).toBeUndefined();
  });
});

describe('getRoleSignatureSectionTitle', () => {
  it('returns RM signature title for RM role', () => {
    expect(getRoleSignatureSectionTitle(ROLES.RM)).toBe("RM's Signature");
  });

  it('returns CRM signature title for CRM role', () => {
    expect(getRoleSignatureSectionTitle(ROLES.CRM)).toBe("CRM's Signature");
  });

  it('returns Finance User signature title', () => {
    expect(getRoleSignatureSectionTitle(ROLES.FINANCE_USER)).toBe("Finance User's Signature");
  });

  it('falls back to User when role is missing', () => {
    expect(getRoleSignatureSectionTitle()).toBe("User's Signature");
  });
});
