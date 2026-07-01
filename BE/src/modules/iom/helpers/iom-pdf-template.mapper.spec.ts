import * as fs from 'fs/promises';

import { Iom } from '../entities/iom.entity';
import { IomDetailExtras } from '../services/iom-crm.service';
import {
  IomSignatoryBlock,
  IomSignatoryInfo,
} from '../types/iom-signatory.interface';
import {
  buildIomDetailsTemplateVars,
  buildReferralEditReasonTemplateVars,
  loadTemplate,
} from './iom-pdf-template.mapper';

jest.mock('fs/promises');

const emptySignatory = (role: IomSignatoryInfo['role']): IomSignatoryInfo => ({
  role,
  userId: null,
  name: null,
  signature: null,
  signedAt: null,
  hasActed: false,
  signatureMissing: false,
});

const filledSignatory = (role: IomSignatoryInfo['role']): IomSignatoryInfo => ({
  role,
  userId: 1,
  name: 'Jane Doe',
  signature: 'sig.png',
  signedAt: new Date('2026-06-19'),
  hasActed: true,
  signatureMissing: false,
});

const baseExtras = (): IomDetailExtras => ({
  statusCode: 'CRM_TL_APPROVAL_PENDING',
  sourceInSAP: null,
  customerProjectName: 'Project A',
  customerProjectLocation: 'City',
  customerBookingDate: '2026-06-15',
  referrerProjectName: 'Project B',
  referrerUnitNo: '101',
  referrerBookingDate: '2026-06-10',
  referrerProjectLocation: 'Town',
});

const baseSignatories = (
  overrides: Partial<IomSignatoryBlock> = {},
): IomSignatoryBlock => ({
  crm: filledSignatory('CRM'),
  crmTl: emptySignatory('CRM TL'),
  crmHead: emptySignatory('CRM Head'),
  financeVerifier: emptySignatory('Finance Verifier'),
  financeApprover: emptySignatory('Finance Approver'),
  ...overrides,
});

describe('iom-pdf-template.mapper', () => {
  describe('buildIomDetailsTemplateVars', () => {
    it('blanks signatory placeholders when userId is null', () => {
      const vars = buildIomDetailsTemplateVars(
        { iomNo: 'IOM-1' } as Iom,
        baseExtras(),
        baseSignatories(),
        'https://s3.example.com',
      );

      expect(vars.preparedByName).toBe('Jane Doe');
      expect(vars.preparedByRole).toBe('CRM');
      expect(vars.preparedBySignatureUrl).toContain('sig.png');

      expect(vars.verifiedByName).toBe('');
      expect(vars.verifiedByRole).toBe('');
      expect(vars.verifiedBySignatureUrl).toBe('');
      expect(vars.approvedByName).toBe('');
      expect(vars.financeVerifiedByName).toBe('');
      expect(vars.financeApprovedByName).toBe('');
    });

    it('formats PDF dates as DD-MM-YYYY', () => {
      const vars = buildIomDetailsTemplateVars(
        {
          iomNo: 'IOM-1',
          submittedAt: new Date('2026-06-19T10:00:00Z'),
          createdAt: new Date('2026-06-18T10:00:00Z'),
          agreementDate: new Date('2026-06-17T10:00:00Z'),
        } as Iom,
        baseExtras(),
        baseSignatories(),
        'https://s3.example.com',
      );

      expect(vars.iomCreatedAt).toMatch(/^\d{2}-\d{2}-\d{4}$/);
      expect(vars.createdAt).toMatch(/^\d{2}-\d{2}-\d{4}$/);
      expect(vars.agreementDone).toMatch(/^\d{2}-\d{2}-\d{4}$/);
      expect(vars.referrerBookingDate).toMatch(/^\d{2}-\d{2}-\d{4}$/);
      expect(vars.refereeBookingDate).toMatch(/^\d{2}-\d{2}-\d{4}$/);
    });

    it('uses No for agreementDone when agreementDate is absent', () => {
      const vars = buildIomDetailsTemplateVars(
        { iomNo: 'IOM-1', agreementDate: null } as Iom,
        baseExtras(),
        baseSignatories(),
        'https://s3.example.com',
      );

      expect(vars.agreementDone).toBe('No');
    });

    it('renders missing scalar data fields as dash', () => {
      const vars = buildIomDetailsTemplateVars(
        {
          iomNo: null,
          bpCode: null,
          salePrice: null,
          brokeragePercentage: null,
          totalBrokerageAmount: null,
          referrerPoints: null,
          refereePoints: null,
          referralSplitType: null,
          sourceInSalesForce: null,
          referrerPaid: null,
          refereePaid: null,
          submittedAt: null,
          createdAt: null,
        } as unknown as Iom,
        {
          ...baseExtras(),
          customerProjectName: null,
          customerProjectLocation: null,
          customerBookingDate: null,
          referrerProjectName: null,
          referrerUnitNo: null,
          referrerBookingDate: null,
          referrerProjectLocation: null,
        },
        baseSignatories(),
        'https://s3.example.com',
      );

      expect(vars.iomNo).toBe('-');
      expect(vars.bpCode).toBe('-');
      expect(vars.basicSalePrice).toBe('-');
      expect(vars.brokeragePercent).toBe('-');
      expect(vars.brokerageAmount).toBe('-');
      expect(vars.pointsToReferrer).toBe('-');
      expect(vars.pointsToReferee).toBe('-');
      expect(vars.refereeProject).toBe('-');
      expect(vars.iomCreatedAt).toBe('-');
      expect(vars.createdAt).toBe('-');
    });

    it('keeps businessException blank when no edit reason', () => {
      const vars = buildIomDetailsTemplateVars(
        { iomNo: 'IOM-1', referralPointsEditReason: null } as Iom,
        baseExtras(),
        baseSignatories(),
        'https://s3.example.com',
      );

      expect(vars.businessException).toBe('');
    });
  });

  describe('buildReferralEditReasonTemplateVars', () => {
    it('formats editedAt as DD-MM-YYYY', () => {
      const vars = buildReferralEditReasonTemplateVars({
        iomNo: 'IOM-1',
        referralPointsEditReason: 'Adjusted',
        referralPointsEditedAt: new Date('2026-06-19T10:00:00Z'),
      } as Iom);

      expect(vars.editedAt).toMatch(/^\d{2}-\d{2}-\d{4}$/);
    });

    it('populates editedByName when editor relation is present', () => {
      const vars = buildReferralEditReasonTemplateVars({
        iomNo: 'IOM-1',
        referralPointsEditReason: 'Adjusted',
        referralPointsEditor: { name: 'Jane Editor' },
      } as Iom);

      expect(vars.editedByName).toBe('Jane Editor');
    });

    it('leaves editedByName as dash when editor relation is absent', () => {
      const vars = buildReferralEditReasonTemplateVars({
        iomNo: 'IOM-1',
        referralPointsEditReason: 'Adjusted',
      } as Iom);

      expect(vars.editedByName).toBe('-');
    });
  });

  describe('loadTemplate', () => {
    it('returns HTML string only', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('<html>test</html>');

      const html = await loadTemplate('iom-details-pdf.html');

      expect(html).toBe('<html>test</html>');
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });
  });
});
