import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ActiveUserData } from '../../types/active-user-data.type';
import { Roles } from '@core/types/roles.enum';
import { ERROR_MAP, ErrorsEnum, REQUEST_USER_KEY } from '@core/constants';
import { ROLES_KEY } from '../../decorators/role.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly _reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const contextRoles = this._reflector.getAllAndOverride<Roles[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!contextRoles) {
      return true;
    }

    const user: ActiveUserData = context.switchToHttp().getRequest()[
      REQUEST_USER_KEY
    ];
    const hasRole = contextRoles.some((role) => user.role === role);

    if (hasRole) return true;
    else
      throw new ForbiddenException({
        message: ErrorsEnum.NOT_ENOUGH_PERMISSIONS,
        errorCode: ERROR_MAP.NOT_ENOUGH_PERMISSIONS,
      });
  }
}
