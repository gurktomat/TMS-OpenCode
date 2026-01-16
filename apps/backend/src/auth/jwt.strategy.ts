import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from './auth.service';
import { User } from '@tms-platform/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      issuer: configService.get<string>('JWT_ISSUER', 'tms-platform'),
      audience: configService.get<string>('JWT_AUDIENCE', 'tms-api'),
    });
  }

  /**
   * Validate JWT payload and return user
   */
  async validate(payload: JwtPayload): Promise<User> {
    try {
      // Extract user ID from payload
      const userId = payload.sub;
      
      // Get user from database
      const user = await this.authService.getProfile(userId);
      
      // Additional validation
      if (!user.isActive) {
        throw new Error('User is not active');
      }

      // Validate tenant if present
      if (payload.tenantId && user.companyId !== payload.tenantId) {
        throw new Error('Tenant mismatch');
      }

      // Validate role if present
      if (payload.role && user.role.name !== payload.role) {
        throw new Error('Role mismatch');
      }

      return user;
    } catch (error) {
      throw new Error(`JWT validation failed: ${error.message}`);
    }
  }
}