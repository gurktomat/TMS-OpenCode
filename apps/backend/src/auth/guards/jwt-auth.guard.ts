import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Check if route is public before running JWT authentication
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>(Public, context.getHandler());
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}