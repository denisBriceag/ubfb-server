import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from '@features/user/dto/create-user.dto';

export class SignUpDto extends OmitType(CreateUserDto, ['role'] as const) {}
