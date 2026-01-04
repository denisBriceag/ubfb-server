import { Domains } from '@core/types/domains.enum';
import { IntrinsicException } from '@nestjs/common/exceptions/intrinsic.exception';
import { ErrorCause } from '@core/types/error-cause.enum';
import { HttpException } from '@nestjs/common';
import { ERROR_MAP, ErrorsEnum } from '@core/constants';

export interface ErrorResponseOptions extends ErrorOptions {
  domain: Domains;
  statusCode: number;
  errorCode: keyof typeof ERROR_MAP;
  timestamp: string;
  path: string;
  message: string;
  validationMessages?: Record<string, string[]>;
  cause?: ErrorCause;
}

export class ErrorResponse extends IntrinsicException {
  domain: Domains;
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  errorCode: keyof typeof ERROR_MAP;
  validationMessages?: Record<string, string[]>;
  cause?: ErrorCause;

  constructor(errorOptions: ErrorResponseOptions) {
    super();

    this.domain = errorOptions.domain;
    this.statusCode = errorOptions.statusCode;
    this.statusCode = errorOptions.statusCode;
    this.errorCode = errorOptions.errorCode;
    this.timestamp = errorOptions.timestamp;
    this.path = errorOptions.path;
    this.message = errorOptions.message;
    this.validationMessages = errorOptions?.validationMessages || undefined;
    this.cause = errorOptions?.cause || undefined;
  }
}
