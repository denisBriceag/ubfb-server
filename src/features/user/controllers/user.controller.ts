import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { User } from '@features/user/entities/user.entity';
import {
  getSwaggerOperations,
  SWAGGER_CONSTANTS,
  SWAGGER_RES_DESCRIPTIONS,
} from '@core/swagger/swagger-descriptions';
import { Roles } from '@core/types/roles.enum';
import { PaginatedData } from '@core/types/paginted-data';
import { FEATURES } from '@core/constants';

import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { FindManyUsersDto } from '../dto/find-many-users.dto';
import { Auth } from '@core/decorators/auth.decorator';
import { AuthType } from '@core/types/auth-type.enum';
import { ActiveUser } from '@core/decorators/active-user.decorator';
import { Role } from '@core/decorators/role.decorator';

const operations = getSwaggerOperations(FEATURES.USER);

@ApiTags('Users')
@Controller('')
@Auth(AuthType.Bearer)
export class UserController {
  constructor(private readonly _userService: UserService) {}

  @Post()
  @Role(Roles.SUPER_ADMIN)
  @ApiOperation({
    summary: operations.CREATE_NEW,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async create(
    @Body() createUserDto: CreateUserDto,
    @ActiveUser('sub') currentUserId: string,
  ): Promise<Omit<User, 'password'> | User> {
    return this._userService.create(createUserDto, false, currentUserId, true);
  }

  @Get()
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({
    summary: operations.GET_ALL_WITH_PAG,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SWAGGER_RES_DESCRIPTIONS.CREATE_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findMany(
    @Query() findManyUsersDto: FindManyUsersDto,
  ): Promise<PaginatedData<User>> {
    return this._userService.findMany(findManyUsersDto);
  }

  @Get(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.GET_BY_ID })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SWAGGER_RES_DESCRIPTIONS.GET_BY_ID_SUCCESS,
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async findOne(@Param('id') id: string): Promise<User> {
    return this._userService.findOneById(id, false);
  }

  @Patch(':id')
  @Role(Roles.SUPER_ADMIN, Roles.ADMIN)
  @ApiOperation({ summary: operations.UPDATE_BY_ID })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SWAGGER_RES_DESCRIPTIONS.UPDATE_SUCCESS,
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SWAGGER_RES_DESCRIPTIONS.INVALID_INPUT,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @ActiveUser('sub') currentUserId: string,
    @ActiveUser('role') currentUserRole: Roles,
  ): Promise<User> {
    return this._userService.update(
      id,
      updateUserDto,
      currentUserId,
      currentUserRole,
    );
  }

  @Delete(':id/soft')
  @Role(Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: operations.SOFT_DELETE_BY_ID })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: SWAGGER_RES_DESCRIPTIONS.SOFT_DELETE_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async softDelete(
    @Param('id') id: string,
    @ActiveUser('sub') currentUserId: User['updatedBy'],
    @ActiveUser('role') currentUserRole: User['role'],
  ): Promise<void> {
    return this._userService.softDelete(id, currentUserId, currentUserRole);
  }

  @Patch(':id/restore')
  @Role(Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: operations.RESTORE_BY_ID })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: SWAGGER_RES_DESCRIPTIONS.RESTORED_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: SWAGGER_RES_DESCRIPTIONS.FORBIDDEN(
      Roles.SUPER_ADMIN + ' only allowed',
    ),
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async restore(
    @Param('id') id: User['id'],
    @ActiveUser('sub') currentUserId: User['updatedBy'],
    @ActiveUser('role') currentUserRole: User['role'],
  ): Promise<void> {
    return this._userService.restore(id, currentUserId, currentUserRole);
  }

  @Delete(':id/hard')
  @Role(Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: operations.HARD_DELETE_BY_ID })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: SWAGGER_RES_DESCRIPTIONS.HARD_DELETE_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SWAGGER_RES_DESCRIPTIONS.NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SWAGGER_RES_DESCRIPTIONS.UNAUTHORIZED,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: SWAGGER_RES_DESCRIPTIONS.FORBIDDEN(
      Roles.SUPER_ADMIN + ' only allowed',
    ),
  })
  @ApiBearerAuth(SWAGGER_CONSTANTS.ACCESS_TOKEN)
  async hardDelete(
    @Param('id') id: string,
    @ActiveUser('sub') currentUserId: User['id'],
    @ActiveUser('role') currentUserRole: User['role'],
  ): Promise<void> {
    return this._userService.hardDelete(id, currentUserId, currentUserRole);
  }
}
