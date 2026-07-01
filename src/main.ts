import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';

import { swaggerAdminConfig } from '@core/swagger/admin.config';
import { swaggerStoreConfig } from '@core/swagger/store.config';
import { exceptionFactory } from '@core/exceptions/exception-factory.filter';

import { AppModule } from './app.module';
import { AdminModule } from './domains/admin/admin.module';
import { StoreModule } from './domains/store/store.module';

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * Setup class serializer for field excluding
   * */
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  /**
   * Setup helmet for security headers
   * */
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );

  /**
   * Setup validators for class validators
   * */
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      exceptionFactory,
    }),
  );

  /**
   * Cors settings setup
   * */
  const allowedOrigins =
    process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) ?? [];

  const allowedMethods =
    process.env.CORS_METHODS?.split(',').filter(Boolean) ?? [];

  app.enableCors({
    origin: allowedOrigins,
    methods: allowedMethods,
    credentials: true,
  });

  /**
   * Swagger setup
   * */
  const documentAdmin = SwaggerModule.createDocument(app, swaggerAdminConfig, {
    include: [AdminModule],
    deepScanRoutes: true,
  });

  const documentStore = SwaggerModule.createDocument(app, swaggerStoreConfig, {
    include: [StoreModule],
    deepScanRoutes: true,
  });

  SwaggerModule.setup('api/admin', app, documentAdmin, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  SwaggerModule.setup('api/store', app, documentStore);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((err) => console.error(err));
