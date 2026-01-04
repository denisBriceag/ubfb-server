import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ErrorResponse,
  ErrorResponseOptions,
} from '@core/types/error-response';
import { Domains } from '@core/types/domains.enum';
import { ErrorCause } from '@core/types/error-cause.enum';
import { ERROR_MAP } from '@core/constants';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = exception.getStatus();
    const domain: Domains = request.url.split('/')[1] as Domains;
    const errorCode = exception.getResponse()['errorCode'];

    const errorResponse: ErrorResponseOptions = {
      domain,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      errorCode,
      message: exception.message,
    };

    if (errorCode === ERROR_MAP.VALIDATION_ERROR) {
      errorResponse.validationMessages = exception.getResponse()['errors'];
      errorResponse.cause = exception!.cause as ErrorCause;
    }

    const responseObject = new ErrorResponse(errorResponse);

    response.status(statusCode).json(responseObject);
  }
}
