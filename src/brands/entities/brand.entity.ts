import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@core/entities/base.entity';
import { BrandTranslation } from './brand-translation.entity';
import { User } from '@features/user/entities/user.entity';

@Entity('brands')
export class Brand extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar', nullable: true })
  logo: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => BrandTranslation, (t) => t.brand, { cascade: true })
  translations: BrandTranslation[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
