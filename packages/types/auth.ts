export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  companyId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  role?: Role;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  roleId: string;
  companyId?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface SecurityContext {
  user: User;
  role: Role;
  permissions: string[];
  companyId?: string;
}