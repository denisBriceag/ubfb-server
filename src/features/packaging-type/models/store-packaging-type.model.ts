import { ApiProperty } from '@nestjs/swagger';

/**
 * A class rather than an interface so Swagger can describe the storefront
 * payload; it is still only ever used as a type.
 * */
export class StorePackagingTypeModel {
  @ApiProperty({
    example: 'glass-bottle',
    description: 'Send this back as `packagingTypeCode` when filtering.',
  })
  code: string;

  @ApiProperty({
    example: 'Sticlă',
    description: 'Already resolved to the language of the `X-Language` header.',
  })
  label: string;
}
