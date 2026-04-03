import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator.js";
import type { UserRole } from "@workspace/db";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException("Доступ запрещён");
    }

    const hasRole = requiredRoles.some((role) => {
      if (role === "admin") {
        return ["superadmin", "admin"].includes(user.role);
      }
      return user.role === role || user.role === "superadmin";
    });

    if (!hasRole) {
      throw new ForbiddenException("Недостаточно прав");
    }

    return true;
  }
}
