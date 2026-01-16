import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, JwtPayload, SecurityContext } from '@tms-platform/types';
import { logger } from '@tms-platform/utils';
import { DatabaseService } from '@tms-platform/db';

export class SecurityMiddleware {
  private dbService: DatabaseService;
  private jwtSecret: string;
  private jwtIssuer: string;
  private jwtAudience: string;

  constructor(dbService: DatabaseService, config: {
    jwtSecret: string;
    jwtIssuer: string;
    jwtAudience: string;
  }) {
    this.dbService = dbService;
    this.jwtSecret = config.jwtSecret;
    this.jwtIssuer = config.jwtIssuer;
    this.jwtAudience = config.jwtAudience;
  }

  /**
   * JWT Authentication Middleware
   * Validates JWT token and attaches user context to request
   */
  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
        algorithms: ['HS256']
      }) as JwtPayload;

      // Fetch user from database
      const user = await this.dbService.user.findById(decoded.sub);
      if (!user || !user.isActive) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'User not found or inactive'
        });
        return;
      }

      // Fetch user role with permissions
      const role = await this.dbService.role.findById(user.roleId);
      if (!role) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'User role not found'
        });
        return;
      }

      // Attach security context to request
      req.user = user;
      req.role = role;

      // Log authentication event
      await this.logSecurityEvent({
        userId: user.id,
        action: 'authentication',
        resource: 'api_access',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true
      });

      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      
      // Log failed authentication attempt
      await this.logSecurityEvent({
        userId: undefined,
        action: 'authentication',
        resource: 'api_access',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: false,
        error: error.message
      });

      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          error: 'Token expired',
          message: 'Please refresh your token'
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          error: 'Invalid token',
          message: 'Token is malformed or invalid'
        });
      } else {
        res.status(500).json({
          error: 'Authentication error',
          message: 'Internal server error during authentication'
        });
      }
    }
  };

  /**
   * Role-Based Access Control (RBAC) Middleware
   * Checks if user has required permissions for the resource
   */
  authorize = (requiredPermissions: string[]) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user || !req.role) {
          res.status(401).json({
            error: 'Authorization failed',
            message: 'User not authenticated'
          });
          return;
        }

        const userPermissions = this.flattenPermissions(req.role.permissions);
        
        // Check if user has all required permissions
        const hasAllPermissions = requiredPermissions.every(permission => 
          userPermissions.includes(permission) || userPermissions.includes('*')
        );

        if (!hasAllPermissions) {
          // Log authorization failure
          await this.logSecurityEvent({
            userId: req.user.id,
            action: 'authorization',
            resource: requiredPermissions.join(','),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            success: false,
            error: 'Insufficient permissions'
          });

          res.status(403).json({
            error: 'Access denied',
            message: 'Insufficient permissions to access this resource',
            required: requiredPermissions,
            current: userPermissions
          });
          return;
        }

        // Log successful authorization
        await this.logSecurityEvent({
          userId: req.user.id,
          action: 'authorization',
          resource: requiredPermissions.join(','),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: true
        });

        next();
      } catch (error) {
        logger.error('Authorization error:', error);
        res.status(500).json({
          error: 'Authorization error',
          message: 'Internal server error during authorization'
        });
      }
    };
  };

  /**
   * Company-based Data Isolation Middleware
   * Ensures users can only access data from their own company
   */
  enforceCompanyIsolation = (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
        return;
      }

      // Admin users can access all companies
      if (req.role.name === 'admin') {
        next();
        return;
      }

      // Non-admin users must have a company
      if (!req.user.companyId) {
        res.status(403).json({
          error: 'Access denied',
          message: 'User must be associated with a company'
        });
        return;
      }

      // Add company filter to query parameters
      req.query.companyId = req.user.companyId;
      next();
    } catch (error) {
      logger.error('Company isolation error:', error);
      res.status(500).json({
        error: 'Authorization error',
        message: 'Internal server error during company isolation'
      });
    }
  };

  /**
   * Rate Limiting Middleware
   * Prevents brute force attacks and API abuse
   */
  rateLimit = (options: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
  }) => {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction): void => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Clean up expired entries
      for (const [ip, data] of requests.entries()) {
        if (data.resetTime < now) {
          requests.delete(ip);
        }
      }

      // Get or create request counter
      let requestData = requests.get(key);
      if (!requestData || requestData.resetTime < now) {
        requestData = { count: 0, resetTime: now + options.windowMs };
        requests.set(key, requestData);
      }

      requestData.count++;

      // Check if rate limit exceeded
      if (requestData.count > options.maxRequests) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Maximum ${options.maxRequests} requests per ${options.windowMs / 1000} seconds.`,
          retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
        });
        return;
      }

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, options.maxRequests - requestData.count).toString(),
        'X-RateLimit-Reset': new Date(requestData.resetTime).toISOString()
      });

      next();
    };
  };

  /**
   * Input Validation Middleware
   * Validates and sanitizes request inputs
   */
  validateInput = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true
        });

        if (error) {
          res.status(400).json({
            error: 'Validation error',
            message: 'Invalid input data',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          });
          return;
        }

        req.body = value;
        next();
      } catch (error) {
        logger.error('Input validation error:', error);
        res.status(500).json({
          error: 'Validation error',
          message: 'Internal server error during validation'
        });
      }
    };
  };

  /**
   * Extract JWT token from request headers
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Support both "Bearer token" and "token" formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }

  /**
   * Flatten permission objects into string array
   */
  private flattenPermissions(permissions: any[]): string[] {
    const flattened: string[] = [];
    
    for (const permission of permissions) {
      if (typeof permission === 'string') {
        flattened.push(permission);
      } else if (permission.resource && permission.actions) {
        for (const action of permission.actions) {
          flattened.push(`${permission.resource}:${action}`);
        }
      }
    }
    
    return flattened;
  }

  /**
   * Log security events for audit trail
   */
  private async logSecurityEvent(event: {
    userId?: string;
    action: string;
    resource: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    try {
      await this.dbService.auditLog.create({
        userId: event.userId,
        action: event.action,
        tableName: 'security_events',
        recordId: null,
        oldValues: null,
        newValues: {
          resource: event.resource,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          success: event.success,
          error: event.error
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent
      });
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }
}

export default SecurityMiddleware;