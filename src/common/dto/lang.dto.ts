import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LangDto {
  @ApiPropertyOptional({ enum: ['ru', 'ro', 'en'], default: 'ru' })
  @IsOptional()
  @IsEnum(['ru', 'ro', 'en'])
  lang: 'ru' | 'ro' | 'en' = 'ru';
}
