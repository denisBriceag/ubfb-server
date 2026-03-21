import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@core/entities/base.entity';
import { VolumeUnitTranslation } from './volume-unit-translation.entity';
import { User } from '@features/user/entities/user.entity';

@Entity('volume_units')
export class VolumeUnit extends BaseEntity {
  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => VolumeUnitTranslation, (t) => t.volumeUnit, { cascade: true })
  translations: VolumeUnitTranslation[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
