import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@core/entities/base.entity';
import { Country } from '@features/country/entities/country.entity';
import { User } from '@features/user/entities/user.entity';

@Entity('brands')
export class Brand extends BaseEntity {
  @Column({ type: 'varchar', length: 150, unique: true })
  slug: string;

  @Column({ length: 150, unique: true })
  name: string;

  @Exclude()
  @Column({ type: 'uuid', nullable: true })
  countryId: string | null;

  @ManyToOne(() => Country, { nullable: true })
  @JoinColumn({ name: 'countryId' })
  country: Country | null;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;

  /**
   * Not a column: how many products reference this brand, soft-deleted ones
   * included — the same set the hard-delete guard counts, so a non-zero value
   * means a hard delete will be refused and a soft delete will strip the brand
   * from that many product pages.
   * */
  productCount?: number;
}
