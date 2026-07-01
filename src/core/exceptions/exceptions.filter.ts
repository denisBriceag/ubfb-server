import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  ErrorResponse,
  ErrorResponseOptions,
} from '@core/types/error-response';
import { Domains } from '@core/types/domains.enum';
import { ErrorCause } from '@core/types/error-cause.enum';
import {
  ERROR_MAP,
  ErrorsEnum,
  REQUEST_USER_KEY,
  REQUEST_ID_HEADER,
} from '@core/constants';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly _logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly _httpAdapter: HttpAdapterHost) {}

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

    if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      errorResponse.errorCode = ERROR_MAP.TOO_MANY_REQUESTS;
      errorResponse.message = ErrorsEnum.TOO_MANY_REQUESTS;
    }

    const responseObject = new ErrorResponse(errorResponse);

    this._logger.error(
      `[HTTP Exception]: ${exception.message} | [URL]: ${this._httpAdapter.httpAdapter.getRequestUrl(request)} | [PATH]: ${request.path} | [Request Author]: ${request[REQUEST_USER_KEY]?.email} | [IP]: ${request.ip} | [IPS]: ${request.ips} | [Request ID]: ${request[REQUEST_ID_HEADER]}`,
    );

    return this._httpAdapter.httpAdapter.reply(
      response,
      responseObject,
      statusCode,
    );
  }
}
