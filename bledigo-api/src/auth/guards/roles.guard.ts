import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/enums';
import { hasAnyRole } from '../../common/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Authentification requise');

    // Un compte peut cumuler plusieurs roles (proprietaire qui voyage aussi)
    if (!hasAnyRole(user, requiredRoles)) {
      throw new ForbiddenException('Permissions insuffisantes');
    }

    return true;
  }
}
