import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Language } from '@core/types/language';
import { BaseEntity } from '@core/entities/base.entity';
import { User } from '@features/user/entities/user.entity';

@Entity('contacts')
@Unique(['singleton'])
@Check('"singleton" = 1')
export class Contact extends BaseEntity {
  @Column({ type: 'int', default: 1 })
  singleton: 1;

  @Column({ type: 'jsonb' })
  street: Record<Language, string>;

  @Column({ type: 'jsonb' })
  city: Record<Language, string>;

  @Column({ type: 'jsonb' })
  country: Record<Language, string>;

  @Column({ type: 'varchar', length: 20 })
  zip: string;

  @Column({ type: 'varchar', length: 40 })
  secretaryPhone: string;

  @Column({ type: 'varchar', length: 40 })
  salesPhone: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
