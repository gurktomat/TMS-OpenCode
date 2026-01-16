import { SecurityMiddleware } from './security.middleware';
import { Request, Response, NextFunction } from 'express';

// Example usage in Express application
export const setupSecurity = (securityMiddleware: SecurityMiddleware) => {
  // Global rate limiting
  const rateLimiter = securityMiddleware.rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100 // limit each IP to 100 requests per windowMs
  });

  // Apply rate limiting to all routes
  return [
    rateLimiter,
    securityMiddleware.authenticate
  ];
};

// Permission constants for easy reference
export const PERMISSIONS = {
  // User management
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  
  // Shipment management
  SHIPMENTS_READ: 'shipments:read',
  SHIPMENTS_READ_OWN: 'shipments:read_own',
  SHIPMENTS_CREATE: 'shipments:create',
  SHIPMENTS_UPDATE: 'shipments:update',
  SHIPMENTS_UPDATE_STATUS: 'shipments:update_status',
  SHIPMENTS_DELETE: 'shipments:delete',
  
  // Carrier management
  CARRIERS_READ: 'carriers:read',
  CARRIERS_CREATE: 'carriers:create',
  CARRIERS_UPDATE: 'carriers:update',
  CARRIERS_DELETE: 'carriers:delete',
  
  // Customer management
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',
  
  // Financial management
  INVOICES_READ: 'invoices:read',
  INVOICES_READ_OWN: 'invoices:read_own',
  INVOICES_CREATE: 'invoices:create',
  INVOICES_UPDATE: 'invoices:update',
  INVOICES_DELETE: 'invoices:delete',
  
  // Admin permissions
  ADMIN_ALL: '*',
  AUDIT_READ: 'audit:read'
};

// Role-based permission sets
export const ROLE_PERMISSIONS = {
  admin: [PERMISSIONS.ADMIN_ALL],
  dispatcher: [
    PERMISSIONS.SHIPMENTS_READ,
    PERMISSIONS.SHIPMENTS_CREATE,
    PERMISSIONS.SHIPMENTS_UPDATE,
    PERMISSIONS.CARRIERS_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.INVOICES_READ
  ],
  driver: [
    PERMISSIONS.SHIPMENTS_READ,
    PERMISSIONS.SHIPMENTS_UPDATE_STATUS
  ],
  customer: [
    PERMISSIONS.SHIPMENTS_READ_OWN,
    PERMISSIONS.INVOICES_READ_OWN
  ]
};