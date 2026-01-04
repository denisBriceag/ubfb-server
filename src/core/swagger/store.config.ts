import { DocumentBuilder } from '@nestjs/swagger';

import pkg from '../../../package.json';

export const swaggerStoreConfig = new DocumentBuilder()
  .setTitle(pkg.name + 'Store API')
  .setDescription(pkg.description)
  .setVersion(pkg.version)
  .build();
