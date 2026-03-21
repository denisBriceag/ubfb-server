import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@core/entities/base.entity';
import { CountryTranslation } from './country-translation.entity';
import { User } from '@features/user/entities/user.entity';

@Entity('countries')
export class Country extends BaseEntity {
  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => CountryTranslation, (t) => t.country, { cascade: true })
  translations: CountryTranslation[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
