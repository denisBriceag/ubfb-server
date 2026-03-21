import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('languages')
export class Language {
  @PrimaryColumn({ type: 'varchar', length: 5 })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;
}
