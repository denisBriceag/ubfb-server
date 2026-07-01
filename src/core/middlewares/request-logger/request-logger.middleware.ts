import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

import { REQUEST_ID_HEADER, REQUEST_USER_KEY } from '@core/constants';
import type { TokenSignature } from '@features/authentication/types/token-signature.type';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly _logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const requestId = req.headers[REQUEST_ID_HEADER] as string;
    const startedAt = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startedAt;
      const user = req[REQUEST_USER_KEY] as TokenSignature | undefined;

      this._logger.log({
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip: req.headers['x-forwarded-for'] ?? ip,
        userEmail: user?.email ?? 'unauthenticated',
        userRole: user?.role ?? null,
      });
    });

    next();
  }
}
