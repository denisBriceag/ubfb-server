import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Language } from '@core/types/language';

@Entity('packaging_types')
export class PackagingType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  label: Record<Language, string> | null;
}
