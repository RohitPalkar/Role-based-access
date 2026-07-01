import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as helpers from '../helpers';
import { convertNumberToWords, formatDate } from 'src/utils';

@Injectable()
export class HelperMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const targetPath = 'preview/';
    if (req.originalUrl.includes(targetPath)) {
      Object.keys(helpers).forEach((key) => {
        res.locals[key] = helpers[key];
      });
      res.locals.formatDate = formatDate;
      res.locals.convertNumberToWords = convertNumberToWords;
    }
    next();
  }
}
