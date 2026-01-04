import { DocumentBuilder } from '@nestjs/swagger';
import pkg from '../../../package.json';
import { REFRESH_TOKEN_KEY } from '@core/constants';

export const swaggerAdminConfig = new DocumentBuilder()
  .setTitle(pkg.name + ' Admin API')
  .setDescription(pkg.description)
  .setVersion(pkg.version)
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter your Bearer token',
      in: 'header',
    },
    'access-token',
  )
  .addCookieAuth(REFRESH_TOKEN_KEY, { type: 'apiKey', in: 'cookie' })
  .build();
