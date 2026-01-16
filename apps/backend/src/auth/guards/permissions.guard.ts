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
import { Permissions, Owner } from '../decorators/roles.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  /**
   * Check if user has required permissions to access the route
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Get required permissions from metadata
      const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
      const isOwner = this.reflector.get<boolean>('Owner, context.getHandler());
      
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

      // Check owner permissions
      if (isOwner) {
        const resourceUserId = this.getResourceUserId(request);
        if (resourceUserId && user.id !== resourceUserId) {
          throw new ForbiddenException('Access denied: You can only access your own resources');
        }
      }

      // If no permissions required, allow access
      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
      }

      // Check if user has required permissions
      const hasRequiredPermissions = this.checkPermissions(user, requiredPermissions);
      
      if (!hasRequiredPermissions) {
        this.logger.warn(
          `Access denied for user ${user.email}. Required permissions: ${requiredPermissions.join(', ')}`
        );
        throw new ForbiddenException('Insufficient permissions');
      }

      // Log successful authorization
      this.logger.log(`User ${user.email} authorized with permissions`);
      
      return true;
    } catch (error) {
      this.logger.error('PermissionsGuard error:', error);
      throw error;
    }
  }

  /**
   * Check if user has any of the required permissions
   */
  private checkPermissions(user: User, requiredPermissions: string[]): boolean {
    if (!user.role?.permissions) {
      return false;
    }

    // Admin role has access to everything
    if (user.role.permissions.includes('*')) {
      return true;
    }

    // Check if user has any of the required permissions
    return requiredPermissions.some(permission => 
      user.role.permissions.includes(permission)
    );
  }

  /**
   * Extract resource user ID from request parameters
   */
  private getResourceUserId(request: Request): string | null {
    // Check route parameters
    if (request.params.userId) {
      return request.params.userId;
    }
    
    // Check query parameters
    if (request.query.userId) {
      return request.query.userId as string;
    }
    
    // Check request body (for POST/PUT requests)
    if (request.body && request.body.userId) {
      return request.body.userId;
    }
    
    return null;
  }
}