import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  private readonly allowHtmlFields = new Set([
    'voucherTermsAndCondition',
    'eoiTermsAndCondition',
    'unitPrefStaticContent',
  ]);
  use(req: Request, res: Response, next: NextFunction) {
    req.body = this.sanitize(req.body, req);
    req.query = this.sanitize(req.query, req);
    req.params = this.sanitize(req.params, req);
    next();
  }

  private sanitize(input: any, req: Request, parentKey?: string): any {
    if (Array.isArray(input)) {
      return input.map((item) => this.sanitize(item, req, parentKey));
    } else if (
      input &&
      typeof input === 'object' &&
      input.constructor === Object
    ) {
      const sanitized: any = {};
      for (const key in input) {
        sanitized[key] = this.sanitize(input[key], req, key);
      }
      return sanitized;
    } else if (typeof input === 'string') {
      if (parentKey && this.allowHtmlFields.has(parentKey)) {
        return input; // allow raw HTML for whitelisted fields
      }
      return this.sanitizeString(input, req, parentKey);
    }
    return input;
  }

  private sanitizeString(value: string, req: Request, key?: string): string {
    // Allow HTML for email templates body field while still sanitizing dangerous tags/attrs
    const isEmailTemplateBody =
      key === 'body' &&
      typeof req?.originalUrl === 'string' &&
      req.originalUrl.includes('/email-templates');

    // Heuristic: treat value as HTML only if it contains a tag-like pattern
    const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(value);

    if (isEmailTemplateBody) {
      return (sanitizeHtml as any)(value, {
        allowedTags: [
          'a',
          'p',
          'ul',
          'ol',
          'li',
          'strong',
          'em',
          'span',
          'br',
          'b',
          'i',
          'u',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
          'img',
          'div',
        ],
        allowedAttributes: {
          a: ['href', 'target', 'rel', 'name'],
          img: ['src', 'alt', 'width', 'height'],
          '*': ['style'],
        },
        // Optional: transform target attr to safe values
        allowedSchemes: ['http', 'https', 'mailto'],
      });
    }

    // For non-HTML plain text, return as-is to allow characters like ', <, >
    if (!looksLikeHtml) {
      return value;
    }

    return (sanitizeHtml as any)(value, {
      allowedTags: [],
      allowedAttributes: {},
    });
  }
}
