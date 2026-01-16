import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, Role } from '@tms-platform/types';
import { UserEntity } from '../users/entities/user.entity';
import { RoleEntity } from '../users/entities/role.entity';

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId?: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly rolesRepository: Repository<RoleEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate user credentials and return user data
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      // Find user with role information
      const user = await this.usersRepository.findOne({
        where: { email, isActive: true },
        relations: ['role', 'company'],
      });

      if (!user) {
        this.logger.warn(`Login attempt with non-existent email: ${email}`);
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for user: ${email}`);
        return null;
      }

      // Update last login timestamp
      await this.usersRepository.update(user.id, { lastLogin: new Date() });

      // Log successful authentication
      this.logger.log(`User authenticated successfully: ${email}`);

      return this.mapUserToResponse(user);
    } catch (error) {
      this.logger.error(`Error validating user ${email}:`, error);
      return null;
    }
  }

  /**
   * Authenticate user and generate tokens
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Validate credentials
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token (optional - for token revocation)
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Find user
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub, isActive: true },
        relations: ['role', 'company'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Validate refresh token version (for token revocation)
      const storedToken = await this.getStoredRefreshToken(user.id);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(this.mapUserToResponse(user));

      // Update stored refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      return {
        ...tokens,
        user: this.mapUserToResponse(user),
      };
    } catch (error) {
      this.logger.error('Error refreshing token:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['role', 'company'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mapUserToResponse(user);
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiresIn = this.configService.get<number>('JWT_EXPIRES_IN', 900); // 15 minutes
    const refreshTokenExpiresIn = this.configService.get<number>('JWT_REFRESH_EXPIRES_IN', 604800); // 7 days

    // Access token payload
    const accessTokenPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      tenantId: user.companyId,
      permissions: this.flattenPermissions(user.role.permissions),
      iat: now,
      exp: now + accessTokenExpiresIn,
      iss: this.configService.get<string>('JWT_ISSUER', 'tms-platform'),
      aud: this.configService.get<string>('JWT_AUDIENCE', 'tms-api'),
    };

    // Refresh token payload
    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenVersion: 1, // Increment for token revocation
      type: 'refresh',
    };

    // Generate tokens
    const accessToken = this.jwtService.sign(accessTokenPayload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: accessTokenExpiresIn,
    });

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshTokenExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresIn,
    };
  }

  /**
   * Store refresh token (in Redis or database)
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    // In production, store in Redis with expiration
    // For now, we'll use a simple approach
    const key = `refresh_token:${userId}`;
    const ttl = this.configService.get<number>('JWT_REFRESH_EXPIRES_IN', 604800);
    
    // TODO: Implement Redis storage
    // await this.redisService.setex(key, ttl, refreshToken);
  }

  /**
   * Get stored refresh token
   */
  private async getStoredRefreshToken(userId: string): Promise<string | null> {
    // TODO: Implement Redis retrieval
    // return await this.redisService.get(`refresh_token:${userId}`);
    return null;
  }

  /**
   * Revoke refresh token (logout)
   */
  async revokeRefreshToken(userId: string): Promise<void> {
    // TODO: Remove from Redis
    // await this.redisService.del(`refresh_token:${userId}`);
  }

  /**
   * Map database entity to response object
   */
  private mapUserToResponse(user: UserEntity): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roleId: user.roleId,
      companyId: user.companyId,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions: user.role.permissions,
        createdAt: user.role.createdAt,
        updatedAt: user.role.updatedAt,
      },
    };
  }

  /**
   * Flatten permissions array for JWT payload
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
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}