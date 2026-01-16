import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { User } from '@tms-platform/types';

@Injectable()
export class CompanyGuard implements CanActivate {
  private readonly logger = new Logger(CompanyGuard.name);

  /**
   * Check if user can access company-specific resources
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest<Request>();
      const user = request.user as User;

      if (!user) {
        throw new ForbiddenException('User not authenticated');
      }

      // Admin can access all companies
      if (user.role?.name === 'admin') {
        return true;
      }

      // Get company ID from request
      const companyId = this.getCompanyId(request);
      
      if (!companyId) {
        return true; // No company restriction
      }

      // Check if user belongs to the company
      if (user.companyId !== companyId) {
        this.logger.warn(
          `Access denied for user ${user.email}. User company: ${user.companyId}, Requested company: ${companyId}`
        );
        throw new ForbiddenException('Access denied: You can only access your company resources');
      }

      return true;
    } catch (error) {
      this.logger.error('CompanyGuard error:', error);
      throw error;
    }
  }

  /**
   * Extract company ID from request
   */
  private getCompanyId(request: Request): string | null {
    // Check route parameters
    if (request.params.companyId) {
      return request.params.companyId;
    }
    
    // Check query parameters
    if (request.query.companyId) {
      return request.query.companyId as string;
    }
    
    // Check request body
    if (request.body && request.body.companyId) {
      return request.body.companyId;
    }
    
    // Check headers
    if (request.headers['x-company-id']) {
      return request.headers['x-company-id'] as string;
    }
    
    return null;
  }
}