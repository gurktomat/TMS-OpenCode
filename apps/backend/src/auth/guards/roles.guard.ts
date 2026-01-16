import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '@tms-platform/types';
import { ROLES_KEY, Public } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  /**
   * Check if user has required roles to access the route
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Check if route is public
      const isPublic = this.reflector.get<boolean>(Public, context.getHandler());
      if (isPublic) {
        return true;
      }

      // Get required roles from metadata
      const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
      
      // If no roles required, allow access
      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      // Get user from request
      const request = context.switchToHttp().getRequest<Request>();
      const user = request.user as User;

      // Check if user is authenticated
      if (!user) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new ForbiddenException('User account is not active');
      }

      // Check if user has required roles
      const hasRequiredRole = this.checkRoles(user, requiredRoles);
      
      if (!hasRequiredRole) {
        this.logger.warn(
          `Access denied for user ${user.email}. Required roles: ${requiredRoles.join(', ')}, User role: ${user.role?.name}`
        );
        throw new ForbiddenException('Insufficient permissions');
      }

      // Log successful authorization
      this.logger.log(`User ${user.email} authorized with role ${user.role?.name}`);
      
      return true;
    } catch (error) {
      this.logger.error('RolesGuard error:', error);
      throw error;
    }
  }

  /**
   * Check if user has any of the required roles
   */
  private checkRoles(user: User, requiredRoles: string[]): boolean {
    if (!user.role) {
      return false;
    }

    // Admin role has access to everything
    if (user.role.name === 'admin') {
      return true;
    }

    // Check if user's role is in the required roles list
    return requiredRoles.includes(user.role.name);
  }
}