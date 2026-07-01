import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { logsAndErrorHandling, sanitizePayload } from './errorLogHandler';

describe('errorLogHandler', () => {
  describe('sanitizePayload', () => {
    it('should return undefined if payload is null or undefined', () => {
      expect(sanitizePayload(null)).toBeUndefined();
      expect(sanitizePayload(undefined)).toBeUndefined();
    });

    it('should redact sensitive fields', () => {
      const payload = {
        normalField: 'test',
        password: 'my-secret-password',
        userToken: 'abc-123',
        PAYMENT_DETAILS: 'cc-number',
      };
      const result = sanitizePayload(payload);
      expect(result).toEqual({
        normalField: 'test',
        password: '[REDACTED]',
        userToken: '[REDACTED]',
        PAYMENT_DETAILS: '[REDACTED]',
      });
    });

    it('should truncate large strings', () => {
      const largeString = 'a'.repeat(1001);
      const payload = { largeField: largeString };
      const result = sanitizePayload(payload);
      expect(result?.largeField).toBe('[TRUNCATED]');
    });

    it('should stringify and truncate large objects', () => {
      const largeObject = { data: 'a'.repeat(1000) };
      const payload = { obj: largeObject };
      const result = sanitizePayload(payload);
      expect(result?.obj).toBe('[TRUNCATED_OBJECT]');
    });

    it('should parse back small objects', () => {
      const smallObject = { data: 'test' };
      const payload = { obj: smallObject };
      const result = sanitizePayload(payload);
      expect(result?.obj).toEqual({ data: 'test' });
    });
  });

  describe('logsAndErrorHandling', () => {
    it('should translate duplicate entry error to BadRequestException', () => {
      const error = { code: 'ER_DUP_ENTRY' };
      expect(() => logsAndErrorHandling('testModule', error)).toThrow(
        BadRequestException,
      );
      try {
        logsAndErrorHandling('testModule', error);
      } catch (e: any) {
        expect(e.message).toBe(
          'Duplicate value detected. Please ensure that the data you are trying to save does not already exist.',
        );
      }
    });

    it('should translate message containing "Duplicate entry" to BadRequestException', () => {
      const error = { message: 'Some Duplicate entry found' };
      expect(() => logsAndErrorHandling('testModule', error)).toThrow(
        BadRequestException,
      );
    });

    it('should preserve HttpException instances exactly as-is', () => {
      const exception = new NotFoundException('Custom not found message');
      expect(() => logsAndErrorHandling('testModule', exception)).toThrow(
        NotFoundException,
      );
      try {
        logsAndErrorHandling('testModule', exception);
      } catch (e: any) {
        expect(e).toBe(exception); // same exact instance
        expect(e.message).toBe('Custom not found message');
        expect(e.getStatus()).toBe(404);
      }
    });

    it('should wrap plain Error in InternalServerErrorException and attach payload', () => {
      const error = new Error('Database connection lost');
      const payload = { userId: 123, password: 'abc' };

      expect(() => logsAndErrorHandling('testModule', error, payload)).toThrow(
        InternalServerErrorException,
      );

      try {
        logsAndErrorHandling('testModule', error, payload);
      } catch (e: any) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
        expect(e.message).toBe('Database connection lost');
        expect(e.cause).toBe(error);
        expect(e.moduleName).toBe('testModule');
        expect(e.payload).toEqual({ userId: 123, password: '[REDACTED]' });
      }
    });

    it('should wrap unknown object in InternalServerErrorException', () => {
      const error = { response: 'Some weird error object' };

      expect(() => logsAndErrorHandling('testModule', error)).toThrow(
        InternalServerErrorException,
      );

      try {
        logsAndErrorHandling('testModule', error);
      } catch (e: any) {
        expect(e.message).toBe('Some weird error object');
        expect(e.moduleName).toBe('testModule');
      }
    });
  });
});
