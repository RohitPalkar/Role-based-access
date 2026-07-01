import { it, expect, describe } from 'vitest';

import { normalizeApiMutationResponse } from './normalize-api-mutation-response';

describe('normalizeApiMutationResponse', () => {
  describe('non-object inputs', () => {
    it('returns null input as { data: null }', () => {
      expect(normalizeApiMutationResponse(null)).toEqual({ data: null });
    });

    it('returns undefined input as { data: undefined }', () => {
      expect(normalizeApiMutationResponse(undefined)).toEqual({ data: undefined });
    });

    it('returns primitive number/string input as { data: <value> }', () => {
      expect(normalizeApiMutationResponse(42)).toEqual({ data: 42 });
      expect(normalizeApiMutationResponse('hello')).toEqual({ data: 'hello' });
    });
  });

  describe('error branches (success === false / "false")', () => {
    it('throws with message from response.response.message when success is boolean false', () => {
      expect(() =>
        normalizeApiMutationResponse({
          success: false,
          response: { response: { message: 'deep error' } },
          message: 'top error',
        })
      ).toThrow('deep error');
    });

    it('throws with message from response.message when nested message is absent', () => {
      expect(() =>
        normalizeApiMutationResponse({
          success: false,
          response: { message: 'mid error' },
          message: 'top error',
        })
      ).toThrow('mid error');
    });

    it('throws with top-level message when response.message is absent', () => {
      expect(() =>
        normalizeApiMutationResponse({
          success: false,
          message: 'top error',
        })
      ).toThrow('top error');
    });

    it('throws with errors.message when message is otherwise absent', () => {
      expect(() =>
        normalizeApiMutationResponse({
          success: false,
          errors: { message: 'validation error' },
        })
      ).toThrow('validation error');
    });

    it('throws with the first array element when message is an array', () => {
      expect(() =>
        normalizeApiMutationResponse({
          success: false,
          message: ['first', 'second'],
        })
      ).toThrow('first');
    });

    it('throws "Something went wrong" when no message can be extracted', () => {
      expect(() => normalizeApiMutationResponse({ success: false })).toThrow(
        'Something went wrong'
      );
    });

    it('treats the string "false" the same as boolean false', () => {
      expect(() => normalizeApiMutationResponse({ success: 'false', message: 'boom' })).toThrow(
        'boom'
      );
    });
  });

  describe('success branches', () => {
    it('extracts nestedData from response.response.data', () => {
      const result = normalizeApiMutationResponse({
        success: true,
        response: { response: { data: { id: 1 } } },
      });

      expect(result).toEqual({ data: { id: 1 }, message: undefined });
    });

    it('falls back to response.data when response.response.data is missing', () => {
      const result = normalizeApiMutationResponse({
        success: true,
        response: { data: { id: 2 } },
      });

      expect(result.data).toEqual({ id: 2 });
    });

    it('falls back to body.data when both response paths are missing', () => {
      const result = normalizeApiMutationResponse({
        success: true,
        data: { id: 3 },
      });

      expect(result.data).toEqual({ id: 3 });
    });

    it('returns the body itself when no wrapper markers exist (no success, no response)', () => {
      const body = { id: 99, name: 'plain' };
      const result = normalizeApiMutationResponse(body);

      expect(result.data).toBe(body);
      expect(result.message).toBeUndefined();
    });

    it('returns undefined data when wrapper exists but no nested data is present', () => {
      const result = normalizeApiMutationResponse({
        success: true,
        message: 'ok',
      });

      expect(result.data).toBeUndefined();
      expect(result.message).toBe('ok');
    });

    it('returns message only when it is a string (drops non-string message values)', () => {
      const numericMessage = normalizeApiMutationResponse({
        success: true,
        data: { id: 1 },
        message: 42,
      });
      expect(numericMessage.message).toBeUndefined();

      const arrayMessage = normalizeApiMutationResponse({
        success: true,
        data: { id: 1 },
        message: ['a', 'b'],
      });
      expect(arrayMessage.message).toBeUndefined();

      const stringMessage = normalizeApiMutationResponse({
        success: true,
        data: { id: 1 },
        message: 'Created',
      });
      expect(stringMessage.message).toBe('Created');
    });
  });
});
