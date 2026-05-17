import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@core/entities/base.entity';
import { Language } from '@core/types/language';
import { User } from '@features/user/entities/user.entity';

@Entity('countries')
export class Country extends BaseEntity {
  @Column({ type: 'jsonb' })
  name: Record<Language, string>;

  @Column({ length: 3, unique: true })
  code: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
