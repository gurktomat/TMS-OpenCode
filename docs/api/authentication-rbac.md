# TMS Platform Authentication & RBAC Implementation

## Overview
Complete authentication system with JWT tokens, bcrypt password hashing, and Role-Based Access Control (RBAC) for the TMS platform.

## Features Implemented

### 🔐 **Core Authentication**
- **JWT Strategy**: Passport-based JWT authentication with Bearer tokens
- **Token Management**: Access tokens (15 min) + Refresh tokens (7 days)
- **Password Security**: bcrypt hashing with 12 rounds
- **Multi-tenant Support**: tenant_id in JWT payload for company isolation

### 🛡️ **Security Hardening**
- **Generic Error Messages**: "Invalid credentials" prevents user enumeration
- **Global ValidationPipe**: Input sanitization with class-validator
- **Security Headers**: XSS protection, content type options, frame options
- **Rate Limiting**: Built-in throttling for API protection

### 🎭 **Role-Based Access Control (RBAC)**
- **@Roles() Decorator**: Specify required roles for endpoints
- **@Permissions() Decorator**: Fine-grained permission control
- **@Owner() Decorator**: Resource ownership validation
- **Guards**: RolesGuard, PermissionsGuard, CompanyGuard, JwtAuthGuard

## API Endpoints

### Authentication
```
POST /auth/login          - User login with email/password
POST /auth/refresh        - Refresh access token
POST /auth/logout         - User logout (revoke token)
GET  /auth/me            - Get current user profile
GET  /auth/verify        - Verify token validity
```

### User Management
```
GET    /users            - Get all users (Admin only)
GET    /users/profile    - Get current user profile
GET    /users/:id        - Get user by ID
PATCH  /users/:id        - Update user
DELETE /users/:id        - Delete user (Admin only)
```

## Usage Examples

### Basic Authentication
```typescript
// Login
POST /auth/login
{
  "email": "admin@tms-platform.com",
  "password": "admin123"
}

// Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "admin@tms-platform.com",
    "role": {
      "name": "admin",
      "permissions": ["*"]
    }
  }
}
```

### Protected Routes
```typescript
// Use Bearer token
GET /users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// Role-based access
GET /users
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
// Requires: @Roles('admin')
```

### RBAC Implementation
```typescript
@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentsController {
  
  @Get()
  @Roles('admin', 'dispatcher')
  async findAll() {
    // Only admin and dispatcher can access
  }

  @Post()
  @Permissions('shipments:create')
  async create() {
    // Users with shipments:create permission can access
  }

  @Get(':id')
  @Owner()
  async findOne(@Param('id') id: string, @Request() req) {
    // Only resource owner can access
  }
}
```

## Security Features

### JWT Payload Structure
```typescript
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "dispatcher",
  "tenantId": "company-id",
  "permissions": ["shipments:read", "shipments:create"],
  "iat": 1234567890,
  "exp": 1234568790,
  "iss": "tms-platform",
  "aud": "tms-api"
}
```

### Password Hashing
```typescript
// bcrypt with 12 rounds
const hash = await bcrypt.hash(password, 12);
const isValid = await bcrypt.compare(password, hash);
```

### Input Validation
```typescript
// Global ValidationPipe
{
  whitelist: true,           // Remove non-decorated properties
  forbidNonWhitelisted: true, // Error on extra properties
  transform: true,          // Auto-transform types
  exceptionFactory: customErrorFormatter
}
```

## Multi-tenant Architecture

### Company Isolation
- JWT includes `tenantId` (company_id)
- CompanyGuard enforces data isolation
- Admin users can access all companies
- Regular users limited to their company

### Permission System
```typescript
// Role permissions
{
  "admin": ["*"],
  "dispatcher": ["shipments:*", "carriers:read"],
  "driver": ["shipments:read_assigned", "shipments:update_status"],
  "customer": ["shipments:read_own", "invoices:read_own"]
}
```

## Error Handling

### Security-focused Errors
```typescript
// Generic authentication error
{
  "message": "Invalid credentials",
  "timestamp": "2024-01-16T10:00:00.000Z"
}

// Validation errors
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "messages": ["email must be an email"],
      "value": "invalid-email"
    }
  ]
}
```

## Configuration

### Environment Variables
```bash
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

### Global Guards
```typescript
// app.module.ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  { provide: APP_GUARD, useClass: PermissionsGuard },
  { provide: APP_PIPE, useClass: GlobalValidationPipe },
  { provide: APP_INTERCEPTOR, useClass: SecurityInterceptor }
]
```

## Testing

### Authentication Flow
1. User logs in with email/password
2. Service validates credentials against database
3. JWT tokens generated with user info and permissions
4. Access token returned, refresh token stored in HttpOnly cookie
5. Subsequent requests use Bearer token
6. Token refresh uses refresh token endpoint

### RBAC Testing
- Test role-based access control
- Verify permission enforcement
- Test company data isolation
- Validate resource ownership checks

This implementation provides enterprise-grade security with proper authentication, authorization, and multi-tenant support for the TMS platform.