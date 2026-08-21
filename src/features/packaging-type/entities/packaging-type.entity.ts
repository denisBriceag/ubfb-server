import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@core/entities/base.entity';
import { Language } from '@core/types/language';
import { User } from '@features/user/entities/user.entity';

@Entity('packaging_types')
export class PackagingType extends BaseEntity {
  /**
   * Stable public key. It is what the store filters on
   * (`?packagingTypeCode=glass-bottle`), so it must outlive any wording change
   * to the display label — rename the label, never the code. Set once at
   * creation: `UpdatePackagingTypeDto` deliberately omits it.
   * */
  @ApiProperty({
    example: 'glass-bottle',
    maxLength: 50,
    description: 'Stable public key used by store filters. Immutable.',
  })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @ApiProperty({
    example: { en: 'Glass bottle', ro: 'Sticlă', ru: 'Стеклянная бутылка' },
    description: 'Display label, required in every supported language.',
  })
  @Column({ type: 'jsonb' })
  label: Record<Language, string>;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: false,
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
    },
    description: 'The admin who last modified this record.',
  })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;

  /**
   * Not a column: how many products reference this type, soft-deleted ones
   * included — the same set the hard-delete guard counts, so a non-zero value
   * means a hard delete will be refused and a soft delete will strip the
   * packaging line from that many product pages.
   * */
  @ApiProperty({
    example: 0,
    description:
      'Referencing products (including soft-deleted). Non-zero means hard delete is refused.',
  })
  productCount?: number;
}
