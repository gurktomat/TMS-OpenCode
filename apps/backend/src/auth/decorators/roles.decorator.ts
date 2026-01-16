import { SetMetadata } from '@nestjs/common';
import { User } from '@tms-platform/types';

/**
 * Roles metadata key for the RolesGuard
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * @param roles - Array of role names that can access the route
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator to specify required permissions for a route
 * @param permissions - Array of permissions that can access the route
 */
export const Permissions = (...permissions: string[]) => 
  SetMetadata('permissions', permissions);

/**
 * Decorator to check if user owns the resource
 */
export const Owner = () => SetMetadata('isOwner', true);

/**
 * Decorator to bypass role checks (public endpoint)
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * Type guard to check if user has specific role
 */
export const hasRole = (user: User, role: string): boolean => {
  return user.role?.name === role;
};

/**
 * Type guard to check if user has any of the specified roles
 */
export const hasAnyRole = (user: User, roles: string[]): boolean => {
  return roles.some(role => hasRole(user, role));
};

/**
 * Type guard to check if user has specific permission
 */
export const hasPermission = (user: User, permission: string): boolean => {
  if (!user.role?.permissions) return false;
  
  // Check for wildcard permission
  if (user.role.permissions.includes('*')) return true;
  
  // Check for exact permission match
  return user.role.permissions.includes(permission);
};

/**
 * Type guard to check if user has any of the specified permissions
 */
export const hasAnyPermission = (user: User, permissions: string[]): boolean => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Type guard to check if user can access their own resources
 */
export const canAccessOwnResource = (user: User, resourceUserId: string): boolean => {
  return user.id === resourceUserId;
};

/**
 * Type guard to check if user can access company resources
 */
export const canAccessCompanyResource = (user: User, resourceCompanyId: string): boolean => {
  // Admin can access all companies
  if (hasRole(user, 'admin')) return true;
  
  // Users can access their own company resources
  return user.companyId === resourceCompanyId;
};