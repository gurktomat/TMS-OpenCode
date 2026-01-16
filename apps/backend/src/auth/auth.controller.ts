import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthResponse } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { User } from '@tms-platform/types';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                permissions: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    try {
      const authResponse = await this.authService.login(loginDto);
      
      // Set refresh token in HttpOnly cookie (optional)
      this.setRefreshTokenCookie(response, authResponse.refreshToken);
      
      // Remove refresh token from response body for security
      const { refreshToken, ...responseWithoutRefreshToken } = authResponse;
      
      this.logger.log(`User logged in: ${loginDto.email}`);
      
      return responseWithoutRefreshToken;
    } catch (error) {
      this.logger.error(`Login failed for ${loginDto.email}:`, error);
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  async refreshToken(
    @Body(ValidationPipe) refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<AuthResponse, 'refreshToken'>> {
    try {
      const authResponse = await this.authService.refreshToken(refreshTokenDto.refreshToken);
      
      // Update refresh token cookie
      this.setRefreshTokenCookie(response, authResponse.refreshToken);
      
      // Remove refresh token from response body
      const { refreshToken, ...responseWithoutRefreshToken } = authResponse;
      
      this.logger.log('Token refreshed successfully');
      
      return responseWithoutRefreshToken;
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    try {
      const user = request.user as User;
      
      // Revoke refresh token
      await this.authService.revokeRefreshToken(user.id);
      
      // Clear refresh token cookie
      this.clearRefreshTokenCookie(response);
      
      this.logger.log(`User logged out: ${user.email}`);
      
      return { message: 'Logout successful' };
    } catch (error) {
      this.logger.error('Logout failed:', error);
      throw error;
    }
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getProfile(@Req() request: Request): Promise<User> {
    const user = request.user as User;
    this.logger.log(`Profile requested for user: ${user.email}`);
    return user;
  }

  @Get('verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify token validity' })
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
  })
  async verifyToken(@Req() request: Request): Promise<{ valid: true; user: User }> {
    const user = request.user as User;
    return { valid: true, user };
  }

  /**
   * Set refresh token in HttpOnly cookie
   */
  private setRefreshTokenCookie(response: Response, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh',
    });
  }

  /**
   * Clear refresh token cookie
   */
  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
    });
  }
}