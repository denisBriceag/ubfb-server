import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VolumeUnit } from './volume-unit.entity';

@Entity('volume_unit_translations')
@Index(['volumeUnitId', 'languageCode'], { unique: true })
export class VolumeUnitTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  volumeUnitId: string;

  @Column({ type: 'varchar', length: 5 })
  languageCode: string;

  @Column({ type: 'varchar', length: 50 })
  label: string;

  @ManyToOne(() => VolumeUnit, (vu) => vu.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volumeUnitId' })
  volumeUnit: VolumeUnit;
}
