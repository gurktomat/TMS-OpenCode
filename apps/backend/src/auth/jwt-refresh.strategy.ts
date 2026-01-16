import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, RefreshTokenPayload } from './auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      issuer: configService.get<string>('JWT_ISSUER', 'tms-platform'),
      audience: configService.get<string>('JWT_AUDIENCE', 'tms-api'),
    });
  }

  /**
   * Validate refresh token payload
   */
  async validate(payload: RefreshTokenPayload): Promise<{ userId: string; tokenVersion: number }> {
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return {
      userId: payload.sub,
      tokenVersion: payload.tokenVersion,
    };
  }
}