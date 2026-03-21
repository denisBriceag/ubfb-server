import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Country } from './country.entity';

@Entity('country_translations')
@Index(['countryId', 'languageCode'], { unique: true })
export class CountryTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  countryId: string;

  @Column({ type: 'varchar', length: 5 })
  languageCode: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ManyToOne(() => Country, (c) => c.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'countryId' })
  country: Country;
}
