import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  ValueTransformer,
} from 'typeorm';

import { BaseEntity } from '@core/entities/base.entity';
import { User } from '@features/user/entities/user.entity';

const decimalTransformer: ValueTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value ? Number(value) : null),
};

@Entity('maps')
export class Maps extends BaseEntity {
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: decimalTransformer,
  })
  centerLat: number;

  @Column('decimal', {
    precision: 10,
    scale: 7,
    transformer: decimalTransformer,
  })
  centerLng: number;

  @Column('decimal', {
    precision: 10,
    scale: 7,
    transformer: decimalTransformer,
  })
  markerLat: number;

  @Column('decimal', {
    precision: 10,
    scale: 7,
    transformer: decimalTransformer,
  })
  markerLng: number;

  @Column('int')
  zoom: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
