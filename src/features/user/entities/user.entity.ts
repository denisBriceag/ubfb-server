import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IsEnum } from 'class-validator';
import { Roles } from '@core/types/roles.enum';
import { BaseEntity } from '@core/entities/base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ length: 100 })
  name: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: Roles, default: Roles.USER })
  @IsEnum(Roles)
  role: Roles;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: Pick<User, 'id' | 'email'> | null;
}
