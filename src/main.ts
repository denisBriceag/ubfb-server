import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerAdminConfig } from '@core/swagger/admin.config';
import { swaggerStoreConfig } from '@core/swagger/store.config';
import { AdminModule } from './domains/admin/admin.module';
import { StoreModule } from './domains/store/store.module';
import { HttpExceptionFilter } from '@core/exceptions/exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import { exceptionFactory } from '@core/exceptions/exception-factory.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:4200',
      'https://localhost:4200',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
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

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((err) => console.error(err));
