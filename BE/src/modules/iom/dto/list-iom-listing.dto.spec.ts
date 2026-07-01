import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ListIomListingDto } from './list-iom-listing.dto';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/config/constants';

describe('ListIomListingDto', () => {
  it('accepts valid listType values', async () => {
    for (const listType of [
      'eligible',
      'ioms',
      'iomRequestInvoice',
      'pendingSubmission',
      'submittedInvoice',
    ] as const) {
      const instance = plainToInstance(ListIomListingDto, { listType });
      const errors = await validate(instance);
      expect(errors).toEqual([]);
      expect(instance.listType).toBe(listType);
    }
  });

  it('leaves listType undefined when omitted', () => {
    const instance = plainToInstance(ListIomListingDto, {});
    expect(instance.listType).toBeUndefined();
  });

  it('rejects invalid listType', async () => {
    const instance = plainToInstance(ListIomListingDto, {
      listType: 'invalid',
    });
    const errors = await validate(instance);
    const listTypeError = errors.find((e) => e.property === 'listType');
    expect(listTypeError).toBeDefined();
  });

  it('enforces pagination bounds', async () => {
    const instance = plainToInstance(ListIomListingDto, {
      page: 0,
      limit: 101,
    });
    const errors = await validate(instance);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('applies default page and limit', () => {
    const instance = plainToInstance(ListIomListingDto, {});
    expect(instance.page).toBe(DEFAULT_PAGE);
    expect(instance.limit).toBe(DEFAULT_LIMIT);
  });

  it('parses comma-separated projects into number array', () => {
    const instance = plainToInstance(ListIomListingDto, {
      projects: '10,11',
    });
    expect(instance.projects).toEqual([10, 11]);
  });

  it('returns undefined projects when omitted or empty', () => {
    expect(plainToInstance(ListIomListingDto, {}).projects).toBeUndefined();
    expect(
      plainToInstance(ListIomListingDto, { projects: '' }).projects,
    ).toBeUndefined();
  });

  it('filters invalid project tokens', () => {
    const instance = plainToInstance(ListIomListingDto, {
      projects: '10,abc,11',
    });
    expect(instance.projects).toEqual([10, 11]);
  });
});
