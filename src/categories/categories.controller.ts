import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { LangDto } from '../common/dto/lang.dto';

@ApiTags('Categories')
@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Auth(AuthType.None)
  @ApiQuery({ name: 'lang', enum: ['ru', 'ro', 'en'], required: false })
  findAll(@Query() query: LangDto) {
    return this.categoriesService.findTreePublic(query.lang);
  }
}
