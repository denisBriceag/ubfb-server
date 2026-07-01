import { Injectable, NestMiddleware } from '@nestjs/common';

import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

import { REQUEST_ID_HEADER } from '@core/constants';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? randomUUID();

    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
