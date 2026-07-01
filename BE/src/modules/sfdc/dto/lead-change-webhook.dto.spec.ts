import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { LeadChangeWebhookDto } from './lead-change-webhook.dto';

describe('LeadChangeWebhookDto', () => {
  describe('@Transform trim + empty-to-null normalization', () => {
    it('trims whitespace from prid and optional string fields', () => {
      const instance = plainToInstance(LeadChangeWebhookDto, {
        prid: '  PRID-001  ',
        leadStatus: '  Hot  ',
      });

      expect(instance.prid).toBe('PRID-001');
      expect(instance.leadStatus).toBe('Hot');
    });

    it('normalizes whitespace-only optional values to null', () => {
      const instance = plainToInstance(LeadChangeWebhookDto, {
        prid: 'PRID-001',
        leadStatus: '   ',
        primarySource: '',
      });

      expect(instance.leadStatus).toBeNull();
      expect(instance.primarySource).toBeNull();
    });

    it('preserves non-string optional values untouched by trim', () => {
      const instance = plainToInstance(LeadChangeWebhookDto, {
        prid: 'PRID-001',
        leadStatus: 42 as unknown as string,
      });

      expect(instance.leadStatus).toBe(42);
    });
  });

  describe('class-validator integration', () => {
    it('reports no errors when a valid payload is provided', async () => {
      const instance = plainToInstance(LeadChangeWebhookDto, {
        prid: 'PRID-001',
        leadStatus: 'Hot',
        svhStatus: 'SVH-Y',
        primarySource: 'Web',
        secondarySource: 'Campaign',
        tertiarySource: 'Email',
        channelPartnerName: 'Acme CP',
        referrerName: 'Jane Ref',
        referrerProjectName: 'Tower One',
        referrerUnitNo: 'A-1201',
        referredOpportunity: 'OPP-9',
        referredEmployee: 'EMP-4',
        leadOwner: 'Owner X',
        stm2: 'STM2-VAL',
      });

      const errors = await validate(instance);

      expect(errors).toEqual([]);
    });

    it('reports a validation error on prid when missing', async () => {
      const instance = plainToInstance(LeadChangeWebhookDto, {
        leadStatus: 'Hot',
      });

      const errors = await validate(instance);

      const pridError = errors.find((error) => error.property === 'prid');

      expect(pridError).toBeDefined();
      expect(Object.values(pridError?.constraints ?? {}).join(' ')).toMatch(
        /PRID/i,
      );
    });

    it('reports a validation error on prid when empty', async () => {
      const instance = plainToInstance(LeadChangeWebhookDto, {
        prid: '   ',
      });

      const errors = await validate(instance);

      const pridError = errors.find((error) => error.property === 'prid');

      expect(pridError).toBeDefined();
    });
  });
});
