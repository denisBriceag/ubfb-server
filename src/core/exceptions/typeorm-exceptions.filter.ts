import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  EntityNotFoundError,
  OptimisticLockVersionMismatchError,
  QueryFailedError,
  TypeORMError,
} from 'typeorm';
import type { Request, Response } from 'express';
import { Domains } from '@core/types/domains.enum';
import {
  ErrorResponse,
  ErrorResponseOptions,
} from '@core/types/error-response';
import { ERROR_MAP, ERROR_MESSAGES, ErrorsEnum } from '@core/types/errors.enum';
import { HttpAdapterHost } from '@nestjs/core';
import { ErrorCause } from '@core/types/error-cause.enum';
import { REQUEST_USER_KEY } from '@core/constants';

type QueryMappedError = Pick<
  ErrorResponseOptions,
  'statusCode' | 'errorCode' | 'message' | 'validationMessages'
>;
interface PgError extends Error {
  code: string;
  detail: string;
  hint: string;
  table: string;
  column: string;
  constraint: string;
}

@Catch(
  QueryFailedError,
  EntityNotFoundError,
  OptimisticLockVersionMismatchError,
  TypeORMError,
)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly _logger = new Logger(TypeOrmExceptionFilter.name);

  constructor(private readonly _httpAdapter: HttpAdapterHost) {}

  catch(exception: TypeORMError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const domain: Domains = request.url.split('/')[1] as Domains;

    const errorResponse: ErrorResponseOptions = {
      domain,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: this._httpAdapter.httpAdapter.getRequestUrl(request),
      errorCode: ERROR_MAP.DB_GENERIC_ERROR,
      message: ErrorsEnum.DB_GENERIC_ERROR,
      cause: ErrorCause.DB,
    };

    if (
      exception instanceof QueryFailedError &&
      Object.hasOwn(exception, 'query')
    ) {
      const error = this._getPostgresError(
        exception as QueryFailedError<PgError>,
      );

      errorResponse.statusCode = error.statusCode;
      errorResponse.errorCode = error.errorCode;
      errorResponse.message = error.message;

      if (error?.validationMessages) {
        errorResponse.validationMessages = error.validationMessages;
      }

      this._logger.warn(
        {
          code: exception.driverError.code,
          constraint: exception.driverError.constraint,
          table: exception.driverError.table,
          column: this._extractUniqueField(exception.driverError.detail),
          requestAuthor: request[REQUEST_USER_KEY].email,
        },
        'Database query failed',
      );

      return this._httpAdapter.httpAdapter.reply(
        response,
        new ErrorResponse(errorResponse),
        error.statusCode,
      );
    }

    if (exception instanceof OptimisticLockVersionMismatchError) {
      errorResponse.statusCode = HttpStatus.CONFLICT;
      errorResponse.errorCode = ERROR_MAP.VERSION_MISMATCH;
      errorResponse.message = ErrorsEnum.VERSION_MISMATCH;

      this._logger.error(
        `[TypeORM Exception]: Version mismatch while updating entity. | [URL]: ${this._httpAdapter.httpAdapter.getRequestUrl(request)} | [Request Author]: ${request[REQUEST_USER_KEY].email}`,
      );

      return this._httpAdapter.httpAdapter.reply(
        response,
        new ErrorResponse(errorResponse),
        errorResponse.statusCode,
      );
    }

    if (
      exception instanceof EntityNotFoundError &&
      Object.hasOwn(exception, 'entityClass')
    ) {
      errorResponse.statusCode = HttpStatus.NOT_FOUND;
      errorResponse.errorCode = ERROR_MAP.GENERIC_NOT_FOUND_EXCEPTION;
      errorResponse.message = ErrorsEnum.GENERIC_NOT_FOUND_EXCEPTION;

      this._logger.error(
        `[TypeORM Exception]: ${exception.message} | URL: ${this._httpAdapter.httpAdapter.getRequestUrl(request)}`,
      );

      return this._httpAdapter.httpAdapter.reply(
        response,
        new ErrorResponse(errorResponse),
        errorResponse.statusCode,
      );
    }

    this._logger.error(
      `[TypeORM Exception]: ${exception.message} | [URL]: ${this._httpAdapter.httpAdapter.getRequestUrl(request)} | [PATH]: ${request.path} | [IP]: ${request.ip} | [IPS]: ${request.ips}`,
      exception.stack,
    );

    return this._httpAdapter.httpAdapter.reply(
      response,
      new ErrorResponse(errorResponse),
      errorResponse.statusCode,
    );
  }

  private _getPostgresError(
    pgError: QueryFailedError<PgError>,
  ): QueryMappedError {
    switch (pgError.driverError.code) {
      case '23505': {
        const field = this._extractUniqueField(pgError.driverError.detail);

        return {
          statusCode: HttpStatus.CONFLICT,
          errorCode: ERROR_MAP.DB_UNIQUE_VIOLATION,
          message: ERROR_MESSAGES.uniqueViolation(field),
          validationMessages: field
            ? { [field]: [ERROR_MESSAGES.uniqueViolation(field)] }
            : undefined,
        };
      }

      case '23503': {
        return {
          statusCode: HttpStatus.CONFLICT,
          errorCode: ERROR_MAP.DB_FOREIGN_KEY_VIOLATION,
          message: ErrorsEnum.DB_FOREIGN_KEY_VIOLATION,
        };
      }

      case '23502': {
        const column = pgError.driverError.column;

        return {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ERROR_MAP.DB_NOT_NULL_VIOLATION,
          message: ERROR_MESSAGES.notNullViolation(column),
        };
      }

      case '40001': {
        return {
          statusCode: HttpStatus.CONFLICT,
          errorCode: ERROR_MAP.DB_SERIALIZATION_FAILURE,
          message: ErrorsEnum.DB_SERIALIZATION_FAILURE,
        };
      }

      case '40P01': {
        return {
          statusCode: HttpStatus.CONFLICT,
          errorCode: ERROR_MAP.DB_DEADLOCK_DETECTED,
          message: ErrorsEnum.DB_DEADLOCK_DETECTED,
        };
      }

      case '22P02': {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ERROR_MAP.DB_INVALID_INPUT,
          message: ErrorsEnum.DB_INVALID_INPUT,
        };
      }

      case '22001': {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ERROR_MAP.DB_VALUE_TOO_LONG,
          message: ErrorsEnum.DB_VALUE_TOO_LONG,
        };
      }

      case '23514': {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ERROR_MAP.DB_CHECK_VIOLATION,
          message: ErrorsEnum.DB_CHECK_VIOLATION,
        };
      }

      case '55P03': {
        return {
          statusCode: HttpStatus.CONFLICT,
          errorCode: ERROR_MAP.DB_LOCK_NOT_AVAILABLE,
          message: ErrorsEnum.DB_LOCK_NOT_AVAILABLE,
        };
      }

      case '57014': {
        return {
          statusCode: HttpStatus.REQUEST_TIMEOUT,
          errorCode: ERROR_MAP.DB_TIMEOUT,
          message: ErrorsEnum.DB_TIMEOUT,
        };
      }

      case '08006':
      case '08001':
      case '57P01':
      case '57P02':
      case '57P03': {
        return {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          errorCode: ERROR_MAP.DB_UNAVAILABLE,
          message: ErrorsEnum.DB_UNAVAILABLE,
        };
      }

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          errorCode: ERROR_MAP.DB_GENERIC_ERROR,
          message: ErrorsEnum.DB_GENERIC_ERROR,
        };
    }
  }

  /**
   * @description Retrieves the field name that caused the unique constraint violation from the error detail message.
   * @param detail - The detail message from the PostgresSQL error.
   * @example 'Key (email)=(a@b.com) already exists.'
   * @returns The field name that caused the unique constraint violation, or undefined if not found.
   * */
  private _extractUniqueField(detail?: string): string | undefined {
    if (!detail) return;

    const match = detail.match(/Key \((.+?)\)=\(/);

    return match?.[1] ?? undefined;
  }
}
