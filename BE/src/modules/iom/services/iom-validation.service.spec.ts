import { HttpException } from '@nestjs/common';
import {
  AuthenticatedUser,
  IomValidationService,
} from './iom-validation.service';
import { Iom } from '../entities/iom.entity';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';

describe('IomValidationService', () => {
  // The `projectUserMappingRepo` is only consulted by
  // `assertProjectAccess`; the rest of the surface area covered here
  // is purely synchronous validation, so a sentinel value is fine.
  const service = new IomValidationService(undefined as never);

  const user: AuthenticatedUser = {
    dbId: 7,
    role: 'CRM',
    crmProjects: [1, 2, 3],
  };

  const expectCode = (err: unknown, code: IomErrorCodeEnum) => {
    expect(err).toBeInstanceOf(HttpException);
    const body = (err as HttpException).getResponse() as {
      code: IomErrorCodeEnum;
    };
    expect(body.code).toBe(code);
  };

  describe('assertProjectAccess', () => {
    it('passes when projectId is in user.crmProjects', () => {
      expect(() => service.assertProjectAccess(user, 2)).not.toThrow();
    });

    it('throws UNAUTHORIZED_PROJECT_ACCESS for foreign project', () => {
      try {
        service.assertProjectAccess(user, 99);
        fail('expected throw');
      } catch (e) {
        expectCode(e, IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS);
      }
    });

    it('throws UNAUTHORIZED_PROJECT_ACCESS when projectId is null', () => {
      try {
        service.assertProjectAccess(user, null);
        fail('expected throw');
      } catch (e) {
        expectCode(e, IomErrorCodeEnum.UNAUTHORIZED_PROJECT_ACCESS);
      }
    });

    it('throws when user has no project mappings at all', () => {
      const blankUser: AuthenticatedUser = { dbId: 1, crmProjects: [] };
      try {
        service.assertProjectAccess(blankUser, 1);
        fail('expected throw');
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(403);
      }
    });
  });

  describe('assertMandatoryForSubmission', () => {
    const validIom: Partial<Iom> = {
      salePrice: 100,
      totalBrokerageAmount: 5,
      customerMobile: '9999999999',
      referralClassification: 'CLASS_A',
      referralSplitType: 'EQUAL',
      referrerPoints: 10,
      refereePoints: 5,
    };

    it('does not throw for a fully populated IOM', () => {
      expect(() =>
        service.assertMandatoryForSubmission(validIom as Iom),
      ).not.toThrow();
    });

    it('reports every missing field in one go', () => {
      const broken: Partial<Iom> = {
        salePrice: 0,
        totalBrokerageAmount: -1,
        customerMobile: '   ',
        referralClassification: '',
        referralSplitType: '',
        referrerPoints: 0,
        refereePoints: 0,
      };
      try {
        service.assertMandatoryForSubmission(broken as Iom);
        fail('expected throw');
      } catch (e) {
        const body = (e as HttpException).getResponse() as {
          code: IomErrorCodeEnum;
          details: { missing: string[] };
        };
        expect(body.code).toBe(IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
        expect(body.details.missing).toEqual(
          expect.arrayContaining([
            'salePrice',
            'totalBrokerageAmount',
            'customerMobile',
            'referralClassification',
            'referralSplitType',
            'referrerPoints+refereePoints',
          ]),
        );
      }
    });

    it('accepts referrerPoints=0 / refereePoints=0 when the IOM is in deviation mode', () => {
      // `brokerage_adj_non_loyalty = 1` ⇒ the CRM has explicitly
      // deviated from the system formula. A zero-point allocation is
      // a legitimate override (e.g. cancel-out brokerage adjustment).
      const deviated: Partial<Iom> = {
        salePrice: 8_000_000,
        totalBrokerageAmount: 160000,
        customerMobile: '9999999999',
        referralClassification: 'CLASS_A',
        referralSplitType: 'other',
        referrerPoints: 0,
        refereePoints: 0,
        brokerageAdjNonLoyalty: 1,
      };
      expect(() =>
        service.assertMandatoryForSubmission(deviated as Iom),
      ).not.toThrow();
    });
  });

  describe('assertCrmEditWhitelist', () => {
    it('accepts the documented inputs + flags + derived set', () => {
      expect(() =>
        service.assertCrmEditWhitelist({
          salePrice: 1,
          brokeragePercentage: 2,
          referralPointsRatio: '1:1',
          salePriceEdited: true,
          brokeragePercentageEdited: false,
          referralPointsRatioEdited: true,
          referralPointsEditReason: null,
          totalBrokerageAmount: 1,
          referrerPoints: 1,
          refereePoints: 1,
        }),
      ).not.toThrow();
    });

    it('rejects anything outside the whitelist', () => {
      try {
        service.assertCrmEditWhitelist({
          salePrice: 1,
          status: 'IOM_APPROVED',
          createdBy: 99,
        });
        fail('expected throw');
      } catch (e) {
        const body = (e as HttpException).getResponse() as {
          code: IomErrorCodeEnum;
          details: { offenders: string[] };
        };
        expect(body.code).toBe(IomErrorCodeEnum.DISALLOWED_FIELD_IN_PAYLOAD);
        expect(body.details.offenders.sort()).toEqual(['createdBy', 'status']);
      }
    });

    it('rejects snake_case field names (camelCase is the contract)', () => {
      try {
        service.assertCrmEditWhitelist({
          sale_price: 1,
          brokerage_percentage: 2,
        });
        fail('expected throw');
      } catch (e) {
        const body = (e as HttpException).getResponse() as {
          code: IomErrorCodeEnum;
          details: { offenders: string[] };
        };
        expect(body.code).toBe(IomErrorCodeEnum.DISALLOWED_FIELD_IN_PAYLOAD);
        expect(body.details.offenders.sort()).toEqual([
          'brokerage_percentage',
          'sale_price',
        ]);
      }
    });

    it('accepts referrerRatio / refereeRatio for the "other" split-type contract', () => {
      // Explicit numeric ratios are now part of the contract when the
      // FE selects `referralPointsRatio === "other"` AND deviation is
      // false (the literal "other" wire marker has no parseable X:Y so
      // the FE must communicate the split numbers explicitly).
      expect(() =>
        service.assertCrmEditWhitelist({
          referralPointsRatio: 'other',
          referrerRatio: 0.6,
          refereeRatio: 0.4,
        }),
      ).not.toThrow();
    });
  });

  describe('assertCrmEditInputs', () => {
    const ok = {
      salePrice: 10_000_000,
      brokeragePercentage: 2.5,
      referrerRatio: 1,
      refereeRatio: 1,
      maxBrokeragePercentage: 5,
    };

    it('passes for a well-formed payload', () => {
      expect(() => service.assertCrmEditInputs(ok)).not.toThrow();
    });

    it('accepts one-sided splits like "2:0" and "0:2"', () => {
      expect(() =>
        service.assertCrmEditInputs({
          ...ok,
          referrerRatio: 2,
          refereeRatio: 0,
        }),
      ).not.toThrow();
      expect(() =>
        service.assertCrmEditInputs({
          ...ok,
          referrerRatio: 0,
          refereeRatio: 2,
        }),
      ).not.toThrow();
    });

    it('aggregates salePrice + brokerage + ratio failures', () => {
      try {
        service.assertCrmEditInputs({
          salePrice: -1,
          brokeragePercentage: 0,
          referrerRatio: 0,
          refereeRatio: 0,
          maxBrokeragePercentage: 5,
        });
        fail('expected throw');
      } catch (e) {
        const body = (e as HttpException).getResponse() as {
          code: IomErrorCodeEnum;
          details: { failures: string[] };
        };
        expect(body.code).toBe(IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
        expect(body.details.failures.length).toBeGreaterThanOrEqual(3);
        expect(body.details.failures.join('|')).toMatch(/salePrice/);
        expect(body.details.failures.join('|')).toMatch(/brokeragePercentage/);
        expect(body.details.failures.join('|')).toMatch(/referralPointsRatio/);
      }
    });

    it('rejects "0:0" as a no-allocation ratio', () => {
      try {
        service.assertCrmEditInputs({
          ...ok,
          referrerRatio: 0,
          refereeRatio: 0,
        });
        fail('expected throw');
      } catch (e) {
        const body = (e as HttpException).getResponse() as {
          code: IomErrorCodeEnum;
          details: { failures: string[] };
        };
        expect(body.code).toBe(IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
        expect(body.details.failures.join('|')).toMatch(/"0:0"/);
      }
    });

    it('rejects brokeragePercentage above the project ceiling', () => {
      try {
        service.assertCrmEditInputs({
          ...ok,
          brokeragePercentage: 6,
          maxBrokeragePercentage: 5,
        });
        fail('expected throw');
      } catch (e) {
        expectCode(e, IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
      }
    });

    it('skips ratio validation in deviation mode (null components are valid)', () => {
      // In deviation mode the ratio concept does not apply - both
      // components are persisted as `null` to `ioms.referrer_ratio` /
      // `ioms.referee_ratio`. The validator must tolerate this.
      expect(() =>
        service.assertCrmEditInputs({
          ...ok,
          referrerRatio: null,
          refereeRatio: null,
          deviation: true,
        }),
      ).not.toThrow();
    });

    it('still rejects "0:0" outside of deviation mode', () => {
      try {
        service.assertCrmEditInputs({
          ...ok,
          referrerRatio: 0,
          refereeRatio: 0,
          deviation: false,
        });
        fail('expected throw');
      } catch (e) {
        expectCode(e, IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
      }
    });
  });

  describe('assertFlaggedInputsArePresent', () => {
    it('passes when no flag is set', () => {
      expect(() => service.assertFlaggedInputsArePresent({})).not.toThrow();
    });

    it('passes when each flagged field has a matching value', () => {
      expect(() =>
        service.assertFlaggedInputsArePresent({
          salePriceEdited: true,
          salePrice: 100,
          brokeragePercentageEdited: false,
          referralPointsRatioEdited: true,
          referralPointsRatio: '1:1',
        }),
      ).not.toThrow();
    });

    it('throws when a flag is set but the value is missing', () => {
      try {
        service.assertFlaggedInputsArePresent({
          salePriceEdited: true,
          brokeragePercentageEdited: true,
          brokeragePercentage: 2.5,
        });
        fail('expected throw');
      } catch (e) {
        const body = (e as HttpException).getResponse() as {
          code: IomErrorCodeEnum;
          details: { missing: string[] };
        };
        expect(body.code).toBe(IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
        expect(body.details.missing).toEqual(['salePrice']);
      }
    });

    it('throws when ratio flag is set but the string is blank', () => {
      try {
        service.assertFlaggedInputsArePresent({
          referralPointsRatioEdited: true,
          referralPointsRatio: '   ',
        });
        fail('expected throw');
      } catch (e) {
        const body = (e as HttpException).getResponse() as {
          code: IomErrorCodeEnum;
          details: { missing: string[] };
        };
        expect(body.code).toBe(IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
        expect(body.details.missing).toEqual(['referralPointsRatio']);
      }
    });

    it('requires referrerRatio + refereeRatio when "other" + !deviation', () => {
      try {
        service.assertFlaggedInputsArePresent({
          referralPointsRatioEdited: true,
          referralPointsRatio: 'other',
          deviation: false,
        });
        fail('expected throw');
      } catch (e) {
        const body = (e as HttpException).getResponse() as {
          code: IomErrorCodeEnum;
          details: { missing: string[] };
        };
        expect(body.code).toBe(IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
        expect(body.details.missing).toEqual(
          expect.arrayContaining(['referrerRatio', 'refereeRatio']),
        );
      }
    });

    it('passes when "other" + !deviation has both numeric ratios', () => {
      expect(() =>
        service.assertFlaggedInputsArePresent({
          referralPointsRatioEdited: true,
          referralPointsRatio: 'other',
          deviation: false,
          referrerRatio: 0.6,
          refereeRatio: 0.4,
        }),
      ).not.toThrow();
    });

    it('rejects FE-supplied ratios when deviation=true', () => {
      try {
        service.assertFlaggedInputsArePresent({
          referralPointsRatioEdited: true,
          referralPointsRatio: 'other',
          deviation: true,
          referrerRatio: 0.5,
          refereeRatio: 0.5,
        });
        fail('expected throw');
      } catch (e) {
        const body = (e as HttpException).getResponse() as {
          code: IomErrorCodeEnum;
          details: { offenders: string[] };
        };
        expect(body.code).toBe(IomErrorCodeEnum.DISALLOWED_FIELD_IN_PAYLOAD);
        expect(body.details.offenders).toEqual(
          expect.arrayContaining(['referrerRatio', 'refereeRatio']),
        );
      }
    });

    it('passes when "other" + deviation omits the numeric ratios', () => {
      expect(() =>
        service.assertFlaggedInputsArePresent({
          referralPointsRatioEdited: true,
          referralPointsRatio: 'other',
          deviation: true,
        }),
      ).not.toThrow();
    });

    it('ignores referrerRatio / refereeRatio for non-"other" split-types', () => {
      // For `"1:1"`, `"2:1"`, etc. the BE derives the components from
      // the wire string. Validation should not require the explicit
      // numeric fields here.
      expect(() =>
        service.assertFlaggedInputsArePresent({
          referralPointsRatioEdited: true,
          referralPointsRatio: '1:1',
          deviation: false,
        }),
      ).not.toThrow();
    });
  });

  describe('valuesDiffer', () => {
    it('treats two nulls as equal', () => {
      expect(service.valuesDiffer(null, null)).toBe(false);
    });

    it('treats null vs number as different', () => {
      expect(service.valuesDiffer(null, 0)).toBe(true);
      expect(service.valuesDiffer(1, null)).toBe(true);
    });

    it('treats floats within tolerance as equal', () => {
      expect(service.valuesDiffer(1.0, 1.0000000001)).toBe(false);
    });

    it('treats floats beyond tolerance as different', () => {
      expect(service.valuesDiffer(1.0, 1.01)).toBe(true);
    });
  });

  describe('parseReferralRatio', () => {
    it('parses balanced ratios like "1:1"', () => {
      expect(service.parseReferralRatio('1:1')).toEqual({
        referrerRatio: 1,
        refereeRatio: 1,
      });
    });

    it('parses uneven ratios like "2:1" and "1:2"', () => {
      expect(service.parseReferralRatio('2:1')).toEqual({
        referrerRatio: 2,
        refereeRatio: 1,
      });
      expect(service.parseReferralRatio('1:2')).toEqual({
        referrerRatio: 1,
        refereeRatio: 2,
      });
    });

    it('parses one-sided ratios like "2:0" and "0:2"', () => {
      expect(service.parseReferralRatio('2:0')).toEqual({
        referrerRatio: 2,
        refereeRatio: 0,
      });
      expect(service.parseReferralRatio('0:2')).toEqual({
        referrerRatio: 0,
        refereeRatio: 2,
      });
    });

    it('parses decimal ratios like "1.2:0.8" (FE "other" split-type)', () => {
      expect(service.parseReferralRatio('1.2:0.8')).toEqual({
        referrerRatio: 1.2,
        refereeRatio: 0.8,
      });
      expect(service.parseReferralRatio('0.5:1.5')).toEqual({
        referrerRatio: 0.5,
        refereeRatio: 1.5,
      });
    });

    it('trims surrounding whitespace', () => {
      expect(service.parseReferralRatio('  3:2  ')).toEqual({
        referrerRatio: 3,
        refereeRatio: 2,
      });
    });

    it('returns null for null / undefined / blank / malformed input', () => {
      expect(service.parseReferralRatio(null)).toBeNull();
      expect(service.parseReferralRatio(undefined)).toBeNull();
      expect(service.parseReferralRatio('')).toBeNull();
      expect(service.parseReferralRatio('1:2:3')).toBeNull();
      expect(service.parseReferralRatio('abc')).toBeNull();
      expect(service.parseReferralRatio('-1:2')).toBeNull();
      expect(service.parseReferralRatio('.5:1')).toBeNull();
      expect(service.parseReferralRatio('1.:2')).toBeNull();
    });
  });

  describe('formatReferralRatio', () => {
    it('formats numeric ratios as "X:Y"', () => {
      expect(service.formatReferralRatio(1, 1)).toBe('1:1');
      expect(service.formatReferralRatio(2, 0)).toBe('2:0');
      expect(service.formatReferralRatio(0, 2)).toBe('0:2');
    });

    it('preserves decimal inputs (custom "other" splits)', () => {
      expect(service.formatReferralRatio(1.2, 0.8)).toBe('1.2:0.8');
      expect(service.formatReferralRatio(0.5, 1.5)).toBe('0.5:1.5');
    });

    it('returns null when either part is null/undefined', () => {
      expect(service.formatReferralRatio(null, 1)).toBeNull();
      expect(service.formatReferralRatio(1, null)).toBeNull();
      expect(service.formatReferralRatio(undefined, undefined)).toBeNull();
    });
  });

  describe('buildReferralSplitRatioJson', () => {
    it('returns 50/50 for "1:1"', () => {
      expect(service.buildReferralSplitRatioJson(1, 1, '1:1')).toEqual({
        referrer: 50,
        referee: 50,
        type: '1:1',
      });
    });

    it('returns 100/0 for "2:0" (all to referrer)', () => {
      expect(service.buildReferralSplitRatioJson(2, 0, '2:0')).toEqual({
        referrer: 100,
        referee: 0,
        type: '2:0',
      });
    });

    it('returns 0/100 for "0:2" (all to referee)', () => {
      expect(service.buildReferralSplitRatioJson(0, 2, '0:2')).toEqual({
        referrer: 0,
        referee: 100,
        type: '0:2',
      });
    });

    it('returns 66.67/33.33 for "2:1"', () => {
      expect(service.buildReferralSplitRatioJson(2, 1, '2:1')).toEqual({
        referrer: 66.67,
        referee: 33.33,
        type: '2:1',
      });
    });

    it('returns 33.33/66.67 for "1:2"', () => {
      expect(service.buildReferralSplitRatioJson(1, 2, '1:2')).toEqual({
        referrer: 33.33,
        referee: 66.67,
        type: '1:2',
      });
    });

    it('surfaces the "other" type marker for FE custom splits', () => {
      expect(service.buildReferralSplitRatioJson(0.55, 0.45, 'other')).toEqual({
        referrer: 55,
        referee: 45,
        type: 'other',
      });
    });

    it('emits type=null when the split-type is missing / blank', () => {
      expect(service.buildReferralSplitRatioJson(1, 1, null)).toEqual({
        referrer: 50,
        referee: 50,
        type: null,
      });
      expect(service.buildReferralSplitRatioJson(1, 1, '   ')).toEqual({
        referrer: 50,
        referee: 50,
        type: null,
      });
    });

    it('returns null when either part is null/undefined', () => {
      expect(service.buildReferralSplitRatioJson(null, 1, '1:1')).toBeNull();
      expect(service.buildReferralSplitRatioJson(1, null, '1:1')).toBeNull();
      expect(
        service.buildReferralSplitRatioJson(undefined, undefined, '1:1'),
      ).toBeNull();
    });

    it('returns null for "0:0" (no allocation)', () => {
      expect(service.buildReferralSplitRatioJson(0, 0, '0:0')).toBeNull();
    });
  });

  describe('assertFeDerivedMatchesBe', () => {
    const be = {
      totalBrokerageAmount: 250000,
      referrerPoints: 125000,
      refereePoints: 125000,
    };

    it('passes when FE omits derived values entirely', () => {
      expect(() => service.assertFeDerivedMatchesBe({}, be)).not.toThrow();
    });

    it('passes when FE values match within tolerance', () => {
      expect(() =>
        service.assertFeDerivedMatchesBe(
          {
            totalBrokerageAmount: 250000.005,
            referrerPoints: 124999.999,
            refereePoints: 125000,
          },
          be,
        ),
      ).not.toThrow();
    });

    it('throws when ANY field is beyond the tolerance', () => {
      try {
        service.assertFeDerivedMatchesBe({ referrerPoints: 999999 }, be);
        fail('expected throw');
      } catch (e) {
        const body = (e as HttpException).getResponse() as {
          code: IomErrorCodeEnum;
          details: { mismatches: Array<{ field: string }> };
        };
        expect(body.code).toBe(IomErrorCodeEnum.MANDATORY_FIELDS_MISSING);
        expect(body.details.mismatches[0].field).toBe('referrerPoints');
      }
    });
  });
});
